/**
 * UpdateService - Manages automatic application updates using electron-updater
 *
 * Handles:
 * - Checking for updates on app launch
 * - Downloading updates in the background
 * - Showing release notes to user
 * - Installing updates with app restart
 */

import { autoUpdater, UpdateInfo, ProgressInfo, UpdateDownloadedEvent } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { EventEmitter } from 'events';

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  downloading: boolean;
  error: string | null;
  progress: number;
  updateInfo: UpdateInfo | null;
}

export type UpdateEventType =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error';

export interface UpdateEvent {
  type: UpdateEventType;
  data?: UpdateInfo | ProgressInfo | UpdateDownloadedEvent | Error;
}

class UpdateService extends EventEmitter {
  private static instance: UpdateService;
  private status: UpdateStatus = {
    checking: false,
    available: false,
    downloaded: false,
    downloading: false,
    error: null,
    progress: 0,
    updateInfo: null,
  };
  private initialized = false;

  private constructor() {
    super();
    this.setupAutoUpdater();
  }

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, let user decide
    autoUpdater.autoInstallOnAppQuit = true; // Auto-install when user quits
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;

    // Set up event handlers
    autoUpdater.on('checking-for-update', () => {
      this.status.checking = true;
      this.status.error = null;
      this.notifyRenderer('checking-for-update');
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.status.checking = false;
      this.status.available = true;
      this.status.updateInfo = info;
      this.notifyRenderer('update-available', info);
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.status.checking = false;
      this.status.available = false;
      this.status.updateInfo = info;
      this.notifyRenderer('update-not-available', info);
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.status.downloading = true;
      this.status.progress = progress.percent;
      this.notifyRenderer('download-progress', progress);
    });

    autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
      this.status.downloading = false;
      this.status.downloaded = true;
      this.status.progress = 100;
      this.notifyRenderer('update-downloaded', event);
    });

    autoUpdater.on('error', (error: Error) => {
      this.status.checking = false;
      this.status.downloading = false;
      this.status.error = error.message;
      this.notifyRenderer('error', error);
    });
  }

  private notifyRenderer(type: UpdateEventType, data?: unknown): void {
    this.emit('update-event', { type, data });

    // Also send to all windows via IPC
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send('update:event', { type, data });
    }
  }

  /**
   * Initialize the update service
   */
  public initialize(): void {
    this.initialized = true;
  }

  /**
   * Check if the update service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check for available updates
   */
  public async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result?.updateInfo || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates';
      this.status.error = errorMessage;
      throw new Error(errorMessage);
    }
  }

  /**
   * Download the available update
   */
  public async downloadUpdate(): Promise<void> {
    if (!this.status.available) {
      throw new Error('No update available to download');
    }

    this.status.downloading = true;
    this.status.progress = 0;

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.status.downloading = false;
      const errorMessage = error instanceof Error ? error.message : 'Failed to download update';
      this.status.error = errorMessage;
      throw new Error(errorMessage);
    }
  }

  /**
   * Install the downloaded update and restart the app
   */
  public quitAndInstall(): void {
    if (!this.status.downloaded) {
      throw new Error('No update downloaded to install');
    }

    // Force quit and install - this will restart the app
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * Get the current update status
   */
  public getStatus(): UpdateStatus {
    return { ...this.status };
  }

  /**
   * Get the update info if available
   */
  public getUpdateInfo(): UpdateInfo | null {
    return this.status.updateInfo;
  }

  /**
   * Get the current app version
   */
  public getCurrentVersion(): string {
    return app.getVersion();
  }

  /**
   * Format release notes from update info
   */
  public getReleaseNotes(): string {
    if (!this.status.updateInfo?.releaseNotes) {
      return '';
    }

    const notes = this.status.updateInfo.releaseNotes;

    // Handle both string and array formats
    if (typeof notes === 'string') {
      return notes;
    }

    // Handle ReleaseNoteInfo array
    if (Array.isArray(notes)) {
      return notes.map(note => {
        if (typeof note === 'string') return note;
        return note.note || '';
      }).join('\n\n');
    }

    return '';
  }

  /**
   * Reset the update status (for testing or retry)
   */
  public resetStatus(): void {
    this.status = {
      checking: false,
      available: false,
      downloaded: false,
      downloading: false,
      error: null,
      progress: 0,
      updateInfo: null,
    };
  }

  /**
   * Set the feed URL for updates (useful for custom update servers)
   */
  public setFeedURL(url: string): void {
    autoUpdater.setFeedURL({ provider: 'generic', url });
  }

  /**
   * Enable or disable auto-download
   */
  public setAutoDownload(enabled: boolean): void {
    autoUpdater.autoDownload = enabled;
  }

  /**
   * Enable or disable pre-release updates
   */
  public setAllowPrerelease(enabled: boolean): void {
    autoUpdater.allowPrerelease = enabled;
  }
}

// Export singleton instance
export const updateService = UpdateService.getInstance();

// Re-export types for convenience
export type { UpdateInfo, ProgressInfo, UpdateDownloadedEvent };
