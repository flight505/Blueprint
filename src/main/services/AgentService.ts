/**
 * AgentService - Manages Claude AI sessions in the main process
 *
 * Provides session creation, message streaming, and conversation management
 * using the Anthropic SDK. Supports structured outputs via messages.parse()
 * with Zod schemas for validated, typed responses.
 *
 * Server-side compaction (beta): When enabled, long conversations are
 * automatically compacted by the API to stay within context limits.
 * Compaction blocks are round-tripped transparently in subsequent requests.
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  ContentBlock,
  TextBlock,
} from '@anthropic-ai/sdk/resources/messages';
import type {
  BetaMessage,
  BetaMessageParam,
  BetaContentBlock,
  BetaCompactionBlock,
  BetaCompactionBlockParam,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ParsedMessage } from '@anthropic-ai/sdk/lib/parser';
import type { ZodType, infer as zodInfer } from 'zod';
import { modelRouter, CLAUDE_MODELS, type TaskType } from './ModelRouter';
import { contextManager } from './ContextManager';

// Re-export types needed by consumers
export type { MessageParam, Message, ContentBlock };
export type { BetaMessage, BetaMessageParam, BetaCompactionBlock };

/** Beta header required for the context management API */
const CONTEXT_MANAGEMENT_BETA = 'context-management-2025-06-27' as const;

/**
 * Configuration for server-side compaction.
 * When enabled, the API will automatically compact long conversations.
 */
export interface CompactionConfig {
  /** Enable server-side compaction via the beta API */
  enabled: boolean;
  /** Input token threshold that triggers compaction (default: 100000) */
  triggerTokens?: number;
  /** Additional instructions for the summarization model during compaction */
  instructions?: string;
  /**
   * If true, the API pauses after compaction and returns the compaction block
   * before generating the assistant response. The caller must re-send the
   * request with the compaction block to get the actual response.
   * Default: true (to give callers control over compaction events).
   */
  pauseAfterCompaction?: boolean;
}

/**
 * Result from sendMessage / sendMessageStream when server-side compaction occurs.
 * When stop_reason is 'compaction', the response contains compaction blocks
 * instead of a normal assistant reply.
 */
export interface CompactionEvent {
  /** Indicates this is a compaction event, not a normal response */
  type: 'compaction';
  /** The compaction blocks to round-trip in the next request */
  compactionBlocks: BetaCompactionBlock[];
  /** The full BetaMessage response (for inspection / logging) */
  rawResponse: BetaMessage;
}

// Types for session management
export interface AgentSession {
  id: string;
  createdAt: Date;
  messages: MessageParam[];
  model: string;
  systemPrompt?: string;
  /** When true, message operations are automatically tracked in ContextManager */
  trackContext?: boolean;
  /** Server-side compaction configuration for this session */
  compaction?: CompactionConfig;
  /**
   * Beta message history used when compaction is enabled.
   * This is the authoritative message history for compaction sessions,
   * containing BetaCompactionBlockParam blocks from prior compaction events.
   */
  betaMessages?: BetaMessageParam[];
}

export interface StreamChunk {
  type: 'text' | 'thinking' | 'tool_use' | 'error' | 'done' | 'compaction';
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
  /** If true, automatically sync messages to ContextManager events */
  trackContext?: boolean;
  /** Enable server-side compaction for this session (beta API) */
  compaction?: CompactionConfig;
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

export interface SendMessageParsedOptions extends Omit<SendMessageOptions, 'stream'> {
  /** System prompt override for the parsed request (does not modify session) */
  systemPrompt?: string;
}

/**
 * Result from a parsed structured output request
 */
export interface ParsedMessageResult<T> {
  /** The parsed and validated output object */
  parsed: T;
  /** The raw text response from the model */
  rawText: string;
  /** Model used for the request */
  model: string;
  /** Token usage */
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Models that support adaptive thinking (Opus 4.6, Sonnet 4.6).
 * Haiku 4.5 and older models require type: 'enabled' with budget_tokens.
 */
const ADAPTIVE_THINKING_MODELS: Set<string> = new Set([CLAUDE_MODELS.OPUS, CLAUDE_MODELS.SONNET]);

function supportsAdaptiveThinking(model: string): boolean {
  return ADAPTIVE_THINKING_MODELS.has(model);
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
      trackContext: options.trackContext,
      compaction: options.compaction,
      betaMessages: options.compaction?.enabled ? [] : undefined,
    };

    this.sessions.set(session.id, session);

    // Initialize ContextManager session if tracking is enabled
    if (session.trackContext) {
      contextManager.getOrCreateSession(session.id);
    }

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
   * Bridge a message event to ContextManager if tracking is enabled for the session.
   * Extracts text content from ContentBlock[] for assistant messages.
   */
  private trackContextEvent(
    session: AgentSession,
    type: 'user_message' | 'assistant_message',
    content: string | ContentBlock[]
  ): void {
    if (!session.trackContext) return;

    const text = typeof content === 'string'
      ? content
      : AgentService.extractTextContent(content);

    contextManager.addEvent(session.id, type, text);
  }

  /**
   * Build the context_management config for beta API calls.
   */
  private buildCompactionParams(config: CompactionConfig) {
    return {
      edits: [
        {
          type: 'compact_20260112' as const,
          trigger: {
            type: 'input_tokens' as const,
            value: config.triggerTokens ?? 100000,
          },
          ...(config.instructions && { instructions: config.instructions }),
          pause_after_compaction: config.pauseAfterCompaction ?? true,
        },
      ],
    };
  }

  /**
   * Extract BetaCompactionBlock items from a BetaMessage response content.
   */
  static extractCompactionBlocks(content: BetaContentBlock[]): BetaCompactionBlock[] {
    return content.filter(
      (block): block is BetaCompactionBlock => block.type === 'compaction'
    );
  }

  /**
   * Inject compaction blocks from a compaction event into the session's beta
   * message history as an assistant turn containing the compaction block(s).
   * This enables round-tripping: subsequent requests include the compacted context.
   */
  private injectCompactionBlocks(
    session: AgentSession,
    compactionBlocks: BetaCompactionBlock[]
  ): void {
    if (!session.betaMessages) return;

    const blockParams: BetaCompactionBlockParam[] = compactionBlocks.map((b) => ({
      type: 'compaction' as const,
      content: b.content,
    }));

    // Add as an assistant turn containing the compaction summary
    session.betaMessages.push({
      role: 'assistant',
      content: blockParams,
    });
  }

  /**
   * Extract text from BetaContentBlock array (similar to extractTextContent
   * but for beta content blocks).
   */
  static extractBetaTextContent(content: BetaContentBlock[]): string {
    return content
      .filter((block): block is BetaContentBlock & { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }

  /**
   * Send a message to a session and get a response.
   * Returns the full response message.
   *
   * When the session has compaction enabled, uses the beta API. If the API
   * triggers compaction (stop_reason === 'compaction'), the compaction blocks
   * are stored in the session for round-tripping and a CompactionEvent is
   * thrown/returned via the returned union type.
   */
  async sendMessage(
    sessionId: string,
    userMessage: string,
    options: SendMessageOptions = {}
  ): Promise<Message | CompactionEvent> {
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

    // Build thinking params
    const { thinking, maxTokens } = this.buildThinkingParams(messageModel, options);

    // ----- Compaction path: use beta API -----
    if (session.compaction?.enabled) {
      // Add user message to beta history
      session.betaMessages!.push({
        role: 'user',
        content: userMessage,
      });

      // Also keep the regular messages array in sync for non-compaction consumers
      session.messages.push({
        role: 'user',
        content: userMessage,
      });

      try {
        const response = await this.client.beta.messages.create({
          model: messageModel,
          max_tokens: maxTokens,
          system: session.systemPrompt,
          messages: session.betaMessages!,
          betas: [CONTEXT_MANAGEMENT_BETA],
          context_management: this.buildCompactionParams(session.compaction),
          ...(thinking && { thinking }),
          stream: false,
        });

        // Check if this is a compaction event
        if (response.stop_reason === 'compaction') {
          const compactionBlocks = AgentService.extractCompactionBlocks(response.content);
          this.injectCompactionBlocks(session, compactionBlocks);

          return {
            type: 'compaction',
            compactionBlocks,
            rawResponse: response,
          };
        }

        // Normal response — store in both histories
        session.betaMessages!.push({
          role: 'assistant',
          content: response.content,
        });
        session.messages.push({
          role: 'assistant',
          content: response.content as unknown as ContentBlock[],
        });

        // Bridge to ContextManager
        this.trackContextEvent(session, 'user_message', userMessage);
        this.trackContextEvent(
          session,
          'assistant_message',
          response.content as unknown as ContentBlock[]
        );

        // Return as Message-compatible (BetaMessage is a superset)
        return response as unknown as Message;
      } catch (error) {
        // Roll back user message on failure
        session.betaMessages!.pop();
        session.messages.pop();
        throw error;
      }
    }

    // ----- Standard path (no compaction) -----
    // Add user message to history
    session.messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
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

      // Bridge to ContextManager
      this.trackContextEvent(session, 'user_message', userMessage);
      this.trackContextEvent(session, 'assistant_message', response.content);

      return response;
    } catch (error) {
      // Roll back user message on API failure to keep history consistent
      session.messages.pop();
      throw error;
    }
  }

  /**
   * Send a message with streaming response.
   * Uses the SDK's .stream() helper for reliable streaming with .finalMessage().
   *
   * When compaction is enabled for the session, uses the beta streaming API.
   * If the API triggers compaction, a 'compaction' StreamChunk is emitted
   * and a CompactionEvent is returned (instead of void).
   */
  async sendMessageStream(
    sessionId: string,
    userMessage: string,
    onChunk: StreamCallback,
    options: SendMessageOptions = {}
  ): Promise<void | CompactionEvent> {
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

    // Build thinking params
    const { thinking, maxTokens } = this.buildThinkingParams(messageModel, options);

    // ----- Compaction streaming path: use beta API -----
    if (session.compaction?.enabled) {
      session.betaMessages!.push({
        role: 'user',
        content: userMessage,
      });
      session.messages.push({
        role: 'user',
        content: userMessage,
      });

      try {
        const stream = this.client.beta.messages.stream({
          model: messageModel,
          max_tokens: maxTokens,
          system: session.systemPrompt,
          messages: session.betaMessages!,
          betas: [CONTEXT_MANAGEMENT_BETA],
          context_management: this.buildCompactionParams(session.compaction),
          ...(thinking && { thinking }),
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if ('text' in delta) {
              onChunk({ type: 'text', content: delta.text });
            } else if ('thinking' in delta) {
              onChunk({ type: 'thinking', content: (delta as { thinking: string }).thinking });
            } else if (delta.type === 'compaction_delta') {
              onChunk({
                type: 'compaction',
                content: (delta as { content: string | null }).content ?? '',
              });
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

        const finalMessage = await stream.finalMessage();

        // Check if compaction occurred
        if (finalMessage.stop_reason === 'compaction') {
          const compactionBlocks = AgentService.extractCompactionBlocks(
            finalMessage.content as unknown as BetaContentBlock[]
          );
          this.injectCompactionBlocks(session, compactionBlocks);

          return {
            type: 'compaction',
            compactionBlocks,
            rawResponse: finalMessage as unknown as BetaMessage,
          };
        }

        // Normal response — store in both beta and regular message histories
        const betaContent = finalMessage.content as unknown as BetaContentBlock[];
        session.betaMessages!.push({
          role: 'assistant',
          content: betaContent,
        });

        // Filter compaction blocks for regular message history (they only apply to beta)
        const messageContent = betaContent.filter(
          (b) => b.type !== 'compaction'
        ) as unknown as ContentBlock[];
        session.messages.push({
          role: 'assistant',
          content: messageContent,
        });

        // Bridge to ContextManager
        this.trackContextEvent(session, 'user_message', userMessage);
        this.trackContextEvent(session, 'assistant_message', messageContent);
      } catch (error) {
        // Roll back user messages on failure
        if (session.betaMessages!.at(-1)?.role === 'user') {
          session.betaMessages!.pop();
        }
        if (session.messages.at(-1)?.role === 'user') {
          session.messages.pop();
        }
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        onChunk({ type: 'error', content: errorMessage });
        throw error;
      }
      return;
    }

    // ----- Standard streaming path (no compaction) -----
    // Add user message to history
    session.messages.push({
      role: 'user',
      content: userMessage,
    });

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

      // Bridge to ContextManager
      this.trackContextEvent(session, 'user_message', userMessage);
      this.trackContextEvent(session, 'assistant_message', finalMessage.content);
    } catch (error) {
      // Roll back user message on failure to keep history consistent
      if (session.messages.at(-1)?.role === 'user') {
        session.messages.pop();
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      onChunk({ type: 'error', content: errorMessage });
      throw error;
    }
  }

  /**
   * Send a message and parse the response into a validated Zod schema.
   * Uses the SDK's messages.parse() with zodOutputFormat() for automatic
   * JSON schema enforcement and Zod validation.
   *
   * This does NOT add the message to session history -- it is designed for
   * stateless data extraction tasks. Use sendMessage() for conversational flows.
   */
  async sendMessageParsed<T extends ZodType>(
    schema: T,
    userMessage: string,
    options: SendMessageParsedOptions = {}
  ): Promise<ParsedMessageResult<zodInfer<T>>> {
    if (!this.client) {
      throw new Error('AgentService not initialized. Call initialize() first.');
    }

    // Determine the model
    let model = options.model || modelRouter.getDefaultModel();
    if (options.autoSelectModel && !options.model) {
      const classification = modelRouter.classifyTask(userMessage);
      model = classification.model;
    }

    const maxTokens = options.maxTokens || 4096;

    const response: ParsedMessage<zodInfer<T>> = await this.client.messages.parse({
      model,
      max_tokens: maxTokens,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      output_config: {
        format: zodOutputFormat(schema),
      },
    });

    // Extract parsed output; throw if parsing failed
    if (response.parsed_output === null || response.parsed_output === undefined) {
      const rawText = AgentService.extractTextContent(response.content);
      throw new Error(
        `Structured output parsing returned null. Raw response: ${rawText.substring(0, 500)}`
      );
    }

    return {
      parsed: response.parsed_output,
      rawText: AgentService.extractTextContent(response.content),
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Send a message within a session and parse the response into a validated Zod schema.
   * Unlike sendMessageParsed(), this method maintains session history.
   */
  async sendSessionMessageParsed<T extends ZodType>(
    sessionId: string,
    schema: T,
    userMessage: string,
    options: SendMessageParsedOptions = {}
  ): Promise<ParsedMessageResult<zodInfer<T>>> {
    if (!this.client) {
      throw new Error('AgentService not initialized. Call initialize() first.');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Determine the model
    let messageModel = options.model || session.model;
    if (options.autoSelectModel && !options.model) {
      const classification = modelRouter.classifyTask(userMessage);
      messageModel = classification.model;
    }

    const maxTokens = options.maxTokens || 4096;

    // Add user message to history
    session.messages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const response: ParsedMessage<zodInfer<T>> = await this.client.messages.parse({
        model: messageModel,
        max_tokens: maxTokens,
        system: options.systemPrompt || session.systemPrompt,
        messages: session.messages,
        output_config: {
          format: zodOutputFormat(schema),
        },
      });

      // Add assistant response to history
      session.messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Bridge to ContextManager
      this.trackContextEvent(session, 'user_message', userMessage);
      this.trackContextEvent(session, 'assistant_message', response.content);

      if (response.parsed_output === null || response.parsed_output === undefined) {
        const rawText = AgentService.extractTextContent(response.content);
        throw new Error(
          `Structured output parsing returned null. Raw response: ${rawText.substring(0, 500)}`
        );
      }

      return {
        parsed: response.parsed_output,
        rawText: AgentService.extractTextContent(response.content),
        model: response.model,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      // Roll back user message on failure
      if (session.messages.at(-1)?.role === 'user') {
        session.messages.pop();
      }
      throw error;
    }
  }

  /**
   * Send a message with streaming and parse the final response into a Zod schema.
   * Streams text chunks to the callback during generation, and returns the
   * validated parsed result once complete.
   */
  async sendMessageParsedStream<T extends ZodType>(
    schema: T,
    userMessage: string,
    onChunk: StreamCallback,
    options: SendMessageParsedOptions = {}
  ): Promise<ParsedMessageResult<zodInfer<T>>> {
    if (!this.client) {
      throw new Error('AgentService not initialized. Call initialize() first.');
    }

    let model = options.model || modelRouter.getDefaultModel();
    if (options.autoSelectModel && !options.model) {
      const classification = modelRouter.classifyTask(userMessage);
      model = classification.model;
    }

    const maxTokens = options.maxTokens || 4096;

    const stream = this.client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      output_config: {
        format: zodOutputFormat(schema),
      },
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          onChunk({ type: 'text', content: delta.text });
        }
      } else if (event.type === 'message_stop') {
        onChunk({ type: 'done', content: '' });
      }
    }

    const finalMessage = await stream.finalMessage();
    const rawText = AgentService.extractTextContent(finalMessage.content);

    // Parse the accumulated text using the Zod schema via zodOutputFormat
    const outputFormat = zodOutputFormat(schema);
    let parsed: zodInfer<T>;
    try {
      parsed = outputFormat.parse(rawText);
    } catch (parseError) {
      throw new Error(
        `Structured output parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }

    return {
      parsed,
      rawText,
      model: finalMessage.model,
      usage: {
        input_tokens: finalMessage.usage.input_tokens,
        output_tokens: finalMessage.usage.output_tokens,
      },
    };
  }

  /**
   * Expose the Anthropic client for advanced use cases.
   * Returns null if not initialized.
   */
  getClient(): Anthropic | null {
    return this.client;
  }

  /**
   * Resume a session with existing message history
   */
  resumeSession(
    sessionId: string,
    messages: MessageParam[],
    model?: string,
    systemPrompt?: string,
    compaction?: CompactionConfig,
    betaMessages?: BetaMessageParam[]
  ): AgentSession {
    const session: AgentSession = {
      id: sessionId,
      createdAt: new Date(),
      messages,
      model: model || modelRouter.getDefaultModel(),
      systemPrompt,
      compaction,
      betaMessages: compaction?.enabled
        ? betaMessages ?? (messages as unknown as BetaMessageParam[])
        : undefined,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get the beta message history for a compaction-enabled session.
   * Returns undefined if compaction is not enabled.
   */
  getCompactionHistory(sessionId: string): BetaMessageParam[] | undefined {
    const session = this.sessions.get(sessionId);
    return session?.betaMessages ? [...session.betaMessages] : undefined;
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
