import { app, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

export interface PermissionStatus {
  granted: boolean;
  error?: string;
}

export interface PermissionsResult {
  fileAccess: PermissionStatus;
  networkAccess: PermissionStatus;
}

/**
 * Test file system write access by creating a temp file
 */
export async function checkFileAccess(): Promise<PermissionStatus> {
  const testDir = app.getPath('userData');
  const testFile = path.join(testDir, '.permission-test');

  try {
    // Try to write a test file
    fs.writeFileSync(testFile, 'permission-test');
    fs.unlinkSync(testFile);
    return { granted: true };
  } catch (error) {
    return {
      granted: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test network access by making a simple HTTPS request
 */
export async function checkNetworkAccess(): Promise<PermissionStatus> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ granted: false, error: 'Connection timeout' });
    }, 5000);

    const req = https.get('https://api.anthropic.com', (res) => {
      clearTimeout(timeout);
      // Any response (even 401/403) means network works
      resolve({ granted: true });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        granted: false,
        error: error.message
      });
    });

    req.end();
  });
}

/**
 * Check all permissions
 */
export async function checkAllPermissions(): Promise<PermissionsResult> {
  const [fileAccess, networkAccess] = await Promise.all([
    checkFileAccess(),
    checkNetworkAccess(),
  ]);

  return { fileAccess, networkAccess };
}

/**
 * Open macOS System Preferences to the relevant pane
 */
export function openSystemPreferences(pane: 'files' | 'network'): void {
  if (process.platform !== 'darwin') return;

  const urls: Record<string, string> = {
    files: 'x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders',
    network: 'x-apple.systempreferences:com.apple.preference.security?Firewall',
  };

  shell.openExternal(urls[pane]);
}
