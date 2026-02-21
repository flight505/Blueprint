import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentService } from './AgentService';
import type { StreamChunk } from './AgentService';

// ─── Hoisted mocks (accessible inside vi.mock factories) ───────────────────
const {
  messagesCreateMock,
  messagesStreamMock,
  messagesParseMock,
  modelsListMock,
  classifyTaskMock,
} = vi.hoisted(() => ({
  messagesCreateMock: vi.fn(),
  messagesStreamMock: vi.fn(),
  messagesParseMock: vi.fn(),
  modelsListMock: vi.fn(),
  classifyTaskMock: vi.fn().mockReturnValue({
    model: 'claude-sonnet-4-20250514',
    complexity: 'medium',
    confidence: 0.8,
    reasoning: 'test classification',
  }),
}));

// ─── Mock ContextManager ────────────────────────────────────────────────────
vi.mock('./ContextManager', () => {
  class MockContextManager {
    private sessions = new Map<
      string,
      {
        sessionId: string;
        events: Array<{ type: string; content: string }>;
        summaries: never[];
        totalTokens: number;
      }
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
      ctx.events.push({ type, content });
      return { type, content };
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

// ─── Mock Anthropic SDK ─────────────────────────────────────────────────────
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      models = { list: modelsListMock };
      messages = {
        create: messagesCreateMock,
        stream: messagesStreamMock,
        parse: messagesParseMock,
      };
      beta = {
        messages: {
          create: vi.fn(),
          stream: vi.fn(),
        },
      };
    },
  };
});

// ─── Mock ModelRouter ───────────────────────────────────────────────────────
vi.mock('./ModelRouter', () => ({
  CLAUDE_MODELS: {
    HAIKU: 'claude-haiku-4-20250414',
    SONNET: 'claude-sonnet-4-20250514',
    OPUS: 'claude-opus-4-20250514',
  },
  modelRouter: {
    getDefaultModel: () => 'claude-sonnet-4-20250514',
    classifyTask: classifyTaskMock,
  },
}));

// ─── Mock zodOutputFormat (used by sendMessageParsed) ───────────────────────
vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: vi.fn().mockReturnValue({
    type: 'json_schema',
    name: 'mock_schema',
    parse: (text: string) => JSON.parse(text),
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTextResponse(text: string, model = 'claude-sonnet-4-20250514') {
  return {
    id: `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

function makeStreamIterable(events: unknown[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const event of events) {
        yield event;
      }
    },
  };
}

function makeStream(
  iterableEvents: unknown[],
  finalMessage: unknown
) {
  return {
    ...makeStreamIterable(iterableEvents),
    finalMessage: vi.fn().mockResolvedValue(finalMessage),
  } as never;
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    modelsListMock.mockResolvedValue({ data: [] });
    messagesCreateMock.mockResolvedValue(makeTextResponse('Mock response'));
    service = new AgentService();
  });

  // ── Initialization ──────────────────────────────────────────────────────

  describe('initialization', () => {
    it('initializes with a valid API key', async () => {
      const result = await service.initialize('sk-valid-key');

      expect(result).toBe(true);
      expect(service.isInitialized()).toBe(true);
    });

    it('returns false and remains uninitialized on invalid API key', async () => {
      modelsListMock.mockRejectedValueOnce(new Error('Invalid API key'));

      const result = await service.initialize('sk-bad-key');

      expect(result).toBe(false);
      expect(service.isInitialized()).toBe(false);
    });

    it('clears client on initialization failure', async () => {
      modelsListMock.mockRejectedValueOnce(new Error('Network error'));

      await service.initialize('sk-key');

      expect(service.getClient()).toBeNull();
    });

    it('reports not initialized before initialize() is called', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('exposes the Anthropic client after initialization', async () => {
      await service.initialize('sk-key');

      const client = service.getClient();
      expect(client).not.toBeNull();
      expect(client!.models).toBeDefined();
    });

    it('returns null from getClient() when not initialized', () => {
      expect(service.getClient()).toBeNull();
    });
  });

  describe('validateApiKey', () => {
    it('returns true for a valid key', async () => {
      const result = await service.validateApiKey('sk-valid');
      expect(result).toBe(true);
    });

    it('returns false for an invalid key', async () => {
      modelsListMock.mockRejectedValueOnce(new Error('Unauthorized'));

      const result = await service.validateApiKey('sk-invalid');
      expect(result).toBe(false);
    });

    it('does not affect the service initialization state', async () => {
      await service.validateApiKey('sk-valid');
      expect(service.isInitialized()).toBe(false);
    });
  });

  // ── Session CRUD ────────────────────────────────────────────────────────

  describe('session CRUD', () => {
    beforeEach(async () => {
      await service.initialize('sk-key');
    });

    it('creates a session with default model (Sonnet)', () => {
      const session = service.createSession();

      expect(session.id).toBeDefined();
      expect(session.model).toBe('claude-sonnet-4-20250514');
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it('creates a session with an explicit model', () => {
      const session = service.createSession({ model: 'claude-opus-4-20250514' });

      expect(session.model).toBe('claude-opus-4-20250514');
    });

    it('creates a session with a system prompt', () => {
      const session = service.createSession({
        systemPrompt: 'You are a helpful assistant.',
      });

      expect(session.systemPrompt).toBe('You are a helpful assistant.');
    });

    it('creates a session with auto-selected model', () => {
      classifyTaskMock.mockReturnValueOnce({
        model: 'claude-opus-4-20250514',
        complexity: 'complex',
        confidence: 0.9,
        reasoning: 'auto-selected',
      });

      const session = service.createSession({ autoSelectModel: true });

      expect(classifyTaskMock).toHaveBeenCalled();
      expect(session.model).toBe('claude-opus-4-20250514');
    });

    it('creates a session with taskType-based model selection', () => {
      classifyTaskMock.mockReturnValueOnce({
        model: 'claude-haiku-4-20250414',
        complexity: 'simple',
        confidence: 0.9,
        reasoning: 'autocomplete task',
      });

      const session = service.createSession({ taskType: 'autocomplete' });

      expect(classifyTaskMock).toHaveBeenCalledWith('', { taskType: 'autocomplete' });
      expect(session.model).toBe('claude-haiku-4-20250414');
    });

    it('prefers explicit model over autoSelectModel', () => {
      const session = service.createSession({
        model: 'claude-opus-4-20250514',
        autoSelectModel: true,
      });

      expect(session.model).toBe('claude-opus-4-20250514');
      expect(classifyTaskMock).not.toHaveBeenCalled();
    });

    it('retrieves a session by ID', () => {
      const session = service.createSession();
      const retrieved = service.getSession(session.id);

      expect(retrieved).toBe(session);
    });

    it('returns undefined for a non-existent session', () => {
      expect(service.getSession('non-existent-id')).toBeUndefined();
    });

    it('deletes a session', () => {
      const session = service.createSession();
      const deleted = service.deleteSession(session.id);

      expect(deleted).toBe(true);
      expect(service.getSession(session.id)).toBeUndefined();
    });

    it('returns false when deleting a non-existent session', () => {
      expect(service.deleteSession('non-existent')).toBe(false);
    });

    it('lists all active sessions', () => {
      service.createSession();
      service.createSession();
      service.createSession();

      const sessions = service.listSessions();
      expect(sessions).toHaveLength(3);
    });

    it('returns empty array when no sessions exist', () => {
      expect(service.listSessions()).toEqual([]);
    });

    it('generates unique session IDs', () => {
      const s1 = service.createSession();
      const s2 = service.createSession();
      const s3 = service.createSession();

      const ids = new Set([s1.id, s2.id, s3.id]);
      expect(ids.size).toBe(3);
    });
  });

  // ── Conversation history ────────────────────────────────────────────────

  describe('conversation history', () => {
    beforeEach(async () => {
      await service.initialize('sk-key');
    });

    it('returns a copy of the conversation history', async () => {
      const session = service.createSession();
      await service.sendMessage(session.id, 'Hello');

      const h1 = service.getConversationHistory(session.id);
      const h2 = service.getConversationHistory(session.id);

      expect(h1).not.toBe(h2);
      expect(h1).toEqual(h2);
    });

    it('returns empty array for non-existent session', () => {
      expect(service.getConversationHistory('missing')).toEqual([]);
    });

    it('clears conversation history', async () => {
      const session = service.createSession();
      await service.sendMessage(session.id, 'Hello');

      expect(service.clearConversationHistory(session.id)).toBe(true);
      expect(service.getConversationHistory(session.id)).toEqual([]);
    });

    it('returns false when clearing non-existent session', () => {
      expect(service.clearConversationHistory('missing')).toBe(false);
    });
  });

  // ── sendMessage (standard path) ────────────────────────────────────────

  describe('sendMessage', () => {
    beforeEach(async () => {
      await service.initialize('sk-key');
    });

    it('throws when service is not initialized', async () => {
      const uninitService = new AgentService();
      const session = service.createSession();

      await expect(
        uninitService.sendMessage(session.id, 'Hello')
      ).rejects.toThrow('AgentService not initialized');
    });

    it('throws for non-existent session', async () => {
      await expect(
        service.sendMessage('bad-session', 'Hello')
      ).rejects.toThrow('Session not found: bad-session');
    });

    it('sends a message and returns the response', async () => {
      const session = service.createSession();
      const response = await service.sendMessage(session.id, 'Hello');

      expect(response).toHaveProperty('content');
      expect(messagesCreateMock).toHaveBeenCalledTimes(1);
    });

    it('passes the correct parameters to the API', async () => {
      const session = service.createSession({ systemPrompt: 'Be helpful' });
      await service.sendMessage(session.id, 'Hello', { maxTokens: 2048 });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.model).toBe('claude-sonnet-4-20250514');
      expect(args.max_tokens).toBe(2048);
      expect(args.system).toBe('Be helpful');
      // Messages array is passed by reference; after the call completes the
      // assistant response is also pushed, so we check the first entry.
      expect(args.messages[0]).toEqual({ role: 'user', content: 'Hello' });
    });

    it('appends user and assistant messages to history', async () => {
      const session = service.createSession();
      await service.sendMessage(session.id, 'Hello');

      expect(session.messages).toHaveLength(2);
      expect(session.messages[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(session.messages[1].role).toBe('assistant');
    });

    it('preserves full content blocks in assistant history', async () => {
      messagesCreateMock.mockResolvedValueOnce({
        id: 'msg_multi',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [
          { type: 'text', text: 'Part 1. ' },
          { type: 'text', text: 'Part 2.' },
        ],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const session = service.createSession();
      await service.sendMessage(session.id, 'Hello');

      expect(session.messages[1].content).toEqual([
        { type: 'text', text: 'Part 1. ' },
        { type: 'text', text: 'Part 2.' },
      ]);
    });

    it('rolls back user message on API error', async () => {
      messagesCreateMock.mockRejectedValueOnce(new Error('Rate limited'));

      const session = service.createSession();

      await expect(
        service.sendMessage(session.id, 'Failing message')
      ).rejects.toThrow('Rate limited');

      expect(session.messages).toEqual([]);
    });

    it('uses default maxTokens of 4096 when not specified', async () => {
      const session = service.createSession();
      await service.sendMessage(session.id, 'Hello');

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.max_tokens).toBe(4096);
    });

    it('allows model override per message', async () => {
      const session = service.createSession(); // default Sonnet
      await service.sendMessage(session.id, 'Hello', {
        model: 'claude-opus-4-20250514',
      });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.model).toBe('claude-opus-4-20250514');
    });

    it('auto-selects model when autoSelectModel is true', async () => {
      classifyTaskMock.mockReturnValueOnce({
        model: 'claude-opus-4-20250514',
        complexity: 'complex',
        confidence: 0.9,
        reasoning: 'complex content',
      });

      const session = service.createSession();
      await service.sendMessage(session.id, 'Plan the entire architecture', {
        autoSelectModel: true,
      });

      expect(classifyTaskMock).toHaveBeenCalledWith('Plan the entire architecture');
      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.model).toBe('claude-opus-4-20250514');
    });

    it('prefers explicit model override over autoSelectModel', async () => {
      const session = service.createSession();
      await service.sendMessage(session.id, 'Hello', {
        model: 'claude-haiku-4-20250414',
        autoSelectModel: true,
      });

      expect(classifyTaskMock).not.toHaveBeenCalled();
      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.model).toBe('claude-haiku-4-20250414');
    });

    it('accumulates history across multiple messages', async () => {
      messagesCreateMock
        .mockResolvedValueOnce(makeTextResponse('Response 1'))
        .mockResolvedValueOnce(makeTextResponse('Response 2'));

      const session = service.createSession();
      await service.sendMessage(session.id, 'First');
      await service.sendMessage(session.id, 'Second');

      expect(session.messages).toHaveLength(4);

      // Messages array is passed by reference; after the second call completes
      // the array has all 4 entries. Verify structure rather than call-time length.
      expect(session.messages[0]).toEqual({ role: 'user', content: 'First' });
      expect(session.messages[1].role).toBe('assistant');
      expect(session.messages[2]).toEqual({ role: 'user', content: 'Second' });
      expect(session.messages[3].role).toBe('assistant');
    });
  });

  // ── sendMessageStream (standard path) ──────────────────────────────────

  describe('sendMessageStream', () => {
    beforeEach(async () => {
      await service.initialize('sk-key');
    });

    it('throws when service is not initialized', async () => {
      const uninitService = new AgentService();
      const session = service.createSession();

      await expect(
        uninitService.sendMessageStream(session.id, 'Hello', () => {})
      ).rejects.toThrow('AgentService not initialized');
    });

    it('throws for non-existent session', async () => {
      await expect(
        service.sendMessageStream('bad-session', 'Hello', () => {})
      ).rejects.toThrow('Session not found: bad-session');
    });

    it('streams text chunks and emits done', async () => {
      const finalMsg = makeTextResponse('Hello world');
      messagesStreamMock.mockReturnValue(
        makeStream(
          [
            {
              type: 'content_block_delta',
              index: 0,
              delta: { text: 'Hello ' },
            },
            {
              type: 'content_block_delta',
              index: 0,
              delta: { text: 'world' },
            },
            { type: 'message_stop' },
          ],
          finalMsg
        )
      );

      const session = service.createSession();
      const chunks: StreamChunk[] = [];

      await service.sendMessageStream(session.id, 'Hi', (chunk) =>
        chunks.push(chunk)
      );

      const textChunks = chunks.filter((c) => c.type === 'text');
      expect(textChunks).toHaveLength(2);
      expect(textChunks[0].content).toBe('Hello ');
      expect(textChunks[1].content).toBe('world');

      const doneChunks = chunks.filter((c) => c.type === 'done');
      expect(doneChunks).toHaveLength(1);
    });

    it('stores finalMessage in session history', async () => {
      const finalMsg = makeTextResponse('Full response');
      messagesStreamMock.mockReturnValue(
        makeStream([{ type: 'message_stop' }], finalMsg)
      );

      const session = service.createSession();
      await service.sendMessageStream(session.id, 'Hi', () => {});

      expect(session.messages).toHaveLength(2);
      expect(session.messages[0]).toEqual({ role: 'user', content: 'Hi' });
      expect(session.messages[1].role).toBe('assistant');
    });

    it('emits thinking chunks', async () => {
      const finalMsg = makeTextResponse('Answer');
      messagesStreamMock.mockReturnValue(
        makeStream(
          [
            {
              type: 'content_block_delta',
              index: 0,
              delta: { thinking: 'Let me think...' },
            },
            { type: 'message_stop' },
          ],
          finalMsg
        )
      );

      const session = service.createSession();
      const chunks: StreamChunk[] = [];
      await service.sendMessageStream(session.id, 'Think', (c) =>
        chunks.push(c)
      );

      const thinkingChunks = chunks.filter((c) => c.type === 'thinking');
      expect(thinkingChunks).toHaveLength(1);
      expect(thinkingChunks[0].content).toBe('Let me think...');
    });

    it('emits tool_use chunks on content_block_start', async () => {
      const finalMsg = makeTextResponse('Done');
      messagesStreamMock.mockReturnValue(
        makeStream(
          [
            {
              type: 'content_block_start',
              index: 0,
              content_block: {
                type: 'tool_use',
                name: 'search',
                input: { query: 'test' },
              },
            },
            { type: 'message_stop' },
          ],
          finalMsg
        )
      );

      const session = service.createSession();
      const chunks: StreamChunk[] = [];
      await service.sendMessageStream(session.id, 'Use tools', (c) =>
        chunks.push(c)
      );

      const toolChunks = chunks.filter((c) => c.type === 'tool_use');
      expect(toolChunks).toHaveLength(1);
      expect(toolChunks[0].toolName).toBe('search');
      expect(toolChunks[0].toolInput).toEqual({ query: 'test' });
    });

    it('rolls back user message and emits error on stream failure', async () => {
      messagesStreamMock.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error('Connection reset');
        },
        finalMessage: vi.fn(),
      } as never);

      const session = service.createSession();
      const chunks: StreamChunk[] = [];

      await expect(
        service.sendMessageStream(session.id, 'Fail', (c) => chunks.push(c))
      ).rejects.toThrow('Connection reset');

      expect(session.messages).toEqual([]);

      const errorChunks = chunks.filter((c) => c.type === 'error');
      expect(errorChunks).toHaveLength(1);
      expect(errorChunks[0].content).toBe('Connection reset');
    });

    it('emits generic error message for non-Error thrown objects', async () => {
      messagesStreamMock.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw 'string error'; // eslint-disable-line no-throw-literal
        },
        finalMessage: vi.fn(),
      } as never);

      const session = service.createSession();
      const chunks: StreamChunk[] = [];

      await expect(
        service.sendMessageStream(session.id, 'Fail', (c) => chunks.push(c))
      ).rejects.toBe('string error');

      const errorChunks = chunks.filter((c) => c.type === 'error');
      expect(errorChunks[0].content).toBe('Unknown error');
    });
  });

  // ── buildThinkingParams ────────────────────────────────────────────────

  describe('buildThinkingParams (via sendMessage)', () => {
    beforeEach(async () => {
      await service.initialize('sk-key');
    });

    it('does not include thinking when thinking is false', async () => {
      const session = service.createSession();
      await service.sendMessage(session.id, 'Hello', { thinking: false });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.thinking).toBeUndefined();
      expect(args.max_tokens).toBe(4096);
    });

    it('uses adaptive thinking for Opus model', async () => {
      const session = service.createSession({ model: 'claude-opus-4-20250514' });
      await service.sendMessage(session.id, 'Think deeply', { thinking: true });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.thinking).toEqual({ type: 'adaptive' });
      expect(args.max_tokens).toBeGreaterThanOrEqual(16000);
    });

    it('uses adaptive thinking for Sonnet model', async () => {
      const session = service.createSession({ model: 'claude-sonnet-4-20250514' });
      await service.sendMessage(session.id, 'Think', { thinking: true });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.thinking).toEqual({ type: 'adaptive' });
    });

    it('uses budget thinking for Haiku model', async () => {
      const session = service.createSession({ model: 'claude-haiku-4-20250414' });
      await service.sendMessage(session.id, 'Think', { thinking: true });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.thinking).toEqual({ type: 'enabled', budget_tokens: 10000 });
      // maxTokens should be at least budgetTokens + 4096
      expect(args.max_tokens).toBeGreaterThanOrEqual(14096);
    });

    it('uses custom budget for Haiku model', async () => {
      const session = service.createSession({ model: 'claude-haiku-4-20250414' });
      await service.sendMessage(session.id, 'Think', {
        thinking: true,
        thinkingBudget: 5000,
      });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.thinking).toEqual({ type: 'enabled', budget_tokens: 5000 });
      expect(args.max_tokens).toBeGreaterThanOrEqual(9096);
    });

    it('ensures maxTokens >= 16000 for adaptive thinking models', async () => {
      const session = service.createSession({ model: 'claude-opus-4-20250514' });
      await service.sendMessage(session.id, 'Think', {
        thinking: true,
        maxTokens: 1000, // too low
      });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.max_tokens).toBe(16000);
    });

    it('preserves larger maxTokens for adaptive models', async () => {
      const session = service.createSession({ model: 'claude-opus-4-20250514' });
      await service.sendMessage(session.id, 'Think', {
        thinking: true,
        maxTokens: 32000,
      });

      const args = messagesCreateMock.mock.calls[0][0];
      expect(args.max_tokens).toBe(32000);
    });
  });

  // ── extractTextContent ─────────────────────────────────────────────────

  describe('extractTextContent', () => {
    it('extracts text from a single text block', () => {
      const content = [{ type: 'text', text: 'Hello world' }] as any[];
      expect(AgentService.extractTextContent(content)).toBe('Hello world');
    });

    it('concatenates text from multiple text blocks', () => {
      const content = [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world' },
      ] as any[];
      expect(AgentService.extractTextContent(content)).toBe('Hello world');
    });

    it('ignores non-text blocks', () => {
      const content = [
        { type: 'text', text: 'Hello' },
        { type: 'tool_use', id: 'tool_1', name: 'search', input: {} },
        { type: 'text', text: ' world' },
      ] as any[];
      expect(AgentService.extractTextContent(content)).toBe('Hello world');
    });

    it('returns empty string for empty content array', () => {
      expect(AgentService.extractTextContent([])).toBe('');
    });

    it('returns empty string when no text blocks exist', () => {
      const content = [
        { type: 'tool_use', id: 'tool_1', name: 'search', input: {} },
      ] as any[];
      expect(AgentService.extractTextContent(content)).toBe('');
    });
  });

  // ── resumeSession ──────────────────────────────────────────────────────

  describe('resumeSession', () => {
    beforeEach(async () => {
      await service.initialize('sk-key');
    });

    it('resumes a session with existing history', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
      ];

      const session = service.resumeSession('sess-123', messages);

      expect(session.id).toBe('sess-123');
      expect(session.messages).toEqual(messages);
      expect(service.getSession('sess-123')).toBe(session);
    });

    it('uses default model when none provided', () => {
      const session = service.resumeSession('sess-1', []);
      expect(session.model).toBe('claude-sonnet-4-20250514');
    });

    it('uses the provided model', () => {
      const session = service.resumeSession(
        'sess-1',
        [],
        'claude-opus-4-20250514'
      );
      expect(session.model).toBe('claude-opus-4-20250514');
    });

    it('stores the system prompt', () => {
      const session = service.resumeSession(
        'sess-1',
        [],
        undefined,
        'You are a planner'
      );
      expect(session.systemPrompt).toBe('You are a planner');
    });

    it('overwrites an existing session with the same ID', () => {
      service.resumeSession('same-id', [
        { role: 'user', content: 'Old' },
      ]);
      const session2 = service.resumeSession('same-id', [
        { role: 'user', content: 'New' },
      ]);

      expect(service.getSession('same-id')).toBe(session2);
      expect(session2.messages[0].content).toBe('New');
    });
  });

  // ── Context bridging (basic verification; deep tests in Bridge file) ──

  describe('context bridging', () => {
    let contextManagerMock: {
      getEvents: (id: string) => Array<{ type: string; content: string }>;
      clearAll: () => void;
    };

    beforeEach(async () => {
      await service.initialize('sk-key');
      const mod = await import('./ContextManager');
      contextManagerMock = mod.contextManager as unknown as typeof contextManagerMock;
      contextManagerMock.clearAll();
    });

    it('tracks context when trackContext is enabled', async () => {
      const session = service.createSession({ trackContext: true });
      await service.sendMessage(session.id, 'Hello');

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('user_message');
      expect(events[1].type).toBe('assistant_message');
    });

    it('does not track context when trackContext is disabled', async () => {
      const session = service.createSession({ trackContext: false });
      await service.sendMessage(session.id, 'Hello');

      const events = contextManagerMock.getEvents(session.id);
      expect(events).toHaveLength(0);
    });
  });

  // ── sendMessageParsed ──────────────────────────────────────────────────

  describe('sendMessageParsed', () => {
    beforeEach(async () => {
      await service.initialize('sk-key');
    });

    it('throws when service is not initialized', async () => {
      const uninitService = new AgentService();
      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });

      await expect(
        uninitService.sendMessageParsed(schema, 'Hello')
      ).rejects.toThrow('AgentService not initialized');
    });

    it('returns parsed output from the response', async () => {
      messagesParseMock.mockResolvedValueOnce({
        id: 'msg_parsed',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '{"name":"test"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 15 },
        parsed_output: { name: 'test' },
      });

      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });
      const result = await service.sendMessageParsed(schema, 'Parse this');

      expect(result.parsed).toEqual({ name: 'test' });
      expect(result.rawText).toBe('{"name":"test"}');
      expect(result.model).toBe('claude-sonnet-4-20250514');
      expect(result.usage.input_tokens).toBe(10);
    });

    it('throws when parsed_output is null', async () => {
      messagesParseMock.mockResolvedValueOnce({
        id: 'msg_parsed',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'not json' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
        parsed_output: null,
      });

      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });

      await expect(
        service.sendMessageParsed(schema, 'Bad parse')
      ).rejects.toThrow('Structured output parsing returned null');
    });

    it('does not affect session history (stateless)', async () => {
      messagesParseMock.mockResolvedValueOnce({
        id: 'msg_parsed',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '{"name":"test"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 15 },
        parsed_output: { name: 'test' },
      });

      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });

      const session = service.createSession();
      await service.sendMessageParsed(schema, 'Parse this');

      expect(session.messages).toEqual([]);
    });
  });

  // ── sendSessionMessageParsed ───────────────────────────────────────────

  describe('sendSessionMessageParsed', () => {
    beforeEach(async () => {
      await service.initialize('sk-key');
    });

    it('throws when service is not initialized', async () => {
      const uninitService = new AgentService();
      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });
      const session = service.createSession();

      await expect(
        uninitService.sendSessionMessageParsed(session.id, schema, 'Hello')
      ).rejects.toThrow('AgentService not initialized');
    });

    it('throws for non-existent session', async () => {
      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });

      await expect(
        service.sendSessionMessageParsed('bad-id', schema, 'Hello')
      ).rejects.toThrow('Session not found: bad-id');
    });

    it('adds messages to session history', async () => {
      messagesParseMock.mockResolvedValueOnce({
        id: 'msg_parsed',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: '{"name":"test"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 15 },
        parsed_output: { name: 'test' },
      });

      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });
      const session = service.createSession();

      await service.sendSessionMessageParsed(session.id, schema, 'Parse this');

      expect(session.messages).toHaveLength(2);
      expect(session.messages[0]).toEqual({ role: 'user', content: 'Parse this' });
      expect(session.messages[1].role).toBe('assistant');
    });

    it('rolls back user message on API error', async () => {
      messagesParseMock.mockRejectedValueOnce(new Error('Parse API error'));

      const { z } = await import('zod');
      const schema = z.object({ name: z.string() });
      const session = service.createSession();

      await expect(
        service.sendSessionMessageParsed(session.id, schema, 'Failing')
      ).rejects.toThrow('Parse API error');

      expect(session.messages).toEqual([]);
    });
  });
});
