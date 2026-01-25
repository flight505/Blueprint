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
    };
  }
}
