import { ipcMain } from 'electron';
import { hallucinationDashboardService } from '../services/HallucinationDashboardService';
import type {
  DocumentMetrics,
  ProjectMetrics,
  TrendData,
  DashboardExportOptions,
} from '../../shared/types';

export function register() {
  // Hallucination Dashboard handlers
  ipcMain.handle('dashboard:analyzeDocument', async (
    _,
    documentPath: string,
    projectPath: string,
    content: string
  ): Promise<DocumentMetrics> => {
    return await hallucinationDashboardService.analyzeDocument(documentPath, projectPath, content);
  });

  ipcMain.handle('dashboard:getDocumentMetrics', (
    _,
    documentPath: string
  ): DocumentMetrics | null => {
    return hallucinationDashboardService.getDocumentMetrics(documentPath);
  });

  ipcMain.handle('dashboard:getProjectMetrics', (
    _,
    projectPath: string
  ): ProjectMetrics => {
    return hallucinationDashboardService.getProjectMetrics(projectPath);
  });

  ipcMain.handle('dashboard:getTrendData', (
    _,
    projectPath: string,
    startDate?: string,
    endDate?: string
  ): TrendData => {
    return hallucinationDashboardService.getTrendData(projectPath, startDate, endDate);
  });

  ipcMain.handle('dashboard:exportReport', (
    _,
    projectPath: string,
    options: DashboardExportOptions
  ): string => {
    return hallucinationDashboardService.exportReport(projectPath, options);
  });

  ipcMain.handle('dashboard:clearProjectMetrics', (
    _,
    projectPath: string
  ): number => {
    return hallucinationDashboardService.clearProjectMetrics(projectPath);
  });

  ipcMain.handle('dashboard:clearAllMetrics', (): number => {
    return hallucinationDashboardService.clearAllMetrics();
  });
}
