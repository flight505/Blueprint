/**
 * AgentService - Manages Claude AI sessions in the main process
 *
 * Provides session creation, message streaming, and conversation management
 * using the Anthropic SDK.
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  ContentBlock,
  TextBlock,
} from '@anthropic-ai/sdk/resources/messages';
import { modelRouter, CLAUDE_MODELS, type TaskType } from './ModelRouter';

// Re-export types needed by consumers
export type { MessageParam, Message, ContentBlock };

// Types for session management
export interface AgentSession {
  id: string;
  createdAt: Date;
  messages: MessageParam[];
  model: string;
  systemPrompt?: string;
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
  /** If provided, model will be auto-selected based on task type */
  taskType?: TaskType;
  /** If true, use ModelRouter to select optimal model */
  autoSelectModel?: boolean;
}

export interface SendMessageOptions {
  maxTokens?: number;
  stream?: boolean;
  /** Override the session's model for this message */
  model?: string;
  /** If provided, auto-select model based on the message content */
  autoSelectModel?: boolean;
  /** Enable extended thinking (adaptive for Opus 4.6, enabled with budget for older models) */
  thinking?: boolean;
  /** Budget tokens for thinking on older models (must be < maxTokens, min 1024) */
  thinkingBudget?: number;
}

export type StreamCallback = (chunk: StreamChunk) => void;

/**
 * Check if a model supports adaptive thinking (Opus 4.6+)
 */
function supportsAdaptiveThinking(model: string): boolean {
  return model === CLAUDE_MODELS.OPUS;
}

/**
 * Service for managing Claude AI agent sessions
 */
export class AgentService {
  private client: Anthropic | null = null;
  private sessions: Map<string, AgentSession> = new Map();

  /**
   * Initialize the service with an API key
   */
  async initialize(apiKey: string): Promise<boolean> {
    try {
      this.client = new Anthropic({ apiKey });

      // Test the connection by listing models
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('Failed to initialize AgentService:', error);
      this.client = null;
      return false;
    }
  }

  /**
   * Check if the service is initialized with a valid API key
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Validate an API key without storing it
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new Anthropic({ apiKey });
      await testClient.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new agent session
   */
  createSession(options: CreateSessionOptions = {}): AgentSession {
    // Determine the model to use
    let model = options.model;

    // If no explicit model provided and auto-select is requested or taskType is provided
    if (!model && (options.autoSelectModel || options.taskType)) {
      const classification = modelRouter.classifyTask('', {
        taskType: options.taskType,
      });
      model = classification.model;
    }

    // Default to Sonnet if no model determined
    if (!model) {
      model = modelRouter.getDefaultModel();
    }

    const session: AgentSession = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      messages: [],
      model,
      systemPrompt: options.systemPrompt,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get an existing session by ID
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * List all active sessions
   */
  listSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Build thinking parameters based on model and options
   */
  private buildThinkingParams(
    model: string,
    options: SendMessageOptions
  ): { thinking?: { type: 'adaptive' } | { type: 'enabled'; budget_tokens: number }; maxTokens: number } {
    let maxTokens = options.maxTokens || 4096;

    if (!options.thinking) {
      return { maxTokens };
    }

    if (supportsAdaptiveThinking(model)) {
      // Opus 4.6: use adaptive thinking, no budget_tokens needed
      return {
        thinking: { type: 'adaptive' },
        maxTokens: Math.max(maxTokens, 16000), // Ensure enough room for thinking + response
      };
    }

    // Older models: use enabled with budget_tokens
    const budgetTokens = options.thinkingBudget || 10000;
    maxTokens = Math.max(maxTokens, budgetTokens + 4096); // budget must be < maxTokens
    return {
      thinking: { type: 'enabled', budget_tokens: budgetTokens },
      maxTokens,
    };
  }

  /**
   * Send a message to a session and get a response
   * Returns the full response message
   */
  async sendMessage(
    sessionId: string,
    userMessage: string,
    options: SendMessageOptions = {}
  ): Promise<Message> {
    if (!this.client) {
      throw new Error('AgentService not initialized. Call initialize() first.');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Determine the model to use for this message
    let messageModel = options.model || session.model;

    // Auto-select model based on message content if requested
    if (options.autoSelectModel && !options.model) {
      const classification = modelRouter.classifyTask(userMessage);
      messageModel = classification.model;
    }

    // Add user message to history
    session.messages.push({
      role: 'user',
      content: userMessage,
    });

    // Build thinking params
    const { thinking, maxTokens } = this.buildThinkingParams(messageModel, options);

    // Create the message
    const response = await this.client.messages.create({
      model: messageModel,
      max_tokens: maxTokens,
      system: session.systemPrompt,
      messages: session.messages,
      ...(thinking && { thinking }),
    });

    // Add assistant response to history (preserve full content blocks)
    session.messages.push({
      role: 'assistant',
      content: response.content,
    });

    return response;
  }

  /**
   * Send a message with streaming response
   * Uses the SDK's .stream() helper for reliable streaming with .finalMessage()
   */
  async sendMessageStream(
    sessionId: string,
    userMessage: string,
    onChunk: StreamCallback,
    options: SendMessageOptions = {}
  ): Promise<void> {
    if (!this.client) {
      throw new Error('AgentService not initialized. Call initialize() first.');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Determine the model to use for this message
    let messageModel = options.model || session.model;

    // Auto-select model based on message content if requested
    if (options.autoSelectModel && !options.model) {
      const classification = modelRouter.classifyTask(userMessage);
      messageModel = classification.model;
    }

    // Add user message to history
    session.messages.push({
      role: 'user',
      content: userMessage,
    });

    // Build thinking params
    const { thinking, maxTokens } = this.buildThinkingParams(messageModel, options);

    try {
      const stream = this.client.messages.stream({
        model: messageModel,
        max_tokens: maxTokens,
        system: session.systemPrompt,
        messages: session.messages,
        ...(thinking && { thinking }),
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            onChunk({ type: 'text', content: delta.text });
          } else if ('thinking' in delta) {
            onChunk({ type: 'thinking', content: delta.thinking });
          }
        } else if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'tool_use') {
            onChunk({
              type: 'tool_use',
              content: '',
              toolName: block.name,
              toolInput: block.input,
            });
          }
        } else if (event.type === 'message_stop') {
          onChunk({ type: 'done', content: '' });
        }
      }

      // Get the complete final message and preserve full content blocks in history
      const finalMessage = await stream.finalMessage();
      session.messages.push({
        role: 'assistant',
        content: finalMessage.content,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      onChunk({ type: 'error', content: errorMessage });
      throw error;
    }
  }

  /**
   * Resume a session with existing message history
   */
  resumeSession(
    sessionId: string,
    messages: MessageParam[],
    model?: string
  ): AgentSession {
    const session: AgentSession = {
      id: sessionId,
      createdAt: new Date(),
      messages: messages,
      model: model || modelRouter.getDefaultModel(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): MessageParam[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.messages] : [];
  }

  /**
   * Clear conversation history for a session
   */
  clearConversationHistory(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      return true;
    }
    return false;
  }

  /**
   * Extract text content from a message response
   */
  static extractTextContent(content: ContentBlock[]): string {
    return content
      .filter((block): block is TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }
}

// Singleton instance for the main process
export const agentService = new AgentService();
