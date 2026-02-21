export interface PermissionStatus {
  granted: boolean;
  error?: string;
}

export interface PermissionsResult {
  fileAccess: PermissionStatus;
  networkAccess: PermissionStatus;
}

export type ApiKeyType = 'anthropic' | 'openrouter' | 'gemini';
