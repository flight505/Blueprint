export type ContextEventType = 'user_message' | 'assistant_message' | 'tool_use' | 'file_read' | 'decision' | 'other';

export interface ContextEvent {
  id: string;
  timestamp: Date;
  type: ContextEventType;
  content: string;
  metadata?: Record<string, unknown>;
  tokenEstimate: number;
}

export interface CompactionSummary {
  id: string;
  createdAt: Date;
  eventRange: {
    startId: string;
    endId: string;
    startTimestamp: Date;
    endTimestamp: Date;
    eventCount: number;
  };
  summary: string;
  tokensBefore: number;
  tokensAfter: number;
  compressionRatio: number;
}

export interface CompactionResult {
  success: boolean;
  summary?: CompactionSummary;
  tokensSaved: number;
  error?: string;
}

export interface ContextStats {
  sessionId: string;
  totalEvents: number;
  activeEvents: number;
  compactedEvents: number;
  summaryCount: number;
  totalTokens: number;
  lastCompactionAt?: Date;
}

export interface ContextConfiguration {
  compactionThreshold: number;
  recentEventsToKeep: number;
}
