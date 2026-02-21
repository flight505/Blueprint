import { ipcMain, dialog } from 'electron';
import { readDirectory, readFileContent, listAllFiles, searchInFiles, writeFile, addAllowedBasePath, clearAllowedBasePaths, isPathAllowed } from '../services/FileSystemService';
import type { FileNode, FileContent, QuickOpenFile, SearchResult } from '../../shared/types';
import { validatePath, validateString, validateObject } from './validation';

export function register() {
  ipcMain.handle('fs:selectDirectory', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    // Security: Add the selected directory as an allowed base path
    const selectedPath = result.filePaths[0];
    addAllowedBasePath(selectedPath);
    return selectedPath;
  });

  ipcMain.handle('fs:setProjectPath', (_, projectPath: string): void => {
    // Validate input
    const validatedPath = validatePath(projectPath, 'projectPath');
    // Security: Clear existing paths and set new project path as allowed
    clearAllowedBasePaths();
    addAllowedBasePath(validatedPath);
  });

  ipcMain.handle('fs:isPathAllowed', (_, filePath: string): boolean => {
    const validatedPath = validatePath(filePath, 'filePath');
    return isPathAllowed(validatedPath);
  });

  ipcMain.handle('fs:readDirectory', async (_, dirPath: unknown): Promise<FileNode[]> => {
    // Validate input
    const validatedPath = validatePath(dirPath, 'dirPath');
    return await readDirectory(validatedPath);
  });

  ipcMain.handle('fs:readFile', async (_, filePath: unknown): Promise<FileContent> => {
    // Validate input
    const validatedPath = validatePath(filePath, 'filePath');
    return await readFileContent(validatedPath);
  });

  ipcMain.handle('fs:listAllFiles', async (_, basePath: unknown): Promise<QuickOpenFile[]> => {
    // Validate input
    const validatedPath = validatePath(basePath, 'basePath');
    return await listAllFiles(validatedPath);
  });

  ipcMain.handle('fs:searchInFiles', async (
    _,
    basePath: unknown,
    query: unknown,
    options?: unknown
  ): Promise<SearchResult[]> => {
    // Validate inputs
    const validatedBasePath = validatePath(basePath, 'basePath');
    const validatedQuery = validateString(query, 'query');
    const validatedOptions = validateObject<{ useRegex?: boolean; caseSensitive?: boolean; maxResults?: number }>(options, 'options');
    return await searchInFiles(validatedBasePath, validatedQuery, validatedOptions);
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: unknown, content: unknown): Promise<void> => {
    // Validate inputs
    const validatedPath = validatePath(filePath, 'filePath');
    const validatedContent = validateString(content, 'content');
    return await writeFile(validatedPath, validatedContent);
  });
}
