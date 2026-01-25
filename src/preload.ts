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
    };
  }
}
