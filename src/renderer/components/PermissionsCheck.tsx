import { useState, useEffect } from 'react';

interface PermissionStatus {
  granted: boolean;
  error?: string;
}

interface PermissionsResult {
  fileAccess: PermissionStatus;
  networkAccess: PermissionStatus;
}

interface PermissionsCheckProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function PermissionsCheck({ onComplete, onSkip }: PermissionsCheckProps) {
  const [checking, setChecking] = useState(true);
  const [permissions, setPermissions] = useState<PermissionsResult | null>(null);
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    checkPermissions();
    setPlatform(window.electronAPI.getPlatform());
  }, []);

  async function checkPermissions() {
    setChecking(true);
    try {
      const result = await window.electronAPI.checkPermissions();
      setPermissions(result);

      // Auto-advance if all permissions granted
      if (result.fileAccess.granted && result.networkAccess.granted) {
        setTimeout(() => onComplete(), 1500);
      }
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
    setChecking(false);
  }

  function openSettings(pane: 'files' | 'network') {
    window.electronAPI.openSystemPreferences(pane);
  }

  const allGranted = permissions?.fileAccess.granted && permissions?.networkAccess.granted;
  const isMac = platform === 'darwin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Permissions Check
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Blueprint needs access to your files and network to work properly.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          {/* File Access */}
          <PermissionRow
            label="File System Access"
            description="Read and write project files"
            status={permissions?.fileAccess}
            checking={checking}
            onFix={isMac ? () => openSettings('files') : undefined}
          />

          {/* Network Access */}
          <PermissionRow
            label="Network Access"
            description="Connect to Claude, OpenRouter, and Gemini APIs"
            status={permissions?.networkAccess}
            checking={checking}
            onFix={isMac ? () => openSettings('network') : undefined}
          />

          {/* Status Message */}
          {!checking && (
            <div className={`mt-6 p-4 rounded-lg ${
              allGranted
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
            }`}>
              {allGranted ? (
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>All permissions granted. Continuing...</span>
                </div>
              ) : (
                <div>
                  <p className="font-medium mb-2">Some permissions are missing</p>
                  <p className="text-sm opacity-80">
                    {isMac
                      ? 'Click "Fix" to open System Settings, then grant access to Blueprint.'
                      : 'Please check your system settings to grant the required permissions.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={checkPermissions}
            disabled={checking}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {checking ? 'Checking...' : 'Recheck Permissions'}
          </button>

          {!allGranted && onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Help Text */}
        {isMac && !allGranted && !checking && (
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>After granting permissions, you may need to restart Blueprint.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface PermissionRowProps {
  label: string;
  description: string;
  status?: PermissionStatus;
  checking: boolean;
  onFix?: () => void;
}

function PermissionRow({ label, description, status, checking, onFix }: PermissionRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center">
          {checking ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : status?.granted ? (
            <span className="text-green-500 text-xl">✓</span>
          ) : (
            <span className="text-amber-500 text-xl">⚠</span>
          )}
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{label}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
        </div>
      </div>

      {!checking && !status?.granted && onFix && (
        <button
          onClick={onFix}
          className="px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
        >
          Fix
        </button>
      )}
    </div>
  );
}
