export interface AgentSession {
  id: string;
  createdAt: Date;
  messages: MessageParam[];
  model: string;
}

export interface StreamChunk {
  type: 'text' | 'thinking' | 'tool_use' | 'error' | 'done';
  content: string;
  toolName?: string;
  toolInput?: unknown;
}

export interface CreateSessionOptions {
  model?: string;
  systemPrompt?: string;
}

export interface SendMessageOptions {
  maxTokens?: number;
  stream?: boolean;
}

export interface SendMessageParsedOptions {
  maxTokens?: number;
  model?: string;
  autoSelectModel?: boolean;
  systemPrompt?: string;
}

export type StructuredOutputSchemaName =
  | 'confidence_analysis'
  | 'citation_extraction'
  | 'phase_plan'
  | 'task_classification'
  | 'document_summary'
  | 'research_synthesis';

export interface ParsedMessageResult<T = unknown> {
  parsed: T;
  rawText: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface MessageParam {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface MessageResponse {
  id: string;
  type: string;
  role: string;
  content: ContentBlock[];
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
