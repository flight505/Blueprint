import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { checkAllPermissions, openSystemPreferences } from './main/permissions';
import { readDirectory, readFileContent, listAllFiles, searchInFiles, writeFile, FileNode, FileContent, QuickOpenFile, SearchResult } from './main/services/FileSystemService';
import { agentService, type AgentSession, type StreamChunk, type CreateSessionOptions, type SendMessageOptions, type MessageParam } from './main/services/AgentService';
import { databaseService } from './main/services/DatabaseService';
import type { SessionInput, DocumentInput, StoredSession, StoredDocument, PromptInput, StoredPrompt, RecentProjectInput, RecentProject } from './main/services/DatabaseService';
import { secureStorageService, type ApiKeyType } from './main/services/SecureStorageService';
import { modelRouter, type TaskClassification, type TaskType, type ModelId, CLAUDE_MODELS } from './main/services/ModelRouter';
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

// Register IPC handlers
function registerIpcHandlers() {
  // Permissions
  ipcMain.handle('permissions:check', async () => {
    return await checkAllPermissions();
  });

  ipcMain.handle('permissions:openSettings', async (_, pane: 'files' | 'network') => {
    openSystemPreferences(pane);
  });

  // App info
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  // File system
  ipcMain.handle('fs:selectDirectory', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('fs:readDirectory', async (_, dirPath: string): Promise<FileNode[]> => {
    return await readDirectory(dirPath);
  });

  ipcMain.handle('fs:readFile', async (_, filePath: string): Promise<FileContent> => {
    return await readFileContent(filePath);
  });

  ipcMain.handle('fs:listAllFiles', async (_, basePath: string): Promise<QuickOpenFile[]> => {
    return await listAllFiles(basePath);
  });

  ipcMain.handle('fs:searchInFiles', async (
    _,
    basePath: string,
    query: string,
    options?: { useRegex?: boolean; caseSensitive?: boolean; maxResults?: number }
  ): Promise<SearchResult[]> => {
    return await searchInFiles(basePath, query, options);
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string): Promise<void> => {
    return await writeFile(filePath, content);
  });

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
    // Serialize the response for IPC
    return {
      id: response.id,
      type: response.type,
      role: response.role,
      content: response.content,
      model: response.model,
      stop_reason: response.stop_reason,
      usage: response.usage,
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

  // Database service handlers
  ipcMain.handle('db:isInitialized', (): boolean => {
    return databaseService.isInitialized();
  });

  ipcMain.handle('db:saveSession', (_, session: SessionInput): void => {
    databaseService.saveSession(session);
  });

  ipcMain.handle('db:getSession', (_, sessionId: string): StoredSession | null => {
    return databaseService.getSession(sessionId);
  });

  ipcMain.handle('db:getSessionByProjectPath', (_, projectPath: string): StoredSession | null => {
    return databaseService.getSessionByProjectPath(projectPath);
  });

  ipcMain.handle('db:listSessions', (): StoredSession[] => {
    return databaseService.listSessions();
  });

  ipcMain.handle('db:deleteSession', (_, sessionId: string): boolean => {
    return databaseService.deleteSession(sessionId);
  });

  ipcMain.handle('db:saveDocument', (_, doc: DocumentInput): void => {
    databaseService.saveDocument(doc);
  });

  ipcMain.handle('db:getDocument', (_, docId: string): StoredDocument | null => {
    return databaseService.getDocument(docId);
  });

  ipcMain.handle('db:getDocumentsBySession', (_, sessionId: string): StoredDocument[] => {
    return databaseService.getDocumentsBySession(sessionId);
  });

  ipcMain.handle('db:deleteDocument', (_, docId: string): boolean => {
    return databaseService.deleteDocument(docId);
  });

  ipcMain.handle('db:searchDocumentsByEmbedding', (_, sessionId: string, queryEmbedding: number[], limit?: number): Array<StoredDocument & { similarity: number }> => {
    return databaseService.searchDocumentsByEmbedding(sessionId, queryEmbedding, limit);
  });

  ipcMain.handle('db:getStats', (): { sessionCount: number; documentCount: number; dbSize: number } => {
    return databaseService.getStats();
  });

  // Recent projects handlers
  ipcMain.handle('recentProjects:add', (_, input: RecentProjectInput): RecentProject => {
    return databaseService.addRecentProject(input);
  });

  ipcMain.handle('recentProjects:list', (_, limit?: number): RecentProject[] => {
    return databaseService.listRecentProjects(limit);
  });

  ipcMain.handle('recentProjects:remove', (_, projectId: string): boolean => {
    return databaseService.removeRecentProject(projectId);
  });

  ipcMain.handle('recentProjects:removeByPath', (_, path: string): boolean => {
    return databaseService.removeRecentProjectByPath(path);
  });

  ipcMain.handle('recentProjects:clear', (): number => {
    return databaseService.clearRecentProjects();
  });

  ipcMain.handle('recentProjects:getByPath', (_, path: string): RecentProject | null => {
    return databaseService.getRecentProjectByPath(path);
  });

  // Secure storage handlers for API keys
  ipcMain.handle('secureStorage:setApiKey', async (_, type: ApiKeyType, key: string): Promise<boolean> => {
    return await secureStorageService.setApiKey(type, key);
  });

  ipcMain.handle('secureStorage:getApiKey', async (_, type: ApiKeyType): Promise<string | null> => {
    return await secureStorageService.getApiKey(type);
  });

  ipcMain.handle('secureStorage:deleteApiKey', async (_, type: ApiKeyType): Promise<boolean> => {
    return await secureStorageService.deleteApiKey(type);
  });

  ipcMain.handle('secureStorage:hasApiKey', (_, type: ApiKeyType): boolean => {
    return secureStorageService.hasApiKey(type);
  });

  ipcMain.handle('secureStorage:listStoredKeys', (): ApiKeyType[] => {
    return secureStorageService.listStoredKeys();
  });

  ipcMain.handle('secureStorage:isEncryptionAvailable', (): boolean => {
    return secureStorageService.isEncryptionAvailable();
  });

  // Model router handlers
  ipcMain.handle('modelRouter:classifyTask', (_, prompt: string, context?: { selectedText?: string; taskType?: TaskType }): TaskClassification => {
    return modelRouter.classifyTask(prompt, context);
  });

  ipcMain.handle('modelRouter:getModelForComplexity', (_, complexity: 'simple' | 'medium' | 'complex'): ModelId => {
    return modelRouter.getModelForComplexity(complexity);
  });

  ipcMain.handle('modelRouter:getModelByName', (_, name: 'haiku' | 'sonnet' | 'opus'): ModelId => {
    return modelRouter.getModelByName(name);
  });

  ipcMain.handle('modelRouter:getAvailableModels', () => {
    return modelRouter.getAvailableModels();
  });

  ipcMain.handle('modelRouter:setDefaultModel', (_, model: ModelId): void => {
    modelRouter.setDefaultModel(model);
  });

  ipcMain.handle('modelRouter:getDefaultModel', (): ModelId => {
    return modelRouter.getDefaultModel();
  });

  ipcMain.handle('modelRouter:getModelConstants', () => {
    return CLAUDE_MODELS;
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

  ipcMain.handle('contextManager:getActiveEvents', (_, sessionId: string): ContextEvent[] => {
    return contextManager.getActiveEvents(sessionId);
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

  // Prompt library handlers
  ipcMain.handle('prompt:save', (_, prompt: PromptInput): void => {
    databaseService.savePrompt(prompt);
  });

  ipcMain.handle('prompt:get', (_, promptId: string): StoredPrompt | null => {
    return databaseService.getPrompt(promptId);
  });

  ipcMain.handle('prompt:listAll', (): StoredPrompt[] => {
    return databaseService.listPrompts();
  });

  ipcMain.handle('prompt:delete', (_, promptId: string): boolean => {
    return databaseService.deletePrompt(promptId);
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
}

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
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
  // Initialize services
  databaseService.initialize();
  secureStorageService.initialize();

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
});

app.on('activate', () => {
  // On macOS re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
