import { app, ipcMain } from 'electron';
import { checkAllPermissions, openSystemPreferences } from '../permissions';
import { databaseService } from '../services/DatabaseService';
import type { RecentProjectInput, RecentProject } from '../../shared/types';

export function register() {
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

  // Recent projects handlers
  ipcMain.handle('recentProjects:add', (_, input: RecentProjectInput): RecentProject => {
    return databaseService.addRecentProject(input);
  });

  ipcMain.handle('recentProjects:list', (_, limit?: number): RecentProject[] => {
    return databaseService.listRecentProjects(limit);
  });

  ipcMain.handle('recentProjects:remove', (_, projectId: string): boolean => {
    return databaseService.removeRecentProject(projectId);
  });

  ipcMain.handle('recentProjects:removeByPath', (_, path: string): boolean => {
    return databaseService.removeRecentProjectByPath(path);
  });

  ipcMain.handle('recentProjects:clear', (): number => {
    return databaseService.clearRecentProjects();
  });

  ipcMain.handle('recentProjects:getByPath', (_, path: string): RecentProject | null => {
    return databaseService.getRecentProjectByPath(path);
  });
}
