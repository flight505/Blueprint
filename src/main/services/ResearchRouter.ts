/**
 * ResearchRouter - Routes research queries to appropriate providers
 *
 * Provides automatic provider selection based on research mode and project phase.
 * - Quick mode: Routes all queries to Perplexity (fast, 30s max)
 * - Balanced mode: Uses Deep Research for Phase 1, Perplexity for others
 * - Comprehensive mode: Uses Deep Research for all major phases
 */

import { openRouterService, type ResearchResponse, type ResearchOptions, type StreamCallback } from './OpenRouterService';
import { geminiService, type DeepResearchResponse, type DeepResearchOptions, type GeminiStreamCallback, type ProgressCheckpoint } from './GeminiService';

// Research modes
export type ResearchMode = 'quick' | 'balanced' | 'comprehensive';

// Project phases that may require research
export type ProjectPhase =
  | 'market_research'
  | 'competitive_analysis'
  | 'technical_feasibility'
  | 'architecture_design'
  | 'risk_assessment'
  | 'sprint_planning'
  | 'general';

// Provider types
export type ResearchProvider = 'perplexity' | 'gemini';

// Configuration for phase routing
interface PhaseConfig {
  quick: ResearchProvider;
  balanced: ResearchProvider;
  comprehensive: ResearchProvider;
}

// Phase-specific provider routing configuration
const PHASE_ROUTING: Record<ProjectPhase, PhaseConfig> = {
  // Phase 1: Market Research - most critical, needs comprehensive research
  market_research: {
    quick: 'perplexity',
    balanced: 'gemini',     // Deep Research for thorough analysis
    comprehensive: 'gemini',
  },
  // Competitive Analysis - needs depth in comprehensive mode
  competitive_analysis: {
    quick: 'perplexity',
    balanced: 'perplexity',
    comprehensive: 'gemini',
  },
  // Technical Feasibility - benefits from comprehensive analysis
  technical_feasibility: {
    quick: 'perplexity',
    balanced: 'perplexity',
    comprehensive: 'gemini',
  },
  // Architecture Design - major phase, needs depth
  architecture_design: {
    quick: 'perplexity',
    balanced: 'perplexity',
    comprehensive: 'gemini',
  },
  // Risk Assessment - critical phase
  risk_assessment: {
    quick: 'perplexity',
    balanced: 'gemini',
    comprehensive: 'gemini',
  },
  // Sprint Planning - less research-intensive
  sprint_planning: {
    quick: 'perplexity',
    balanced: 'perplexity',
    comprehensive: 'perplexity',
  },
  // General queries - default routing
  general: {
    quick: 'perplexity',
    balanced: 'perplexity',
    comprehensive: 'gemini',
  },
};

// Result type for unified research response
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

// Options for routed research
export interface RoutedResearchOptions {
  /** Research mode: quick, balanced, or comprehensive */
  mode?: ResearchMode;
  /** Project phase for context-aware routing */
  phase?: ProjectPhase;
  /** Force a specific provider (overrides routing) */
  forceProvider?: ResearchProvider;
  /** System prompt/instruction */
  systemPrompt?: string;
  /** Max tokens for response */
  maxTokens?: number;
  /** Temperature (0-1 for Perplexity, 0-2 for Gemini) */
  temperature?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

// Stream chunk type for unified streaming
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

export type UnifiedStreamCallback = (chunk: UnifiedStreamChunk) => void;

/**
 * Service for routing research queries to appropriate providers
 */
class ResearchRouter {
  private defaultMode: ResearchMode = 'balanced';

  /**
   * Get the provider for a given mode and phase
   */
  getProvider(mode: ResearchMode, phase: ProjectPhase = 'general'): ResearchProvider {
    const phaseConfig = PHASE_ROUTING[phase] || PHASE_ROUTING.general;
    return phaseConfig[mode];
  }

  /**
   * Check if a provider is available (initialized)
   */
  isProviderAvailable(provider: ResearchProvider): boolean {
    if (provider === 'perplexity') {
      return openRouterService.isInitialized();
    } else if (provider === 'gemini') {
      return geminiService.isInitialized();
    }
    return false;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): ResearchProvider[] {
    const providers: ResearchProvider[] = [];
    if (openRouterService.isInitialized()) {
      providers.push('perplexity');
    }
    if (geminiService.isInitialized()) {
      providers.push('gemini');
    }
    return providers;
  }

  /**
   * Get fallback provider if preferred is not available
   */
  private getFallbackProvider(preferred: ResearchProvider): ResearchProvider | null {
    if (this.isProviderAvailable(preferred)) {
      return preferred;
    }

    // Try the other provider as fallback
    const fallback: ResearchProvider = preferred === 'perplexity' ? 'gemini' : 'perplexity';
    if (this.isProviderAvailable(fallback)) {
      return fallback;
    }

    return null;
  }

  /**
   * Set the default research mode
   */
  setDefaultMode(mode: ResearchMode): void {
    this.defaultMode = mode;
  }

  /**
   * Get the current default research mode
   */
  getDefaultMode(): ResearchMode {
    return this.defaultMode;
  }

  /**
   * Get routing configuration for a specific phase
   */
  getPhaseRouting(phase: ProjectPhase): PhaseConfig {
    return { ...PHASE_ROUTING[phase] };
  }

  /**
   * Execute a research query with automatic provider routing
   */
  async research(
    query: string,
    options: RoutedResearchOptions = {}
  ): Promise<UnifiedResearchResponse> {
    const mode = options.mode || this.defaultMode;
    const phase = options.phase || 'general';

    // Determine provider
    let provider = options.forceProvider || this.getProvider(mode, phase);

    // Check availability and get fallback if needed
    const actualProvider = this.getFallbackProvider(provider);
    if (!actualProvider) {
      throw new Error('No research provider available. Please configure API keys for OpenRouter or Gemini.');
    }
    provider = actualProvider;

    if (provider === 'perplexity') {
      return this.executePerplexityResearch(query, options);
    } else {
      return this.executeGeminiResearch(query, options);
    }
  }

  /**
   * Execute a research query with streaming and automatic provider routing
   */
  async researchStream(
    query: string,
    onChunk: UnifiedStreamCallback,
    options: RoutedResearchOptions = {}
  ): Promise<void> {
    const mode = options.mode || this.defaultMode;
    const phase = options.phase || 'general';

    // Determine provider
    let provider = options.forceProvider || this.getProvider(mode, phase);

    // Check availability and get fallback if needed
    const actualProvider = this.getFallbackProvider(provider);
    if (!actualProvider) {
      onChunk({
        type: 'error',
        content: 'No research provider available. Please configure API keys for OpenRouter or Gemini.',
        provider: provider,
      });
      throw new Error('No research provider available.');
    }
    provider = actualProvider;

    if (provider === 'perplexity') {
      await this.executePerplexityStream(query, onChunk, options);
    } else {
      await this.executeGeminiStream(query, onChunk, options);
    }
  }

  /**
   * Execute Perplexity research via OpenRouter
   */
  private async executePerplexityResearch(
    query: string,
    options: RoutedResearchOptions
  ): Promise<UnifiedResearchResponse> {
    const researchOptions: ResearchOptions = {
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      timeout: options.timeout,
    };

    const response: ResearchResponse = await openRouterService.research(query, researchOptions);

    return {
      id: response.id,
      content: response.content,
      provider: 'perplexity',
      model: response.model,
      citations: response.citations,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      finishReason: response.finishReason,
    };
  }

  /**
   * Execute Gemini deep research
   */
  private async executeGeminiResearch(
    query: string,
    options: RoutedResearchOptions
  ): Promise<UnifiedResearchResponse> {
    const researchOptions: DeepResearchOptions = {
      systemInstruction: options.systemPrompt,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
      timeout: options.timeout,
    };

    const response: DeepResearchResponse = await geminiService.deepResearch(query, researchOptions);

    return {
      id: response.id,
      content: response.content,
      provider: 'gemini',
      model: response.model,
      usage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.candidatesTokens,
        totalTokens: response.usage.totalTokens,
      },
      finishReason: response.finishReason,
    };
  }

  /**
   * Execute Perplexity streaming research
   */
  private async executePerplexityStream(
    query: string,
    onChunk: UnifiedStreamCallback,
    options: RoutedResearchOptions
  ): Promise<void> {
    const researchOptions: ResearchOptions = {
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      timeout: options.timeout,
    };

    const streamCallback: StreamCallback = (chunk) => {
      onChunk({
        type: chunk.type,
        content: chunk.content,
        provider: 'perplexity',
        citation: chunk.citation,
      });
    };

    await openRouterService.researchStream(query, streamCallback, researchOptions);
  }

  /**
   * Execute Gemini streaming deep research
   */
  private async executeGeminiStream(
    query: string,
    onChunk: UnifiedStreamCallback,
    options: RoutedResearchOptions
  ): Promise<void> {
    const researchOptions: DeepResearchOptions = {
      systemInstruction: options.systemPrompt,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
      timeout: options.timeout,
    };

    const streamCallback: GeminiStreamCallback = (chunk) => {
      onChunk({
        type: chunk.type,
        content: chunk.content,
        provider: 'gemini',
        progress: chunk.progress,
      });
    };

    await geminiService.deepResearchStream(query, streamCallback, researchOptions);
  }

  /**
   * Get mode descriptions for UI
   */
  getModeDescriptions(): Record<ResearchMode, string> {
    return {
      quick: 'Fast research using Perplexity. Best for quick facts and simple queries. Returns in ~30 seconds.',
      balanced: 'Uses Deep Research for Phase 1 (Market Research), Perplexity for other phases. Good balance of speed and depth.',
      comprehensive: 'Uses Deep Research for all major phases. Most thorough analysis but takes longer (up to 60 minutes per query).',
    };
  }

  /**
   * Get phase descriptions for UI
   */
  getPhaseDescriptions(): Record<ProjectPhase, string> {
    return {
      market_research: 'Market analysis, trends, and opportunity assessment',
      competitive_analysis: 'Competitor research and positioning analysis',
      technical_feasibility: 'Technology stack evaluation and implementation viability',
      architecture_design: 'System design and architectural decisions',
      risk_assessment: 'Risk identification and mitigation planning',
      sprint_planning: 'Sprint scope and task breakdown',
      general: 'General research queries',
    };
  }

  /**
   * Get all available research modes
   */
  getAvailableModes(): ResearchMode[] {
    return ['quick', 'balanced', 'comprehensive'];
  }

  /**
   * Get all project phases
   */
  getProjectPhases(): ProjectPhase[] {
    return [
      'market_research',
      'competitive_analysis',
      'technical_feasibility',
      'architecture_design',
      'risk_assessment',
      'sprint_planning',
      'general',
    ];
  }
}

// Singleton instance for the main process
export const researchRouter = new ResearchRouter();

// Re-export types for consumers
export type { ResearchRouter };
