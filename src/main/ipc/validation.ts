// ========================================
// Input Validation Utilities
// ========================================

/**
 * Validate that a value is a non-empty string
 */
export function validateString(value: unknown, paramName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid parameter "${paramName}": expected string, got ${typeof value}`);
  }
  return value;
}

/**
 * Validate that a value is a non-empty string path
 */
export function validatePath(value: unknown, paramName: string): string {
  const str = validateString(value, paramName);
  if (str.length === 0) {
    throw new Error(`Invalid parameter "${paramName}": path cannot be empty`);
  }
  // Check for null bytes (path injection)
  if (str.includes('\0')) {
    throw new Error(`Invalid parameter "${paramName}": path contains invalid characters`);
  }
  return str;
}

/**
 * Validate an optional object parameter
 */
export function validateObject<T>(value: unknown, paramName: string): T | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'object') {
    throw new Error(`Invalid parameter "${paramName}": expected object, got ${typeof value}`);
  }
  return value as T;
}
