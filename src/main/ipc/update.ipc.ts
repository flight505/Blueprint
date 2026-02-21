import { ipcMain } from 'electron';
import { updateService, type UpdateStatus, type UpdateInfo } from '../services/UpdateService';

export function register() {
  // Update service handlers
  ipcMain.handle('update:checkForUpdates', async (): Promise<UpdateInfo | null> => {
    return await updateService.checkForUpdates();
  });

  ipcMain.handle('update:downloadUpdate', async (): Promise<void> => {
    return await updateService.downloadUpdate();
  });

  ipcMain.handle('update:quitAndInstall', (): void => {
    updateService.quitAndInstall();
  });

  ipcMain.handle('update:getStatus', (): UpdateStatus => {
    return updateService.getStatus();
  });

  ipcMain.handle('update:getUpdateInfo', (): UpdateInfo | null => {
    return updateService.getUpdateInfo();
  });

  ipcMain.handle('update:getCurrentVersion', (): string => {
    return updateService.getCurrentVersion();
  });

  ipcMain.handle('update:getReleaseNotes', (): string => {
    return updateService.getReleaseNotes();
  });

  ipcMain.handle('update:setAutoDownload', (_, enabled: boolean): void => {
    updateService.setAutoDownload(enabled);
  });

  ipcMain.handle('update:setAllowPrerelease', (_, enabled: boolean): void => {
    updateService.setAllowPrerelease(enabled);
  });

  ipcMain.handle('update:resetStatus', (): void => {
    updateService.resetStatus();
  });
}
