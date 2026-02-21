/**
 * OpenRouterService - Manages Perplexity API calls via OpenRouter
 *
 * Provides research query functionality using Perplexity's Sonar Pro model
 * through the OpenRouter API gateway.
 */

import type {
  Citation,
  ResearchResponse,
  ResearchOptions,
  OpenRouterStreamChunk,
} from '../../shared/types';

// Re-export for consumers
export type { Citation, ResearchResponse, ResearchOptions, OpenRouterStreamChunk } from '../../shared/types';

// Local alias for backward compatibility
export type StreamChunk = OpenRouterStreamChunk;
export type StreamCallback = (chunk: StreamChunk) => void;

// OpenRouter API base URL
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

// Perplexity model via OpenRouter
const PERPLEXITY_MODEL = 'perplexity/sonar-pro';

// Request timeout (30 seconds as per acceptance criteria)
const REQUEST_TIMEOUT_MS = 30000;

// OpenRouter API response types
interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string | null;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterStreamDelta {
  role?: string;
  content?: string;
}

interface OpenRouterStreamChoice {
  index: number;
  delta: OpenRouterStreamDelta;
  finish_reason: string | null;
}

interface OpenRouterRawStreamChunk {
  id: string;
  model: string;
  choices: OpenRouterStreamChoice[];
}

/**
 * Service for research queries via OpenRouter/Perplexity
 */
class OpenRouterService {
  private apiKey: string | null = null;
  private initialized = false;

  /**
   * Initialize the service with an OpenRouter API key
   */
  async initialize(apiKey: string): Promise<boolean> {
    try {
      // Test the API key with a simple request
      const isValid = await this.validateApiKey(apiKey);
      if (isValid) {
        this.apiKey = apiKey;
        this.initialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize OpenRouterService:', error);
      this.apiKey = null;
      this.initialized = false;
      return false;
    }
  }

  /**
   * Check if the service is initialized with a valid API key
   */
  isInitialized(): boolean {
    return this.initialized && this.apiKey !== null;
  }

  /**
   * Validate an OpenRouter API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      // OpenRouter provides a key validation endpoint
      const response = await fetch(`${OPENROUTER_API_URL}/auth/key`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return true;
      }

      // If key endpoint doesn't exist, try a minimal models request
      const modelsResponse = await fetch(`${OPENROUTER_API_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      return modelsResponse.ok;
    } catch {
      return false;
    }
  }

  /**
   * Execute a research query using Perplexity via OpenRouter
   * Returns within 30 seconds as per acceptance criteria
   */
  async research(
    query: string,
    options: ResearchOptions = {}
  ): Promise<ResearchResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouterService not initialized. Call initialize() first.');
    }

    const timeout = options.timeout || REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://blueprint.app', // Required by OpenRouter
          'X-Title': 'Blueprint', // App name for OpenRouter dashboard
        },
        body: JSON.stringify({
          model: PERPLEXITY_MODEL,
          messages: [
            ...(options.systemPrompt
              ? [{ role: 'system', content: options.systemPrompt }]
              : []),
            { role: 'user', content: query },
          ],
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as OpenRouterResponse;
      const content = data.choices[0]?.message?.content || '';
      const citations = this.extractCitations(content);

      return {
        id: data.id,
        content,
        citations,
        model: data.model,
        usage: data.usage,
        finishReason: data.choices[0]?.finish_reason || null,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Research query timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Execute a research query with streaming response
   */
  async researchStream(
    query: string,
    onChunk: StreamCallback,
    options: ResearchOptions = {}
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error('OpenRouterService not initialized. Call initialize() first.');
    }

    const timeout = options.timeout || REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://blueprint.app',
          'X-Title': 'Blueprint',
        },
        body: JSON.stringify({
          model: PERPLEXITY_MODEL,
          messages: [
            ...(options.systemPrompt
              ? [{ role: 'system', content: options.systemPrompt }]
              : []),
            { role: 'user', content: query },
          ],
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.7,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Extract citations from the full content
                const citations = this.extractCitations(fullContent);
                for (const citation of citations) {
                  onChunk({ type: 'citation', content: '', citation });
                }
                onChunk({ type: 'done', content: '' });
                return;
              }

              try {
                const parsed = JSON.parse(data) as OpenRouterRawStreamChunk;
                const content = parsed.choices[0]?.delta?.content || '';
                if (content) {
                  fullContent += content;
                  onChunk({ type: 'text', content });
                }
              } catch {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          onChunk({ type: 'error', content: `Research query timed out after ${timeout}ms` });
        } else {
          onChunk({ type: 'error', content: error.message });
        }
      }
      throw error;
    }
  }

  /**
   * Extract citations from Perplexity response content
   * Perplexity includes citations as inline references like [1], [2] and lists sources at the end
   */
  private extractCitations(content: string): Citation[] {
    const citations: Citation[] = [];

    // Look for URLs in the content (common in Perplexity responses)
    const urlRegex = /https?:\/\/[^\s\])"'<>]+/g;
    const urls = content.match(urlRegex) || [];

    // Also look for citation-style references like [Source: title](url)
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let match;
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const title = match[1];
      const url = match[2];
      if (!citations.some((c) => c.url === url)) {
        citations.push({
          url,
          title,
          domain: this.extractDomain(url),
        });
      }
    }

    // Add any remaining URLs that weren't in markdown format
    for (const url of urls) {
      if (!citations.some((c) => c.url === url)) {
        citations.push({
          url,
          domain: this.extractDomain(url),
        });
      }
    }

    // Look for numbered citation list at the end (common Perplexity format)
    // e.g., "Sources:\n1. Title - url\n2. Title - url"
    const sourcesMatch = content.match(/(?:Sources|References|Citations):?\s*\n([\s\S]*?)$/i);
    if (sourcesMatch) {
      const sourcesSection = sourcesMatch[1];
      const numberedSourceRegex = /^\s*\d+\.\s*(?:\[)?([^\]\n]+?)(?:\])?\s*[-–—]?\s*(https?:\/\/[^\s\n]+)/gm;
      let sourceMatch;
      while ((sourceMatch = numberedSourceRegex.exec(sourcesSection)) !== null) {
        const title = sourceMatch[1].trim();
        const url = sourceMatch[2];
        if (!citations.some((c) => c.url === url)) {
          citations.push({
            url,
            title,
            domain: this.extractDomain(url),
          });
        }
      }
    }

    return citations;
  }

  /**
   * Extract domain from URL for display
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return PERPLEXITY_MODEL;
  }
}

// Singleton instance for the main process
export const openRouterService = new OpenRouterService();

// Re-export types for consumers
export type { OpenRouterService };
