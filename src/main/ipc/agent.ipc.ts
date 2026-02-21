import { ipcMain } from 'electron';
import { agentService, type AgentSession, type StreamChunk, type CreateSessionOptions, type SendMessageOptions, type SendMessageParsedOptions, type MessageParam, type CompactionEvent, type Message } from '../services/AgentService';
import {
  ConfidenceAnalysisSchema,
  CitationExtractionSchema,
  PhasePlanSchema,
  TaskClassificationSchema,
  DocumentSummarySchema,
  ResearchSynthesisSchema,
} from '../services/StructuredOutputSchemas';

// Schema registry for IPC: maps schema names to Zod schema objects
const structuredOutputSchemas = {
  confidence_analysis: ConfidenceAnalysisSchema,
  citation_extraction: CitationExtractionSchema,
  phase_plan: PhasePlanSchema,
  task_classification: TaskClassificationSchema,
  document_summary: DocumentSummarySchema,
  research_synthesis: ResearchSynthesisSchema,
} as const;

type SchemaName = keyof typeof structuredOutputSchemas;

export function register() {
  // Agent service handlers
  ipcMain.handle('agent:initialize', async (_, apiKey: string): Promise<boolean> => {
    return await agentService.initialize(apiKey);
  });

  ipcMain.handle('agent:isInitialized', (): boolean => {
    return agentService.isInitialized();
  });

  ipcMain.handle('agent:validateApiKey', async (_, apiKey: string): Promise<boolean> => {
    return await agentService.validateApiKey(apiKey);
  });

  ipcMain.handle('agent:createSession', (_, options?: CreateSessionOptions): AgentSession => {
    return agentService.createSession(options);
  });

  ipcMain.handle('agent:getSession', (_, sessionId: string): AgentSession | undefined => {
    return agentService.getSession(sessionId);
  });

  ipcMain.handle('agent:deleteSession', (_, sessionId: string): boolean => {
    return agentService.deleteSession(sessionId);
  });

  ipcMain.handle('agent:listSessions', (): AgentSession[] => {
    return agentService.listSessions();
  });

  ipcMain.handle('agent:sendMessage', async (_, sessionId: string, userMessage: string, options?: SendMessageOptions) => {
    const response = await agentService.sendMessage(sessionId, userMessage, options);

    // Handle compaction events (server-side context compaction)
    if (response.type === 'compaction') {
      const compaction = response as CompactionEvent;
      return {
        type: 'compaction' as const,
        compactionBlocks: compaction.compactionBlocks,
      };
    }

    // Serialize the normal message response for IPC
    const msg = response as Message;
    return {
      id: msg.id,
      type: msg.type,
      role: msg.role,
      content: msg.content,
      model: msg.model,
      stop_reason: msg.stop_reason,
      usage: msg.usage,
    };
  });

  // For streaming, we use a different pattern with events
  ipcMain.handle('agent:sendMessageStream', async (event, sessionId: string, userMessage: string, options?: SendMessageOptions) => {
    const webContents = event.sender;

    await agentService.sendMessageStream(
      sessionId,
      userMessage,
      (chunk: StreamChunk) => {
        // Send each chunk to the renderer via IPC
        webContents.send('agent:streamChunk', sessionId, chunk);
      },
      options
    );
  });

  ipcMain.handle('agent:resumeSession', (_, sessionId: string, messages: MessageParam[], model?: string): AgentSession => {
    return agentService.resumeSession(sessionId, messages, model);
  });

  ipcMain.handle('agent:getConversationHistory', (_, sessionId: string): MessageParam[] => {
    return agentService.getConversationHistory(sessionId);
  });

  ipcMain.handle('agent:clearConversationHistory', (_, sessionId: string): boolean => {
    return agentService.clearConversationHistory(sessionId);
  });

  // ========================================
  // Structured Output handlers (messages.parse() + Zod)
  // ========================================

  ipcMain.handle('agent:sendMessageParsed', async (
    _,
    schemaName: string,
    userMessage: string,
    options?: SendMessageParsedOptions
  ) => {
    const schema = structuredOutputSchemas[schemaName as SchemaName];
    if (!schema) {
      throw new Error(`Unknown schema: "${schemaName}". Available schemas: ${Object.keys(structuredOutputSchemas).join(', ')}`);
    }
    return await agentService.sendMessageParsed(schema, userMessage, options);
  });

  ipcMain.handle('agent:sendSessionMessageParsed', async (
    _,
    sessionId: string,
    schemaName: string,
    userMessage: string,
    options?: SendMessageParsedOptions
  ) => {
    const schema = structuredOutputSchemas[schemaName as SchemaName];
    if (!schema) {
      throw new Error(`Unknown schema: "${schemaName}". Available schemas: ${Object.keys(structuredOutputSchemas).join(', ')}`);
    }
    return await agentService.sendSessionMessageParsed(sessionId, schema, userMessage, options);
  });

  ipcMain.handle('agent:sendMessageParsedStream', async (
    event,
    schemaName: string,
    userMessage: string,
    options?: SendMessageParsedOptions
  ) => {
    const schema = structuredOutputSchemas[schemaName as SchemaName];
    if (!schema) {
      throw new Error(`Unknown schema: "${schemaName}". Available schemas: ${Object.keys(structuredOutputSchemas).join(', ')}`);
    }
    const webContents = event.sender;
    return await agentService.sendMessageParsedStream(
      schema,
      userMessage,
      (chunk: StreamChunk) => {
        webContents.send('agent:parsedStreamChunk', chunk);
      },
      options
    );
  });

  ipcMain.handle('agent:listStructuredOutputSchemas', () => {
    return Object.keys(structuredOutputSchemas);
  });
}
