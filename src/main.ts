import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { agentService, type AgentSession, type StreamChunk, type CreateSessionOptions, type SendMessageOptions, type SendMessageParsedOptions, type MessageParam, type CompactionEvent, type Message } from './main/services/AgentService';
import {
  ConfidenceAnalysisSchema,
  CitationExtractionSchema,
  PhasePlanSchema,
  TaskClassificationSchema,
  DocumentSummarySchema,
  ResearchSynthesisSchema,
} from './main/services/StructuredOutputSchemas';
import { databaseService } from './main/services/DatabaseService';
import { secureStorageService } from './main/services/SecureStorageService';
import { contextManager, type ContextEvent, type CompactionResult, type ContextStats, type CompactionSummary } from './main/services/ContextManager';
import { openRouterService, type ResearchResponse, type ResearchOptions, type StreamChunk as OpenRouterStreamChunk } from './main/services/OpenRouterService';
import { geminiService, type DeepResearchResponse, type DeepResearchOptions, type GeminiStreamChunk, type ProgressCheckpoint } from './main/services/GeminiService';
import { researchRouter, type ResearchMode, type ProjectPhase, type ResearchProvider, type UnifiedResearchResponse, type RoutedResearchOptions, type UnifiedStreamChunk } from './main/services/ResearchRouter';
import { citationManager, type Citation, type CitationFile, type AddCitationInput, type ReferenceListOptions, type FormattedReference } from './main/services/CitationManager';
import { pdfGenerator, type PDFGenerationOptions, type PDFGenerationResult, type PDFSection } from './main/services/PDFGenerator';
import { docxGenerator, type DOCXGenerationOptions, type DOCXGenerationResult, type DOCXSection } from './main/services/DOCXGenerator';
import { pptxGenerator, type PPTXGenerationOptions, type PPTXGenerationResult, type PPTXSection, PPTX_THEMES } from './main/services/PPTXGenerator';
import { phaseOrchestrator, type PhaseOrchestratorConfig, type ProjectExecutionState, type PhaseState } from './main/services/PhaseOrchestrator';
import { updateService, type UpdateStatus, type UpdateInfo } from './main/services/UpdateService';
import { citationVerificationService, type CitationQuery, type VerificationResult } from './main/services/CitationVerificationService';
import { citationAttachmentService, type RAGSource, type AttachmentResult, type AttachmentOptions, type SourceClaimLink } from './main/services/CitationAttachmentService';
import { confidenceScoringService, type ParagraphConfidence, type DocumentConfidence, type ConfidenceScoringConfig, type ConfidenceStreamUpdate } from './main/services/ConfidenceScoringService';
import { reviewQueueService, type DocumentReviewQueue, type ReviewItem, type ReviewScanOptions } from './main/services/ReviewQueueService';
import { hallucinationDashboardService, type DocumentMetrics, type ProjectMetrics, type TrendData, type ExportOptions } from './main/services/HallucinationDashboardService';
import { imageEditorService, type ImageEditRequest, type ImageEditResponse } from './main/services/ImageEditorService';
import { registerAllHandlers } from './main/ipc';

// Register IPC handlers
function registerIpcHandlers() {
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

  // Context manager handlers
  ipcMain.handle('contextManager:initialize', async (_, apiKey: string): Promise<void> => {
    contextManager.initialize(apiKey);
  });

  ipcMain.handle('contextManager:isInitialized', (): boolean => {
    return contextManager.isInitialized();
  });

  ipcMain.handle('contextManager:addEvent', (
    _,
    sessionId: string,
    type: ContextEvent['type'],
    content: string,
    metadata?: Record<string, unknown>
  ): ContextEvent => {
    return contextManager.addEvent(sessionId, type, content, metadata);
  });

  ipcMain.handle('contextManager:getEvents', (_, sessionId: string): ContextEvent[] => {
    return contextManager.getEvents(sessionId);
  });

  ipcMain.handle('contextManager:getStats', (_, sessionId: string): ContextStats | null => {
    return contextManager.getStats(sessionId);
  });

  ipcMain.handle('contextManager:shouldCompact', (_, sessionId: string): boolean => {
    return contextManager.shouldCompact(sessionId);
  });

  ipcMain.handle('contextManager:compact', async (_, sessionId: string): Promise<CompactionResult> => {
    return await contextManager.compact(sessionId);
  });

  ipcMain.handle('contextManager:getFullContext', (_, sessionId: string): string => {
    return contextManager.getFullContext(sessionId);
  });

  ipcMain.handle('contextManager:getContextAsMessages', (_, sessionId: string) => {
    return contextManager.getContextAsMessages(sessionId);
  });

  ipcMain.handle('contextManager:clearSession', (_, sessionId: string): boolean => {
    return contextManager.clearSession(sessionId);
  });

  ipcMain.handle('contextManager:configure', (_, options: {
    compactionThreshold?: number;
    recentEventsToKeep?: number;
  }): void => {
    contextManager.configure(options);
  });

  ipcMain.handle('contextManager:getConfiguration', () => {
    return contextManager.getConfiguration();
  });

  ipcMain.handle('contextManager:getSummaries', (_, sessionId: string): CompactionSummary[] => {
    const context = contextManager.getOrCreateSession(sessionId);
    return context.summaries;
  });

  // OpenRouter service handlers (Perplexity via OpenRouter)
  ipcMain.handle('openRouter:initialize', async (_, apiKey: string): Promise<boolean> => {
    return await openRouterService.initialize(apiKey);
  });

  ipcMain.handle('openRouter:isInitialized', (): boolean => {
    return openRouterService.isInitialized();
  });

  ipcMain.handle('openRouter:validateApiKey', async (_, apiKey: string): Promise<boolean> => {
    return await openRouterService.validateApiKey(apiKey);
  });

  ipcMain.handle('openRouter:research', async (_, query: string, options?: ResearchOptions): Promise<ResearchResponse> => {
    return await openRouterService.research(query, options);
  });

  ipcMain.handle('openRouter:researchStream', async (event, query: string, options?: ResearchOptions): Promise<void> => {
    const webContents = event.sender;

    await openRouterService.researchStream(
      query,
      (chunk: OpenRouterStreamChunk) => {
        webContents.send('openRouter:streamChunk', chunk);
      },
      options
    );
  });

  ipcMain.handle('openRouter:getModel', (): string => {
    return openRouterService.getModel();
  });

  // Gemini service handlers (Deep Research)
  ipcMain.handle('gemini:initialize', async (_, apiKey: string): Promise<boolean> => {
    return await geminiService.initialize(apiKey);
  });

  ipcMain.handle('gemini:isInitialized', (): boolean => {
    return geminiService.isInitialized();
  });

  ipcMain.handle('gemini:validateApiKey', async (_, apiKey: string): Promise<boolean> => {
    return await geminiService.validateApiKey(apiKey);
  });

  ipcMain.handle('gemini:deepResearch', async (event, query: string, options?: DeepResearchOptions): Promise<DeepResearchResponse> => {
    const webContents = event.sender;

    // Wrap the options to forward progress events via IPC
    const optionsWithProgress: DeepResearchOptions = {
      ...options,
      onProgress: (progress: ProgressCheckpoint) => {
        webContents.send('gemini:progressCheckpoint', progress);
      },
    };

    return await geminiService.deepResearch(query, optionsWithProgress);
  });

  ipcMain.handle('gemini:deepResearchStream', async (event, query: string, options?: DeepResearchOptions): Promise<void> => {
    const webContents = event.sender;

    await geminiService.deepResearchStream(
      query,
      (chunk: GeminiStreamChunk) => {
        webContents.send('gemini:streamChunk', chunk);
      },
      options
    );
  });

  ipcMain.handle('gemini:getModel', (): string => {
    return geminiService.getModel();
  });

  ipcMain.handle('gemini:getProgressCheckpoints', (): number[] => {
    return geminiService.getProgressCheckpoints();
  });

  // Image Editor handlers (Nano Banana)
  ipcMain.handle('imageEditor:initialize', async (): Promise<boolean> => {
    return await imageEditorService.initialize();
  });

  ipcMain.handle('imageEditor:isInitialized', (): boolean => {
    return imageEditorService.isInitialized();
  });

  ipcMain.handle('imageEditor:processImage', async (_, request: ImageEditRequest): Promise<ImageEditResponse> => {
    return await imageEditorService.processImage(request);
  });

  ipcMain.handle('imageEditor:validateImage', (_, imageBase64: string, mimeType: string): { valid: boolean; error?: string } => {
    return imageEditorService.validateImage(imageBase64, mimeType);
  });

  ipcMain.handle('imageEditor:getModel', (): string => {
    return imageEditorService.getModel();
  });

  ipcMain.handle('imageEditor:getMaxImageSize', (): number => {
    return imageEditorService.getMaxImageSize();
  });

  ipcMain.handle('imageEditor:getSupportedMimeTypes', (): readonly string[] => {
    return imageEditorService.getSupportedMimeTypes();
  });

  ipcMain.handle('imageEditor:generateHistoryId', (): string => {
    return imageEditorService.generateHistoryId();
  });

  // Image Editor database handlers (history persistence)
  ipcMain.handle('imageEditor:saveToHistory', (_, edit: {
    id: string;
    projectId: string;
    imageData: string;
    prompt: string;
    responseText?: string | null;
    processingTimeMs?: number;
  }): void => {
    databaseService.saveImageEdit(edit);
  });

  ipcMain.handle('imageEditor:getHistory', (_, projectId: string) => {
    return databaseService.getImageEditsByProject(projectId);
  });

  ipcMain.handle('imageEditor:clearHistory', (_, projectId: string): number => {
    return databaseService.clearImageEdits(projectId);
  });

  ipcMain.handle('imageEditor:revertToEdit', (_, projectId: string, editId: string): number => {
    return databaseService.deleteImageEditsAfter(projectId, editId);
  });

  ipcMain.handle('imageEditor:getHistoryCount', (_, projectId: string): number => {
    return databaseService.getImageEditCount(projectId);
  });

  // Research router handlers
  ipcMain.handle('researchRouter:getProvider', (_, mode: ResearchMode, phase?: ProjectPhase): ResearchProvider => {
    return researchRouter.getProvider(mode, phase);
  });

  ipcMain.handle('researchRouter:isProviderAvailable', (_, provider: ResearchProvider): boolean => {
    return researchRouter.isProviderAvailable(provider);
  });

  ipcMain.handle('researchRouter:getAvailableProviders', (): ResearchProvider[] => {
    return researchRouter.getAvailableProviders();
  });

  ipcMain.handle('researchRouter:setDefaultMode', (_, mode: ResearchMode): void => {
    researchRouter.setDefaultMode(mode);
  });

  ipcMain.handle('researchRouter:getDefaultMode', (): ResearchMode => {
    return researchRouter.getDefaultMode();
  });

  ipcMain.handle('researchRouter:getPhaseRouting', (_, phase: ProjectPhase) => {
    return researchRouter.getPhaseRouting(phase);
  });

  ipcMain.handle('researchRouter:research', async (_, query: string, options?: RoutedResearchOptions): Promise<UnifiedResearchResponse> => {
    return await researchRouter.research(query, options);
  });

  ipcMain.handle('researchRouter:researchStream', async (event, query: string, options?: RoutedResearchOptions): Promise<void> => {
    const webContents = event.sender;

    await researchRouter.researchStream(
      query,
      (chunk: UnifiedStreamChunk) => {
        webContents.send('researchRouter:streamChunk', chunk);
      },
      options
    );
  });

  ipcMain.handle('researchRouter:getModeDescriptions', () => {
    return researchRouter.getModeDescriptions();
  });

  ipcMain.handle('researchRouter:getPhaseDescriptions', () => {
    return researchRouter.getPhaseDescriptions();
  });

  ipcMain.handle('researchRouter:getAvailableModes', (): ResearchMode[] => {
    return researchRouter.getAvailableModes();
  });

  ipcMain.handle('researchRouter:getProjectPhases', (): ProjectPhase[] => {
    return researchRouter.getProjectPhases();
  });

  // Research cancellation handlers
  ipcMain.handle('researchRouter:startSession', (): string => {
    return researchRouter.startResearchSession();
  });

  ipcMain.handle('researchRouter:cancelResearch', (_, sessionId: string): boolean => {
    return researchRouter.cancelResearch(sessionId);
  });

  ipcMain.handle('researchRouter:endSession', (_, sessionId: string): void => {
    researchRouter.endResearchSession(sessionId);
  });

  ipcMain.handle('researchRouter:getActiveSessions', (): string[] => {
    return researchRouter.getActiveResearchSessions();
  });

  // Citation manager handlers
  ipcMain.handle('citation:loadCitations', async (_, documentPath: string): Promise<CitationFile> => {
    return await citationManager.loadCitations(documentPath);
  });

  ipcMain.handle('citation:saveCitations', async (_, documentPath: string, citationFile: CitationFile): Promise<void> => {
    await citationManager.saveCitations(documentPath, citationFile);
  });

  ipcMain.handle('citation:addCitation', async (_, documentPath: string, input: AddCitationInput): Promise<Citation> => {
    return await citationManager.addCitation(documentPath, input);
  });

  ipcMain.handle('citation:addCitations', async (_, documentPath: string, inputs: AddCitationInput[]): Promise<Citation[]> => {
    return await citationManager.addCitations(documentPath, inputs);
  });

  ipcMain.handle('citation:updateCitation', async (_, documentPath: string, citationId: string, updates: Partial<AddCitationInput>): Promise<Citation | null> => {
    return await citationManager.updateCitation(documentPath, citationId, updates);
  });

  ipcMain.handle('citation:removeCitation', async (_, documentPath: string, citationId: string): Promise<boolean> => {
    return await citationManager.removeCitation(documentPath, citationId);
  });

  ipcMain.handle('citation:addUsage', async (_, documentPath: string, citationId: string, usage: { claim: string; line?: number; offset?: number }): Promise<boolean> => {
    return await citationManager.addUsage(documentPath, citationId, usage);
  });

  ipcMain.handle('citation:getCitationByNumber', async (_, documentPath: string, number: number): Promise<Citation | null> => {
    return await citationManager.getCitationByNumber(documentPath, number);
  });

  ipcMain.handle('citation:generateReferenceList', async (_, documentPath: string, options?: ReferenceListOptions): Promise<FormattedReference[]> => {
    return await citationManager.generateReferenceList(documentPath, options);
  });

  ipcMain.handle('citation:generateReferenceListMarkdown', async (_, documentPath: string, options?: ReferenceListOptions): Promise<string> => {
    return await citationManager.generateReferenceListMarkdown(documentPath, options);
  });

  ipcMain.handle('citation:formatTextWithCitations', (_, text: string, citations: Citation[]): string => {
    return citationManager.formatTextWithCitations(text, citations);
  });

  ipcMain.handle('citation:hasCitations', async (_, documentPath: string): Promise<boolean> => {
    return await citationManager.hasCitations(documentPath);
  });

  ipcMain.handle('citation:getCitationCount', async (_, documentPath: string): Promise<number> => {
    return await citationManager.getCitationCount(documentPath);
  });

  ipcMain.handle('citation:deleteCitationFile', async (_, documentPath: string): Promise<boolean> => {
    return await citationManager.deleteCitationFile(documentPath);
  });

  ipcMain.handle('citation:getCitationFilePath', (_, documentPath: string): string => {
    return citationManager.getCitationFilePath(documentPath);
  });

  // Citation verification handlers (OpenAlex + Crossref APIs)
  ipcMain.handle('citationVerification:verifyCitation', async (_, query: CitationQuery): Promise<VerificationResult> => {
    return await citationVerificationService.verifyCitation(query);
  });

  ipcMain.handle('citationVerification:verifyCitations', async (_, queries: CitationQuery[]): Promise<Map<number, VerificationResult>> => {
    return await citationVerificationService.verifyCitations(queries);
  });

  ipcMain.handle('citationVerification:clearCache', (): number => {
    return citationVerificationService.clearCache();
  });

  ipcMain.handle('citationVerification:getCacheStats', (): { totalEntries: number; expiredEntries: number; cacheSize: number } => {
    return citationVerificationService.getCacheStats();
  });

  // Citation Attachment handlers
  ipcMain.handle('citationAttachment:attachCitations', async (
    _,
    documentPath: string,
    generatedText: string,
    sources: RAGSource[],
    options?: AttachmentOptions
  ): Promise<AttachmentResult> => {
    return await citationAttachmentService.attachCitations(documentPath, generatedText, sources, options);
  });

  ipcMain.handle('citationAttachment:relocateCitations', async (
    _,
    documentPath: string,
    newText: string
  ): Promise<{ relocated: number; lost: number }> => {
    return await citationAttachmentService.relocateCitationsAfterEdit(documentPath, newText);
  });

  ipcMain.handle('citationAttachment:getSourceClaimLinks', async (
    _,
    documentPath: string
  ): Promise<SourceClaimLink[]> => {
    return await citationAttachmentService.getSourceClaimLinks(documentPath);
  });

  ipcMain.handle('citationAttachment:cleanupOrphanedLinks', async (
    _,
    documentPath: string
  ): Promise<number> => {
    return await citationAttachmentService.cleanupOrphanedLinks(documentPath);
  });

  ipcMain.handle('citationAttachment:convertResearchCitations', (
    _,
    citations: Array<{ url: string; title?: string; snippet?: string; domain?: string }>,
    provider: 'perplexity' | 'gemini'
  ): RAGSource[] => {
    return citationAttachmentService.convertResearchCitations(citations, provider);
  });

  // PDF Generator handlers
  ipcMain.handle('pdf:isPandocAvailable', async (): Promise<boolean> => {
    return await pdfGenerator.isPandocAvailable();
  });

  ipcMain.handle('pdf:getPandocVersion', async (): Promise<string | null> => {
    return await pdfGenerator.getPandocVersion();
  });

  ipcMain.handle('pdf:generatePDF', async (
    _,
    markdownContent: string,
    outputPath: string,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> => {
    return await pdfGenerator.generatePDF(markdownContent, outputPath, options);
  });

  ipcMain.handle('pdf:generatePDFFromDocument', async (
    _,
    documentPath: string,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> => {
    return await pdfGenerator.generatePDFFromDocument(documentPath, options);
  });

  ipcMain.handle('pdf:generatePDFFromSections', async (
    _,
    sections: PDFSection[],
    outputPath: string,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> => {
    return await pdfGenerator.generatePDFFromSections(sections, outputPath, options);
  });

  ipcMain.handle('pdf:generatePreview', async (
    _,
    pdfPath: string,
    outputPath: string,
    dpi?: number
  ): Promise<{ success: boolean; error?: string }> => {
    return await pdfGenerator.generatePreview(pdfPath, outputPath, dpi);
  });

  ipcMain.handle('pdf:cleanup', async (): Promise<void> => {
    return await pdfGenerator.cleanup();
  });

  // DOCX generation
  ipcMain.handle('docx:generateDOCX', async (
    _,
    markdownContent: string,
    outputPath: string,
    options?: DOCXGenerationOptions
  ): Promise<DOCXGenerationResult> => {
    return await docxGenerator.generateDOCX(markdownContent, outputPath, options);
  });

  ipcMain.handle('docx:generateDOCXFromDocument', async (
    _,
    documentPath: string,
    options?: DOCXGenerationOptions
  ): Promise<DOCXGenerationResult> => {
    return await docxGenerator.generateDOCXFromDocument(documentPath, options);
  });

  ipcMain.handle('docx:generateDOCXFromSections', async (
    _,
    sections: DOCXSection[],
    outputPath: string,
    options?: DOCXGenerationOptions
  ): Promise<DOCXGenerationResult> => {
    return await docxGenerator.generateDOCXFromSections(sections, outputPath, options);
  });

  // PPTX generation
  ipcMain.handle('pptx:generatePPTX', async (
    _,
    markdownContent: string,
    outputPath: string,
    options?: PPTXGenerationOptions
  ): Promise<PPTXGenerationResult> => {
    return await pptxGenerator.generatePPTX(markdownContent, outputPath, options);
  });

  ipcMain.handle('pptx:generatePPTXFromDocument', async (
    _,
    documentPath: string,
    options?: PPTXGenerationOptions
  ): Promise<PPTXGenerationResult> => {
    return await pptxGenerator.generatePPTXFromDocument(documentPath, options);
  });

  ipcMain.handle('pptx:generatePPTXFromSections', async (
    _,
    sections: PPTXSection[],
    outputPath: string,
    options?: PPTXGenerationOptions
  ): Promise<PPTXGenerationResult> => {
    return await pptxGenerator.generatePPTXFromSections(sections, outputPath, options);
  });

  ipcMain.handle('pptx:getAvailableThemes', async (): Promise<string[]> => {
    return pptxGenerator.getAvailableThemes();
  });

  ipcMain.handle('pptx:getTheme', async (_, themeName: string): Promise<typeof PPTX_THEMES[keyof typeof PPTX_THEMES] | null> => {
    return PPTX_THEMES[themeName] || null;
  });

  // Phase orchestrator handlers
  ipcMain.handle('orchestrator:start', async (event, config: PhaseOrchestratorConfig): Promise<void> => {
    const webContents = event.sender;

    // Set up event listeners to forward to renderer
    phaseOrchestrator.on('phase:start', (phase: ProjectPhase, phaseIndex: number) => {
      webContents.send('orchestrator:phase:start', phase, phaseIndex);
    });

    phaseOrchestrator.on('phase:progress', (phase: ProjectPhase, progress: number, content: string) => {
      webContents.send('orchestrator:phase:progress', phase, progress, content);
    });

    phaseOrchestrator.on('phase:complete', (phase: ProjectPhase, output: string) => {
      webContents.send('orchestrator:phase:complete', phase, output);
    });

    phaseOrchestrator.on('phase:error', (phase: ProjectPhase, error: string) => {
      webContents.send('orchestrator:phase:error', phase, error);
    });

    phaseOrchestrator.on('phase:awaiting_approval', (phase: ProjectPhase, phaseIndex: number) => {
      webContents.send('orchestrator:phase:awaiting_approval', phase, phaseIndex);
    });

    phaseOrchestrator.on('orchestration:start', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:orchestration:start', state);
    });

    phaseOrchestrator.on('orchestration:pause', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:orchestration:pause', state);
    });

    phaseOrchestrator.on('orchestration:resume', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:orchestration:resume', state);
    });

    phaseOrchestrator.on('orchestration:complete', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:orchestration:complete', state);
    });

    phaseOrchestrator.on('orchestration:error', (error: string) => {
      webContents.send('orchestrator:orchestration:error', error);
    });

    phaseOrchestrator.on('state:update', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:state:update', state);
    });

    phaseOrchestrator.on('checkpoint:saved', (checkpoint) => {
      webContents.send('checkpoint:saved', checkpoint);
    });

    phaseOrchestrator.on('checkpoint:resumed', (checkpoint) => {
      webContents.send('checkpoint:resumed', checkpoint);
    });

    await phaseOrchestrator.start(config);
  });

  ipcMain.handle('orchestrator:pause', (): boolean => {
    return phaseOrchestrator.pause();
  });

  ipcMain.handle('orchestrator:resume', async (): Promise<void> => {
    await phaseOrchestrator.resume();
  });

  ipcMain.handle('orchestrator:stop', (): boolean => {
    return phaseOrchestrator.stop();
  });

  ipcMain.handle('orchestrator:skipCurrentPhase', (): boolean => {
    return phaseOrchestrator.skipCurrentPhase();
  });

  ipcMain.handle('orchestrator:getExecutionState', (): ProjectExecutionState | null => {
    return phaseOrchestrator.getExecutionState();
  });

  ipcMain.handle('orchestrator:isRunning', (): boolean => {
    return phaseOrchestrator.isRunning();
  });

  ipcMain.handle('orchestrator:isPaused', (): boolean => {
    return phaseOrchestrator.isPaused();
  });

  ipcMain.handle('orchestrator:isWaitingForApproval', (): boolean => {
    return phaseOrchestrator.isWaitingForApproval();
  });

  ipcMain.handle('orchestrator:approveAndContinue', (): boolean => {
    return phaseOrchestrator.approveAndContinue();
  });

  ipcMain.handle('orchestrator:revisePhase', (_, feedback: string): boolean => {
    return phaseOrchestrator.revisePhase(feedback);
  });

  ipcMain.handle('orchestrator:getCurrentPhase', (): PhaseState | null => {
    return phaseOrchestrator.getCurrentPhase();
  });

  ipcMain.handle('orchestrator:getPhaseDisplayName', (_, phase: ProjectPhase): string => {
    return phaseOrchestrator.getPhaseDisplayName(phase);
  });

  ipcMain.handle('orchestrator:getOverallProgress', (): number => {
    return phaseOrchestrator.getOverallProgress();
  });

  ipcMain.handle('orchestrator:getPhaseStates', (): PhaseState[] => {
    return phaseOrchestrator.getPhaseStates();
  });

  ipcMain.handle('orchestrator:cleanup', (): void => {
    phaseOrchestrator.cleanup();
  });

  // Checkpoint handlers
  ipcMain.handle('checkpoint:save', () => {
    return phaseOrchestrator.saveCheckpoint();
  });

  ipcMain.handle('checkpoint:hasResumable', (_event, projectPath: string): boolean => {
    return phaseOrchestrator.hasResumableCheckpoint(projectPath);
  });

  ipcMain.handle('checkpoint:getForProject', (_event, projectPath: string) => {
    return phaseOrchestrator.getCheckpointForProject(projectPath);
  });

  ipcMain.handle('checkpoint:resumeFromCheckpoint', async (_event, checkpointId: string): Promise<void> => {
    const webContents = BrowserWindow.getAllWindows()[0]?.webContents;
    if (!webContents) {
      throw new Error('No window available for checkpoint events');
    }

    // Forward checkpoint events to renderer
    phaseOrchestrator.on('checkpoint:saved', (checkpoint) => {
      webContents.send('checkpoint:saved', checkpoint);
    });

    phaseOrchestrator.on('checkpoint:resumed', (checkpoint) => {
      webContents.send('checkpoint:resumed', checkpoint);
    });

    await phaseOrchestrator.resumeFromCheckpoint(checkpointId);
  });

  ipcMain.handle('checkpoint:delete', (_event, checkpointId: string): boolean => {
    return phaseOrchestrator.deleteCheckpoint(checkpointId);
  });

  ipcMain.handle('checkpoint:deleteForProject', (_event, projectPath: string): number => {
    return phaseOrchestrator.deleteCheckpointsForProject(projectPath);
  });

  ipcMain.handle('checkpoint:getCurrentId', (): string | null => {
    return phaseOrchestrator.getCurrentCheckpointId();
  });

  // Update service handlers
  ipcMain.handle('update:checkForUpdates', async (): Promise<UpdateInfo | null> => {
    return await updateService.checkForUpdates();
  });

  ipcMain.handle('update:downloadUpdate', async (): Promise<void> => {
    return await updateService.downloadUpdate();
  });

  ipcMain.handle('update:quitAndInstall', (): void => {
    updateService.quitAndInstall();
  });

  ipcMain.handle('update:getStatus', (): UpdateStatus => {
    return updateService.getStatus();
  });

  ipcMain.handle('update:getUpdateInfo', (): UpdateInfo | null => {
    return updateService.getUpdateInfo();
  });

  ipcMain.handle('update:getCurrentVersion', (): string => {
    return updateService.getCurrentVersion();
  });

  ipcMain.handle('update:getReleaseNotes', (): string => {
    return updateService.getReleaseNotes();
  });

  ipcMain.handle('update:setAutoDownload', (_, enabled: boolean): void => {
    updateService.setAutoDownload(enabled);
  });

  ipcMain.handle('update:setAllowPrerelease', (_, enabled: boolean): void => {
    updateService.setAllowPrerelease(enabled);
  });

  ipcMain.handle('update:resetStatus', (): void => {
    updateService.resetStatus();
  });

  // Confidence Scoring handlers
  ipcMain.handle('confidence:computeParagraph', (
    _,
    text: string,
    paragraphIndex?: number
  ): ParagraphConfidence => {
    return confidenceScoringService.computeParagraphConfidence(text, paragraphIndex);
  });

  ipcMain.handle('confidence:computeDocument', (
    _,
    content: string,
    documentPath?: string
  ): DocumentConfidence => {
    return confidenceScoringService.computeDocumentConfidence(content, documentPath);
  });

  ipcMain.handle('confidence:getCached', (
    _,
    documentPath: string
  ): DocumentConfidence | undefined => {
    return confidenceScoringService.getCachedDocumentConfidence(documentPath);
  });

  ipcMain.handle('confidence:clearCache', (
    _,
    documentPath?: string
  ): void => {
    confidenceScoringService.clearCache(documentPath);
  });

  ipcMain.handle('confidence:getThreshold', (): number => {
    return confidenceScoringService.getLowConfidenceThreshold();
  });

  ipcMain.handle('confidence:setThreshold', (
    _,
    threshold: number
  ): void => {
    confidenceScoringService.setLowConfidenceThreshold(threshold);
  });

  ipcMain.handle('confidence:getConfig', (): ConfidenceScoringConfig => {
    return confidenceScoringService.getConfig();
  });

  ipcMain.handle('confidence:updateConfig', (
    _,
    config: Partial<ConfidenceScoringConfig>
  ): void => {
    confidenceScoringService.updateConfig(config);
  });

  ipcMain.handle('confidence:processStreaming', (
    event,
    sessionId: string,
    newText: string,
    fullText: string
  ): void => {
    confidenceScoringService.processStreamingText(
      sessionId,
      newText,
      fullText,
      (update: ConfidenceStreamUpdate) => {
        event.sender.send('confidence:streamUpdate', update);
      }
    );
  });

  // Review Queue handlers
  ipcMain.handle('review:scanDocument', async (
    _,
    documentPath: string,
    content: string,
    options?: ReviewScanOptions
  ): Promise<DocumentReviewQueue> => {
    return await reviewQueueService.scanDocument(documentPath, content, options);
  });

  ipcMain.handle('review:getQueue', (
    _,
    documentPath: string
  ): DocumentReviewQueue | undefined => {
    return reviewQueueService.getQueue(documentPath);
  });

  ipcMain.handle('review:getItem', (
    _,
    documentPath: string,
    itemId: string
  ): ReviewItem | undefined => {
    return reviewQueueService.getItem(documentPath, itemId);
  });

  ipcMain.handle('review:getPendingItems', (
    _,
    documentPath: string
  ): ReviewItem[] => {
    return reviewQueueService.getPendingItems(documentPath);
  });

  ipcMain.handle('review:acceptItem', (
    _,
    documentPath: string,
    itemId: string
  ): ReviewItem | undefined => {
    return reviewQueueService.acceptItem(documentPath, itemId);
  });

  ipcMain.handle('review:editItem', (
    _,
    documentPath: string,
    itemId: string,
    editedText: string
  ): ReviewItem | undefined => {
    return reviewQueueService.editItem(documentPath, itemId, editedText);
  });

  ipcMain.handle('review:removeItem', (
    _,
    documentPath: string,
    itemId: string,
    reason?: string
  ): ReviewItem | undefined => {
    return reviewQueueService.removeItem(documentPath, itemId, reason);
  });

  ipcMain.handle('review:dismissItem', (
    _,
    documentPath: string,
    itemId: string
  ): ReviewItem | undefined => {
    return reviewQueueService.dismissItem(documentPath, itemId);
  });

  ipcMain.handle('review:clearQueue', (
    _,
    documentPath: string
  ): void => {
    reviewQueueService.clearQueue(documentPath);
  });

  ipcMain.handle('review:getDocumentsWithPendingReviews', (): string[] => {
    return reviewQueueService.getDocumentsWithPendingReviews();
  });

  ipcMain.handle('review:getThreshold', (): number => {
    return reviewQueueService.getConfidenceThreshold();
  });

  ipcMain.handle('review:setThreshold', (
    _,
    threshold: number
  ): void => {
    reviewQueueService.setConfidenceThreshold(threshold);
  });

  // =============== Hallucination Dashboard ===============

  ipcMain.handle('dashboard:analyzeDocument', async (
    _,
    documentPath: string,
    projectPath: string,
    content: string
  ): Promise<DocumentMetrics> => {
    return await hallucinationDashboardService.analyzeDocument(documentPath, projectPath, content);
  });

  ipcMain.handle('dashboard:getDocumentMetrics', (
    _,
    documentPath: string
  ): DocumentMetrics | null => {
    return hallucinationDashboardService.getDocumentMetrics(documentPath);
  });

  ipcMain.handle('dashboard:getProjectMetrics', (
    _,
    projectPath: string
  ): ProjectMetrics => {
    return hallucinationDashboardService.getProjectMetrics(projectPath);
  });

  ipcMain.handle('dashboard:getTrendData', (
    _,
    projectPath: string,
    startDate?: string,
    endDate?: string
  ): TrendData => {
    return hallucinationDashboardService.getTrendData(projectPath, startDate, endDate);
  });

  ipcMain.handle('dashboard:exportReport', (
    _,
    projectPath: string,
    options: ExportOptions
  ): string => {
    return hallucinationDashboardService.exportReport(projectPath, options);
  });

  ipcMain.handle('dashboard:clearProjectMetrics', (
    _,
    projectPath: string
  ): number => {
    return hallucinationDashboardService.clearProjectMetrics(projectPath);
  });

  ipcMain.handle('dashboard:clearAllMetrics', (): number => {
    return hallucinationDashboardService.clearAllMetrics();
  });
}

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Dev mode: retry connecting to Vite dev server
    const maxRetries = 10;
    const retryDelay = 500;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        break;
      } catch (error) {
        if (i === maxRetries - 1) {
          console.error('Failed to connect to Vite dev server after retries:', error);
          throw error;
        }
        console.log(`Waiting for Vite dev server... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    mainWindow.loadFile(
      path.join(__dirname, '../renderer/index.html'),
    );
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  // Set Content Security Policy for production
  // In dev mode, Vite HMR requires 'unsafe-eval', so we use a more permissive policy
  const isDev = !!MAIN_WINDOW_VITE_DEV_SERVER_URL;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? // Dev: Allow Vite HMR and local dev server
        "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' ws://localhost:* http://localhost:* https://api.anthropic.com https://openrouter.ai https://generativelanguage.googleapis.com; " +
        "font-src 'self' data:;"
      : // Production: Strict CSP
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " + // Inline styles needed for some UI libraries
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.anthropic.com https://openrouter.ai https://generativelanguage.googleapis.com; " +
        "font-src 'self' data:;";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // Initialize services
  databaseService.initialize();
  secureStorageService.initialize();
  citationVerificationService.initialize();
  hallucinationDashboardService.initialize();

  // Initialize context manager with API key if available
  const anthropicKey = await secureStorageService.getApiKey('anthropic');
  if (anthropicKey) {
    contextManager.initialize(anthropicKey);
  }

  // Initialize OpenRouter service with API key if available
  const openRouterKey = await secureStorageService.getApiKey('openrouter');
  if (openRouterKey) {
    openRouterService.initialize(openRouterKey);
  }

  // Initialize Gemini service with API key if available
  const geminiKey = await secureStorageService.getApiKey('gemini');
  if (geminiKey) {
    geminiService.initialize(geminiKey);
  }

  registerAllHandlers();
  registerIpcHandlers();
  createWindow();

  // Initialize update service and check for updates (only in production)
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    updateService.initialize();
    // Delay check to not interfere with app startup
    setTimeout(() => {
      updateService.checkForUpdates().catch((error) => {
        console.error('Failed to check for updates:', error);
      });
    }, 3000);
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up database on quit
app.on('will-quit', () => {
  databaseService.close();
  citationVerificationService.close();
  hallucinationDashboardService.close();
});

app.on('activate', () => {
  // On macOS re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
