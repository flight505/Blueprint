/**
 * API Key Settings Component
 *
 * Provides UI for configuring and validating API keys for various services.
 * Keys are stored securely using Electron's safeStorage API.
 */
import { useState, useEffect, useCallback } from 'react';
import type { ApiKeyType } from '../../../preload';
import { Check } from '../icons';

interface ApiKeyConfig {
  type: ApiKeyType;
  label: string;
  placeholder: string;
  helpText: string;
  validateFn?: (key: string) => Promise<boolean>;
}

const API_KEY_CONFIGS: ApiKeyConfig[] = [
  {
    type: 'anthropic',
    label: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    helpText: 'Required for Claude AI features. Get your key at console.anthropic.com',
  },
  {
    type: 'openrouter',
    label: 'OpenRouter',
    placeholder: 'sk-or-...',
    helpText: 'Optional. Used for Perplexity research queries via OpenRouter.',
  },
  {
    type: 'gemini',
    label: 'Google Gemini',
    placeholder: 'AIza...',
    helpText: 'Optional. Used for Gemini Deep Research features.',
  },
];

interface KeyState {
  hasKey: boolean;
  isEditing: boolean;
  inputValue: string;
  isValidating: boolean;
  validationStatus: 'idle' | 'valid' | 'invalid';
  errorMessage?: string;
}

type KeyStates = Record<ApiKeyType, KeyState>;

const defaultKeyState: KeyState = {
  hasKey: false,
  isEditing: false,
  inputValue: '',
  isValidating: false,
  validationStatus: 'idle',
};

export default function ApiKeySettings() {
  const [keyStates, setKeyStates] = useState<KeyStates>({
    anthropic: { ...defaultKeyState },
    openrouter: { ...defaultKeyState },
    gemini: { ...defaultKeyState },
  });
  const [isEncryptionAvailable, setIsEncryptionAvailable] = useState(true);

  // Load initial state
  useEffect(() => {
    async function loadKeyStates() {
      try {
        const encryptionAvailable = await window.electronAPI.secureStorageIsEncryptionAvailable();
        setIsEncryptionAvailable(encryptionAvailable);

        const storedKeys = await window.electronAPI.secureStorageListStoredKeys();

        setKeyStates((prev) => {
          const updated = { ...prev };
          for (const type of Object.keys(updated) as ApiKeyType[]) {
            updated[type] = {
              ...updated[type],
              hasKey: storedKeys.includes(type),
            };
          }
          return updated;
        });
      } catch (error) {
        console.error('Failed to load key states:', error);
      }
    }
    loadKeyStates();
  }, []);

  const updateKeyState = useCallback(
    (type: ApiKeyType, updates: Partial<KeyState>) => {
      setKeyStates((prev) => ({
        ...prev,
        [type]: { ...prev[type], ...updates },
      }));
    },
    []
  );

  const handleEdit = useCallback((type: ApiKeyType) => {
    updateKeyState(type, {
      isEditing: true,
      inputValue: '',
      validationStatus: 'idle',
      errorMessage: undefined,
    });
  }, [updateKeyState]);

  const handleCancel = useCallback((type: ApiKeyType) => {
    updateKeyState(type, {
      isEditing: false,
      inputValue: '',
      validationStatus: 'idle',
      errorMessage: undefined,
    });
  }, [updateKeyState]);

  const handleInputChange = useCallback(
    (type: ApiKeyType, value: string) => {
      updateKeyState(type, {
        inputValue: value,
        validationStatus: 'idle',
        errorMessage: undefined,
      });
    },
    [updateKeyState]
  );

  const handleValidate = useCallback(
    async (type: ApiKeyType) => {
      const state = keyStates[type];
      if (!state.inputValue.trim()) {
        updateKeyState(type, {
          validationStatus: 'invalid',
          errorMessage: 'API key cannot be empty',
        });
        return;
      }

      updateKeyState(type, { isValidating: true, validationStatus: 'idle' });

      try {
        let isValid = false;

        // Validate based on type
        if (type === 'anthropic') {
          // Use the AgentService validation
          isValid = await window.electronAPI.agentValidateApiKey(state.inputValue);
        } else {
          // For other providers, do basic format validation
          // (Real validation would require actual API calls)
          if (type === 'openrouter') {
            isValid = state.inputValue.startsWith('sk-or-') && state.inputValue.length > 20;
          } else if (type === 'gemini') {
            isValid = state.inputValue.startsWith('AIza') && state.inputValue.length > 30;
          }
        }

        updateKeyState(type, {
          isValidating: false,
          validationStatus: isValid ? 'valid' : 'invalid',
          errorMessage: isValid ? undefined : 'Invalid API key',
        });
      } catch (error) {
        updateKeyState(type, {
          isValidating: false,
          validationStatus: 'invalid',
          errorMessage: error instanceof Error ? error.message : 'Validation failed',
        });
      }
    },
    [keyStates, updateKeyState]
  );

  const handleSave = useCallback(
    async (type: ApiKeyType) => {
      const state = keyStates[type];

      // Validate first if not already validated
      if (state.validationStatus !== 'valid') {
        await handleValidate(type);
        // Re-check after validation
        const updatedState = keyStates[type];
        if (updatedState.validationStatus !== 'valid') {
          return;
        }
      }

      try {
        // Store the key securely
        const success = await window.electronAPI.secureStorageSetApiKey(type, state.inputValue);

        if (success) {
          // Initialize the agent service with the new key if it's the Anthropic key
          if (type === 'anthropic') {
            await window.electronAPI.agentInitialize(state.inputValue);
          }

          updateKeyState(type, {
            hasKey: true,
            isEditing: false,
            inputValue: '',
            validationStatus: 'idle',
          });
        } else {
          updateKeyState(type, {
            validationStatus: 'invalid',
            errorMessage: 'Failed to save API key',
          });
        }
      } catch (error) {
        updateKeyState(type, {
          validationStatus: 'invalid',
          errorMessage: error instanceof Error ? error.message : 'Failed to save',
        });
      }
    },
    [keyStates, handleValidate, updateKeyState]
  );

  const handleDelete = useCallback(
    async (type: ApiKeyType) => {
      try {
        const success = await window.electronAPI.secureStorageDeleteApiKey(type);
        if (success) {
          updateKeyState(type, {
            hasKey: false,
            isEditing: false,
            inputValue: '',
            validationStatus: 'idle',
          });
        }
      } catch (error) {
        console.error(`Failed to delete ${type} key:`, error);
      }
    },
    [updateKeyState]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium mb-1">API Keys</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {isEncryptionAvailable
            ? 'Keys are stored securely using OS-level encryption.'
            : 'Warning: Encryption not available on this system.'}
        </p>
      </div>

      <div className="space-y-4">
        {API_KEY_CONFIGS.map((config) => {
          const state = keyStates[config.type];
          return (
            <ApiKeyInput
              key={config.type}
              config={config}
              state={state}
              onEdit={() => handleEdit(config.type)}
              onCancel={() => handleCancel(config.type)}
              onInputChange={(value) => handleInputChange(config.type, value)}
              onValidate={() => handleValidate(config.type)}
              onSave={() => handleSave(config.type)}
              onDelete={() => handleDelete(config.type)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ApiKeyInputProps {
  config: ApiKeyConfig;
  state: KeyState;
  onEdit: () => void;
  onCancel: () => void;
  onInputChange: (value: string) => void;
  onValidate: () => void;
  onSave: () => void;
  onDelete: () => void;
}

function ApiKeyInput({
  config,
  state,
  onEdit,
  onCancel,
  onInputChange,
  onValidate,
  onSave,
  onDelete,
}: ApiKeyInputProps) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{config.label}</label>
        {state.hasKey && !state.isEditing && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check size={12} aria-hidden="true" /> Configured
          </span>
        )}
      </div>

      {state.isEditing ? (
        <div className="space-y-3">
          <div className="relative">
            <input
              type="password"
              value={state.inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={config.placeholder}
              className={`w-full px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 text-sm ${
                state.validationStatus === 'valid'
                  ? 'border-green-500 focus:ring-green-500'
                  : state.validationStatus === 'invalid'
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              } focus:ring-2 focus:border-transparent`}
              aria-label={`Enter ${config.label} API key`}
              aria-describedby={`${config.type}-help`}
              disabled={state.isValidating}
            />
            {state.validationStatus === 'valid' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <Check size={16} />
              </span>
            )}
          </div>

          {state.errorMessage && (
            <p className="text-xs text-red-500 dark:text-red-400" role="alert">
              {state.errorMessage}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onValidate}
              disabled={state.isValidating || !state.inputValue.trim()}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Validate API key"
            >
              {state.isValidating ? 'Validating...' : 'Validate'}
            </button>
            <button
              onClick={onSave}
              disabled={state.isValidating || !state.inputValue.trim()}
              className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Save API key"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              disabled={state.isValidating}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Cancel editing"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p id={`${config.type}-help`} className="text-xs text-gray-500 dark:text-gray-400">
            {config.helpText}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={state.hasKey ? `Update ${config.label} API key` : `Add ${config.label} API key`}
            >
              {state.hasKey ? 'Update Key' : 'Add Key'}
            </button>
            {state.hasKey && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-sm rounded-lg text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                aria-label={`Remove ${config.label} API key`}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
