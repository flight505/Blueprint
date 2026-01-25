/**
 * PromptLibrary - Component for managing reusable AI edit prompts
 *
 * Features:
 * - Built-in templates (Improve clarity, Make concise, Expand details)
 * - Custom prompt creation and management
 * - Variable support ({selection}, {context})
 * - Integration with InlineEditOverlay
 */
import { useState, useEffect, useCallback } from 'react';

export interface Prompt {
  id: string;
  name: string;
  template: string;
  description?: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptLibraryProps {
  /** Currently selected text for variable preview */
  selectedText?: string;
  /** Additional context for variable preview */
  context?: string;
  /** Callback when a prompt is selected */
  onSelect: (processedPrompt: string, originalPrompt: Prompt) => void;
  /** Callback to close the library */
  onClose: () => void;
}

// Built-in prompt templates
const BUILT_IN_PROMPTS: Omit<Prompt, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'builtin-improve-clarity',
    name: 'Improve clarity',
    template: 'Improve the clarity and readability of this text while preserving its meaning:\n\n{selection}',
    description: 'Make the text easier to understand',
    isBuiltIn: true,
  },
  {
    id: 'builtin-make-concise',
    name: 'Make concise',
    template: 'Make this text more concise and direct, removing unnecessary words while keeping the essential meaning:\n\n{selection}',
    description: 'Shorten and tighten the text',
    isBuiltIn: true,
  },
  {
    id: 'builtin-expand-details',
    name: 'Expand details',
    template: 'Expand this text with more details, examples, and explanations to make it more comprehensive:\n\n{selection}',
    description: 'Add more information and depth',
    isBuiltIn: true,
  },
  {
    id: 'builtin-fix-grammar',
    name: 'Fix grammar',
    template: 'Fix any grammar, spelling, and punctuation errors in this text:\n\n{selection}',
    description: 'Correct grammar and spelling mistakes',
    isBuiltIn: true,
  },
  {
    id: 'builtin-professional-tone',
    name: 'Professional tone',
    template: 'Rewrite this text in a more professional and formal tone:\n\n{selection}',
    description: 'Make the tone more business-appropriate',
    isBuiltIn: true,
  },
  {
    id: 'builtin-casual-tone',
    name: 'Casual tone',
    template: 'Rewrite this text in a more casual and conversational tone:\n\n{selection}',
    description: 'Make the tone more relaxed and friendly',
    isBuiltIn: true,
  },
];

/**
 * Process a prompt template by replacing variables with actual values
 */
export function processPromptTemplate(
  template: string,
  variables: { selection?: string; context?: string }
): string {
  let processed = template;

  if (variables.selection !== undefined) {
    processed = processed.replace(/\{selection\}/g, variables.selection);
  }

  if (variables.context !== undefined) {
    processed = processed.replace(/\{context\}/g, variables.context);
  }

  return processed;
}

export function PromptLibrary({
  selectedText = '',
  context = '',
  onSelect,
  onClose,
}: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showNewPromptForm, setShowNewPromptForm] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptTemplate, setNewPromptTemplate] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');

  // Load custom prompts from database on mount
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      // Combine built-in prompts with custom prompts from database
      const builtIn = BUILT_IN_PROMPTS.map((p) => ({
        ...p,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Load custom prompts from database and convert null descriptions to undefined
      const customFromDb = await window.electronAPI.promptListAll();
      const custom: Prompt[] = customFromDb.map((p) => ({
        ...p,
        description: p.description ?? undefined,
      }));
      setPrompts([...builtIn, ...custom]);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      // Fall back to built-in only
      setPrompts(
        BUILT_IN_PROMPTS.map((p) => ({
          ...p,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter prompts by search term
  const filteredPrompts = prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.description?.toLowerCase().includes(filter.toLowerCase()) ||
      p.template.toLowerCase().includes(filter.toLowerCase())
  );

  // Separate built-in and custom prompts
  const builtInPrompts = filteredPrompts.filter((p) => p.isBuiltIn);
  const userPrompts = filteredPrompts.filter((p) => !p.isBuiltIn);

  // Handle prompt selection
  const handleSelectPrompt = useCallback(
    (prompt: Prompt) => {
      const processed = processPromptTemplate(prompt.template, {
        selection: selectedText,
        context,
      });
      onSelect(processed, prompt);
    },
    [selectedText, context, onSelect]
  );

  // Handle creating a new prompt
  const handleCreatePrompt = async () => {
    if (!newPromptName.trim() || !newPromptTemplate.trim()) return;

    const newPrompt: Omit<Prompt, 'createdAt' | 'updatedAt'> = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: newPromptName.trim(),
      template: newPromptTemplate.trim(),
      description: newPromptDescription.trim() || undefined,
      isBuiltIn: false,
    };

    try {
      await window.electronAPI.promptSave(newPrompt);
      await loadPrompts();
      resetForm();
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  // Handle updating an existing prompt
  const handleUpdatePrompt = async () => {
    if (!editingPrompt || !newPromptName.trim() || !newPromptTemplate.trim()) return;

    const updatedPrompt = {
      ...editingPrompt,
      name: newPromptName.trim(),
      template: newPromptTemplate.trim(),
      description: newPromptDescription.trim() || undefined,
    };

    try {
      await window.electronAPI.promptSave(updatedPrompt);
      await loadPrompts();
      resetForm();
    } catch (error) {
      console.error('Failed to update prompt:', error);
    }
  };

  // Handle deleting a prompt
  const handleDeletePrompt = async (promptId: string) => {
    try {
      await window.electronAPI.promptDelete(promptId);
      await loadPrompts();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };

  // Start editing a prompt
  const startEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setNewPromptName(prompt.name);
    setNewPromptTemplate(prompt.template);
    setNewPromptDescription(prompt.description || '');
    setShowNewPromptForm(true);
  };

  // Reset the form
  const resetForm = () => {
    setShowNewPromptForm(false);
    setEditingPrompt(null);
    setNewPromptName('');
    setNewPromptTemplate('');
    setNewPromptDescription('');
  };

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNewPromptForm) {
          resetForm();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showNewPromptForm]);

  return (
    <div className="flex flex-col h-full max-h-80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="Prompt library">
            📚
          </span>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            Prompt Library
          </h4>
        </div>
        <button
          onClick={() => setShowNewPromptForm(true)}
          className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
          aria-label="Create new prompt"
        >
          + New
        </button>
      </div>

      {/* Search filter */}
      <div className="py-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search prompts..."
          className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          aria-label="Search prompts"
        />
      </div>

      {/* New/Edit prompt form */}
      {showNewPromptForm && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 bg-gray-50 dark:bg-gray-800/50">
          <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {editingPrompt ? 'Edit Prompt' : 'New Custom Prompt'}
          </h5>
          <input
            type="text"
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            placeholder="Prompt name"
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
            autoFocus
          />
          <textarea
            value={newPromptTemplate}
            onChange={(e) => setNewPromptTemplate(e.target.value)}
            placeholder="Prompt template (use {selection} and {context} variables)"
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none mb-2"
            rows={3}
          />
          <input
            type="text"
            value={newPromptDescription}
            onChange={(e) => setNewPromptDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-2"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={editingPrompt ? handleUpdatePrompt : handleCreatePrompt}
              disabled={!newPromptName.trim() || !newPromptTemplate.trim()}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingPrompt ? 'Update' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Variables: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{selection}'}</code> = selected text,{' '}
            <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'{context}'}</code> = additional context
          </p>
        </div>
      )}

      {/* Prompt list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
            Loading prompts...
          </div>
        ) : (
          <>
            {/* Built-in prompts */}
            {builtInPrompts.length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-1">
                  Built-in Templates
                </h5>
                <div className="space-y-1">
                  {builtInPrompts.map((prompt) => (
                    <PromptItem
                      key={prompt.id}
                      prompt={prompt}
                      onSelect={() => handleSelectPrompt(prompt)}
                      selectedText={selectedText}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom prompts */}
            {userPrompts.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-1">
                  Custom Prompts
                </h5>
                <div className="space-y-1">
                  {userPrompts.map((prompt) => (
                    <PromptItem
                      key={prompt.id}
                      prompt={prompt}
                      onSelect={() => handleSelectPrompt(prompt)}
                      onEdit={() => startEditPrompt(prompt)}
                      onDelete={() => handleDeletePrompt(prompt.id)}
                      selectedText={selectedText}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredPrompts.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
                {filter ? 'No prompts match your search' : 'No prompts available'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface PromptItemProps {
  prompt: Prompt;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  selectedText?: string;
}

function PromptItem({ prompt, onSelect, onEdit, onDelete, selectedText }: PromptItemProps) {
  const [showPreview, setShowPreview] = useState(false);

  // Generate preview with variables replaced
  const preview = processPromptTemplate(prompt.template, {
    selection: selectedText || '[your selected text]',
    context: '[additional context]',
  });

  return (
    <div
      className="group relative rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 transition-colors"
    >
      <button
        onClick={onSelect}
        className="w-full text-left px-3 py-2"
        aria-label={`Select prompt: ${prompt.name}`}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">
            {prompt.name}
          </span>
          {!prompt.isBuiltIn && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1 text-gray-400 hover:text-blue-500"
                  aria-label="Edit prompt"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete prompt "${prompt.name}"?`)) {
                      onDelete();
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                  aria-label="Delete prompt"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        {prompt.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {prompt.description}
          </p>
        )}
      </button>

      {/* Preview toggle */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="absolute bottom-1 right-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label={showPreview ? 'Hide preview' : 'Show preview'}
      >
        {showPreview ? '▲' : '▼'}
      </button>

      {/* Preview panel */}
      {showPreview && (
        <div className="px-3 pb-2 pt-1 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Preview:</p>
          <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 rounded p-2 max-h-24 overflow-y-auto">
            {preview.length > 300 ? preview.slice(0, 300) + '...' : preview}
          </pre>
        </div>
      )}
    </div>
  );
}

export default PromptLibrary;
