/**
 * ModelRouter - Intelligent model selection based on task complexity
 *
 * Automatically routes requests to the appropriate Claude model:
 * - Haiku: Simple tasks (autocomplete, quick suggestions)
 * - Sonnet: Medium tasks (inline editing, code generation)
 * - Opus: Complex tasks (planning, architecture, research)
 */

// Available Claude models with their identifiers
export const CLAUDE_MODELS = {
  HAIKU: 'claude-haiku-4-5',
  SONNET: 'claude-sonnet-4-6',
  OPUS: 'claude-opus-4-6',
} as const;

export type ModelId = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];

export type TaskComplexity = 'simple' | 'medium' | 'complex';

export interface TaskClassification {
  complexity: TaskComplexity;
  model: ModelId;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
}

// Task type categories for classification
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

// Complexity rules for different task types
const TASK_TYPE_COMPLEXITY: Record<TaskType, TaskComplexity> = {
  autocomplete: 'simple',
  quick_suggestion: 'simple',
  formatting: 'simple',
  inline_edit: 'medium',
  code_generation: 'medium',
  refactoring: 'medium',
  planning: 'complex',
  architecture: 'complex',
  research: 'complex',
  analysis: 'complex',
  unknown: 'medium', // Default to medium for unknown tasks
};

// Keywords that indicate task complexity
const COMPLEXITY_KEYWORDS: Record<TaskComplexity, string[]> = {
  simple: [
    'autocomplete',
    'complete',
    'suggest',
    'format',
    'fix typo',
    'rename',
    'quick',
    'simple',
    'brief',
    'short',
    'single line',
    'one line',
  ],
  medium: [
    'edit',
    'modify',
    'change',
    'update',
    'generate',
    'create',
    'add',
    'implement',
    'write',
    'convert',
    'transform',
    'refactor',
  ],
  complex: [
    'plan',
    'design',
    'architect',
    'research',
    'analyze',
    'comprehensive',
    'detailed',
    'full',
    'complete system',
    'strategy',
    'evaluation',
    'compare',
    'review',
    'explain in depth',
    'multiple files',
    'entire codebase',
  ],
};

// Content length thresholds
const LENGTH_THRESHOLDS = {
  SHORT: 100, // Characters - typically simple tasks
  MEDIUM: 500, // Characters - typically medium tasks
  // Above MEDIUM is considered potentially complex
};

/**
 * ModelRouter service for intelligent model selection
 */
export class ModelRouter {
  private defaultModel: ModelId = CLAUDE_MODELS.SONNET;

  /**
   * Classify task complexity and select appropriate model
   */
  classifyTask(
    prompt: string,
    context?: { selectedText?: string; taskType?: TaskType }
  ): TaskClassification {
    const promptLower = prompt.toLowerCase();
    const selectedTextLength = context?.selectedText?.length || 0;
    const totalLength = prompt.length + selectedTextLength;

    // If explicit task type is provided, use it
    if (context?.taskType && context.taskType !== 'unknown') {
      const complexity = TASK_TYPE_COMPLEXITY[context.taskType];
      return {
        complexity,
        model: this.getModelForComplexity(complexity),
        confidence: 0.9,
        reasoning: `Task type '${context.taskType}' indicates ${complexity} complexity`,
      };
    }

    // Score each complexity level based on keyword matches
    const scores: Record<TaskComplexity, number> = {
      simple: 0,
      medium: 0,
      complex: 0,
    };

    // Check for keyword matches
    for (const [complexity, keywords] of Object.entries(COMPLEXITY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (promptLower.includes(keyword.toLowerCase())) {
          scores[complexity as TaskComplexity] += 1;
        }
      }
    }

    // Adjust scores based on content length
    if (totalLength <= LENGTH_THRESHOLDS.SHORT) {
      scores.simple += 2;
    } else if (totalLength <= LENGTH_THRESHOLDS.MEDIUM) {
      scores.medium += 1;
    } else {
      scores.complex += 1;
    }

    // Check for multi-step indicators
    const multiStepIndicators = [
      /step\s*\d/i,
      /first.*then/i,
      /multiple/i,
      /several/i,
      /\d+\.\s/,
    ];
    for (const pattern of multiStepIndicators) {
      if (pattern.test(prompt)) {
        scores.complex += 1;
      }
    }

    // Determine winning complexity.
    // Tie-breaking: when multiple complexity levels have equal scores, the
    // iteration order of Object.entries(scores) determines the winner (the
    // last-seen level with the highest score wins due to strict `>`). In
    // practice the insertion order is simple → medium → complex, so ties
    // resolve to the *highest* complexity. To keep behaviour predictable we
    // explicitly fall back to 'medium' (the safest default) on ties.
    let maxScore = -1;
    let winningComplexity: TaskComplexity = 'medium';
    let isTied = false;

    for (const [complexity, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        winningComplexity = complexity as TaskComplexity;
        isTied = false;
      } else if (score === maxScore) {
        isTied = true;
      }
    }

    // On a tie, prefer 'medium' — it maps to Sonnet which is the safest
    // default: capable enough for most tasks without the latency/cost of
    // Opus or the reduced quality of Haiku.
    if (isTied) {
      winningComplexity = 'medium';
    }

    // Calculate confidence based on score margin
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const scoreDiff =
      sortedScores.length > 1 ? sortedScores[0] - sortedScores[1] : 0;
    const confidence = Math.min(0.5 + scoreDiff * 0.1, 0.95);

    return {
      complexity: winningComplexity,
      model: this.getModelForComplexity(winningComplexity),
      confidence,
      reasoning: this.generateReasoning(
        winningComplexity,
        scores,
        totalLength
      ),
    };
  }

  /**
   * Get the model ID for a given complexity level
   */
  getModelForComplexity(complexity: TaskComplexity): ModelId {
    switch (complexity) {
      case 'simple':
        return CLAUDE_MODELS.HAIKU;
      case 'medium':
        return CLAUDE_MODELS.SONNET;
      case 'complex':
        return CLAUDE_MODELS.OPUS;
      default:
        return this.defaultModel;
    }
  }

  /**
   * Get model by name (for user override)
   */
  getModelByName(name: 'haiku' | 'sonnet' | 'opus'): ModelId {
    switch (name) {
      case 'haiku':
        return CLAUDE_MODELS.HAIKU;
      case 'sonnet':
        return CLAUDE_MODELS.SONNET;
      case 'opus':
        return CLAUDE_MODELS.OPUS;
      default:
        return this.defaultModel;
    }
  }

  /**
   * Get all available models
   */
  getAvailableModels(): Array<{
    id: ModelId;
    name: string;
    complexity: TaskComplexity;
    description: string;
  }> {
    return [
      {
        id: CLAUDE_MODELS.HAIKU,
        name: 'Haiku',
        complexity: 'simple',
        description: 'Fast responses for simple tasks',
      },
      {
        id: CLAUDE_MODELS.SONNET,
        name: 'Sonnet',
        complexity: 'medium',
        description: 'Balanced for most tasks',
      },
      {
        id: CLAUDE_MODELS.OPUS,
        name: 'Opus',
        complexity: 'complex',
        description: 'Deep analysis and complex tasks',
      },
    ];
  }

  /**
   * Set the default model
   */
  setDefaultModel(model: ModelId): void {
    this.defaultModel = model;
  }

  /**
   * Get the default model
   */
  getDefaultModel(): ModelId {
    return this.defaultModel;
  }

  /**
   * Generate human-readable reasoning for classification
   */
  private generateReasoning(
    complexity: TaskComplexity,
    scores: Record<TaskComplexity, number>,
    totalLength: number
  ): string {
    const parts: string[] = [];

    if (totalLength <= LENGTH_THRESHOLDS.SHORT) {
      parts.push('short prompt');
    } else if (totalLength <= LENGTH_THRESHOLDS.MEDIUM) {
      parts.push('moderate length');
    } else {
      parts.push('lengthy content');
    }

    if (scores[complexity] > 0) {
      parts.push(`matched ${complexity} keywords`);
    }

    return `Selected ${complexity} complexity based on: ${parts.join(', ')}`;
  }
}

// Singleton instance for the main process
export const modelRouter = new ModelRouter();
