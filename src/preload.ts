import { contextBridge, ipcRenderer } from 'electron';

// Re-export all shared types for renderer consumption
export type {
  // common
  PermissionStatus,
  PermissionsResult,
  ApiKeyType,
  // filesystem
  FileNode,
  FileContent,
  QuickOpenFile,
  SearchMatch,
  SearchResult,
  SearchOptions,
  // agent
  AgentSession,
  StreamChunk,
  CreateSessionOptions,
  SendMessageOptions,
  SendMessageParsedOptions,
  StructuredOutputSchemaName,
  ParsedMessageResult,
  MessageParam,
  ContentBlock,
  MessageResponse,
  // database
  StoredSession,
  StoredDocument,
  SessionInput,
  DocumentInput,
  DbStats,
  RecentProject,
  RecentProjectInput,
  StoredPrompt,
  PromptInput,
  StoredImageEdit,
  ImageEditInput,
  // models
  TaskComplexity,
  ModelId,
  TaskType,
  TaskClassification,
  ModelInfo,
  ClaudeModels,
  // context
  ContextEventType,
  ContextEvent,
  CompactionSummary,
  CompactionResult,
  ContextStats,
  ContextConfiguration,
  // research
  Citation,
  ResearchResponse,
  ResearchOptions,
  OpenRouterStreamChunk,
  DeepResearchResponse,
  DeepResearchOptions,
  ProgressCheckpoint,
  GeminiStreamChunk,
  ResearchMode,
  ProjectPhase,
  ResearchProvider,
  PhaseConfig,
  UnifiedResearchResponse,
  RoutedResearchOptions,
  UnifiedStreamChunk,
  // citation
  ManagedCitation,
  CitationUsage,
  CitationFile,
  ReferenceListOptions,
  FormattedReference,
  AddCitationInput,
  CitationVerificationResult,
  VerifiedCitationData,
  CitationVerificationQuery,
  CitationVerificationCacheStats,
  RAGSource,
  ExtractedClaim,
  AttachmentResult,
  AttachmentOptions,
  SourceClaimLink,
  // confidence & review
  ConfidenceBreakdown,
  ParagraphConfidence,
  DocumentConfidence,
  ConfidenceScoringConfig,
  ConfidenceStreamUpdate,
  ReviewItemType,
  ReviewItemStatus,
  ReviewItemAction,
  ReviewSource,
  LowConfidenceReviewItem,
  CitationReviewItem,
  ReviewItem,
  DocumentReviewQueue,
  ReviewScanOptions,
  // orchestrator, dashboard, export, updates
  DocumentMetrics,
  ProjectMetrics,
  TrendDataPoint,
  TrendData,
  DashboardExportOptions,
  PDFGenerationOptions,
  CoverPageMetadata,
  PDFMetadata,
  PDFGenerationResult,
  PDFSection,
  DOCXGenerationOptions,
  DOCXCoverPageMetadata,
  DOCXMetadata,
  DOCXGenerationResult,
  DOCXSection,
  PPTXTheme,
  PPTXGenerationOptions,
  PPTXTitleSlideMetadata,
  PPTXMetadata,
  PPTXGenerationResult,
  PPTXSection,
  PhaseStatus,
  OrchestrationStatus,
  PhaseState,
  ProjectExecutionState,
  PhaseOrchestratorConfig,
  CheckpointData,
  ImageEditorMimeType,
  ImageEditRequest,
  ImageEditResponse,
  ImageEditHistoryItem,
  UpdateStatus,
  UpdateInfo,
  UpdateProgressInfo,
  UpdateEventType,
  UpdateEvent,
} from './shared/types';

// Import types locally for use in contextBridge wiring and global declaration
import type {
  PermissionsResult,
  FileNode,
  FileContent,
  QuickOpenFile,
  SearchOptions,
  SearchResult,
  CreateSessionOptions,
  AgentSession,
  SendMessageOptions,
  MessageResponse,
  MessageParam,
  StreamChunk,
  StructuredOutputSchemaName,
  SendMessageParsedOptions,
  ParsedMessageResult,
  SessionInput,
  StoredSession,
  DocumentInput,
  StoredDocument,
  DbStats,
  RecentProjectInput,
  RecentProject,
  ApiKeyType,
  TaskType,
  TaskClassification,
  TaskComplexity,
  ModelId,
  ModelInfo,
  ClaudeModels,
  ContextEventType,
  ContextEvent,
  ContextStats,
  CompactionResult,
  CompactionSummary,
  ContextConfiguration,
  PromptInput,
  StoredPrompt,
  ResearchOptions,
  ResearchResponse,
  OpenRouterStreamChunk,
  DeepResearchOptions,
  DeepResearchResponse,
  ProgressCheckpoint,
  GeminiStreamChunk,
  ImageEditRequest,
  ImageEditResponse,
  ImageEditInput,
  StoredImageEdit,
  ResearchMode,
  ProjectPhase,
  ResearchProvider,
  PhaseConfig,
  RoutedResearchOptions,
  UnifiedResearchResponse,
  UnifiedStreamChunk,
  CitationFile,
  AddCitationInput,
  ManagedCitation,
  CitationUsage,
  ReferenceListOptions,
  FormattedReference,
  CitationVerificationQuery,
  CitationVerificationResult,
  CitationVerificationCacheStats,
  RAGSource,
  AttachmentOptions,
  AttachmentResult,
  SourceClaimLink,
  ParagraphConfidence,
  DocumentConfidence,
  ConfidenceScoringConfig,
  ConfidenceStreamUpdate,
  ReviewScanOptions,
  DocumentReviewQueue,
  ReviewItem,
  DocumentMetrics,
  ProjectMetrics,
  TrendData,
  DashboardExportOptions,
  PDFGenerationOptions,
  PDFGenerationResult,
  PDFSection,
  DOCXGenerationOptions,
  DOCXGenerationResult,
  DOCXSection,
  PPTXGenerationOptions,
  PPTXGenerationResult,
  PPTXSection,
  PPTXTheme,
  PhaseOrchestratorConfig,
  ProjectExecutionState,
  PhaseState,
  CheckpointData,
  UpdateInfo,
  UpdateStatus,
  UpdateEvent,
} from './shared/types';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Permissions
  checkPermissions: (): Promise<PermissionsResult> =>
    ipcRenderer.invoke('permissions:check'),
  openSystemPreferences: (pane: 'files' | 'network'): Promise<void> =>
    ipcRenderer.invoke('permissions:openSettings', pane),

  // App info
  getPlatform: (): string => process.platform,
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('app:getVersion'),

  // File system
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('fs:selectDirectory'),
  readDirectory: (dirPath: string): Promise<FileNode[]> =>
    ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFile: (filePath: string): Promise<FileContent> =>
    ipcRenderer.invoke('fs:readFile', filePath),
  listAllFiles: (basePath: string): Promise<QuickOpenFile[]> =>
    ipcRenderer.invoke('fs:listAllFiles', basePath),
  searchInFiles: (basePath: string, query: string, options?: SearchOptions): Promise<SearchResult[]> =>
    ipcRenderer.invoke('fs:searchInFiles', basePath, query, options),
  writeFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),
  setProjectPath: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke('fs:setProjectPath', projectPath),
  isPathAllowed: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:isPathAllowed', filePath),

  // Agent service
  agentInitialize: (apiKey: string): Promise<boolean> =>
    ipcRenderer.invoke('agent:initialize', apiKey),
  agentIsInitialized: (): Promise<boolean> =>
    ipcRenderer.invoke('agent:isInitialized'),
  agentValidateApiKey: (apiKey: string): Promise<boolean> =>
    ipcRenderer.invoke('agent:validateApiKey', apiKey),
  agentCreateSession: (options?: CreateSessionOptions): Promise<AgentSession> =>
    ipcRenderer.invoke('agent:createSession', options),
  agentGetSession: (sessionId: string): Promise<AgentSession | undefined> =>
    ipcRenderer.invoke('agent:getSession', sessionId),
  agentDeleteSession: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('agent:deleteSession', sessionId),
  agentListSessions: (): Promise<AgentSession[]> =>
    ipcRenderer.invoke('agent:listSessions'),
  agentSendMessage: (sessionId: string, userMessage: string, options?: SendMessageOptions): Promise<MessageResponse> =>
    ipcRenderer.invoke('agent:sendMessage', sessionId, userMessage, options),
  agentSendMessageStream: (sessionId: string, userMessage: string, options?: SendMessageOptions): Promise<void> =>
    ipcRenderer.invoke('agent:sendMessageStream', sessionId, userMessage, options),
  agentResumeSession: (sessionId: string, messages: MessageParam[], model?: string): Promise<AgentSession> =>
    ipcRenderer.invoke('agent:resumeSession', sessionId, messages, model),
  agentGetConversationHistory: (sessionId: string): Promise<MessageParam[]> =>
    ipcRenderer.invoke('agent:getConversationHistory', sessionId),
  agentClearConversationHistory: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('agent:clearConversationHistory', sessionId),

  // Structured output methods (messages.parse() + Zod)
  agentSendMessageParsed: (
    schemaName: StructuredOutputSchemaName,
    userMessage: string,
    options?: SendMessageParsedOptions
  ): Promise<ParsedMessageResult> =>
    ipcRenderer.invoke('agent:sendMessageParsed', schemaName, userMessage, options),
  agentSendSessionMessageParsed: (
    sessionId: string,
    schemaName: StructuredOutputSchemaName,
    userMessage: string,
    options?: SendMessageParsedOptions
  ): Promise<ParsedMessageResult> =>
    ipcRenderer.invoke('agent:sendSessionMessageParsed', sessionId, schemaName, userMessage, options),
  agentSendMessageParsedStream: (
    schemaName: StructuredOutputSchemaName,
    userMessage: string,
    options?: SendMessageParsedOptions
  ): Promise<ParsedMessageResult> =>
    ipcRenderer.invoke('agent:sendMessageParsedStream', schemaName, userMessage, options),
  agentListStructuredOutputSchemas: (): Promise<string[]> =>
    ipcRenderer.invoke('agent:listStructuredOutputSchemas'),

  // Event listeners for streaming
  onAgentStreamChunk: (callback: (sessionId: string, chunk: StreamChunk) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, chunk: StreamChunk) => {
      callback(sessionId, chunk);
    };
    ipcRenderer.on('agent:streamChunk', handler);
    // Return a cleanup function
    return () => ipcRenderer.removeListener('agent:streamChunk', handler);
  },
  onAgentParsedStreamChunk: (callback: (chunk: StreamChunk) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: StreamChunk) => {
      callback(chunk);
    };
    ipcRenderer.on('agent:parsedStreamChunk', handler);
    return () => ipcRenderer.removeListener('agent:parsedStreamChunk', handler);
  },

  // Database service
  dbIsInitialized: (): Promise<boolean> =>
    ipcRenderer.invoke('db:isInitialized'),
  dbSaveSession: (session: SessionInput): Promise<void> =>
    ipcRenderer.invoke('db:saveSession', session),
  dbGetSession: (sessionId: string): Promise<StoredSession | null> =>
    ipcRenderer.invoke('db:getSession', sessionId),
  dbGetSessionByProjectPath: (projectPath: string): Promise<StoredSession | null> =>
    ipcRenderer.invoke('db:getSessionByProjectPath', projectPath),
  dbListSessions: (): Promise<StoredSession[]> =>
    ipcRenderer.invoke('db:listSessions'),
  dbDeleteSession: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('db:deleteSession', sessionId),
  dbSaveDocument: (doc: DocumentInput): Promise<void> =>
    ipcRenderer.invoke('db:saveDocument', doc),
  dbGetDocument: (docId: string): Promise<StoredDocument | null> =>
    ipcRenderer.invoke('db:getDocument', docId),
  dbGetDocumentsBySession: (sessionId: string): Promise<StoredDocument[]> =>
    ipcRenderer.invoke('db:getDocumentsBySession', sessionId),
  dbDeleteDocument: (docId: string): Promise<boolean> =>
    ipcRenderer.invoke('db:deleteDocument', docId),
  dbSearchDocumentsByEmbedding: (sessionId: string, queryEmbedding: number[], limit?: number): Promise<Array<StoredDocument & { similarity: number }>> =>
    ipcRenderer.invoke('db:searchDocumentsByEmbedding', sessionId, queryEmbedding, limit),
  dbGetStats: (): Promise<DbStats> =>
    ipcRenderer.invoke('db:getStats'),

  // Recent projects
  recentProjectsAdd: (input: RecentProjectInput): Promise<RecentProject> =>
    ipcRenderer.invoke('recentProjects:add', input),
  recentProjectsList: (limit?: number): Promise<RecentProject[]> =>
    ipcRenderer.invoke('recentProjects:list', limit),
  recentProjectsRemove: (projectId: string): Promise<boolean> =>
    ipcRenderer.invoke('recentProjects:remove', projectId),
  recentProjectsRemoveByPath: (path: string): Promise<boolean> =>
    ipcRenderer.invoke('recentProjects:removeByPath', path),
  recentProjectsClear: (): Promise<number> =>
    ipcRenderer.invoke('recentProjects:clear'),
  recentProjectsGetByPath: (path: string): Promise<RecentProject | null> =>
    ipcRenderer.invoke('recentProjects:getByPath', path),

  // Secure storage for API keys
  secureStorageSetApiKey: (type: ApiKeyType, key: string): Promise<boolean> =>
    ipcRenderer.invoke('secureStorage:setApiKey', type, key),
  secureStorageGetApiKey: (type: ApiKeyType): Promise<string | null> =>
    ipcRenderer.invoke('secureStorage:getApiKey', type),
  secureStorageDeleteApiKey: (type: ApiKeyType): Promise<boolean> =>
    ipcRenderer.invoke('secureStorage:deleteApiKey', type),
  secureStorageHasApiKey: (type: ApiKeyType): Promise<boolean> =>
    ipcRenderer.invoke('secureStorage:hasApiKey', type),
  secureStorageListStoredKeys: (): Promise<ApiKeyType[]> =>
    ipcRenderer.invoke('secureStorage:listStoredKeys'),
  secureStorageIsEncryptionAvailable: (): Promise<boolean> =>
    ipcRenderer.invoke('secureStorage:isEncryptionAvailable'),

  // Model router
  modelRouterClassifyTask: (prompt: string, context?: { selectedText?: string; taskType?: TaskType }): Promise<TaskClassification> =>
    ipcRenderer.invoke('modelRouter:classifyTask', prompt, context),
  modelRouterGetModelForComplexity: (complexity: TaskComplexity): Promise<ModelId> =>
    ipcRenderer.invoke('modelRouter:getModelForComplexity', complexity),
  modelRouterGetModelByName: (name: 'haiku' | 'sonnet' | 'opus'): Promise<ModelId> =>
    ipcRenderer.invoke('modelRouter:getModelByName', name),
  modelRouterGetAvailableModels: (): Promise<ModelInfo[]> =>
    ipcRenderer.invoke('modelRouter:getAvailableModels'),
  modelRouterSetDefaultModel: (model: ModelId): Promise<void> =>
    ipcRenderer.invoke('modelRouter:setDefaultModel', model),
  modelRouterGetDefaultModel: (): Promise<ModelId> =>
    ipcRenderer.invoke('modelRouter:getDefaultModel'),
  modelRouterGetModelConstants: (): Promise<ClaudeModels> =>
    ipcRenderer.invoke('modelRouter:getModelConstants'),

  // Context manager
  contextManagerInitialize: (apiKey: string): Promise<void> =>
    ipcRenderer.invoke('contextManager:initialize', apiKey),
  contextManagerIsInitialized: (): Promise<boolean> =>
    ipcRenderer.invoke('contextManager:isInitialized'),
  contextManagerAddEvent: (
    sessionId: string,
    type: ContextEventType,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ContextEvent> =>
    ipcRenderer.invoke('contextManager:addEvent', sessionId, type, content, metadata),
  contextManagerGetEvents: (sessionId: string): Promise<ContextEvent[]> =>
    ipcRenderer.invoke('contextManager:getEvents', sessionId),
  contextManagerGetStats: (sessionId: string): Promise<ContextStats | null> =>
    ipcRenderer.invoke('contextManager:getStats', sessionId),
  contextManagerShouldCompact: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('contextManager:shouldCompact', sessionId),
  contextManagerCompact: (sessionId: string): Promise<CompactionResult> =>
    ipcRenderer.invoke('contextManager:compact', sessionId),
  contextManagerGetFullContext: (sessionId: string): Promise<string> =>
    ipcRenderer.invoke('contextManager:getFullContext', sessionId),
  contextManagerGetContextAsMessages: (sessionId: string): Promise<MessageParam[]> =>
    ipcRenderer.invoke('contextManager:getContextAsMessages', sessionId),
  contextManagerClearSession: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('contextManager:clearSession', sessionId),
  contextManagerConfigure: (options: {
    compactionThreshold?: number;
    recentEventsToKeep?: number;
  }): Promise<void> =>
    ipcRenderer.invoke('contextManager:configure', options),
  contextManagerGetConfiguration: (): Promise<ContextConfiguration> =>
    ipcRenderer.invoke('contextManager:getConfiguration'),
  contextManagerGetSummaries: (sessionId: string): Promise<CompactionSummary[]> =>
    ipcRenderer.invoke('contextManager:getSummaries', sessionId),

  // Prompt library
  promptSave: (prompt: PromptInput): Promise<void> =>
    ipcRenderer.invoke('prompt:save', prompt),
  promptGet: (promptId: string): Promise<StoredPrompt | null> =>
    ipcRenderer.invoke('prompt:get', promptId),
  promptListAll: (): Promise<StoredPrompt[]> =>
    ipcRenderer.invoke('prompt:listAll'),
  promptDelete: (promptId: string): Promise<boolean> =>
    ipcRenderer.invoke('prompt:delete', promptId),

  // OpenRouter/Perplexity research
  openRouterInitialize: (apiKey: string): Promise<boolean> =>
    ipcRenderer.invoke('openRouter:initialize', apiKey),
  openRouterIsInitialized: (): Promise<boolean> =>
    ipcRenderer.invoke('openRouter:isInitialized'),
  openRouterValidateApiKey: (apiKey: string): Promise<boolean> =>
    ipcRenderer.invoke('openRouter:validateApiKey', apiKey),
  openRouterResearch: (query: string, options?: ResearchOptions): Promise<ResearchResponse> =>
    ipcRenderer.invoke('openRouter:research', query, options),
  openRouterResearchStream: (query: string, options?: ResearchOptions): Promise<void> =>
    ipcRenderer.invoke('openRouter:researchStream', query, options),
  openRouterGetModel: (): Promise<string> =>
    ipcRenderer.invoke('openRouter:getModel'),
  onOpenRouterStreamChunk: (callback: (chunk: OpenRouterStreamChunk) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: OpenRouterStreamChunk) => {
      callback(chunk);
    };
    ipcRenderer.on('openRouter:streamChunk', handler);
    return () => ipcRenderer.removeListener('openRouter:streamChunk', handler);
  },

  // Gemini/Deep Research
  geminiInitialize: (apiKey: string): Promise<boolean> =>
    ipcRenderer.invoke('gemini:initialize', apiKey),
  geminiIsInitialized: (): Promise<boolean> =>
    ipcRenderer.invoke('gemini:isInitialized'),
  geminiValidateApiKey: (apiKey: string): Promise<boolean> =>
    ipcRenderer.invoke('gemini:validateApiKey', apiKey),
  geminiDeepResearch: (query: string, options?: DeepResearchOptions): Promise<DeepResearchResponse> =>
    ipcRenderer.invoke('gemini:deepResearch', query, options),
  geminiDeepResearchStream: (query: string, options?: DeepResearchOptions): Promise<void> =>
    ipcRenderer.invoke('gemini:deepResearchStream', query, options),
  geminiGetModel: (): Promise<string> =>
    ipcRenderer.invoke('gemini:getModel'),
  geminiGetProgressCheckpoints: (): Promise<number[]> =>
    ipcRenderer.invoke('gemini:getProgressCheckpoints'),
  onGeminiProgressCheckpoint: (callback: (progress: ProgressCheckpoint) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ProgressCheckpoint) => {
      callback(progress);
    };
    ipcRenderer.on('gemini:progressCheckpoint', handler);
    return () => ipcRenderer.removeListener('gemini:progressCheckpoint', handler);
  },
  onGeminiStreamChunk: (callback: (chunk: GeminiStreamChunk) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: GeminiStreamChunk) => {
      callback(chunk);
    };
    ipcRenderer.on('gemini:streamChunk', handler);
    return () => ipcRenderer.removeListener('gemini:streamChunk', handler);
  },

  // Image Editor (Nano Banana)
  imageEditorInitialize: (): Promise<boolean> =>
    ipcRenderer.invoke('imageEditor:initialize'),
  imageEditorIsInitialized: (): Promise<boolean> =>
    ipcRenderer.invoke('imageEditor:isInitialized'),
  imageEditorProcessImage: (request: ImageEditRequest): Promise<ImageEditResponse> =>
    ipcRenderer.invoke('imageEditor:processImage', request),
  imageEditorValidateImage: (imageBase64: string, mimeType: string): Promise<{ valid: boolean; error?: string }> =>
    ipcRenderer.invoke('imageEditor:validateImage', imageBase64, mimeType),
  imageEditorGetModel: (): Promise<string> =>
    ipcRenderer.invoke('imageEditor:getModel'),
  imageEditorGetMaxImageSize: (): Promise<number> =>
    ipcRenderer.invoke('imageEditor:getMaxImageSize'),
  imageEditorGetSupportedMimeTypes: (): Promise<readonly string[]> =>
    ipcRenderer.invoke('imageEditor:getSupportedMimeTypes'),
  imageEditorGenerateHistoryId: (): Promise<string> =>
    ipcRenderer.invoke('imageEditor:generateHistoryId'),

  // Image Editor database (history persistence)
  imageEditorSaveToHistory: (edit: ImageEditInput): Promise<void> =>
    ipcRenderer.invoke('imageEditor:saveToHistory', edit),
  imageEditorGetHistory: (projectId: string): Promise<StoredImageEdit[]> =>
    ipcRenderer.invoke('imageEditor:getHistory', projectId),
  imageEditorClearHistory: (projectId: string): Promise<number> =>
    ipcRenderer.invoke('imageEditor:clearHistory', projectId),
  imageEditorRevertToEdit: (projectId: string, editId: string): Promise<number> =>
    ipcRenderer.invoke('imageEditor:revertToEdit', projectId, editId),
  imageEditorGetHistoryCount: (projectId: string): Promise<number> =>
    ipcRenderer.invoke('imageEditor:getHistoryCount', projectId),

  // Research router
  researchRouterGetProvider: (mode: ResearchMode, phase?: ProjectPhase): Promise<ResearchProvider> =>
    ipcRenderer.invoke('researchRouter:getProvider', mode, phase),
  researchRouterIsProviderAvailable: (provider: ResearchProvider): Promise<boolean> =>
    ipcRenderer.invoke('researchRouter:isProviderAvailable', provider),
  researchRouterGetAvailableProviders: (): Promise<ResearchProvider[]> =>
    ipcRenderer.invoke('researchRouter:getAvailableProviders'),
  researchRouterSetDefaultMode: (mode: ResearchMode): Promise<void> =>
    ipcRenderer.invoke('researchRouter:setDefaultMode', mode),
  researchRouterGetDefaultMode: (): Promise<ResearchMode> =>
    ipcRenderer.invoke('researchRouter:getDefaultMode'),
  researchRouterGetPhaseRouting: (phase: ProjectPhase): Promise<PhaseConfig> =>
    ipcRenderer.invoke('researchRouter:getPhaseRouting', phase),
  researchRouterResearch: (query: string, options?: RoutedResearchOptions): Promise<UnifiedResearchResponse> =>
    ipcRenderer.invoke('researchRouter:research', query, options),
  researchRouterResearchStream: (query: string, options?: RoutedResearchOptions): Promise<void> =>
    ipcRenderer.invoke('researchRouter:researchStream', query, options),
  researchRouterGetModeDescriptions: (): Promise<Record<ResearchMode, string>> =>
    ipcRenderer.invoke('researchRouter:getModeDescriptions'),
  researchRouterGetPhaseDescriptions: (): Promise<Record<ProjectPhase, string>> =>
    ipcRenderer.invoke('researchRouter:getPhaseDescriptions'),
  researchRouterGetAvailableModes: (): Promise<ResearchMode[]> =>
    ipcRenderer.invoke('researchRouter:getAvailableModes'),
  researchRouterGetProjectPhases: (): Promise<ProjectPhase[]> =>
    ipcRenderer.invoke('researchRouter:getProjectPhases'),
  // Research cancellation
  researchRouterStartSession: (): Promise<string> =>
    ipcRenderer.invoke('researchRouter:startSession'),
  researchRouterCancelResearch: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('researchRouter:cancelResearch', sessionId),
  researchRouterEndSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('researchRouter:endSession', sessionId),
  researchRouterGetActiveSessions: (): Promise<string[]> =>
    ipcRenderer.invoke('researchRouter:getActiveSessions'),
  onResearchRouterStreamChunk: (callback: (chunk: UnifiedStreamChunk) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: UnifiedStreamChunk) => {
      callback(chunk);
    };
    ipcRenderer.on('researchRouter:streamChunk', handler);
    return () => ipcRenderer.removeListener('researchRouter:streamChunk', handler);
  },

  // Citation management
  citationLoadCitations: (documentPath: string): Promise<CitationFile> =>
    ipcRenderer.invoke('citation:loadCitations', documentPath),
  citationSaveCitations: (documentPath: string, citationFile: CitationFile): Promise<void> =>
    ipcRenderer.invoke('citation:saveCitations', documentPath, citationFile),
  citationAddCitation: (documentPath: string, input: AddCitationInput): Promise<ManagedCitation> =>
    ipcRenderer.invoke('citation:addCitation', documentPath, input),
  citationAddCitations: (documentPath: string, inputs: AddCitationInput[]): Promise<ManagedCitation[]> =>
    ipcRenderer.invoke('citation:addCitations', documentPath, inputs),
  citationUpdateCitation: (documentPath: string, citationId: string, updates: Partial<AddCitationInput>): Promise<ManagedCitation | null> =>
    ipcRenderer.invoke('citation:updateCitation', documentPath, citationId, updates),
  citationRemoveCitation: (documentPath: string, citationId: string): Promise<boolean> =>
    ipcRenderer.invoke('citation:removeCitation', documentPath, citationId),
  citationAddUsage: (documentPath: string, citationId: string, usage: CitationUsage): Promise<boolean> =>
    ipcRenderer.invoke('citation:addUsage', documentPath, citationId, usage),
  citationGetCitationByNumber: (documentPath: string, number: number): Promise<ManagedCitation | null> =>
    ipcRenderer.invoke('citation:getCitationByNumber', documentPath, number),
  citationGenerateReferenceList: (documentPath: string, options?: ReferenceListOptions): Promise<FormattedReference[]> =>
    ipcRenderer.invoke('citation:generateReferenceList', documentPath, options),
  citationGenerateReferenceListMarkdown: (documentPath: string, options?: ReferenceListOptions): Promise<string> =>
    ipcRenderer.invoke('citation:generateReferenceListMarkdown', documentPath, options),
  citationFormatTextWithCitations: (text: string, citations: ManagedCitation[]): Promise<string> =>
    ipcRenderer.invoke('citation:formatTextWithCitations', text, citations),
  citationHasCitations: (documentPath: string): Promise<boolean> =>
    ipcRenderer.invoke('citation:hasCitations', documentPath),
  citationGetCitationCount: (documentPath: string): Promise<number> =>
    ipcRenderer.invoke('citation:getCitationCount', documentPath),
  citationDeleteCitationFile: (documentPath: string): Promise<boolean> =>
    ipcRenderer.invoke('citation:deleteCitationFile', documentPath),
  citationGetCitationFilePath: (documentPath: string): Promise<string> =>
    ipcRenderer.invoke('citation:getCitationFilePath', documentPath),

  // Citation verification (OpenAlex + Crossref APIs)
  citationVerifyCitation: (query: CitationVerificationQuery): Promise<CitationVerificationResult> =>
    ipcRenderer.invoke('citationVerification:verifyCitation', query),
  citationVerifyCitations: (queries: CitationVerificationQuery[]): Promise<Map<number, CitationVerificationResult>> =>
    ipcRenderer.invoke('citationVerification:verifyCitations', queries),
  citationVerificationClearCache: (): Promise<number> =>
    ipcRenderer.invoke('citationVerification:clearCache'),
  citationVerificationGetCacheStats: (): Promise<CitationVerificationCacheStats> =>
    ipcRenderer.invoke('citationVerification:getCacheStats'),

  // Citation attachment (attaching citations during AI generation)
  citationAttachCitations: (
    documentPath: string,
    generatedText: string,
    sources: RAGSource[],
    options?: AttachmentOptions
  ): Promise<AttachmentResult> =>
    ipcRenderer.invoke('citationAttachment:attachCitations', documentPath, generatedText, sources, options),
  citationRelocateCitations: (
    documentPath: string,
    newText: string
  ): Promise<{ relocated: number; lost: number }> =>
    ipcRenderer.invoke('citationAttachment:relocateCitations', documentPath, newText),
  citationGetSourceClaimLinks: (documentPath: string): Promise<SourceClaimLink[]> =>
    ipcRenderer.invoke('citationAttachment:getSourceClaimLinks', documentPath),
  citationCleanupOrphanedLinks: (documentPath: string): Promise<number> =>
    ipcRenderer.invoke('citationAttachment:cleanupOrphanedLinks', documentPath),
  citationConvertResearchCitations: (
    citations: Array<{ url: string; title?: string; snippet?: string; domain?: string }>,
    provider: 'perplexity' | 'gemini'
  ): Promise<RAGSource[]> =>
    ipcRenderer.invoke('citationAttachment:convertResearchCitations', citations, provider),

  // Confidence Scoring
  confidenceComputeParagraph: (text: string, paragraphIndex?: number): Promise<ParagraphConfidence> =>
    ipcRenderer.invoke('confidence:computeParagraph', text, paragraphIndex),
  confidenceComputeDocument: (content: string, documentPath?: string): Promise<DocumentConfidence> =>
    ipcRenderer.invoke('confidence:computeDocument', content, documentPath),
  confidenceGetCached: (documentPath: string): Promise<DocumentConfidence | undefined> =>
    ipcRenderer.invoke('confidence:getCached', documentPath),
  confidenceClearCache: (documentPath?: string): Promise<void> =>
    ipcRenderer.invoke('confidence:clearCache', documentPath),
  confidenceGetThreshold: (): Promise<number> =>
    ipcRenderer.invoke('confidence:getThreshold'),
  confidenceSetThreshold: (threshold: number): Promise<void> =>
    ipcRenderer.invoke('confidence:setThreshold', threshold),
  confidenceGetConfig: (): Promise<ConfidenceScoringConfig> =>
    ipcRenderer.invoke('confidence:getConfig'),
  confidenceUpdateConfig: (config: Partial<ConfidenceScoringConfig>): Promise<void> =>
    ipcRenderer.invoke('confidence:updateConfig', config),
  confidenceProcessStreaming: (sessionId: string, newText: string, fullText: string): Promise<void> =>
    ipcRenderer.invoke('confidence:processStreaming', sessionId, newText, fullText),
  onConfidenceStreamUpdate: (callback: (update: ConfidenceStreamUpdate) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, update: ConfidenceStreamUpdate) => callback(update);
    ipcRenderer.on('confidence:streamUpdate', listener);
    return () => ipcRenderer.removeListener('confidence:streamUpdate', listener);
  },

  // Review Queue
  reviewScanDocument: (documentPath: string, content: string, options?: ReviewScanOptions): Promise<DocumentReviewQueue> =>
    ipcRenderer.invoke('review:scanDocument', documentPath, content, options),
  reviewGetQueue: (documentPath: string): Promise<DocumentReviewQueue | undefined> =>
    ipcRenderer.invoke('review:getQueue', documentPath),
  reviewGetItem: (documentPath: string, itemId: string): Promise<ReviewItem | undefined> =>
    ipcRenderer.invoke('review:getItem', documentPath, itemId),
  reviewGetPendingItems: (documentPath: string): Promise<ReviewItem[]> =>
    ipcRenderer.invoke('review:getPendingItems', documentPath),
  reviewAcceptItem: (documentPath: string, itemId: string): Promise<ReviewItem | undefined> =>
    ipcRenderer.invoke('review:acceptItem', documentPath, itemId),
  reviewEditItem: (documentPath: string, itemId: string, editedText: string): Promise<ReviewItem | undefined> =>
    ipcRenderer.invoke('review:editItem', documentPath, itemId, editedText),
  reviewRemoveItem: (documentPath: string, itemId: string, reason?: string): Promise<ReviewItem | undefined> =>
    ipcRenderer.invoke('review:removeItem', documentPath, itemId, reason),
  reviewDismissItem: (documentPath: string, itemId: string): Promise<ReviewItem | undefined> =>
    ipcRenderer.invoke('review:dismissItem', documentPath, itemId),
  reviewClearQueue: (documentPath: string): Promise<void> =>
    ipcRenderer.invoke('review:clearQueue', documentPath),
  reviewGetDocumentsWithPendingReviews: (): Promise<string[]> =>
    ipcRenderer.invoke('review:getDocumentsWithPendingReviews'),
  reviewGetThreshold: (): Promise<number> =>
    ipcRenderer.invoke('review:getThreshold'),
  reviewSetThreshold: (threshold: number): Promise<void> =>
    ipcRenderer.invoke('review:setThreshold', threshold),

  // Hallucination Dashboard
  dashboardAnalyzeDocument: (documentPath: string, projectPath: string, content: string): Promise<DocumentMetrics> =>
    ipcRenderer.invoke('dashboard:analyzeDocument', documentPath, projectPath, content),
  dashboardGetDocumentMetrics: (documentPath: string): Promise<DocumentMetrics | null> =>
    ipcRenderer.invoke('dashboard:getDocumentMetrics', documentPath),
  dashboardGetProjectMetrics: (projectPath: string): Promise<ProjectMetrics> =>
    ipcRenderer.invoke('dashboard:getProjectMetrics', projectPath),
  dashboardGetTrendData: (projectPath: string, startDate?: string, endDate?: string): Promise<TrendData> =>
    ipcRenderer.invoke('dashboard:getTrendData', projectPath, startDate, endDate),
  dashboardExportReport: (projectPath: string, options: DashboardExportOptions): Promise<string> =>
    ipcRenderer.invoke('dashboard:exportReport', projectPath, options),
  dashboardClearProjectMetrics: (projectPath: string): Promise<number> =>
    ipcRenderer.invoke('dashboard:clearProjectMetrics', projectPath),
  dashboardClearAllMetrics: (): Promise<number> =>
    ipcRenderer.invoke('dashboard:clearAllMetrics'),

  // PDF generation
  pdfIsPandocAvailable: (): Promise<boolean> =>
    ipcRenderer.invoke('pdf:isPandocAvailable'),
  pdfGetPandocVersion: (): Promise<string | null> =>
    ipcRenderer.invoke('pdf:getPandocVersion'),
  pdfGeneratePDF: (markdownContent: string, outputPath: string, options?: PDFGenerationOptions): Promise<PDFGenerationResult> =>
    ipcRenderer.invoke('pdf:generatePDF', markdownContent, outputPath, options),
  pdfGeneratePDFFromDocument: (documentPath: string, options?: PDFGenerationOptions): Promise<PDFGenerationResult> =>
    ipcRenderer.invoke('pdf:generatePDFFromDocument', documentPath, options),
  pdfGeneratePDFFromSections: (sections: PDFSection[], outputPath: string, options?: PDFGenerationOptions): Promise<PDFGenerationResult> =>
    ipcRenderer.invoke('pdf:generatePDFFromSections', sections, outputPath, options),
  pdfGeneratePreview: (pdfPath: string, outputPath: string, dpi?: number): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('pdf:generatePreview', pdfPath, outputPath, dpi),
  pdfCleanup: (): Promise<void> =>
    ipcRenderer.invoke('pdf:cleanup'),

  // DOCX generation
  docxGenerateDOCX: (markdownContent: string, outputPath: string, options?: DOCXGenerationOptions): Promise<DOCXGenerationResult> =>
    ipcRenderer.invoke('docx:generateDOCX', markdownContent, outputPath, options),
  docxGenerateDOCXFromDocument: (documentPath: string, options?: DOCXGenerationOptions): Promise<DOCXGenerationResult> =>
    ipcRenderer.invoke('docx:generateDOCXFromDocument', documentPath, options),
  docxGenerateDOCXFromSections: (sections: DOCXSection[], outputPath: string, options?: DOCXGenerationOptions): Promise<DOCXGenerationResult> =>
    ipcRenderer.invoke('docx:generateDOCXFromSections', sections, outputPath, options),

  // PPTX generation
  pptxGeneratePPTX: (markdownContent: string, outputPath: string, options?: PPTXGenerationOptions): Promise<PPTXGenerationResult> =>
    ipcRenderer.invoke('pptx:generatePPTX', markdownContent, outputPath, options),
  pptxGeneratePPTXFromDocument: (documentPath: string, options?: PPTXGenerationOptions): Promise<PPTXGenerationResult> =>
    ipcRenderer.invoke('pptx:generatePPTXFromDocument', documentPath, options),
  pptxGeneratePPTXFromSections: (sections: PPTXSection[], outputPath: string, options?: PPTXGenerationOptions): Promise<PPTXGenerationResult> =>
    ipcRenderer.invoke('pptx:generatePPTXFromSections', sections, outputPath, options),
  pptxGetAvailableThemes: (): Promise<string[]> =>
    ipcRenderer.invoke('pptx:getAvailableThemes'),
  pptxGetTheme: (themeName: string): Promise<PPTXTheme | null> =>
    ipcRenderer.invoke('pptx:getTheme', themeName),

  // Phase orchestrator
  orchestratorStart: (config: PhaseOrchestratorConfig): Promise<void> =>
    ipcRenderer.invoke('orchestrator:start', config),
  orchestratorPause: (): Promise<boolean> =>
    ipcRenderer.invoke('orchestrator:pause'),
  orchestratorResume: (): Promise<void> =>
    ipcRenderer.invoke('orchestrator:resume'),
  orchestratorStop: (): Promise<boolean> =>
    ipcRenderer.invoke('orchestrator:stop'),
  orchestratorSkipCurrentPhase: (): Promise<boolean> =>
    ipcRenderer.invoke('orchestrator:skipCurrentPhase'),
  orchestratorGetExecutionState: (): Promise<ProjectExecutionState | null> =>
    ipcRenderer.invoke('orchestrator:getExecutionState'),
  orchestratorIsRunning: (): Promise<boolean> =>
    ipcRenderer.invoke('orchestrator:isRunning'),
  orchestratorIsPaused: (): Promise<boolean> =>
    ipcRenderer.invoke('orchestrator:isPaused'),
  orchestratorIsWaitingForApproval: (): Promise<boolean> =>
    ipcRenderer.invoke('orchestrator:isWaitingForApproval'),
  orchestratorApproveAndContinue: (): Promise<boolean> =>
    ipcRenderer.invoke('orchestrator:approveAndContinue'),
  orchestratorRevisePhase: (feedback: string): Promise<boolean> =>
    ipcRenderer.invoke('orchestrator:revisePhase', feedback),
  orchestratorGetCurrentPhase: (): Promise<PhaseState | null> =>
    ipcRenderer.invoke('orchestrator:getCurrentPhase'),
  orchestratorGetPhaseDisplayName: (phase: ProjectPhase): Promise<string> =>
    ipcRenderer.invoke('orchestrator:getPhaseDisplayName', phase),
  orchestratorGetOverallProgress: (): Promise<number> =>
    ipcRenderer.invoke('orchestrator:getOverallProgress'),
  orchestratorGetPhaseStates: (): Promise<PhaseState[]> =>
    ipcRenderer.invoke('orchestrator:getPhaseStates'),
  orchestratorCleanup: (): Promise<void> =>
    ipcRenderer.invoke('orchestrator:cleanup'),
  // Orchestrator event listeners
  onOrchestratorPhaseStart: (callback: (phase: ProjectPhase, phaseIndex: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, phase: ProjectPhase, phaseIndex: number) => {
      callback(phase, phaseIndex);
    };
    ipcRenderer.on('orchestrator:phase:start', handler);
    return () => ipcRenderer.removeListener('orchestrator:phase:start', handler);
  },
  onOrchestratorPhaseProgress: (callback: (phase: ProjectPhase, progress: number, content: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, phase: ProjectPhase, progress: number, content: string) => {
      callback(phase, progress, content);
    };
    ipcRenderer.on('orchestrator:phase:progress', handler);
    return () => ipcRenderer.removeListener('orchestrator:phase:progress', handler);
  },
  onOrchestratorPhaseComplete: (callback: (phase: ProjectPhase, output: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, phase: ProjectPhase, output: string) => {
      callback(phase, output);
    };
    ipcRenderer.on('orchestrator:phase:complete', handler);
    return () => ipcRenderer.removeListener('orchestrator:phase:complete', handler);
  },
  onOrchestratorPhaseError: (callback: (phase: ProjectPhase, error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, phase: ProjectPhase, error: string) => {
      callback(phase, error);
    };
    ipcRenderer.on('orchestrator:phase:error', handler);
    return () => ipcRenderer.removeListener('orchestrator:phase:error', handler);
  },
  onOrchestratorPhaseAwaitingApproval: (callback: (phase: ProjectPhase, phaseIndex: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, phase: ProjectPhase, phaseIndex: number) => {
      callback(phase, phaseIndex);
    };
    ipcRenderer.on('orchestrator:phase:awaiting_approval', handler);
    return () => ipcRenderer.removeListener('orchestrator:phase:awaiting_approval', handler);
  },
  onOrchestratorStart: (callback: (state: ProjectExecutionState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ProjectExecutionState) => {
      callback(state);
    };
    ipcRenderer.on('orchestrator:orchestration:start', handler);
    return () => ipcRenderer.removeListener('orchestrator:orchestration:start', handler);
  },
  onOrchestratorPause: (callback: (state: ProjectExecutionState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ProjectExecutionState) => {
      callback(state);
    };
    ipcRenderer.on('orchestrator:orchestration:pause', handler);
    return () => ipcRenderer.removeListener('orchestrator:orchestration:pause', handler);
  },
  onOrchestratorResume: (callback: (state: ProjectExecutionState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ProjectExecutionState) => {
      callback(state);
    };
    ipcRenderer.on('orchestrator:orchestration:resume', handler);
    return () => ipcRenderer.removeListener('orchestrator:orchestration:resume', handler);
  },
  onOrchestratorComplete: (callback: (state: ProjectExecutionState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ProjectExecutionState) => {
      callback(state);
    };
    ipcRenderer.on('orchestrator:orchestration:complete', handler);
    return () => ipcRenderer.removeListener('orchestrator:orchestration:complete', handler);
  },
  onOrchestratorError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => {
      callback(error);
    };
    ipcRenderer.on('orchestrator:orchestration:error', handler);
    return () => ipcRenderer.removeListener('orchestrator:orchestration:error', handler);
  },
  onOrchestratorStateUpdate: (callback: (state: ProjectExecutionState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ProjectExecutionState) => {
      callback(state);
    };
    ipcRenderer.on('orchestrator:state:update', handler);
    return () => ipcRenderer.removeListener('orchestrator:state:update', handler);
  },

  // Checkpoint API
  checkpointSave: (): Promise<CheckpointData | null> =>
    ipcRenderer.invoke('checkpoint:save'),
  checkpointHasResumable: (projectPath: string): Promise<boolean> =>
    ipcRenderer.invoke('checkpoint:hasResumable', projectPath),
  checkpointGetForProject: (projectPath: string): Promise<CheckpointData | null> =>
    ipcRenderer.invoke('checkpoint:getForProject', projectPath),
  checkpointResumeFromCheckpoint: (checkpointId: string): Promise<void> =>
    ipcRenderer.invoke('checkpoint:resumeFromCheckpoint', checkpointId),
  checkpointDelete: (checkpointId: string): Promise<boolean> =>
    ipcRenderer.invoke('checkpoint:delete', checkpointId),
  checkpointDeleteForProject: (projectPath: string): Promise<number> =>
    ipcRenderer.invoke('checkpoint:deleteForProject', projectPath),
  checkpointGetCurrentId: (): Promise<string | null> =>
    ipcRenderer.invoke('checkpoint:getCurrentId'),
  onCheckpointSaved: (callback: (checkpoint: CheckpointData) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, checkpoint: CheckpointData) => {
      callback(checkpoint);
    };
    ipcRenderer.on('checkpoint:saved', handler);
    return () => ipcRenderer.removeListener('checkpoint:saved', handler);
  },
  onCheckpointResumed: (callback: (checkpoint: CheckpointData) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, checkpoint: CheckpointData) => {
      callback(checkpoint);
    };
    ipcRenderer.on('checkpoint:resumed', handler);
    return () => ipcRenderer.removeListener('checkpoint:resumed', handler);
  },

  // Update service
  updateCheckForUpdates: (): Promise<UpdateInfo | null> =>
    ipcRenderer.invoke('update:checkForUpdates'),
  updateDownloadUpdate: (): Promise<void> =>
    ipcRenderer.invoke('update:downloadUpdate'),
  updateQuitAndInstall: (): Promise<void> =>
    ipcRenderer.invoke('update:quitAndInstall'),
  updateGetStatus: (): Promise<UpdateStatus> =>
    ipcRenderer.invoke('update:getStatus'),
  updateGetUpdateInfo: (): Promise<UpdateInfo | null> =>
    ipcRenderer.invoke('update:getUpdateInfo'),
  updateGetCurrentVersion: (): Promise<string> =>
    ipcRenderer.invoke('update:getCurrentVersion'),
  updateGetReleaseNotes: (): Promise<string> =>
    ipcRenderer.invoke('update:getReleaseNotes'),
  updateSetAutoDownload: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('update:setAutoDownload', enabled),
  updateSetAllowPrerelease: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('update:setAllowPrerelease', enabled),
  updateResetStatus: (): Promise<void> =>
    ipcRenderer.invoke('update:resetStatus'),
  onUpdateEvent: (callback: (event: UpdateEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, updateEvent: UpdateEvent) => {
      callback(updateEvent);
    };
    ipcRenderer.on('update:event', handler);
    return () => ipcRenderer.removeListener('update:event', handler);
  },
});

// Type declaration for the renderer
declare global {
  interface Window {
    electronAPI: {
      checkPermissions: () => Promise<PermissionsResult>;
      openSystemPreferences: (pane: 'files' | 'network') => Promise<void>;
      getPlatform: () => string;
      getAppVersion: () => Promise<string>;
      selectDirectory: () => Promise<string | null>;
      readDirectory: (dirPath: string) => Promise<FileNode[]>;
      readFile: (filePath: string) => Promise<FileContent>;
      listAllFiles: (basePath: string) => Promise<QuickOpenFile[]>;
      searchInFiles: (basePath: string, query: string, options?: SearchOptions) => Promise<SearchResult[]>;
      writeFile: (filePath: string, content: string) => Promise<void>;
      setProjectPath: (projectPath: string) => Promise<void>;
      isPathAllowed: (filePath: string) => Promise<boolean>;

      // Agent service
      agentInitialize: (apiKey: string) => Promise<boolean>;
      agentIsInitialized: () => Promise<boolean>;
      agentValidateApiKey: (apiKey: string) => Promise<boolean>;
      agentCreateSession: (options?: CreateSessionOptions) => Promise<AgentSession>;
      agentGetSession: (sessionId: string) => Promise<AgentSession | undefined>;
      agentDeleteSession: (sessionId: string) => Promise<boolean>;
      agentListSessions: () => Promise<AgentSession[]>;
      agentSendMessage: (sessionId: string, userMessage: string, options?: SendMessageOptions) => Promise<MessageResponse>;
      agentSendMessageStream: (sessionId: string, userMessage: string, options?: SendMessageOptions) => Promise<void>;
      agentResumeSession: (sessionId: string, messages: MessageParam[], model?: string) => Promise<AgentSession>;
      agentGetConversationHistory: (sessionId: string) => Promise<MessageParam[]>;
      agentClearConversationHistory: (sessionId: string) => Promise<boolean>;
      // Structured output methods
      agentSendMessageParsed: (
        schemaName: StructuredOutputSchemaName,
        userMessage: string,
        options?: SendMessageParsedOptions
      ) => Promise<ParsedMessageResult>;
      agentSendSessionMessageParsed: (
        sessionId: string,
        schemaName: StructuredOutputSchemaName,
        userMessage: string,
        options?: SendMessageParsedOptions
      ) => Promise<ParsedMessageResult>;
      agentSendMessageParsedStream: (
        schemaName: StructuredOutputSchemaName,
        userMessage: string,
        options?: SendMessageParsedOptions
      ) => Promise<ParsedMessageResult>;
      agentListStructuredOutputSchemas: () => Promise<string[]>;
      onAgentStreamChunk: (callback: (sessionId: string, chunk: StreamChunk) => void) => () => void;
      onAgentParsedStreamChunk: (callback: (chunk: StreamChunk) => void) => () => void;

      // Database service
      dbIsInitialized: () => Promise<boolean>;
      dbSaveSession: (session: SessionInput) => Promise<void>;
      dbGetSession: (sessionId: string) => Promise<StoredSession | null>;
      dbGetSessionByProjectPath: (projectPath: string) => Promise<StoredSession | null>;
      dbListSessions: () => Promise<StoredSession[]>;
      dbDeleteSession: (sessionId: string) => Promise<boolean>;
      dbSaveDocument: (doc: DocumentInput) => Promise<void>;
      dbGetDocument: (docId: string) => Promise<StoredDocument | null>;
      dbGetDocumentsBySession: (sessionId: string) => Promise<StoredDocument[]>;
      dbDeleteDocument: (docId: string) => Promise<boolean>;
      dbSearchDocumentsByEmbedding: (sessionId: string, queryEmbedding: number[], limit?: number) => Promise<Array<StoredDocument & { similarity: number }>>;
      dbGetStats: () => Promise<DbStats>;

      // Recent projects
      recentProjectsAdd: (input: RecentProjectInput) => Promise<RecentProject>;
      recentProjectsList: (limit?: number) => Promise<RecentProject[]>;
      recentProjectsRemove: (projectId: string) => Promise<boolean>;
      recentProjectsRemoveByPath: (path: string) => Promise<boolean>;
      recentProjectsClear: () => Promise<number>;
      recentProjectsGetByPath: (path: string) => Promise<RecentProject | null>;

      // Secure storage for API keys
      secureStorageSetApiKey: (type: ApiKeyType, key: string) => Promise<boolean>;
      secureStorageGetApiKey: (type: ApiKeyType) => Promise<string | null>;
      secureStorageDeleteApiKey: (type: ApiKeyType) => Promise<boolean>;
      secureStorageHasApiKey: (type: ApiKeyType) => Promise<boolean>;
      secureStorageListStoredKeys: () => Promise<ApiKeyType[]>;
      secureStorageIsEncryptionAvailable: () => Promise<boolean>;

      // Model router
      modelRouterClassifyTask: (prompt: string, context?: { selectedText?: string; taskType?: TaskType }) => Promise<TaskClassification>;
      modelRouterGetModelForComplexity: (complexity: TaskComplexity) => Promise<ModelId>;
      modelRouterGetModelByName: (name: 'haiku' | 'sonnet' | 'opus') => Promise<ModelId>;
      modelRouterGetAvailableModels: () => Promise<ModelInfo[]>;
      modelRouterSetDefaultModel: (model: ModelId) => Promise<void>;
      modelRouterGetDefaultModel: () => Promise<ModelId>;
      modelRouterGetModelConstants: () => Promise<ClaudeModels>;

      // Context manager
      contextManagerInitialize: (apiKey: string) => Promise<void>;
      contextManagerIsInitialized: () => Promise<boolean>;
      contextManagerAddEvent: (
        sessionId: string,
        type: ContextEventType,
        content: string,
        metadata?: Record<string, unknown>
      ) => Promise<ContextEvent>;
      contextManagerGetEvents: (sessionId: string) => Promise<ContextEvent[]>;
      contextManagerGetStats: (sessionId: string) => Promise<ContextStats | null>;
      contextManagerShouldCompact: (sessionId: string) => Promise<boolean>;
      contextManagerCompact: (sessionId: string) => Promise<CompactionResult>;
      contextManagerGetFullContext: (sessionId: string) => Promise<string>;
      contextManagerGetContextAsMessages: (sessionId: string) => Promise<MessageParam[]>;
      contextManagerClearSession: (sessionId: string) => Promise<boolean>;
      contextManagerConfigure: (options: {
        compactionThreshold?: number;
        recentEventsToKeep?: number;
      }) => Promise<void>;
      contextManagerGetConfiguration: () => Promise<ContextConfiguration>;
      contextManagerGetSummaries: (sessionId: string) => Promise<CompactionSummary[]>;

      // Prompt library
      promptSave: (prompt: PromptInput) => Promise<void>;
      promptGet: (promptId: string) => Promise<StoredPrompt | null>;
      promptListAll: () => Promise<StoredPrompt[]>;
      promptDelete: (promptId: string) => Promise<boolean>;

      // OpenRouter/Perplexity research
      openRouterInitialize: (apiKey: string) => Promise<boolean>;
      openRouterIsInitialized: () => Promise<boolean>;
      openRouterValidateApiKey: (apiKey: string) => Promise<boolean>;
      openRouterResearch: (query: string, options?: ResearchOptions) => Promise<ResearchResponse>;
      openRouterResearchStream: (query: string, options?: ResearchOptions) => Promise<void>;
      openRouterGetModel: () => Promise<string>;
      onOpenRouterStreamChunk: (callback: (chunk: OpenRouterStreamChunk) => void) => () => void;

      // Gemini/Deep Research
      geminiInitialize: (apiKey: string) => Promise<boolean>;
      geminiIsInitialized: () => Promise<boolean>;
      geminiValidateApiKey: (apiKey: string) => Promise<boolean>;
      geminiDeepResearch: (query: string, options?: DeepResearchOptions) => Promise<DeepResearchResponse>;
      geminiDeepResearchStream: (query: string, options?: DeepResearchOptions) => Promise<void>;
      geminiGetModel: () => Promise<string>;
      geminiGetProgressCheckpoints: () => Promise<number[]>;
      onGeminiProgressCheckpoint: (callback: (progress: ProgressCheckpoint) => void) => () => void;
      onGeminiStreamChunk: (callback: (chunk: GeminiStreamChunk) => void) => () => void;

      // Image Editor (Nano Banana)
      imageEditorInitialize: () => Promise<boolean>;
      imageEditorIsInitialized: () => Promise<boolean>;
      imageEditorProcessImage: (request: ImageEditRequest) => Promise<ImageEditResponse>;
      imageEditorValidateImage: (imageBase64: string, mimeType: string) => Promise<{ valid: boolean; error?: string }>;
      imageEditorGetModel: () => Promise<string>;
      imageEditorGetMaxImageSize: () => Promise<number>;
      imageEditorGetSupportedMimeTypes: () => Promise<readonly string[]>;
      imageEditorGenerateHistoryId: () => Promise<string>;

      // Image Editor database (history persistence)
      imageEditorSaveToHistory: (edit: ImageEditInput) => Promise<void>;
      imageEditorGetHistory: (projectId: string) => Promise<StoredImageEdit[]>;
      imageEditorClearHistory: (projectId: string) => Promise<number>;
      imageEditorRevertToEdit: (projectId: string, editId: string) => Promise<number>;
      imageEditorGetHistoryCount: (projectId: string) => Promise<number>;

      // Research router
      researchRouterGetProvider: (mode: ResearchMode, phase?: ProjectPhase) => Promise<ResearchProvider>;
      researchRouterIsProviderAvailable: (provider: ResearchProvider) => Promise<boolean>;
      researchRouterGetAvailableProviders: () => Promise<ResearchProvider[]>;
      researchRouterSetDefaultMode: (mode: ResearchMode) => Promise<void>;
      researchRouterGetDefaultMode: () => Promise<ResearchMode>;
      researchRouterGetPhaseRouting: (phase: ProjectPhase) => Promise<PhaseConfig>;
      researchRouterResearch: (query: string, options?: RoutedResearchOptions) => Promise<UnifiedResearchResponse>;
      researchRouterResearchStream: (query: string, options?: RoutedResearchOptions) => Promise<void>;
      researchRouterGetModeDescriptions: () => Promise<Record<ResearchMode, string>>;
      researchRouterGetPhaseDescriptions: () => Promise<Record<ProjectPhase, string>>;
      researchRouterGetAvailableModes: () => Promise<ResearchMode[]>;
      researchRouterGetProjectPhases: () => Promise<ProjectPhase[]>;
      // Research cancellation
      researchRouterStartSession: () => Promise<string>;
      researchRouterCancelResearch: (sessionId: string) => Promise<boolean>;
      researchRouterEndSession: (sessionId: string) => Promise<void>;
      researchRouterGetActiveSessions: () => Promise<string[]>;
      onResearchRouterStreamChunk: (callback: (chunk: UnifiedStreamChunk) => void) => () => void;

      // Citation management
      citationLoadCitations: (documentPath: string) => Promise<CitationFile>;
      citationSaveCitations: (documentPath: string, citationFile: CitationFile) => Promise<void>;
      citationAddCitation: (documentPath: string, input: AddCitationInput) => Promise<ManagedCitation>;
      citationAddCitations: (documentPath: string, inputs: AddCitationInput[]) => Promise<ManagedCitation[]>;
      citationUpdateCitation: (documentPath: string, citationId: string, updates: Partial<AddCitationInput>) => Promise<ManagedCitation | null>;
      citationRemoveCitation: (documentPath: string, citationId: string) => Promise<boolean>;
      citationAddUsage: (documentPath: string, citationId: string, usage: CitationUsage) => Promise<boolean>;
      citationGetCitationByNumber: (documentPath: string, number: number) => Promise<ManagedCitation | null>;
      citationGenerateReferenceList: (documentPath: string, options?: ReferenceListOptions) => Promise<FormattedReference[]>;
      citationGenerateReferenceListMarkdown: (documentPath: string, options?: ReferenceListOptions) => Promise<string>;
      citationFormatTextWithCitations: (text: string, citations: ManagedCitation[]) => Promise<string>;
      citationHasCitations: (documentPath: string) => Promise<boolean>;
      citationGetCitationCount: (documentPath: string) => Promise<number>;
      citationDeleteCitationFile: (documentPath: string) => Promise<boolean>;
      citationGetCitationFilePath: (documentPath: string) => Promise<string>;

      // Citation verification
      citationVerifyCitation: (query: CitationVerificationQuery) => Promise<CitationVerificationResult>;
      citationVerifyCitations: (queries: CitationVerificationQuery[]) => Promise<Map<number, CitationVerificationResult>>;
      citationVerificationClearCache: () => Promise<number>;
      citationVerificationGetCacheStats: () => Promise<CitationVerificationCacheStats>;

      // Citation attachment
      citationAttachCitations: (
        documentPath: string,
        generatedText: string,
        sources: RAGSource[],
        options?: AttachmentOptions
      ) => Promise<AttachmentResult>;
      citationRelocateCitations: (
        documentPath: string,
        newText: string
      ) => Promise<{ relocated: number; lost: number }>;
      citationGetSourceClaimLinks: (documentPath: string) => Promise<SourceClaimLink[]>;
      citationCleanupOrphanedLinks: (documentPath: string) => Promise<number>;
      citationConvertResearchCitations: (
        citations: Array<{ url: string; title?: string; snippet?: string; domain?: string }>,
        provider: 'perplexity' | 'gemini'
      ) => Promise<RAGSource[]>;

      // Confidence Scoring
      confidenceComputeParagraph: (text: string, paragraphIndex?: number) => Promise<ParagraphConfidence>;
      confidenceComputeDocument: (content: string, documentPath?: string) => Promise<DocumentConfidence>;
      confidenceGetCached: (documentPath: string) => Promise<DocumentConfidence | undefined>;
      confidenceClearCache: (documentPath?: string) => Promise<void>;
      confidenceGetThreshold: () => Promise<number>;
      confidenceSetThreshold: (threshold: number) => Promise<void>;
      confidenceGetConfig: () => Promise<ConfidenceScoringConfig>;
      confidenceUpdateConfig: (config: Partial<ConfidenceScoringConfig>) => Promise<void>;
      confidenceProcessStreaming: (sessionId: string, newText: string, fullText: string) => Promise<void>;
      onConfidenceStreamUpdate: (callback: (update: ConfidenceStreamUpdate) => void) => () => void;

      // Review Queue
      reviewScanDocument: (documentPath: string, content: string, options?: ReviewScanOptions) => Promise<DocumentReviewQueue>;
      reviewGetQueue: (documentPath: string) => Promise<DocumentReviewQueue | undefined>;
      reviewGetItem: (documentPath: string, itemId: string) => Promise<ReviewItem | undefined>;
      reviewGetPendingItems: (documentPath: string) => Promise<ReviewItem[]>;
      reviewAcceptItem: (documentPath: string, itemId: string) => Promise<ReviewItem | undefined>;
      reviewEditItem: (documentPath: string, itemId: string, editedText: string) => Promise<ReviewItem | undefined>;
      reviewRemoveItem: (documentPath: string, itemId: string, reason?: string) => Promise<ReviewItem | undefined>;
      reviewDismissItem: (documentPath: string, itemId: string) => Promise<ReviewItem | undefined>;
      reviewClearQueue: (documentPath: string) => Promise<void>;
      reviewGetDocumentsWithPendingReviews: () => Promise<string[]>;
      reviewGetThreshold: () => Promise<number>;
      reviewSetThreshold: (threshold: number) => Promise<void>;

      // Hallucination Dashboard
      dashboardAnalyzeDocument: (documentPath: string, projectPath: string, content: string) => Promise<DocumentMetrics>;
      dashboardGetDocumentMetrics: (documentPath: string) => Promise<DocumentMetrics | null>;
      dashboardGetProjectMetrics: (projectPath: string) => Promise<ProjectMetrics>;
      dashboardGetTrendData: (projectPath: string, startDate?: string, endDate?: string) => Promise<TrendData>;
      dashboardExportReport: (projectPath: string, options: DashboardExportOptions) => Promise<string>;
      dashboardClearProjectMetrics: (projectPath: string) => Promise<number>;
      dashboardClearAllMetrics: () => Promise<number>;

      // PDF generation
      pdfIsPandocAvailable: () => Promise<boolean>;
      pdfGetPandocVersion: () => Promise<string | null>;
      pdfGeneratePDF: (markdownContent: string, outputPath: string, options?: PDFGenerationOptions) => Promise<PDFGenerationResult>;
      pdfGeneratePDFFromDocument: (documentPath: string, options?: PDFGenerationOptions) => Promise<PDFGenerationResult>;
      pdfGeneratePDFFromSections: (sections: PDFSection[], outputPath: string, options?: PDFGenerationOptions) => Promise<PDFGenerationResult>;
      pdfGeneratePreview: (pdfPath: string, outputPath: string, dpi?: number) => Promise<{ success: boolean; error?: string }>;
      pdfCleanup: () => Promise<void>;

      // DOCX generation
      docxGenerateDOCX: (markdownContent: string, outputPath: string, options?: DOCXGenerationOptions) => Promise<DOCXGenerationResult>;
      docxGenerateDOCXFromDocument: (documentPath: string, options?: DOCXGenerationOptions) => Promise<DOCXGenerationResult>;
      docxGenerateDOCXFromSections: (sections: DOCXSection[], outputPath: string, options?: DOCXGenerationOptions) => Promise<DOCXGenerationResult>;

      // PPTX generation
      pptxGeneratePPTX: (markdownContent: string, outputPath: string, options?: PPTXGenerationOptions) => Promise<PPTXGenerationResult>;
      pptxGeneratePPTXFromDocument: (documentPath: string, options?: PPTXGenerationOptions) => Promise<PPTXGenerationResult>;
      pptxGeneratePPTXFromSections: (sections: PPTXSection[], outputPath: string, options?: PPTXGenerationOptions) => Promise<PPTXGenerationResult>;
      pptxGetAvailableThemes: () => Promise<string[]>;
      pptxGetTheme: (themeName: string) => Promise<PPTXTheme | null>;

      // Phase orchestrator
      orchestratorStart: (config: PhaseOrchestratorConfig) => Promise<void>;
      orchestratorPause: () => Promise<boolean>;
      orchestratorResume: () => Promise<void>;
      orchestratorStop: () => Promise<boolean>;
      orchestratorSkipCurrentPhase: () => Promise<boolean>;
      orchestratorGetExecutionState: () => Promise<ProjectExecutionState | null>;
      orchestratorIsRunning: () => Promise<boolean>;
      orchestratorIsPaused: () => Promise<boolean>;
      orchestratorIsWaitingForApproval: () => Promise<boolean>;
      orchestratorApproveAndContinue: () => Promise<boolean>;
      orchestratorRevisePhase: (feedback: string) => Promise<boolean>;
      orchestratorGetCurrentPhase: () => Promise<PhaseState | null>;
      orchestratorGetPhaseDisplayName: (phase: ProjectPhase) => Promise<string>;
      orchestratorGetOverallProgress: () => Promise<number>;
      orchestratorGetPhaseStates: () => Promise<PhaseState[]>;
      orchestratorCleanup: () => Promise<void>;
      onOrchestratorPhaseStart: (callback: (phase: ProjectPhase, phaseIndex: number) => void) => () => void;
      onOrchestratorPhaseProgress: (callback: (phase: ProjectPhase, progress: number, content: string) => void) => () => void;
      onOrchestratorPhaseComplete: (callback: (phase: ProjectPhase, output: string) => void) => () => void;
      onOrchestratorPhaseError: (callback: (phase: ProjectPhase, error: string) => void) => () => void;
      onOrchestratorPhaseAwaitingApproval: (callback: (phase: ProjectPhase, phaseIndex: number) => void) => () => void;
      onOrchestratorStart: (callback: (state: ProjectExecutionState) => void) => () => void;
      onOrchestratorPause: (callback: (state: ProjectExecutionState) => void) => () => void;
      onOrchestratorResume: (callback: (state: ProjectExecutionState) => void) => () => void;
      onOrchestratorComplete: (callback: (state: ProjectExecutionState) => void) => () => void;
      onOrchestratorError: (callback: (error: string) => void) => () => void;
      onOrchestratorStateUpdate: (callback: (state: ProjectExecutionState) => void) => () => void;

      // Checkpoint API
      checkpointSave: () => Promise<CheckpointData | null>;
      checkpointHasResumable: (projectPath: string) => Promise<boolean>;
      checkpointGetForProject: (projectPath: string) => Promise<CheckpointData | null>;
      checkpointResumeFromCheckpoint: (checkpointId: string) => Promise<void>;
      checkpointDelete: (checkpointId: string) => Promise<boolean>;
      checkpointDeleteForProject: (projectPath: string) => Promise<number>;
      checkpointGetCurrentId: () => Promise<string | null>;
      onCheckpointSaved: (callback: (checkpoint: CheckpointData) => void) => () => void;
      onCheckpointResumed: (callback: (checkpoint: CheckpointData) => void) => () => void;

      // Update service
      updateCheckForUpdates: () => Promise<UpdateInfo | null>;
      updateDownloadUpdate: () => Promise<void>;
      updateQuitAndInstall: () => Promise<void>;
      updateGetStatus: () => Promise<UpdateStatus>;
      updateGetUpdateInfo: () => Promise<UpdateInfo | null>;
      updateGetCurrentVersion: () => Promise<string>;
      updateGetReleaseNotes: () => Promise<string>;
      updateSetAutoDownload: (enabled: boolean) => Promise<void>;
      updateSetAllowPrerelease: (enabled: boolean) => Promise<void>;
      updateResetStatus: () => Promise<void>;
      onUpdateEvent: (callback: (event: UpdateEvent) => void) => () => void;
    };
  }
}
