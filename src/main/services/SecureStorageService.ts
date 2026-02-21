/**
 * SecureStorageService - Manages encrypted API key storage
 *
 * Uses Electron's safeStorage API to encrypt sensitive data using the
 * OS-level credential store (Keychain on macOS, Credential Manager on Windows,
 * libsecret on Linux).
 */
import { safeStorage, app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ApiKeyType } from '../../shared/types';

// Re-export for consumers
export type { ApiKeyType } from '../../shared/types';

// Storage file path in userData
const STORAGE_FILE = 'secure-keys.enc';

interface EncryptedKeyStore {
  [key: string]: string; // Base64-encoded encrypted values
}

/**
 * Service for securely storing API keys using OS-level encryption
 */
class SecureStorageService {
  private storePath: string | null = null;
  private cache: Map<ApiKeyType, string> = new Map();
  private initialized = false;

  /**
   * Initialize the service (call after app.whenReady())
   */
  initialize(): void {
    if (this.initialized) return;

    this.storePath = path.join(app.getPath('userData'), STORAGE_FILE);
    this.loadCachedKeys();
    this.initialized = true;
  }

  /**
   * Check if the encryption backend is available
   */
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Store an API key securely
   * @param requireEncryption If true, will refuse to store if encryption is unavailable (default: true)
   */
  async setApiKey(type: ApiKeyType, key: string, requireEncryption = true): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('SecureStorageService not initialized');
    }

    if (!this.isEncryptionAvailable()) {
      if (requireEncryption) {
        throw new Error(
          'Secure encryption is not available on this system. ' +
          'API keys cannot be stored securely. Please ensure your OS keychain/credential store is unlocked and accessible.'
        );
      }
      console.warn(
        'SECURITY WARNING: Encryption not available. API key will be stored with minimal protection. ' +
        'This is not recommended for production use.'
      );
    }

    try {
      // Encrypt the key (only if encryption is available)
      const encrypted = this.isEncryptionAvailable()
        ? safeStorage.encryptString(key)
        : this.obfuscate(key); // Fallback obfuscation (NOT secure, just basic protection)

      // Load existing store
      const store = this.loadStore();

      // Add encrypted key
      store[type] = encrypted.toString('base64');

      // Save store
      this.saveStore(store);

      // Update cache
      this.cache.set(type, key);

      return true;
    } catch (error) {
      console.error(`Failed to store API key for ${type}:`, error);
      return false;
    }
  }

  /**
   * Retrieve an API key
   */
  async getApiKey(type: ApiKeyType): Promise<string | null> {
    if (!this.initialized) {
      throw new Error('SecureStorageService not initialized');
    }

    // Check cache first
    if (this.cache.has(type)) {
      return this.cache.get(type) || null;
    }

    try {
      const store = this.loadStore();
      const encrypted = store[type];

      if (!encrypted) {
        return null;
      }

      // Decrypt the key
      const buffer = Buffer.from(encrypted, 'base64');
      const decrypted = this.isEncryptionAvailable()
        ? safeStorage.decryptString(buffer)
        : this.deobfuscate(buffer);

      // Update cache
      this.cache.set(type, decrypted);

      return decrypted;
    } catch (error) {
      console.error(`Failed to retrieve API key for ${type}:`, error);
      return null;
    }
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(type: ApiKeyType): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('SecureStorageService not initialized');
    }

    try {
      const store = this.loadStore();
      delete store[type];
      this.saveStore(store);

      // Remove from cache
      this.cache.delete(type);

      return true;
    } catch (error) {
      console.error(`Failed to delete API key for ${type}:`, error);
      return false;
    }
  }

  /**
   * Check if an API key exists
   */
  hasApiKey(type: ApiKeyType): boolean {
    if (!this.initialized) {
      return false;
    }

    const store = this.loadStore();
    return type in store;
  }

  /**
   * List all stored key types
   */
  listStoredKeys(): ApiKeyType[] {
    if (!this.initialized) {
      return [];
    }

    const store = this.loadStore();
    return Object.keys(store) as ApiKeyType[];
  }

  /**
   * Basic obfuscation for systems without encryption support.
   * WARNING: This is NOT secure encryption - it's just basic obfuscation
   * to prevent casual inspection. Use only as a last resort.
   */
  private obfuscate(text: string): Buffer {
    // Use XOR with a machine-specific key (not cryptographically secure)
    const machineKey = app.getPath('userData');
    const keyBuffer = Buffer.from(machineKey);
    const textBuffer = Buffer.from(text, 'utf-8');
    const result = Buffer.alloc(textBuffer.length);

    for (let i = 0; i < textBuffer.length; i++) {
      result[i] = textBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }

    return result;
  }

  /**
   * Deobfuscate a value that was obfuscated with the obfuscate method
   */
  private deobfuscate(buffer: Buffer): string {
    const machineKey = app.getPath('userData');
    const keyBuffer = Buffer.from(machineKey);
    const result = Buffer.alloc(buffer.length);

    for (let i = 0; i < buffer.length; i++) {
      result[i] = buffer[i] ^ keyBuffer[i % keyBuffer.length];
    }

    return result.toString('utf-8');
  }

  /**
   * Load the encrypted key store from disk
   */
  private loadStore(): EncryptedKeyStore {
    if (!this.storePath) return {};

    try {
      if (fs.existsSync(this.storePath)) {
        const data = fs.readFileSync(this.storePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load key store:', error);
    }

    return {};
  }

  /**
   * Save the encrypted key store to disk
   */
  private saveStore(store: EncryptedKeyStore): void {
    if (!this.storePath) return;

    try {
      fs.writeFileSync(this.storePath, JSON.stringify(store, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save key store:', error);
    }
  }

  /**
   * Load keys into cache on startup
   */
  private loadCachedKeys(): void {
    const store = this.loadStore();

    for (const type of Object.keys(store) as ApiKeyType[]) {
      try {
        const encrypted = store[type];
        const buffer = Buffer.from(encrypted, 'base64');
        const decrypted = this.isEncryptionAvailable()
          ? safeStorage.decryptString(buffer)
          : this.deobfuscate(buffer);

        this.cache.set(type, decrypted);
      } catch (error) {
        console.error(`Failed to cache key for ${type}:`, error);
      }
    }
  }
}

// Singleton instance
export const secureStorageService = new SecureStorageService();

// Re-export type for consumers
export type { SecureStorageService };
