/**
 * ModelSelector - UI component for model selection and override
 *
 * Allows users to:
 * - See the auto-selected model based on task complexity
 * - Override with a specific model (Haiku, Sonnet, Opus)
 * - View model descriptions and recommended use cases
 */
import { useState, useEffect, useId } from 'react';

export interface ModelInfo {
  id: string;
  name: string;
  complexity: 'simple' | 'medium' | 'complex';
  description: string;
}

export interface TaskClassification {
  complexity: 'simple' | 'medium' | 'complex';
  model: string;
  confidence: number;
  reasoning: string;
}

export interface ModelSelectorProps {
  /** Currently selected model ID */
  selectedModel: string | null;
  /** Auto-classified task info (optional - shows reasoning) */
  classification?: TaskClassification | null;
  /** Callback when model is selected */
  onModelChange: (model: string) => void;
  /** Whether to show auto-select option */
  showAutoSelect?: boolean;
  /** Label for the selector */
  label?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
}

// Complexity badge colors - Tokyo Night Storm palette
const COMPLEXITY_COLORS: Record<string, string> = {
  simple: 'bg-green-900/50 text-green-400',
  medium: 'bg-blue-900/50 text-blue-400',
  complex: 'bg-purple-900/50 text-purple-400',
};

export function ModelSelector({
  selectedModel,
  classification,
  onModelChange,
  showAutoSelect = true,
  label = 'Model',
  disabled = false,
  compact = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const selectId = useId();

  // Load available models on mount
  useEffect(() => {
    window.electronAPI.modelRouterGetAvailableModels().then(setModels);
  }, []);

  // Handle auto mode toggle
  const handleAutoModeChange = (auto: boolean) => {
    setIsAutoMode(auto);
    if (auto && classification) {
      onModelChange(classification.model);
    }
  };

  // Handle manual model selection
  const handleModelSelect = (modelId: string) => {
    setIsAutoMode(false);
    onModelChange(modelId);
  };

  // Get the currently selected model info
  const selectedModelInfo = models.find(m => m.id === selectedModel);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="text-xs text-fg-muted">
          {label}:
        </label>
        <select
          id={selectId}
          value={isAutoMode ? 'auto' : selectedModel || ''}
          onChange={(e) => {
            if (e.target.value === 'auto') {
              handleAutoModeChange(true);
            } else {
              handleModelSelect(e.target.value);
            }
          }}
          disabled={disabled}
          className="text-xs px-2 py-1 rounded border border-gray-600 bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          aria-label={`Select ${label.toLowerCase()}`}
        >
          {showAutoSelect && (
            <option value="auto">
              Auto {classification ? `(${classification.complexity})` : ''}
            </option>
          )}
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        {classification && isAutoMode && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${COMPLEXITY_COLORS[classification.complexity]}`}
            title={classification.reasoning}
          >
            {Math.round(classification.confidence * 100)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-fg-secondary">
          {label}
        </label>
        {showAutoSelect && (
          <label className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoMode}
              onChange={(e) => handleAutoModeChange(e.target.checked)}
              disabled={disabled}
              className="rounded border-border-default text-blue-600 focus:ring-blue-500"
              aria-label="Enable auto model selection"
            />
            Auto-select
          </label>
        )}
      </div>

      {/* Classification info when in auto mode */}
      {classification && isAutoMode && (
        <div className="p-2 bg-gray-800 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">
              Detected: {classification.complexity} task
            </span>
            <span className={`px-2 py-0.5 rounded ${COMPLEXITY_COLORS[classification.complexity]}`}>
              {Math.round(classification.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-fg-muted">
            {classification.reasoning}
          </p>
        </div>
      )}

      {/* Model selection buttons */}
      <div className="grid grid-cols-3 gap-2">
        {models.map(model => (
          <button
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            disabled={disabled}
            className={`p-3 rounded-lg border transition-colors text-left ${
              selectedModel === model.id && !isAutoMode
                ? 'border-blue-500 bg-blue-900/30'
                : isAutoMode && classification?.model === model.id
                ? 'border-green-500 bg-green-900/30'
                : 'border-gray-700 hover:border-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-pressed={selectedModel === model.id}
            aria-label={`Select ${model.name} model`}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-gray-100">
                {model.name}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${COMPLEXITY_COLORS[model.complexity]}`}>
                {model.complexity}
              </span>
            </div>
            <p className="text-xs text-fg-muted">
              {model.description}
            </p>
          </button>
        ))}
      </div>

      {/* Currently selected model display */}
      {selectedModelInfo && (
        <div className="text-xs text-fg-muted">
          Selected: <span className="font-medium text-fg-secondary">{selectedModelInfo.name}</span>
          {isAutoMode && ' (auto)'}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;
