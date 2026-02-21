import { ipcMain } from 'electron';
import { imageEditorService } from '../services/ImageEditorService';
import { databaseService } from '../services/DatabaseService';
import type {
  ImageEditRequest,
  ImageEditResponse,
} from '../../shared/types';

export function register() {
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
}
