import { ipcMain } from 'electron';
import { modelRouter, CLAUDE_MODELS } from '../services/ModelRouter';
import type { TaskClassification, TaskType } from '../../shared/types';
import type { ModelId } from '../services/ModelRouter';

export function register() {
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
}
