import { contextBridge, ipcRenderer } from 'electron';

export interface PermissionStatus {
  granted: boolean;
  error?: string;
}

export interface PermissionsResult {
  fileAccess: PermissionStatus;
  networkAccess: PermissionStatus;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
}

export interface QuickOpenFile {
  name: string;
  path: string;
  relativePath: string;
}

export interface SearchMatch {
  line: number;
  column: number;
  content: string;
  match: string;
}

export interface SearchResult {
  filePath: string;
  relativePath: string;
  matches: SearchMatch[];
}

export interface SearchOptions {
  useRegex?: boolean;
  caseSensitive?: boolean;
  maxResults?: number;
}

// Agent types (matching main process)
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
}

export interface SendMessageOptions {
  maxTokens?: number;
  stream?: boolean;
}

export interface MessageParam {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface MessageResponse {
  id: string;
  type: string;
  role: string;
  content: ContentBlock[];
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Database types
export interface StoredSession {
  id: string;
  projectPath: string;
  conversationHistory: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDocument {
  id: string;
  sessionId: string;
  filePath: string;
  content: string;
  embedding: ArrayBuffer | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInput {
  id: string;
  projectPath: string;
  conversationHistory: string;
  model: string;
}

export interface DocumentInput {
  id: string;
  sessionId: string;
  filePath: string;
  content: string;
  embedding?: number[];
}

export interface DbStats {
  sessionCount: number;
  documentCount: number;
  dbSize: number;
}

// Secure storage types
export type ApiKeyType = 'anthropic' | 'openrouter' | 'gemini';

// Model router types
export type TaskComplexity = 'simple' | 'medium' | 'complex';
export type ModelId = string;
export type TaskType =
  | 'autocomplete'
  | 'quick_suggestion'
  | 'formatting'
  | 'inline_edit'
  | 'code_generation'
  | 'refactoring'
  | 'planning'
  | 'architecture'
  | 'research'
  | 'analysis'
  | 'unknown';

export interface TaskClassification {
  complexity: TaskComplexity;
  model: ModelId;
  confidence: number;
  reasoning: string;
}

export interface ModelInfo {
  id: ModelId;
  name: string;
  complexity: TaskComplexity;
  description: string;
}

export interface ClaudeModels {
  HAIKU: string;
  SONNET: string;
  OPUS: string;
}

// Context manager types
export type ContextEventType = 'user_message' | 'assistant_message' | 'tool_use' | 'file_read' | 'decision' | 'other';

export interface ContextEvent {
  id: string;
  timestamp: Date;
  type: ContextEventType;
  content: string;
  metadata?: Record<string, unknown>;
  tokenEstimate: number;
}

export interface CompactionSummary {
  id: string;
  createdAt: Date;
  eventRange: {
    startId: string;
    endId: string;
    startTimestamp: Date;
    endTimestamp: Date;
    eventCount: number;
  };
  summary: string;
  tokensBefore: number;
  tokensAfter: number;
  compressionRatio: number;
}

export interface CompactionResult {
  success: boolean;
  summary?: CompactionSummary;
  tokensSaved: number;
  error?: string;
}

export interface ContextStats {
  sessionId: string;
  totalEvents: number;
  activeEvents: number;
  compactedEvents: number;
  summaryCount: number;
  totalTokens: number;
  lastCompactionAt?: Date;
}

export interface ContextConfiguration {
  compactionThreshold: number;
  recentEventsToKeep: number;
}

// Prompt library types
export interface StoredPrompt {
  id: string;
  name: string;
  template: string;
  description: string | null;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptInput {
  id: string;
  name: string;
  template: string;
  description?: string;
  isBuiltIn: boolean;
}

// OpenRouter/Perplexity types
export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
  domain?: string;
}

export interface ResearchResponse {
  id: string;
  content: string;
  citations: Citation[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finishReason: string | null;
}

export interface ResearchOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  timeout?: number;
}

export interface OpenRouterStreamChunk {
  type: 'text' | 'citation' | 'error' | 'done';
  content: string;
  citation?: Citation;
}

// Gemini/Deep Research types
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
  maxOutputTokens?: number;
  temperature?: number;
  systemInstruction?: string;
  timeout?: number;
}

export interface ProgressCheckpoint {
  percentage: number;
  timestamp: Date;
  message: string;
  partialContent?: string;
}

export interface GeminiStreamChunk {
  type: 'text' | 'progress' | 'error' | 'done';
  content: string;
  progress?: ProgressCheckpoint;
}

// Research router types
export type ResearchMode = 'quick' | 'balanced' | 'comprehensive';
export type ProjectPhase =
  | 'market_research'
  | 'competitive_analysis'
  | 'technical_feasibility'
  | 'architecture_design'
  | 'risk_assessment'
  | 'sprint_planning'
  | 'general';
export type ResearchProvider = 'perplexity' | 'gemini';

export interface PhaseConfig {
  quick: ResearchProvider;
  balanced: ResearchProvider;
  comprehensive: ResearchProvider;
}

export interface UnifiedResearchResponse {
  id: string;
  content: string;
  provider: ResearchProvider;
  model: string;
  citations?: Array<{
    url: string;
    title?: string;
    snippet?: string;
    domain?: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string | null;
  progress?: ProgressCheckpoint;
}

export interface RoutedResearchOptions {
  mode?: ResearchMode;
  phase?: ProjectPhase;
  forceProvider?: ResearchProvider;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface UnifiedStreamChunk {
  type: 'text' | 'citation' | 'progress' | 'error' | 'done';
  content: string;
  provider: ResearchProvider;
  citation?: {
    url: string;
    title?: string;
    snippet?: string;
    domain?: string;
  };
  progress?: ProgressCheckpoint;
}

// Citation management types (stored in .citations.json sidecar files)
export interface ManagedCitation {
  id: string;
  number: number;
  url: string;
  title: string;
  authors?: string[];
  date?: string;
  publisher?: string;
  accessedAt: string;
  source: 'perplexity' | 'gemini' | 'manual' | 'imported';
  usages: CitationUsage[];
}

export interface CitationUsage {
  claim: string;
  line?: number;
  offset?: number;
}

export interface CitationFile {
  version: '1.0';
  documentPath: string;
  updatedAt: string;
  citations: ManagedCitation[];
  nextNumber: number;
}

export interface ReferenceListOptions {
  format: 'ieee' | 'apa' | 'mla' | 'chicago';
  includeUrls?: boolean;
  includeAccessDates?: boolean;
}

export interface FormattedReference {
  number: number;
  text: string;
  url?: string;
}

export interface AddCitationInput {
  url: string;
  title: string;
  authors?: string[];
  date?: string;
  publisher?: string;
  source: ManagedCitation['source'];
  claim?: string;
  line?: number;
  offset?: number;
}

// PDF generation types
export interface PDFGenerationOptions {
  includeToc?: boolean;
  includeCoverPage?: boolean;
  coverPage?: CoverPageMetadata;
  includeCitations?: boolean;
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  outputDir?: string;
  outputFilename?: string;
  pageSize?: 'a4' | 'letter' | 'legal';
  margin?: string;
  fontSize?: number;
  customCss?: string;
  pageNumbers?: boolean;
  pdfMetadata?: PDFMetadata;
}

export interface CoverPageMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
  logo?: string;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
}

export interface PDFGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  pageCount?: number;
}

export interface PDFSection {
  title: string;
  content: string;
  order: number;
  includeInToc?: boolean;
}

// DOCX generation types
export interface DOCXGenerationOptions {
  includeToc?: boolean;
  includeCoverPage?: boolean;
  coverPage?: DOCXCoverPageMetadata;
  includeCitations?: boolean;
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  outputDir?: string;
  outputFilename?: string;
  documentMetadata?: DOCXMetadata;
  fontFamily?: string;
  fontSize?: number;
  pageSize?: 'a4' | 'letter' | 'legal';
}

export interface DOCXCoverPageMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
}

export interface DOCXMetadata {
  title?: string;
  author?: string;
  subject?: string;
  description?: string;
  keywords?: string[];
  creator?: string;
}

export interface DOCXGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface DOCXSection {
  title: string;
  content: string;
  order: number;
}

// PPTX generation types
export interface PPTXTheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export interface PPTXGenerationOptions {
  theme?: string | PPTXTheme;
  includeTitleSlide?: boolean;
  titleSlide?: PPTXTitleSlideMetadata;
  includeCitations?: boolean;
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  outputDir?: string;
  outputFilename?: string;
  metadata?: PPTXMetadata;
  slideSize?: '16:9' | '4:3';
  maxBulletsPerSlide?: number;
}

export interface PPTXTitleSlideMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
}

export interface PPTXMetadata {
  title?: string;
  author?: string;
  subject?: string;
  company?: string;
  keywords?: string[];
}

export interface PPTXGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  slideCount?: number;
}

export interface PPTXSection {
  title: string;
  content: string;
  order: number;
}

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

  // Event listeners for streaming
  onAgentStreamChunk: (callback: (sessionId: string, chunk: StreamChunk) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, sessionId: string, chunk: StreamChunk) => {
      callback(sessionId, chunk);
    };
    ipcRenderer.on('agent:streamChunk', handler);
    // Return a cleanup function
    return () => ipcRenderer.removeListener('agent:streamChunk', handler);
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
  contextManagerGetActiveEvents: (sessionId: string): Promise<ContextEvent[]> =>
    ipcRenderer.invoke('contextManager:getActiveEvents', sessionId),
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
      onAgentStreamChunk: (callback: (sessionId: string, chunk: StreamChunk) => void) => () => void;

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
      contextManagerGetActiveEvents: (sessionId: string) => Promise<ContextEvent[]>;
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
    };
  }
}
