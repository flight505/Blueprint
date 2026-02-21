/**
 * ContextManager - Manages session context with automatic compaction
 *
 * Tracks session events and automatically compacts older context using Haiku
 * to generate concise summaries while preserving recent context in full.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, TextBlock } from '@anthropic-ai/sdk/resources/messages';
import { CLAUDE_MODELS } from './ModelRouter';
import type {
  ContextEvent,
  CompactionSummary,
  CompactionResult,
  ContextStats,
} from '../../shared/types';

// Re-export for consumers
export type {
  ContextEvent,
  CompactionSummary,
  CompactionResult,
  ContextStats,
} from '../../shared/types';

// Configuration constants
const COMPACTION_THRESHOLD = 20; // Events before triggering compaction
const RECENT_EVENTS_TO_KEEP = 10; // Always keep last N events in full
const SUMMARY_MAX_TOKENS = 1024; // Max tokens for summary generation

// SessionContext is service-specific (not in shared types)
export interface SessionContext {
  sessionId: string;
  events: ContextEvent[];
  summaries: CompactionSummary[];
  totalTokens: number;
  lastCompactionAt?: Date;
}

/**
 * Estimate tokens from text content (rough approximation: ~4 chars per token for English)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate a unique ID for events
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Service for managing context with automatic compaction
 */
export class ContextManager {
  private client: Anthropic | null = null;
  private sessions: Map<string, SessionContext> = new Map();
  private compactionThreshold: number = COMPACTION_THRESHOLD;
  private recentEventsToKeep: number = RECENT_EVENTS_TO_KEEP;

  /**
   * Initialize with an Anthropic client instance
   */
  initialize(apiKey: string): void {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Check if the manager is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get or create a session context
   */
  getOrCreateSession(sessionId: string): SessionContext {
    let context = this.sessions.get(sessionId);
    if (!context) {
      context = {
        sessionId,
        events: [],
        summaries: [],
        totalTokens: 0,
      };
      this.sessions.set(sessionId, context);
    }
    return context;
  }

  /**
   * Add an event to the session context
   */
  addEvent(
    sessionId: string,
    type: ContextEvent['type'],
    content: string,
    metadata?: Record<string, unknown>
  ): ContextEvent {
    const context = this.getOrCreateSession(sessionId);
    const tokenEstimate = estimateTokens(content);

    const event: ContextEvent = {
      id: generateEventId(),
      timestamp: new Date(),
      type,
      content,
      metadata,
      tokenEstimate,
    };

    context.events.push(event);
    context.totalTokens += tokenEstimate;

    return event;
  }

  /**
   * Get all events for a session
   */
  getEvents(sessionId: string): ContextEvent[] {
    const context = this.sessions.get(sessionId);
    return context ? [...context.events] : [];
  }

  /**
   * Get context statistics for a session
   */
  getStats(sessionId: string): ContextStats | null {
    const context = this.sessions.get(sessionId);
    if (!context) return null;

    return {
      sessionId,
      totalEvents: context.events.length + context.summaries.reduce(
        (sum, s) => sum + s.eventRange.eventCount, 0
      ),
      activeEvents: context.events.length,
      compactedEvents: context.summaries.reduce(
        (sum, s) => sum + s.eventRange.eventCount, 0
      ),
      summaryCount: context.summaries.length,
      totalTokens: context.totalTokens,
      lastCompactionAt: context.lastCompactionAt,
    };
  }

  /**
   * Check if compaction should be triggered
   */
  shouldCompact(sessionId: string): boolean {
    const context = this.sessions.get(sessionId);
    if (!context) return false;
    return context.events.length > this.compactionThreshold;
  }

  /**
   * Compact older context using Haiku for summarization
   */
  async compact(sessionId: string): Promise<CompactionResult> {
    if (!this.client) {
      return {
        success: false,
        tokensSaved: 0,
        error: 'ContextManager not initialized',
      };
    }

    const context = this.sessions.get(sessionId);
    if (!context) {
      return {
        success: false,
        tokensSaved: 0,
        error: `Session not found: ${sessionId}`,
      };
    }

    // Check if compaction is needed
    if (context.events.length <= this.recentEventsToKeep) {
      return {
        success: true,
        tokensSaved: 0,
      };
    }

    // Split events: older events to compact, recent events to keep
    const eventsToCompact = context.events.slice(
      0,
      context.events.length - this.recentEventsToKeep
    );
    const eventsToKeep = context.events.slice(
      context.events.length - this.recentEventsToKeep
    );

    if (eventsToCompact.length === 0) {
      return {
        success: true,
        tokensSaved: 0,
      };
    }

    // Calculate tokens before compaction
    const tokensBefore = eventsToCompact.reduce(
      (sum, e) => sum + e.tokenEstimate, 0
    );

    // Prepare content for summarization
    const contextToSummarize = eventsToCompact.map(event => {
      const prefix = this.getEventTypePrefix(event.type);
      return `${prefix}: ${event.content}`;
    }).join('\n\n');

    // Generate summary using Haiku
    try {
      const messages: MessageParam[] = [
        {
          role: 'user',
          content: `Please create a concise summary of the following conversation context. Focus on:
- Key decisions made
- Important information shared
- Tasks completed or pending
- Any critical context that would be needed to continue the conversation

Keep the summary brief but comprehensive. Do not include unnecessary details.

Context to summarize:
${contextToSummarize}`,
        },
      ];

      const response = await this.client.messages.create({
        model: CLAUDE_MODELS.HAIKU,
        max_tokens: SUMMARY_MAX_TOKENS,
        messages,
      });

      // Extract text from response
      const summaryText = response.content
        .filter((block): block is TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('');

      const tokensAfter = estimateTokens(summaryText);
      const tokensSaved = tokensBefore - tokensAfter;

      // Create the compaction summary
      const compactionSummary: CompactionSummary = {
        id: `sum_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date(),
        eventRange: {
          startId: eventsToCompact[0].id,
          endId: eventsToCompact[eventsToCompact.length - 1].id,
          startTimestamp: eventsToCompact[0].timestamp,
          endTimestamp: eventsToCompact[eventsToCompact.length - 1].timestamp,
          eventCount: eventsToCompact.length,
        },
        summary: summaryText,
        tokensBefore,
        tokensAfter,
        compressionRatio: tokensBefore > 0 ? tokensAfter / tokensBefore : 1,
      };

      // Update context: replace compacted events with summary reference
      context.summaries.push(compactionSummary);
      context.events = eventsToKeep;
      context.totalTokens = context.totalTokens - tokensBefore + tokensAfter;
      context.lastCompactionAt = new Date();

      return {
        success: true,
        summary: compactionSummary,
        tokensSaved,
      };
    } catch (error) {
      return {
        success: false,
        tokensSaved: 0,
        error: error instanceof Error ? error.message : 'Unknown error during compaction',
      };
    }
  }

  /**
   * Get full context for a session including summaries
   */
  getFullContext(sessionId: string): string {
    const context = this.sessions.get(sessionId);
    if (!context) return '';

    const parts: string[] = [];

    // Add summaries first (older context)
    if (context.summaries.length > 0) {
      parts.push('=== Previous Context Summary ===');
      for (const summary of context.summaries) {
        parts.push(`[Summarized ${summary.eventRange.eventCount} events from ${summary.eventRange.startTimestamp.toISOString()} to ${summary.eventRange.endTimestamp.toISOString()}]`);
        parts.push(summary.summary);
        parts.push('');
      }
      parts.push('=== Recent Context ===');
    }

    // Add recent events
    for (const event of context.events) {
      const prefix = this.getEventTypePrefix(event.type);
      parts.push(`${prefix}: ${event.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Convert context to MessageParam format for the API
   */
  getContextAsMessages(sessionId: string): MessageParam[] {
    const context = this.sessions.get(sessionId);
    if (!context) return [];

    const messages: MessageParam[] = [];

    // Add summaries as a system context message
    if (context.summaries.length > 0) {
      const summaryText = context.summaries.map(s => s.summary).join('\n\n');
      messages.push({
        role: 'user',
        content: `[Context summary from earlier in this conversation]\n${summaryText}`,
      });
      messages.push({
        role: 'assistant',
        content: 'I understand the context from our earlier conversation. How can I help you now?',
      });
    }

    // Add recent events as messages
    for (const event of context.events) {
      if (event.type === 'user_message') {
        messages.push({ role: 'user', content: event.content });
      } else if (event.type === 'assistant_message') {
        messages.push({ role: 'assistant', content: event.content });
      }
      // Other event types are embedded in the context but not as separate messages
    }

    return messages;
  }

  /**
   * Clear all context for a session
   */
  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.sessions.clear();
  }

  /**
   * Configure compaction thresholds
   */
  configure(options: {
    compactionThreshold?: number;
    recentEventsToKeep?: number;
  }): void {
    if (options.compactionThreshold !== undefined) {
      this.compactionThreshold = options.compactionThreshold;
    }
    if (options.recentEventsToKeep !== undefined) {
      this.recentEventsToKeep = options.recentEventsToKeep;
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): {
    compactionThreshold: number;
    recentEventsToKeep: number;
  } {
    return {
      compactionThreshold: this.compactionThreshold,
      recentEventsToKeep: this.recentEventsToKeep,
    };
  }

  /**
   * Get a human-readable prefix for event types
   */
  private getEventTypePrefix(type: ContextEvent['type']): string {
    switch (type) {
      case 'user_message':
        return 'User';
      case 'assistant_message':
        return 'Assistant';
      case 'tool_use':
        return 'Tool';
      case 'file_read':
        return 'File';
      case 'decision':
        return 'Decision';
      case 'other':
      default:
        return 'Event';
    }
  }
}

// Singleton instance for the main process
export const contextManager = new ContextManager();
