import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextManager } from './ContextManager';
import type { ContextEventType } from '../../shared/types';

// Mock the Anthropic SDK
const mockCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'Summary of compacted events.' }],
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
      constructor(_opts?: Record<string, unknown>) {}
    },
  };
});

// Mock ModelRouter constants
vi.mock('./ModelRouter', () => ({
  CLAUDE_MODELS: {
    HAIKU: 'claude-haiku-4-5',
    SONNET: 'claude-sonnet-4-6',
    OPUS: 'claude-opus-4-6',
  },
}));

/**
 * Helper: add N events to a session
 */
function addEvents(
  manager: ContextManager,
  sessionId: string,
  count: number,
  type: ContextEventType = 'user_message',
  contentPrefix = 'Event'
): void {
  for (let i = 0; i < count; i++) {
    manager.addEvent(sessionId, type, `${contentPrefix} ${i + 1}`);
  }
}

describe('ContextManager', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  // ─── Session Lifecycle ───────────────────────────────────────────

  describe('session lifecycle', () => {
    it('should create a new session via getOrCreateSession', () => {
      const session = manager.getOrCreateSession('s1');
      expect(session.sessionId).toBe('s1');
      expect(session.events).toEqual([]);
      expect(session.summaries).toEqual([]);
      expect(session.totalTokens).toBe(0);
    });

    it('should return the same session on repeated calls', () => {
      const s1 = manager.getOrCreateSession('s1');
      s1.events.push({
        id: 'test',
        timestamp: new Date(),
        type: 'other',
        content: 'marker',
        tokenEstimate: 2,
      });
      const s1Again = manager.getOrCreateSession('s1');
      expect(s1Again.events).toHaveLength(1);
      expect(s1Again.events[0].content).toBe('marker');
    });

    it('should isolate sessions by sessionId', () => {
      manager.addEvent('s1', 'user_message', 'Hello from s1');
      manager.addEvent('s2', 'user_message', 'Hello from s2');

      const eventsS1 = manager.getEvents('s1');
      const eventsS2 = manager.getEvents('s2');

      expect(eventsS1).toHaveLength(1);
      expect(eventsS1[0].content).toBe('Hello from s1');
      expect(eventsS2).toHaveLength(1);
      expect(eventsS2[0].content).toBe('Hello from s2');
    });

    it('should clear a specific session', () => {
      manager.addEvent('s1', 'user_message', 'test');
      manager.addEvent('s2', 'user_message', 'test');

      const deleted = manager.clearSession('s1');
      expect(deleted).toBe(true);
      expect(manager.getEvents('s1')).toEqual([]);
      expect(manager.getEvents('s2')).toHaveLength(1);
    });

    it('should return false when clearing a non-existent session', () => {
      expect(manager.clearSession('nonexistent')).toBe(false);
    });

    it('should clear all sessions', () => {
      manager.addEvent('s1', 'user_message', 'test');
      manager.addEvent('s2', 'user_message', 'test');

      manager.clearAll();
      expect(manager.getEvents('s1')).toEqual([]);
      expect(manager.getEvents('s2')).toEqual([]);
    });
  });

  // ─── Event Tracking ─────────────────────────────────────────────

  describe('event tracking', () => {
    it('should add events and return them with correct fields', () => {
      const event = manager.addEvent('s1', 'user_message', 'Hello world');

      expect(event.id).toMatch(/^evt_/);
      expect(event.type).toBe('user_message');
      expect(event.content).toBe('Hello world');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.tokenEstimate).toBeGreaterThan(0);
    });

    it('should support all ContextEventType values', () => {
      const types: ContextEventType[] = [
        'user_message',
        'assistant_message',
        'tool_use',
        'file_read',
        'decision',
        'other',
      ];

      for (const type of types) {
        const event = manager.addEvent('s1', type, `content for ${type}`);
        expect(event.type).toBe(type);
      }

      expect(manager.getEvents('s1')).toHaveLength(types.length);
    });

    it('should store metadata when provided', () => {
      const meta = { source: 'test', priority: 1 };
      const event = manager.addEvent('s1', 'decision', 'decided X', meta);
      expect(event.metadata).toEqual(meta);
    });

    it('should preserve event ordering', () => {
      manager.addEvent('s1', 'user_message', 'first');
      manager.addEvent('s1', 'assistant_message', 'second');
      manager.addEvent('s1', 'tool_use', 'third');

      const events = manager.getEvents('s1');
      expect(events[0].content).toBe('first');
      expect(events[1].content).toBe('second');
      expect(events[2].content).toBe('third');
    });

    it('should return empty array for unknown session', () => {
      expect(manager.getEvents('unknown')).toEqual([]);
    });

    it('should return a copy of events, not a reference', () => {
      manager.addEvent('s1', 'user_message', 'test');
      const events = manager.getEvents('s1');
      events.push({
        id: 'fake',
        timestamp: new Date(),
        type: 'other',
        content: 'injected',
        tokenEstimate: 0,
      });
      expect(manager.getEvents('s1')).toHaveLength(1);
    });

    it('should accumulate totalTokens on the session', () => {
      // 'AAAA' is 4 chars -> ceil(4/4) = 1 token
      manager.addEvent('s1', 'user_message', 'AAAA');
      // 'BBBBBBBB' is 8 chars -> ceil(8/4) = 2 tokens
      manager.addEvent('s1', 'user_message', 'BBBBBBBB');

      const session = manager.getOrCreateSession('s1');
      expect(session.totalTokens).toBe(3);
    });
  });

  // ─── Token Estimation ───────────────────────────────────────────

  describe('token estimation', () => {
    it('should estimate ~1 token per 4 characters', () => {
      const event = manager.addEvent('s1', 'user_message', 'abcd'); // 4 chars
      expect(event.tokenEstimate).toBe(1);
    });

    it('should ceil partial tokens', () => {
      const event = manager.addEvent('s1', 'user_message', 'abcde'); // 5 chars -> ceil(5/4) = 2
      expect(event.tokenEstimate).toBe(2);
    });

    it('should handle empty content', () => {
      const event = manager.addEvent('s1', 'user_message', ''); // 0 chars -> ceil(0/4) = 0
      expect(event.tokenEstimate).toBe(0);
    });

    it('should scale linearly with longer content', () => {
      const longContent = 'x'.repeat(400); // 400 chars -> 100 tokens
      const event = manager.addEvent('s1', 'user_message', longContent);
      expect(event.tokenEstimate).toBe(100);
    });
  });

  // ─── Compaction Trigger ──────────────────────────────────────────

  describe('shouldCompact', () => {
    it('should return false for unknown session', () => {
      expect(manager.shouldCompact('unknown')).toBe(false);
    });

    it('should return false when events are below threshold', () => {
      addEvents(manager, 's1', 20);
      expect(manager.shouldCompact('s1')).toBe(false);
    });

    it('should return true when events exceed threshold', () => {
      addEvents(manager, 's1', 21);
      expect(manager.shouldCompact('s1')).toBe(true);
    });

    it('should respect custom thresholds', () => {
      manager.configure({ compactionThreshold: 5 });
      addEvents(manager, 's1', 5);
      expect(manager.shouldCompact('s1')).toBe(false);

      manager.addEvent('s1', 'user_message', 'one more');
      expect(manager.shouldCompact('s1')).toBe(true);
    });
  });

  // ─── Compaction Execution ─────────────────────────────────────────

  describe('compact', () => {
    it('should fail if not initialized', async () => {
      addEvents(manager, 's1', 25);
      const result = await manager.compact('s1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('ContextManager not initialized');
    });

    it('should fail for non-existent session', async () => {
      manager.initialize('test-key');
      const result = await manager.compact('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });

    it('should no-op when events are at or below recentEventsToKeep', async () => {
      manager.initialize('test-key');
      addEvents(manager, 's1', 10); // default recentEventsToKeep = 10
      const result = await manager.compact('s1');
      expect(result.success).toBe(true);
      expect(result.tokensSaved).toBe(0);
    });

    it('should compact older events and keep recent ones', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 5 });
      addEvents(manager, 's1', 15);

      const result = await manager.compact('s1');

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary!.eventRange.eventCount).toBe(10); // 15 - 5 compacted
      expect(manager.getEvents('s1')).toHaveLength(5); // 5 kept
    });

    it('should create a summary record after compaction', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 3 });
      addEvents(manager, 's1', 8);

      await manager.compact('s1');

      const session = manager.getOrCreateSession('s1');
      expect(session.summaries).toHaveLength(1);
      expect(session.summaries[0].summary).toBe('Summary of compacted events.');
      expect(session.summaries[0].eventRange.eventCount).toBe(5);
    });

    it('should set lastCompactionAt after compaction', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 2 });
      addEvents(manager, 's1', 5);

      const before = new Date();
      await manager.compact('s1');
      const after = new Date();

      const session = manager.getOrCreateSession('s1');
      expect(session.lastCompactionAt).toBeDefined();
      expect(session.lastCompactionAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(session.lastCompactionAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should handle API errors gracefully', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 2 });
      addEvents(manager, 's1', 5);

      // Override the mock to throw on next call
      mockCreate.mockRejectedValueOnce(new Error('API rate limited'));

      const result = await manager.compact('s1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limited');
    });
  });

  // ─── Context Retrieval ────────────────────────────────────────────

  describe('getFullContext', () => {
    it('should return empty string for unknown session', () => {
      expect(manager.getFullContext('unknown')).toBe('');
    });

    it('should format events with type prefixes', () => {
      manager.addEvent('s1', 'user_message', 'Hello');
      manager.addEvent('s1', 'assistant_message', 'Hi there');
      manager.addEvent('s1', 'tool_use', 'ran search');
      manager.addEvent('s1', 'file_read', 'content of file.ts');
      manager.addEvent('s1', 'decision', 'use React');
      manager.addEvent('s1', 'other', 'miscellaneous');

      const context = manager.getFullContext('s1');

      expect(context).toContain('User: Hello');
      expect(context).toContain('Assistant: Hi there');
      expect(context).toContain('Tool: ran search');
      expect(context).toContain('File: content of file.ts');
      expect(context).toContain('Decision: use React');
      expect(context).toContain('Event: miscellaneous');
    });

    it('should include summary section after compaction', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 2 });
      addEvents(manager, 's1', 5);

      await manager.compact('s1');
      const context = manager.getFullContext('s1');

      expect(context).toContain('=== Previous Context Summary ===');
      expect(context).toContain('Summary of compacted events.');
      expect(context).toContain('=== Recent Context ===');
    });
  });

  describe('getContextAsMessages', () => {
    it('should return empty array for unknown session', () => {
      expect(manager.getContextAsMessages('unknown')).toEqual([]);
    });

    it('should convert user and assistant events to messages', () => {
      manager.addEvent('s1', 'user_message', 'What is X?');
      manager.addEvent('s1', 'assistant_message', 'X is ...');
      manager.addEvent('s1', 'tool_use', 'search tool call'); // should be skipped
      manager.addEvent('s1', 'user_message', 'Thanks');

      const messages = manager.getContextAsMessages('s1');

      expect(messages).toHaveLength(3);
      expect(messages[0]).toEqual({ role: 'user', content: 'What is X?' });
      expect(messages[1]).toEqual({ role: 'assistant', content: 'X is ...' });
      expect(messages[2]).toEqual({ role: 'user', content: 'Thanks' });
    });

    it('should prepend summary messages after compaction', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 2 });

      manager.addEvent('s1', 'user_message', 'Old message 1');
      manager.addEvent('s1', 'assistant_message', 'Old reply 1');
      manager.addEvent('s1', 'user_message', 'Old message 2');
      manager.addEvent('s1', 'user_message', 'Recent message 1');
      manager.addEvent('s1', 'assistant_message', 'Recent reply');

      await manager.compact('s1');

      const messages = manager.getContextAsMessages('s1');

      // First two messages are the summary context pair
      expect(messages[0].role).toBe('user');
      expect((messages[0].content as string)).toContain('[Context summary');
      expect(messages[1].role).toBe('assistant');

      // Then the recent user_message and assistant_message events
      expect(messages[2]).toEqual({ role: 'user', content: 'Recent message 1' });
      expect(messages[3]).toEqual({ role: 'assistant', content: 'Recent reply' });
    });
  });

  // ─── Configuration ───────────────────────────────────────────────

  describe('configuration', () => {
    it('should return default configuration', () => {
      const config = manager.getConfiguration();
      expect(config.compactionThreshold).toBe(20);
      expect(config.recentEventsToKeep).toBe(10);
    });

    it('should update compactionThreshold', () => {
      manager.configure({ compactionThreshold: 50 });
      expect(manager.getConfiguration().compactionThreshold).toBe(50);
      // recentEventsToKeep should remain unchanged
      expect(manager.getConfiguration().recentEventsToKeep).toBe(10);
    });

    it('should update recentEventsToKeep', () => {
      manager.configure({ recentEventsToKeep: 3 });
      expect(manager.getConfiguration().recentEventsToKeep).toBe(3);
      expect(manager.getConfiguration().compactionThreshold).toBe(20);
    });

    it('should update both values at once', () => {
      manager.configure({ compactionThreshold: 100, recentEventsToKeep: 25 });
      const config = manager.getConfiguration();
      expect(config.compactionThreshold).toBe(100);
      expect(config.recentEventsToKeep).toBe(25);
    });
  });

  // ─── Initialization ──────────────────────────────────────────────

  describe('initialization', () => {
    it('should not be initialized by default', () => {
      expect(manager.isInitialized()).toBe(false);
    });

    it('should be initialized after calling initialize', () => {
      manager.initialize('test-api-key');
      expect(manager.isInitialized()).toBe(true);
    });
  });

  // ─── Stats ────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return null for unknown session', () => {
      expect(manager.getStats('unknown')).toBeNull();
    });

    it('should return accurate stats for a session', () => {
      addEvents(manager, 's1', 5);
      const stats = manager.getStats('s1');

      expect(stats).not.toBeNull();
      expect(stats!.sessionId).toBe('s1');
      expect(stats!.totalEvents).toBe(5);
      expect(stats!.activeEvents).toBe(5);
      expect(stats!.compactedEvents).toBe(0);
      expect(stats!.summaryCount).toBe(0);
      expect(stats!.totalTokens).toBeGreaterThan(0);
    });

    it('should reflect compacted events in stats', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 3 });
      addEvents(manager, 's1', 8);

      await manager.compact('s1');

      const stats = manager.getStats('s1');
      expect(stats!.activeEvents).toBe(3);
      expect(stats!.compactedEvents).toBe(5);
      expect(stats!.totalEvents).toBe(8); // 3 active + 5 compacted
      expect(stats!.summaryCount).toBe(1);
      expect(stats!.lastCompactionAt).toBeDefined();
    });
  });

  // ─── Summaries ────────────────────────────────────────────────────

  describe('summaries after compaction', () => {
    it('should accumulate multiple summaries across compactions', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 2, compactionThreshold: 4 });

      // First batch + compact
      addEvents(manager, 's1', 5);
      await manager.compact('s1');

      // Second batch + compact
      addEvents(manager, 's1', 5);
      await manager.compact('s1');

      const session = manager.getOrCreateSession('s1');
      expect(session.summaries).toHaveLength(2);
      expect(session.events).toHaveLength(2); // only last 2 kept
    });

    it('should have valid compression ratio in summary', async () => {
      manager.initialize('test-key');
      manager.configure({ recentEventsToKeep: 1 });
      addEvents(manager, 's1', 5, 'user_message', 'Longer content string for testing purposes');

      const result = await manager.compact('s1');

      expect(result.summary).toBeDefined();
      expect(result.summary!.compressionRatio).toBeGreaterThan(0);
      expect(result.summary!.compressionRatio).toBeLessThanOrEqual(1);
      expect(result.summary!.tokensBefore).toBeGreaterThan(0);
      expect(result.summary!.tokensAfter).toBeGreaterThan(0);
    });
  });
});
