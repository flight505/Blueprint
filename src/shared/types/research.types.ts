export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
  domain?: string;
}

export interface ResearchResponse {
  id: string;
  content: string;
  citations: Citation[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finishReason: string | null;
}

export interface ResearchOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  timeout?: number;
}

export interface OpenRouterStreamChunk {
  type: 'text' | 'citation' | 'error' | 'done';
  content: string;
  citation?: Citation;
}

export interface DeepResearchResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
  finishReason: string | null;
}

export interface DeepResearchOptions {
  maxOutputTokens?: number;
  temperature?: number;
  systemInstruction?: string;
  timeout?: number;
}

export interface ProgressCheckpoint {
  percentage: number;
  timestamp: Date;
  message: string;
  partialContent?: string;
}

export interface GeminiStreamChunk {
  type: 'text' | 'progress' | 'error' | 'done';
  content: string;
  progress?: ProgressCheckpoint;
}

export type ResearchMode = 'quick' | 'balanced' | 'comprehensive';
export type ProjectPhase =
  | 'market_research'
  | 'competitive_analysis'
  | 'technical_feasibility'
  | 'architecture_design'
  | 'risk_assessment'
  | 'sprint_planning'
  | 'general';
export type ResearchProvider = 'perplexity' | 'gemini';

export interface PhaseConfig {
  quick: ResearchProvider;
  balanced: ResearchProvider;
  comprehensive: ResearchProvider;
}

export interface UnifiedResearchResponse {
  id: string;
  content: string;
  provider: ResearchProvider;
  model: string;
  citations?: Array<{
    url: string;
    title?: string;
    snippet?: string;
    domain?: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string | null;
  progress?: ProgressCheckpoint;
}

export interface RoutedResearchOptions {
  mode?: ResearchMode;
  phase?: ProjectPhase;
  forceProvider?: ResearchProvider;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface UnifiedStreamChunk {
  type: 'text' | 'citation' | 'progress' | 'error' | 'done';
  content: string;
  provider: ResearchProvider;
  citation?: {
    url: string;
    title?: string;
    snippet?: string;
    domain?: string;
  };
  progress?: ProgressCheckpoint;
}
