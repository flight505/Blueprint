/**
 * useUpdate - Hook for managing application updates
 *
 * Provides reactive state for update status and actions for checking,
 * downloading, and installing updates.
 */

import { useEffect, useState, useCallback } from 'react';
import type { UpdateStatus, UpdateEvent, UpdateInfo, UpdateProgressInfo } from '../../preload';

interface UseUpdateResult {
  /** Current update status */
  status: UpdateStatus | null;
  /** Release notes for the available update */
  releaseNotes: string;
  /** Current installed app version */
  currentVersion: string;
  /** Error message if any operation failed */
  error: string | null;
  /** Whether an update is available */
  isUpdateAvailable: boolean;
  /** Whether an update is being downloaded */
  isDownloading: boolean;
  /** Whether an update is ready to install */
  isReadyToInstall: boolean;
  /** Check for available updates */
  checkForUpdates: () => Promise<void>;
  /** Download the available update */
  downloadUpdate: () => Promise<void>;
  /** Install the update and restart the app */
  installUpdate: () => Promise<void>;
  /** Clear any error state */
  clearError: () => void;
}

export function useUpdate(): UseUpdateResult {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load initial status
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const [statusResult, version, notes] = await Promise.all([
          window.electronAPI.updateGetStatus(),
          window.electronAPI.updateGetCurrentVersion(),
          window.electronAPI.updateGetReleaseNotes(),
        ]);
        setStatus(statusResult);
        setCurrentVersion(version);
        setReleaseNotes(notes);
      } catch (err) {
        console.error('Failed to load update status:', err);
      }
    };

    loadStatus();
  }, []);

  // Subscribe to update events
  useEffect(() => {
    const unsubscribe = window.electronAPI.onUpdateEvent((event: UpdateEvent) => {
      switch (event.type) {
        case 'checking-for-update':
          setStatus(prev => prev ? { ...prev, checking: true, error: null } : null);
          setError(null);
          break;
        case 'update-available':
          setStatus(prev => prev ? {
            ...prev,
            checking: false,
            available: true,
            updateInfo: event.data as UpdateInfo,
          } : null);
          // Reload release notes
          window.electronAPI.updateGetReleaseNotes().then(setReleaseNotes);
          break;
        case 'update-not-available':
          setStatus(prev => prev ? {
            ...prev,
            checking: false,
            available: false,
          } : null);
          break;
        case 'download-progress':
          const progress = event.data as UpdateProgressInfo;
          setStatus(prev => prev ? {
            ...prev,
            downloading: true,
            progress: progress.percent,
          } : null);
          break;
        case 'update-downloaded':
          setStatus(prev => prev ? {
            ...prev,
            downloading: false,
            downloaded: true,
            progress: 100,
          } : null);
          break;
        case 'error':
          const err = event.data as Error;
          setStatus(prev => prev ? {
            ...prev,
            checking: false,
            downloading: false,
            error: err.message,
          } : null);
          setError(err.message);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      setError(null);
      await window.electronAPI.updateCheckForUpdates();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check for updates';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    try {
      setError(null);
      await window.electronAPI.updateDownloadUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download update';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      await window.electronAPI.updateQuitAndInstall();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to install update';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    status,
    releaseNotes,
    currentVersion,
    error,
    isUpdateAvailable: status?.available ?? false,
    isDownloading: status?.downloading ?? false,
    isReadyToInstall: status?.downloaded ?? false,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    clearError,
  };
}

export default useUpdate;
