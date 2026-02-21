export type TaskComplexity = 'simple' | 'medium' | 'complex';
export type ModelId = string;
export type TaskType =
  | 'autocomplete'
  | 'quick_suggestion'
  | 'formatting'
  | 'inline_edit'
  | 'code_generation'
  | 'refactoring'
  | 'planning'
  | 'architecture'
  | 'research'
  | 'analysis'
  | 'unknown';

export interface TaskClassification {
  complexity: TaskComplexity;
  model: ModelId;
  confidence: number;
  reasoning: string;
}

export interface ModelInfo {
  id: ModelId;
  name: string;
  complexity: TaskComplexity;
  description: string;
}

export interface ClaudeModels {
  HAIKU: string;
  SONNET: string;
  OPUS: string;
}
