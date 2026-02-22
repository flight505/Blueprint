/**
 * UpdateNotification - Component for displaying update availability and progress
 *
 * Shows:
 * - Update available banner with version info and release notes
 * - Download progress bar
 * - Install and restart button
 */

import React, { useEffect, useState, useCallback } from 'react';
import { AnimatedOverlay } from '../animations';
import type { UpdateStatus, UpdateEvent, UpdateInfo, UpdateProgressInfo } from '../../../preload';

interface UpdateNotificationProps {
  /** Whether to show as a modal overlay instead of inline banner */
  asModal?: boolean;
  /** Callback when modal is closed */
  onClose?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  asModal = false,
  onClose,
}) => {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
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

  const handleCheckForUpdates = useCallback(async () => {
    try {
      setError(null);
      await window.electronAPI.updateCheckForUpdates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    }
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      setError(null);
      await window.electronAPI.updateDownloadUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download update');
    }
  }, []);

  const handleInstall = useCallback(async () => {
    try {
      await window.electronAPI.updateQuitAndInstall();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install update');
    }
  }, []);

  // Don't render if no status or no update available (and not showing modal)
  if (!status) return null;
  if (!asModal && !status.available && !status.downloading && !status.downloaded) return null;

  const content = (
    <div
      className={`
        bg-surface-overlay rounded-lg shadow-lg overflow-hidden
        ${asModal ? 'w-full max-w-lg' : 'w-full'}
      `}
      role="alertdialog"
      aria-labelledby="update-title"
      aria-describedby="update-description"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <h2 id="update-title" className="font-semibold">
            {status.downloaded
              ? 'Update Ready to Install'
              : status.downloading
              ? 'Downloading Update...'
              : status.available
              ? 'Update Available'
              : 'Check for Updates'}
          </h2>
        </div>
        {asModal && onClose && (
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close update notification"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Version info */}
        <p id="update-description" className="text-fg-secondary text-sm mb-3">
          {status.updateInfo ? (
            <>
              Version <strong>{status.updateInfo.version}</strong> is available.
              You currently have version <strong>{currentVersion}</strong>.
            </>
          ) : (
            <>Current version: <strong>{currentVersion}</strong></>
          )}
        </p>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-3 text-sm">
            {error}
          </div>
        )}

        {/* Download progress */}
        {status.downloading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-fg-muted mb-1">
              <span>Downloading...</span>
              <span>{Math.round(status.progress)}%</span>
            </div>
            <div
              className="h-2 bg-surface-raised rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={status.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Download progress"
            >
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${status.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Release notes */}
        {releaseNotes && status.available && (
          <div className="mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1"
              aria-expanded={showDetails}
            >
              <svg
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showDetails ? 'Hide' : 'Show'} release notes
            </button>
            {showDetails && (
              <div
                className="mt-2 p-3 bg-surface-raised rounded-lg text-sm text-fg-secondary max-h-48 overflow-y-auto prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: releaseNotes.replace(/\n/g, '<br>'),
                }}
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          {status.checking && (
            <div className="flex items-center gap-2 text-fg-muted">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Checking for updates...
            </div>
          )}

          {!status.available && !status.checking && !status.downloaded && (
            <button
              onClick={handleCheckForUpdates}
              className="px-4 py-2 bg-surface-raised text-fg-secondary rounded-lg hover:bg-surface-hover transition-colors text-sm"
            >
              Check for Updates
            </button>
          )}

          {status.available && !status.downloading && !status.downloaded && (
            <>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-fg-muted hover:text-fg transition-colors text-sm"
                >
                  Later
                </button>
              )}
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Download Update
              </button>
            </>
          )}

          {status.downloaded && (
            <>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-fg-muted hover:text-fg transition-colors text-sm"
                >
                  Later
                </button>
              )}
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restart & Install
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (asModal) {
    return (
      <AnimatedOverlay
        isOpen={true}
        onClose={onClose || (() => {})}
      >
        {content}
      </AnimatedOverlay>
    );
  }

  return content;
};

export default UpdateNotification;
