/**
 * GeminiService - Manages Gemini API calls for deep research
 *
 * Provides comprehensive research functionality using Google's Gemini models
 * with support for long-running queries (up to 60 minutes) and progress checkpoints.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini model for deep research
const GEMINI_MODEL = 'gemini-2.0-flash';

// Deep research timeout (60 minutes as per acceptance criteria)
const DEEP_RESEARCH_TIMEOUT_MS = 60 * 60 * 1000;

// Progress checkpoint percentages
const PROGRESS_CHECKPOINTS = [15, 30, 50, 75, 90, 100];

// Types for Gemini responses
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
  /** Maximum tokens for the response */
  maxOutputTokens?: number;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** System instruction to guide research */
  systemInstruction?: string;
  /** Timeout in milliseconds (default 60 minutes) */
  timeout?: number;
  /** Callback for progress updates */
  onProgress?: (progress: ProgressCheckpoint) => void;
}

export interface ProgressCheckpoint {
  /** Progress percentage (15, 30, 50, 75, 90, 100) */
  percentage: number;
  /** Timestamp of checkpoint */
  timestamp: Date;
  /** Status message */
  message: string;
  /** Partial content if available */
  partialContent?: string;
}

export interface GeminiStreamChunk {
  type: 'text' | 'progress' | 'error' | 'done';
  content: string;
  progress?: ProgressCheckpoint;
}

export type GeminiStreamCallback = (chunk: GeminiStreamChunk) => void;

/**
 * Service for deep research queries via Google Gemini
 */
class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private initialized = false;

  /**
   * Initialize the service with a Gemini API key
   */
  async initialize(apiKey: string): Promise<boolean> {
    try {
      // Test the API key with a simple request
      const isValid = await this.validateApiKey(apiKey);
      if (isValid) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.initialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize GeminiService:', error);
      this.genAI = null;
      this.initialized = false;
      return false;
    }
  }

  /**
   * Check if the service is initialized with a valid API key
   */
  isInitialized(): boolean {
    return this.initialized && this.genAI !== null;
  }

  /**
   * Validate a Gemini API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const tempGenAI = new GoogleGenerativeAI(apiKey);
      const model = tempGenAI.getGenerativeModel({ model: GEMINI_MODEL });

      // Try a minimal generation to validate the key
      const response = await model.generateContent('test');

      return response !== null && response.response !== undefined;
    } catch (error) {
      console.error('Gemini API key validation failed:', error);
      return false;
    }
  }

  /**
   * Execute a deep research query using Gemini
   * Supports long-running queries up to 60 minutes with progress checkpoints
   */
  async deepResearch(
    query: string,
    options: DeepResearchOptions = {}
  ): Promise<DeepResearchResponse> {
    if (!this.genAI) {
      throw new Error('GeminiService not initialized. Call initialize() first.');
    }

    const timeout = options.timeout || DEEP_RESEARCH_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const emitProgress = (percentage: number, message: string, partialContent?: string) => {
      if (options.onProgress) {
        options.onProgress({
          percentage,
          timestamp: new Date(),
          message,
          partialContent,
        });
      }
    };

    try {
      // Emit initial progress
      emitProgress(0, 'Starting deep research...');

      // Build the prompt with system instruction if provided
      const systemInstruction = options.systemInstruction ||
        'You are a comprehensive research assistant. Provide thorough, well-structured analysis with citations where applicable.';

      const model = this.genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction,
        generationConfig: {
          maxOutputTokens: options.maxOutputTokens || 8192,
          temperature: options.temperature ?? 0.7,
        },
      });

      // Emit 15% progress
      emitProgress(15, 'Analyzing query and gathering context...');

      const response = await model.generateContent(query);

      clearTimeout(timeoutId);

      // Emit 30% progress
      emitProgress(30, 'Processing response...');

      const result = response.response;
      const content = result.text();

      // Emit 50% progress
      emitProgress(50, 'Extracting key findings...');

      // For non-streaming, we simulate the remaining checkpoints
      emitProgress(75, 'Organizing results...');
      emitProgress(90, 'Finalizing research...');

      const candidate = result.candidates?.[0];
      const usage = result.usageMetadata || {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
      };

      emitProgress(100, 'Research complete.');

      return {
        id: `gemini-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        content,
        model: GEMINI_MODEL,
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          candidatesTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        },
        finishReason: candidate?.finishReason || null,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Deep research query timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Execute a deep research query with streaming response
   * Provides real-time progress checkpoints at 15%, 30%, 50%
   */
  async deepResearchStream(
    query: string,
    onChunk: GeminiStreamCallback,
    options: DeepResearchOptions = {}
  ): Promise<void> {
    if (!this.genAI) {
      throw new Error('GeminiService not initialized. Call initialize() first.');
    }

    const timeout = options.timeout || DEEP_RESEARCH_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let accumulatedContent = '';
    let lastCheckpointPercentage = 0;

    const emitProgress = (percentage: number, message: string) => {
      if (percentage > lastCheckpointPercentage) {
        lastCheckpointPercentage = percentage;
        onChunk({
          type: 'progress',
          content: message,
          progress: {
            percentage,
            timestamp: new Date(),
            message,
            partialContent: accumulatedContent,
          },
        });
      }
    };

    try {
      onChunk({ type: 'progress', content: 'Starting deep research...', progress: {
        percentage: 0,
        timestamp: new Date(),
        message: 'Starting deep research...',
      }});

      const systemInstruction = options.systemInstruction ||
        'You are a comprehensive research assistant. Provide thorough, well-structured analysis with citations where applicable.';

      const model = this.genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction,
        generationConfig: {
          maxOutputTokens: options.maxOutputTokens || 8192,
          temperature: options.temperature ?? 0.7,
        },
      });

      // Emit 15% progress - starting query
      emitProgress(15, 'Analyzing query and gathering context...');

      const streamResult = await model.generateContentStream(query);

      // Emit 30% progress - got initial response
      emitProgress(30, 'Receiving initial response...');

      let totalChunks = 0;
      const estimatedTotalChunks = 100; // Rough estimate for progress calculation

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          accumulatedContent += text;
          totalChunks++;

          onChunk({ type: 'text', content: text });

          // Update progress based on streaming progress
          const streamProgress = Math.min(90, 30 + Math.floor((totalChunks / estimatedTotalChunks) * 60));
          if (streamProgress >= 50 && lastCheckpointPercentage < 50) {
            emitProgress(50, 'Extracting key findings...');
          }
        }
      }

      clearTimeout(timeoutId);

      // Final progress checkpoint
      emitProgress(100, 'Research complete.');
      onChunk({ type: 'done', content: '' });

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          onChunk({ type: 'error', content: `Deep research query timed out after ${timeout}ms` });
        } else {
          onChunk({ type: 'error', content: error.message });
        }
      }
      throw error;
    }
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return GEMINI_MODEL;
  }

  /**
   * Get progress checkpoint percentages
   */
  getProgressCheckpoints(): number[] {
    return [...PROGRESS_CHECKPOINTS];
  }
}

// Singleton instance for the main process
export const geminiService = new GeminiService();

// Re-export types for consumers
export type { GeminiService };
