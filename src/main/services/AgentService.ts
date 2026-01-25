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
  MessageCreateParamsStreaming,
  ContentBlock,
  TextBlock,
  RawMessageStreamEvent,
} from '@anthropic-ai/sdk/resources/messages/messages';
import { modelRouter, type TaskType } from './ModelRouter';

// Re-export types needed by consumers
export type { MessageParam, Message, ContentBlock };

// Types for session management
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
}

export type StreamCallback = (chunk: StreamChunk) => void;

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
    };

    // Add system prompt if provided
    if (options.systemPrompt) {
      // System prompts are passed separately in the API, we store it in session metadata
      (session as AgentSession & { systemPrompt?: string }).systemPrompt =
        options.systemPrompt;
    }

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

    const sessionWithSystem = session as AgentSession & {
      systemPrompt?: string;
    };

    // Create the message
    const response = await this.client.messages.create({
      model: messageModel,
      max_tokens: options.maxTokens || 4096,
      system: sessionWithSystem.systemPrompt,
      messages: session.messages,
    });

    // Add assistant response to history
    session.messages.push({
      role: 'assistant',
      content: response.content,
    });

    return response;
  }

  /**
   * Send a message with streaming response
   * Calls the callback for each chunk received
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

    const sessionWithSystem = session as AgentSession & {
      systemPrompt?: string;
    };

    const streamParams: MessageCreateParamsStreaming = {
      model: messageModel,
      max_tokens: options.maxTokens || 4096,
      system: sessionWithSystem.systemPrompt,
      messages: session.messages,
      stream: true,
    };

    // Collect full response text for history
    let fullText = '';

    try {
      const stream = await this.client.messages.create(streamParams);

      for await (const event of stream as AsyncIterable<RawMessageStreamEvent>) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            fullText += delta.text;
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

      // Add assistant response to history
      if (fullText) {
        session.messages.push({
          role: 'assistant',
          content: fullText,
        });
      }
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
