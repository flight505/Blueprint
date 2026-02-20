import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentService } from './AgentService';

// Mock the ContextManager module - factory cannot reference outer scope variables
vi.mock('./ContextManager', () => {
  class MockContextManager {
    private sessions = new Map<
      string,
      { sessionId: string; events: Array<{ type: string; content: string }>; summaries: never[]; totalTokens: number }
    >();

    getOrCreateSession(sessionId: string) {
      let ctx = this.sessions.get(sessionId);
      if (!ctx) {
        ctx = { sessionId, events: [], summaries: [], totalTokens: 0 };
        this.sessions.set(sessionId, ctx);
      }
      return ctx;
    }

    addEvent(sessionId: string, type: string, content: string) {
      const ctx = this.getOrCreateSession(sessionId);
      const event = {
        id: `evt_${Date.now()}`,
        timestamp: new Date(),
        type,
        content,
        tokenEstimate: Math.ceil(content.length / 4),
      };
      ctx.events.push(event);
      return event;
    }

    getEvents(sessionId: string) {
      const ctx = this.sessions.get(sessionId);
      return ctx ? [...ctx.events] : [];
    }

    clearAll() {
      this.sessions.clear();
    }
  }

  return {
    ContextManager: MockContextManager,
    contextManager: new MockContextManager(),
  };
});

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      models = {
        list: vi.fn().mockResolvedValue({ data: [] }),
      };
      messages = {
        create: vi.fn().mockResolvedValue({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          model: 'claude-sonnet-4-20250514',
          content: [{ type: 'text', text: 'Mock response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
        stream: vi.fn(),
        parse: vi.fn(),
      };
    },
  };
});

// Mock ModelRouter
vi.mock('./ModelRouter', () => ({
  CLAUDE_MODELS: {
    HAIKU: 'claude-haiku-4-20250414',
    SONNET: 'claude-sonnet-4-20250514',
    OPUS: 'claude-opus-4-20250514',
  },
  modelRouter: {
    getDefaultModel: () => 'claude-sonnet-4-20250514',
    classifyTask: () => ({
      model: 'claude-sonnet-4-20250514',
      complexity: 'medium',
      confidence: 0.8,
      reasoning: 'test',
    }),
  },
}));

// Type for our mock ContextManager
interface MockContextManagerType {
  getOrCreateSession: (id: string) => unknown;
  addEvent: (id: string, type: string, content: string) => unknown;
  getEvents: (id: string) => Array<{ type: string; content: string }>;
  clearAll: () => void;
}

describe('AgentService <-> ContextManager Bridge', () => {
  let service: AgentService;
  let contextManagerMock: MockContextManagerType;

  beforeEach(async () => {
    const mod = await import('./ContextManager');
    contextManagerMock = mod.contextManager as unknown as MockContextManagerType;
    contextManagerMock.clearAll();

    service = new AgentService();
    await service.initialize('test-api-key');
  });

  describe('createSession with trackContext', () => {
    it('does not initialize ContextManager session when trackContext is false', () => {
      const session = service.createSession({ trackContext: false });
      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });

    it('does not initialize ContextManager session when trackContext is undefined', () => {
      const session = service.createSession();
      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });

    it('initializes ContextManager session when trackContext is true', () => {
      const session = service.createSession({ trackContext: true });
      expect(session.trackContext).toBe(true);
      // getOrCreateSession was called, so the session exists (but no events yet)
      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });
  });

  describe('sendMessage bridge', () => {
    it('creates user_message and assistant_message events when trackContext is true', async () => {
      const session = service.createSession({ trackContext: true });

      await service.sendMessage(session.id, 'Hello, world!');

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('user_message');
      expect(events[0].content).toBe('Hello, world!');
      expect(events[1].type).toBe('assistant_message');
      expect(events[1].content).toBe('Mock response');
    });

    it('does not create events when trackContext is false', async () => {
      const session = service.createSession({ trackContext: false });

      await service.sendMessage(session.id, 'Hello, world!');

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });

    it('does not create events when trackContext is undefined (opt-in behavior)', async () => {
      const session = service.createSession();

      await service.sendMessage(session.id, 'Hello, world!');

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });

    it('accumulates events across multiple messages', async () => {
      const session = service.createSession({ trackContext: true });

      await service.sendMessage(session.id, 'First message');
      await service.sendMessage(session.id, 'Second message');

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(4); // 2 pairs of user+assistant
      expect(events[0].type).toBe('user_message');
      expect(events[0].content).toBe('First message');
      expect(events[1].type).toBe('assistant_message');
      expect(events[2].type).toBe('user_message');
      expect(events[2].content).toBe('Second message');
      expect(events[3].type).toBe('assistant_message');
    });

    it('does not create events when API call fails', async () => {
      const session = service.createSession({ trackContext: true });

      // Make the API call fail
      const client = service.getClient()!;
      vi.spyOn(client.messages, 'create').mockRejectedValueOnce(
        new Error('API error')
      );

      await expect(
        service.sendMessage(session.id, 'Failing message')
      ).rejects.toThrow('API error');

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });

    it('uses session ID as the ContextManager session ID', async () => {
      const session = service.createSession({ trackContext: true });

      const addEventSpy = vi.spyOn(contextManagerMock, 'addEvent');
      await service.sendMessage(session.id, 'Test');

      expect(addEventSpy).toHaveBeenCalledWith(
        session.id,
        'user_message',
        'Test'
      );
      expect(addEventSpy).toHaveBeenCalledWith(
        session.id,
        'assistant_message',
        'Mock response'
      );

      addEventSpy.mockRestore();
    });
  });

  describe('sendMessageStream bridge', () => {
    it('creates events after stream completes when trackContext is true', async () => {
      const session = service.createSession({ trackContext: true });

      const client = service.getClient()!;
      const mockFinalMessage = {
        id: 'msg_stream',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Streamed response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      vi.spyOn(client.messages, 'stream').mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: 'Streamed response' },
          };
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue(mockFinalMessage),
      } as never);

      const chunks: Array<{ type: string; content: string }> = [];
      await service.sendMessageStream(
        session.id,
        'Stream this',
        (chunk) => chunks.push(chunk)
      );

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('user_message');
      expect(events[0].content).toBe('Stream this');
      expect(events[1].type).toBe('assistant_message');
      expect(events[1].content).toBe('Streamed response');
    });

    it('does not create events when trackContext is false for streaming', async () => {
      const session = service.createSession({ trackContext: false });

      const client = service.getClient()!;
      const mockFinalMessage = {
        id: 'msg_stream',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Streamed response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      vi.spyOn(client.messages, 'stream').mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue(mockFinalMessage),
      } as never);

      await service.sendMessageStream(
        session.id,
        'Stream this',
        () => {}
      );

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });

    it('does not create events when stream fails', async () => {
      const session = service.createSession({ trackContext: true });

      const client = service.getClient()!;
      vi.spyOn(client.messages, 'stream').mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error('Stream error');
        },
        finalMessage: vi.fn(),
      } as never);

      await expect(
        service.sendMessageStream(session.id, 'Fail', () => {})
      ).rejects.toThrow('Stream error');

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });
  });

  describe('sendSessionMessageParsed bridge', () => {
    it('creates events when trackContext is true', async () => {
      const session = service.createSession({ trackContext: true });

      const client = service.getClient()!;
      vi.spyOn(client.messages, 'parse').mockResolvedValue({
        id: 'msg_parsed',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '{"name":"test"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
        parsed_output: { name: 'test' },
      } as never);

      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });

      await service.sendSessionMessageParsed(
        session.id,
        schema,
        'Parse this'
      );

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('user_message');
      expect(events[0].content).toBe('Parse this');
      expect(events[1].type).toBe('assistant_message');
      expect(events[1].content).toBe('{"name":"test"}');
    });

    it('does not create events when trackContext is false', async () => {
      const session = service.createSession({ trackContext: false });

      const client = service.getClient()!;
      vi.spyOn(client.messages, 'parse').mockResolvedValue({
        id: 'msg_parsed',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '{"name":"test"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
        parsed_output: { name: 'test' },
      } as never);

      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });

      await service.sendSessionMessageParsed(
        session.id,
        schema,
        'Parse this'
      );

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });
  });

  describe('extractTextContent for bridge', () => {
    it('extracts text from ContentBlock arrays for assistant events', async () => {
      const session = service.createSession({ trackContext: true });

      const client = service.getClient()!;
      vi.spyOn(client.messages, 'create').mockResolvedValueOnce({
        id: 'msg_multi',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [
          { type: 'text', text: 'Part one. ' },
          { type: 'text', text: 'Part two.' },
        ],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 30 },
      } as never);

      await service.sendMessage(session.id, 'Multi-block test');

      const events = contextManagerMock.getEvents(session.id);
      expect(events[1].type).toBe('assistant_message');
      expect(events[1].content).toBe('Part one. Part two.');
    });
  });
});
