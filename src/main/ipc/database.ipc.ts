import { ipcMain } from 'electron';
import { databaseService } from '../services/DatabaseService';
import type { SessionInput, StoredSession, DocumentInput } from '../../shared/types';
import type { StoredDocument } from '../services/DatabaseService';

export function register() {
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
}
