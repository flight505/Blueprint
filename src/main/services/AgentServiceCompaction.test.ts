import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentService } from './AgentService';
import type { CompactionEvent, CompactionConfig } from './AgentService';

// Mock the ContextManager singleton
vi.mock('./ContextManager', () => {
  const manager = new (class {
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
      const event = { type, content };
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
  })();

  return {
    ContextManager: class {},
    contextManager: manager,
  };
});

// Mock the Anthropic SDK with beta.messages support
const betaCreateMock = vi.fn();
const betaStreamMock = vi.fn();
const regularCreateMock = vi.fn().mockResolvedValue({
  id: 'msg_regular',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-20250514',
  content: [{ type: 'text', text: 'Regular response' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 10, output_tokens: 20 },
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      models = {
        list: vi.fn().mockResolvedValue({ data: [] }),
      };
      messages = {
        create: regularCreateMock,
        stream: vi.fn(),
        parse: vi.fn(),
      };
      beta = {
        messages: {
          create: betaCreateMock,
          stream: betaStreamMock,
        },
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

const COMPACTION_CONFIG: CompactionConfig = {
  enabled: true,
  triggerTokens: 100000,
};

describe('AgentService Server-Side Compaction', () => {
  let service: AgentService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new AgentService();
    await service.initialize('test-api-key');
  });

  // ---- Session creation ----

  describe('createSession with compaction', () => {
    it('initializes betaMessages when compaction is enabled', () => {
      const session = service.createSession({
        compaction: { enabled: true },
      });

      expect(session.compaction).toEqual({ enabled: true });
      expect(session.betaMessages).toEqual([]);
    });

    it('does not initialize betaMessages when compaction is disabled', () => {
      const session = service.createSession({
        compaction: { enabled: false },
      });

      expect(session.compaction).toEqual({ enabled: false });
      expect(session.betaMessages).toBeUndefined();
    });

    it('does not initialize betaMessages when compaction is not specified', () => {
      const session = service.createSession();
      expect(session.compaction).toBeUndefined();
      expect(session.betaMessages).toBeUndefined();
    });

    it('stores custom trigger tokens and instructions', () => {
      const config: CompactionConfig = {
        enabled: true,
        triggerTokens: 50000,
        instructions: 'Preserve code snippets',
        pauseAfterCompaction: false,
      };
      const session = service.createSession({ compaction: config });
      expect(session.compaction).toEqual(config);
    });
  });

  // ---- sendMessage with compaction ----

  describe('sendMessage with compaction enabled', () => {
    it('uses beta API with context_management when compaction is enabled', async () => {
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_beta',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Beta response' }],
        stop_reason: 'end_turn',
        context_management: null,
        usage: { input_tokens: 15, output_tokens: 25 },
      });

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      const result = await service.sendMessage(session.id, 'Hello');

      // Should have called beta.messages.create
      expect(betaCreateMock).toHaveBeenCalledTimes(1);
      expect(regularCreateMock).not.toHaveBeenCalled();

      // Verify the beta API call parameters
      const callArgs = betaCreateMock.mock.calls[0][0];
      expect(callArgs.betas).toContain('context-management-2025-06-27');
      expect(callArgs.context_management).toEqual({
        edits: [
          {
            type: 'compact_20260112',
            trigger: { type: 'input_tokens', value: 100000 },
            pause_after_compaction: true,
          },
        ],
      });
      expect(callArgs.stream).toBe(false);

      // Result should be a normal message (not compaction event)
      expect(result.type).toBe('message');
    });

    it('returns CompactionEvent when stop_reason is compaction', async () => {
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_compact',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [
          {
            type: 'compaction',
            content: 'Summary of previous conversation about project planning.',
          },
        ],
        stop_reason: 'compaction',
        context_management: null,
        usage: { input_tokens: 100000, output_tokens: 500 },
      });

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      const result = await service.sendMessage(session.id, 'Continue discussion');

      expect(result.type).toBe('compaction');
      const compactionResult = result as CompactionEvent;
      expect(compactionResult.compactionBlocks).toHaveLength(1);
      expect(compactionResult.compactionBlocks[0].content).toBe(
        'Summary of previous conversation about project planning.'
      );
      expect(compactionResult.rawResponse.stop_reason).toBe('compaction');
    });

    it('stores compaction blocks in betaMessages for round-tripping', async () => {
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_compact',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [
          { type: 'compaction', content: 'Compacted summary' },
        ],
        stop_reason: 'compaction',
        context_management: null,
        usage: { input_tokens: 100000, output_tokens: 500 },
      });

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      await service.sendMessage(session.id, 'Hello');

      // Check that betaMessages has the user message + compaction assistant turn
      const history = service.getCompactionHistory(session.id);
      expect(history).toHaveLength(2);
      expect(history![0]).toEqual({ role: 'user', content: 'Hello' });
      expect(history![1]).toEqual({
        role: 'assistant',
        content: [{ type: 'compaction', content: 'Compacted summary' }],
      });
    });

    it('includes previous compaction blocks in subsequent requests', async () => {
      // First call: compaction event
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_compact',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'compaction', content: 'Previous context summary' }],
        stop_reason: 'compaction',
        context_management: null,
        usage: { input_tokens: 100000, output_tokens: 500 },
      });

      // Second call: normal response
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_normal',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Response after compaction' }],
        stop_reason: 'end_turn',
        context_management: null,
        usage: { input_tokens: 2000, output_tokens: 50 },
      });

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      // First message triggers compaction
      await service.sendMessage(session.id, 'First message');

      // After compaction, betaMessages should have:
      // [user "First message", assistant [compaction block]]
      expect(service.getCompactionHistory(session.id)).toHaveLength(2);

      // Second message should include the full history with compaction block
      await service.sendMessage(session.id, 'Second message');

      const secondCallArgs = betaCreateMock.mock.calls[1][0];
      const messages = secondCallArgs.messages;

      // betaMessages passed to API: user, assistant-compaction, user (the 2nd user msg is pushed before the call)
      // But the array is the session.betaMessages reference which now also has the 2nd call's assistant response pushed.
      // We check the call args, which is the same array ref at time of call (3 items).
      // Actually since arrays are passed by reference and we push after the call, the mock captures the ref.
      // To verify correctly, check that compaction block is present.
      expect(messages.length).toBeGreaterThanOrEqual(3);

      // Find the assistant compaction turn
      const compactionTurn = messages.find(
        (m: { role: string; content: unknown }) =>
          m.role === 'assistant' &&
          Array.isArray(m.content) &&
          m.content.some((b: { type: string }) => b.type === 'compaction')
      );
      expect(compactionTurn).toBeDefined();
      expect(compactionTurn.content).toEqual([
        { type: 'compaction', content: 'Previous context summary' },
      ]);

      // Last message should be the second user message
      const lastUserMsg = [...messages].reverse().find(
        (m: { role: string }) => m.role === 'user'
      );
      expect(lastUserMsg).toEqual({ role: 'user', content: 'Second message' });
    });

    it('handles compaction with null content (failed compaction)', async () => {
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_compact_fail',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'compaction', content: null }],
        stop_reason: 'compaction',
        context_management: null,
        usage: { input_tokens: 100000, output_tokens: 0 },
      });

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      const result = await service.sendMessage(session.id, 'Hello');

      expect(result.type).toBe('compaction');
      const compactionResult = result as CompactionEvent;
      expect(compactionResult.compactionBlocks[0].content).toBeNull();

      // Still round-trips the null-content block
      const history = service.getCompactionHistory(session.id);
      expect(history![1].content).toEqual([
        { type: 'compaction', content: null },
      ]);
    });

    it('rolls back user message on API failure', async () => {
      betaCreateMock.mockRejectedValueOnce(new Error('API timeout'));

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      await expect(
        service.sendMessage(session.id, 'Failing message')
      ).rejects.toThrow('API timeout');

      expect(session.betaMessages).toEqual([]);
      expect(session.messages).toEqual([]);
    });

    it('uses custom trigger tokens from config', async () => {
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_custom',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        context_management: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const session = service.createSession({
        compaction: {
          enabled: true,
          triggerTokens: 50000,
          instructions: 'Keep technical details',
          pauseAfterCompaction: false,
        },
      });

      await service.sendMessage(session.id, 'Hello');

      const callArgs = betaCreateMock.mock.calls[0][0];
      expect(callArgs.context_management.edits[0].trigger.value).toBe(50000);
      expect(callArgs.context_management.edits[0].instructions).toBe('Keep technical details');
      expect(callArgs.context_management.edits[0].pause_after_compaction).toBe(false);
    });
  });

  // ---- sendMessage without compaction (unchanged behavior) ----

  describe('sendMessage without compaction (standard path)', () => {
    it('uses regular API when compaction is not enabled', async () => {
      const session = service.createSession();

      await service.sendMessage(session.id, 'Hello');

      expect(regularCreateMock).toHaveBeenCalledTimes(1);
      expect(betaCreateMock).not.toHaveBeenCalled();
    });

    it('does not include context_management or betas in standard calls', async () => {
      const session = service.createSession();

      await service.sendMessage(session.id, 'Hello');

      const callArgs = regularCreateMock.mock.calls[0][0];
      expect(callArgs.betas).toBeUndefined();
      expect(callArgs.context_management).toBeUndefined();
    });
  });

  // ---- sendMessageStream with compaction ----

  describe('sendMessageStream with compaction enabled', () => {
    it('uses beta stream API and returns CompactionEvent on compaction', async () => {
      const mockFinalMessage = {
        id: 'msg_stream_compact',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [
          { type: 'compaction', content: 'Streamed compaction summary' },
        ],
        stop_reason: 'compaction',
        context_management: null,
        usage: { input_tokens: 100000, output_tokens: 500 },
      };

      betaStreamMock.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'compaction', content: null },
          };
          yield {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'compaction_delta', content: 'Streamed compaction summary' },
          };
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue(mockFinalMessage),
      } as never);

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      const chunks: Array<{ type: string; content: string }> = [];
      const result = await service.sendMessageStream(
        session.id,
        'Long conversation',
        (chunk) => chunks.push(chunk)
      );

      expect(betaStreamMock).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result!.type).toBe('compaction');

      // Verify compaction delta was emitted as a chunk
      const compactionChunks = chunks.filter((c) => c.type === 'compaction');
      expect(compactionChunks.length).toBeGreaterThanOrEqual(1);
      expect(compactionChunks[0].content).toBe('Streamed compaction summary');
    });

    it('returns void on normal stream response with compaction enabled', async () => {
      const mockFinalMessage = {
        id: 'msg_stream_normal',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Normal streamed response' }],
        stop_reason: 'end_turn',
        context_management: null,
        usage: { input_tokens: 100, output_tokens: 30 },
      };

      betaStreamMock.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: 'Normal streamed response' },
          };
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue(mockFinalMessage),
      } as never);

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      const chunks: Array<{ type: string; content: string }> = [];
      const result = await service.sendMessageStream(
        session.id,
        'Hello',
        (chunk) => chunks.push(chunk)
      );

      expect(result).toBeUndefined();

      // Verify text chunks came through
      const textChunks = chunks.filter((c) => c.type === 'text');
      expect(textChunks.length).toBeGreaterThanOrEqual(1);
    });

    it('passes beta headers and context_management in stream call', async () => {
      const mockFinalMessage = {
        id: 'msg_stream',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        context_management: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      };

      betaStreamMock.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'message_stop' };
        },
        finalMessage: vi.fn().mockResolvedValue(mockFinalMessage),
      } as never);

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      await service.sendMessageStream(session.id, 'Hello', () => {});

      const callArgs = betaStreamMock.mock.calls[0][0];
      expect(callArgs.betas).toContain('context-management-2025-06-27');
      expect(callArgs.context_management).toBeDefined();
      expect(callArgs.context_management.edits[0].type).toBe('compact_20260112');
    });

    it('rolls back user messages on stream failure', async () => {
      betaStreamMock.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error('Stream error');
        },
        finalMessage: vi.fn(),
      } as never);

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      await expect(
        service.sendMessageStream(session.id, 'Fail', () => {})
      ).rejects.toThrow('Stream error');

      expect(session.betaMessages).toEqual([]);
      expect(session.messages).toEqual([]);
    });
  });

  // ---- Static helper methods ----

  describe('static helpers', () => {
    it('extractCompactionBlocks filters only compaction blocks', () => {
      const content = [
        { type: 'text', text: 'Hello' },
        { type: 'compaction', content: 'Summary 1' },
        { type: 'text', text: 'World' },
        { type: 'compaction', content: 'Summary 2' },
      ] as any[];

      const blocks = AgentService.extractCompactionBlocks(content);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].content).toBe('Summary 1');
      expect(blocks[1].content).toBe('Summary 2');
    });

    it('extractCompactionBlocks returns empty array when no compaction blocks', () => {
      const content = [
        { type: 'text', text: 'Hello' },
      ] as any[];

      const blocks = AgentService.extractCompactionBlocks(content);
      expect(blocks).toHaveLength(0);
    });

    it('extractBetaTextContent extracts text from beta content blocks', () => {
      const content = [
        { type: 'text', text: 'Hello ' },
        { type: 'compaction', content: 'Summary' },
        { type: 'text', text: 'World' },
      ] as any[];

      const text = AgentService.extractBetaTextContent(content);
      expect(text).toBe('Hello World');
    });

    it('extractBetaTextContent returns empty string with no text blocks', () => {
      const content = [
        { type: 'compaction', content: 'Summary' },
      ] as any[];

      const text = AgentService.extractBetaTextContent(content);
      expect(text).toBe('');
    });
  });

  // ---- getCompactionHistory ----

  describe('getCompactionHistory', () => {
    it('returns beta message history for compaction-enabled sessions', () => {
      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      const history = service.getCompactionHistory(session.id);
      expect(history).toEqual([]);
    });

    it('returns undefined for non-compaction sessions', () => {
      const session = service.createSession();

      const history = service.getCompactionHistory(session.id);
      expect(history).toBeUndefined();
    });

    it('returns a copy (not a reference) of beta messages', async () => {
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_beta',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        context_management: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      await service.sendMessage(session.id, 'Hello');

      const history1 = service.getCompactionHistory(session.id);
      const history2 = service.getCompactionHistory(session.id);
      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  // ---- resumeSession with compaction ----

  describe('resumeSession with compaction', () => {
    it('resumes a session with compaction config and beta messages', () => {
      const betaMessages = [
        { role: 'user' as const, content: 'Previous message' },
        {
          role: 'assistant' as const,
          content: [{ type: 'compaction' as const, content: 'Previous summary' }],
        },
      ];

      const session = service.resumeSession(
        'session-123',
        [],
        'claude-sonnet-4-20250514',
        'System prompt',
        { enabled: true, triggerTokens: 80000 },
        betaMessages
      );

      expect(session.compaction).toEqual({ enabled: true, triggerTokens: 80000 });
      expect(session.betaMessages).toEqual(betaMessages);
    });

    it('uses regular messages as beta messages when none provided', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
      ];

      const session = service.resumeSession(
        'session-456',
        messages,
        undefined,
        undefined,
        { enabled: true }
      );

      expect(session.betaMessages).toEqual(messages);
    });

    it('does not set betaMessages when compaction is not enabled', () => {
      const session = service.resumeSession(
        'session-789',
        [],
        undefined,
        undefined,
        { enabled: false }
      );

      expect(session.betaMessages).toBeUndefined();
    });
  });

  // ---- Multi-turn conversation with compaction ----

  describe('multi-turn conversation with compaction', () => {
    it('maintains correct beta message history across multiple turns', async () => {
      // Turn 1: normal response
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'First response' }],
        stop_reason: 'end_turn',
        context_management: null,
        usage: { input_tokens: 50, output_tokens: 20 },
      });

      // Turn 2: compaction
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_2',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'compaction', content: 'Conversation summary' }],
        stop_reason: 'compaction',
        context_management: null,
        usage: { input_tokens: 100000, output_tokens: 500 },
      });

      // Turn 3: normal response after compaction
      betaCreateMock.mockResolvedValueOnce({
        id: 'msg_3',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Third response' }],
        stop_reason: 'end_turn',
        context_management: null,
        usage: { input_tokens: 1000, output_tokens: 30 },
      });

      const session = service.createSession({
        compaction: COMPACTION_CONFIG,
      });

      // Turn 1
      const r1 = await service.sendMessage(session.id, 'First message');
      expect(r1.type).toBe('message');

      // Turn 2: triggers compaction
      const r2 = await service.sendMessage(session.id, 'Second message');
      expect(r2.type).toBe('compaction');

      // Turn 3: after compaction
      const r3 = await service.sendMessage(session.id, 'Third message');
      expect(r3.type).toBe('message');

      // Verify the third call includes the compaction block in the beta messages
      const thirdCallMessages = betaCreateMock.mock.calls[2][0].messages;

      // The beta messages array is passed by reference, so after the third call
      // completes (normal response), it may have additional entries pushed.
      // At the time of the API call, betaMessages had 5 items:
      // [user1, asst1, user2, asst_compaction, user3]
      // After the call, asst3 is pushed making it 6.
      // Since mock captures the reference, we see 6, but the key check is that
      // the compaction block is present and correctly positioned.

      // Find the compaction turn
      const compactionTurn = thirdCallMessages.find(
        (m: { role: string; content: unknown }) =>
          m.role === 'assistant' &&
          Array.isArray(m.content) &&
          m.content.some((b: { type: string }) => b.type === 'compaction')
      );
      expect(compactionTurn).toBeDefined();
      expect(compactionTurn.content).toEqual([
        { type: 'compaction', content: 'Conversation summary' },
      ]);

      // Verify the overall structure contains all expected turns
      const userMessages = thirdCallMessages.filter(
        (m: { role: string }) => m.role === 'user'
      );
      expect(userMessages).toHaveLength(3);
      expect(userMessages[0].content).toBe('First message');
      expect(userMessages[1].content).toBe('Second message');
      expect(userMessages[2].content).toBe('Third message');
    });
  });
});
