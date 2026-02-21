import { ipcMain } from 'electron';
import { contextManager } from '../services/ContextManager';
import type {
  ContextEvent,
  ContextStats,
  CompactionResult,
  CompactionSummary,
} from '../../shared/types';

export function register() {
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
}
