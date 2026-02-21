import { ipcMain } from 'electron';
import { secureStorageService } from '../services/SecureStorageService';
import type { ApiKeyType, PromptInput, StoredPrompt } from '../../shared/types';
import { databaseService } from '../services/DatabaseService';

export function register() {
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
}
