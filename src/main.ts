import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import { databaseService } from './main/services/DatabaseService';
import { secureStorageService } from './main/services/SecureStorageService';
import { contextManager } from './main/services/ContextManager';
import { openRouterService } from './main/services/OpenRouterService';
import { geminiService } from './main/services/GeminiService';
import { citationManager, type Citation, type CitationFile, type AddCitationInput, type ReferenceListOptions, type FormattedReference } from './main/services/CitationManager';
import { pdfGenerator, type PDFGenerationOptions, type PDFGenerationResult, type PDFSection } from './main/services/PDFGenerator';
import { docxGenerator, type DOCXGenerationOptions, type DOCXGenerationResult, type DOCXSection } from './main/services/DOCXGenerator';
import { pptxGenerator, type PPTXGenerationOptions, type PPTXGenerationResult, type PPTXSection, PPTX_THEMES } from './main/services/PPTXGenerator';
import { phaseOrchestrator, type PhaseOrchestratorConfig, type ProjectExecutionState, type PhaseState } from './main/services/PhaseOrchestrator';
import { updateService, type UpdateStatus, type UpdateInfo } from './main/services/UpdateService';
import { citationVerificationService, type CitationQuery, type VerificationResult } from './main/services/CitationVerificationService';
import { citationAttachmentService, type RAGSource, type AttachmentResult, type AttachmentOptions, type SourceClaimLink } from './main/services/CitationAttachmentService';
import { reviewQueueService, type DocumentReviewQueue, type ReviewItem, type ReviewScanOptions } from './main/services/ReviewQueueService';
import { hallucinationDashboardService, type DocumentMetrics, type ProjectMetrics, type TrendData, type ExportOptions } from './main/services/HallucinationDashboardService';
import { imageEditorService, type ImageEditRequest, type ImageEditResponse } from './main/services/ImageEditorService';
import type { ProjectPhase } from './shared/types';
import { registerAllHandlers } from './main/ipc';

// Register IPC handlers
function registerIpcHandlers() {
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
