import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { checkAllPermissions, openSystemPreferences } from './main/permissions';
import { readDirectory, readFileContent, FileNode, FileContent } from './main/services/FileSystemService';
import { agentService, type AgentSession, type StreamChunk, type CreateSessionOptions, type SendMessageOptions, type MessageParam } from './main/services/AgentService';
import { databaseService } from './main/services/DatabaseService';
import type { SessionInput, DocumentInput, StoredSession, StoredDocument } from './main/services/DatabaseService';
import { secureStorageService, type ApiKeyType } from './main/services/SecureStorageService';
import { modelRouter, type TaskClassification, type TaskType, type ModelId, CLAUDE_MODELS } from './main/services/ModelRouter';
import { contextManager, type ContextEvent, type CompactionResult, type ContextStats, type CompactionSummary } from './main/services/ContextManager';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

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
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
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

  registerIpcHandlers();
  createWindow();
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
