/**
 * InlineEditOverlay - Overlay component for AI-assisted inline text editing
 *
 * Appears near text selection with:
 * - Input field for edit instructions
 * - Model selector dropdown (auto-selects Sonnet for inline edits, allows override)
 * - Generate button to send request to AI
 * - Prompt library for reusable prompts
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ModelSelector, TaskClassification } from '../models';
import { PromptLibrary, Prompt } from '../prompt-library';
import { Sparkles, X } from '../icons';

export interface InlineEditOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Position near the selection */
  position: { x: number; y: number };
  /** The selected text being edited */
  selectedText: string;
  /** Selection range (from/to positions in the document) */
  selectionRange: { from: number; to: number };
  /** Callback when user submits an edit request */
  onSubmit: (instruction: string, model: string, selectionRange: { from: number; to: number }) => void;
  /** Callback when overlay is closed */
  onClose: () => void;
  /** Whether an edit is currently being generated */
  isGenerating?: boolean;
}

export function InlineEditOverlay({
  isOpen,
  position,
  selectedText,
  selectionRange,
  onSubmit,
  onClose,
  isGenerating = false,
}: InlineEditOverlayProps) {
  const [instruction, setInstruction] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [classification, setClassification] = useState<TaskClassification | null>(null);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset state when overlay opens
  useEffect(() => {
    if (isOpen) {
      setInstruction('');
      setShowPromptLibrary(false);
      // Auto-classify for inline edit task type (defaults to Sonnet)
      window.electronAPI.modelRouterClassifyTask('', { taskType: 'inline_edit' }).then((result) => {
        setClassification(result);
        setSelectedModel(result.model);
      });
      // Focus input after opening
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle prompt library selection
  const handlePromptSelect = useCallback(
    (processedPrompt: string, _originalPrompt: Prompt) => {
      setInstruction(processedPrompt);
      setShowPromptLibrary(false);
      // Focus the input after selecting
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    []
  );

  // Re-classify when instruction changes significantly
  useEffect(() => {
    if (!isOpen || !instruction || instruction.length < 5) return;

    const timer = setTimeout(() => {
      window.electronAPI
        .modelRouterClassifyTask(instruction, {
          taskType: 'inline_edit',
          selectedText,
        })
        .then((result) => {
          setClassification(result);
          // Only auto-update model if user hasn't manually changed it
          // Keep default of Sonnet for inline edits unless clearly complex
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [instruction, isOpen, selectedText]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use capture phase to close before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen, onClose]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!instruction.trim() || isGenerating || !selectedModel) return;
    onSubmit(instruction.trim(), selectedModel, selectionRange);
  }, [instruction, isGenerating, selectedModel, selectionRange, onSubmit]);

  // Handle Enter key to submit (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Calculate adjusted position to keep overlay in viewport
  const getAdjustedPosition = useCallback(() => {
    if (!overlayRef.current) return position;

    const rect = overlayRef.current.getBoundingClientRect();
    const padding = 16;
    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + rect.width + padding > window.innerWidth) {
      x = window.innerWidth - rect.width - padding;
    }
    if (x < padding) {
      x = padding;
    }

    // Adjust vertical position (prefer below selection, but flip if needed)
    if (y + rect.height + padding > window.innerHeight) {
      y = position.y - rect.height - 20; // Position above selection
    }
    if (y < padding) {
      y = padding;
    }

    return { x, y };
  }, [position]);

  const adjustedPosition = getAdjustedPosition();

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed z-50 bg-surface-overlay rounded-lg shadow-xl border border-border-default w-96 p-4"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      role="dialog"
      aria-label="Edit text with AI"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-purple-400" aria-hidden="true" />
          <h3 className="font-medium text-fg">
            Edit with AI
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-fg-muted hover:text-fg p-1 rounded"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Selected text preview */}
      <div className="mb-3">
        <label className="text-xs text-fg-muted block mb-1">
          Selected text ({selectedText.length} chars)
        </label>
        <div className="bg-surface-raised rounded p-2 text-sm text-fg-secondary max-h-20 overflow-y-auto">
          {selectedText.length > 200 ? (
            <>
              {selectedText.slice(0, 100)}
              <span className="text-gray-400">...</span>
              {selectedText.slice(-100)}
            </>
          ) : (
            selectedText
          )}
        </div>
      </div>

      {/* Instruction input with prompt library toggle */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="edit-instruction" className="text-xs text-fg-muted">
            How should this be edited?
          </label>
          <button
            onClick={() => setShowPromptLibrary(!showPromptLibrary)}
            className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
              showPromptLibrary
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-surface-raised text-fg-muted hover:bg-surface-hover'
            }`}
            aria-label={showPromptLibrary ? 'Hide prompt library' : 'Show prompt library'}
            aria-expanded={showPromptLibrary}
          >
            <span role="img" aria-hidden="true">📚</span>
            Prompts
          </button>
        </div>

        {/* Prompt Library Panel */}
        {showPromptLibrary && (
          <div className="mb-2 border border-border-default rounded-lg p-2 bg-surface-raised">
            <PromptLibrary
              selectedText={selectedText}
              onSelect={handlePromptSelect}
              onClose={() => setShowPromptLibrary(false)}
            />
          </div>
        )}

        <textarea
          ref={inputRef}
          id="edit-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Make it more concise, Fix grammar, Translate to French..."
          className="w-full px-3 py-2 rounded-lg border border-border-default bg-input text-fg placeholder-fg-muted resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          rows={2}
          disabled={isGenerating}
          aria-describedby="instruction-hint"
        />
        <p id="instruction-hint" className="text-xs text-fg-muted mt-1">
          Press Enter to generate, Shift+Enter for newline
        </p>
      </div>

      {/* Model selector */}
      <div className="mb-4">
        <ModelSelector
          selectedModel={selectedModel}
          classification={classification}
          onModelChange={setSelectedModel}
          showAutoSelect={true}
          label="Model"
          disabled={isGenerating}
          compact={true}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-fg-muted hover:text-fg disabled:opacity-50"
          disabled={isGenerating}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!instruction.trim() || isGenerating || !selectedModel}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          aria-label="Generate AI edit"
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="32"
                  strokeLinecap="round"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default InlineEditOverlay;
