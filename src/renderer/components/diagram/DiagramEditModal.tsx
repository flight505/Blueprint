import { useState, useEffect, useCallback, useRef, useId } from 'react';
import mermaid from 'mermaid';
import { AnimatedModal, AnimatedCollapse } from '../animations';
import { AlertTriangle } from '../icons';

export interface DiagramEditModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Initial Mermaid code to edit */
  initialCode: string;
  /** Position in the editor where the diagram is located */
  nodePos?: number;
  /** Callback when user saves changes */
  onSave: (code: string, nodePos?: number) => void;
  /** Callback when user cancels/closes the modal */
  onClose: () => void;
}

// System prompt for AI diagram generation
const DIAGRAM_SYSTEM_PROMPT = `You are a Mermaid diagram expert. When asked to create or modify a Mermaid diagram, you respond ONLY with valid Mermaid code. Do not include any explanations, markdown code fences, or other text - just the raw Mermaid diagram code.

Rules:
1. Always output valid Mermaid syntax
2. Use appropriate diagram types (flowchart, sequence, class, etc.)
3. Keep diagrams clear and readable
4. Preserve the structure of existing diagrams when modifying
5. Use descriptive node labels`;

/**
 * DiagramEditModal - Modal for editing Mermaid diagrams
 *
 * Features:
 * - Tiptap-style code editor for Mermaid syntax
 * - Live preview with 300ms debounce
 * - Syntax error display
 * - Save/Cancel actions
 */
export function DiagramEditModal({
  isOpen,
  initialCode,
  nodePos,
  onSave,
  onClose,
}: DiagramEditModalProps) {
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<{ svg: string } | { error: string } | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uniqueId = useId();
  const renderIdRef = useRef(0);
  const streamCleanupRef = useRef<(() => void) | null>(null);

  // Reset state when modal opens with new code
  useEffect(() => {
    if (isOpen) {
      setCode(initialCode);
      setPreview(null);
      setShowAiPanel(false);
      setAiPrompt('');
      setAiError(null);
      // Focus textarea when modal opens
      setTimeout(() => textareaRef.current?.focus(), 100);
    }

    // Cleanup stream listener when modal closes
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      // Clean up AI session when modal closes
      if (aiSessionId) {
        window.electronAPI.agentDeleteSession(aiSessionId).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [isOpen, initialCode, aiSessionId]);

  // Render Mermaid diagram
  const renderDiagram = useCallback(async (mermaidCode: string) => {
    if (!mermaidCode.trim()) {
      setPreview({ error: 'No diagram code provided' });
      setIsRendering(false);
      return;
    }

    setIsRendering(true);
    renderIdRef.current += 1;
    const renderId = `diagram-edit-${uniqueId.replace(/:/g, '-')}-${renderIdRef.current}`;

    try {
      // Check for dark mode
      const isDarkMode = document.documentElement.classList.contains('dark');

      // Configure mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      });

      // Validate syntax first
      await mermaid.parse(mermaidCode);

      // Render the diagram
      const { svg } = await mermaid.render(renderId, mermaidCode);
      setPreview({ svg });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
      setPreview({ error: errorMessage });
    } finally {
      setIsRendering(false);
    }
  }, [uniqueId]);

  // Debounced render on code change (300ms)
  useEffect(() => {
    if (!isOpen) return;

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      renderDiagram(code);
    }, 300);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [code, isOpen, renderDiagram]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(code, nodePos);
  }, [code, nodePos, onSave]);

  // Handle AI regeneration
  const handleAiRegenerate = useCallback(async () => {
    if (!aiPrompt.trim()) {
      setAiError('Please describe the changes you want to make');
      return;
    }

    setIsAiGenerating(true);
    setAiError(null);

    try {
      // Check if agent is initialized
      const isInitialized = await window.electronAPI.agentIsInitialized();
      if (!isInitialized) {
        // Try to initialize with stored API key
        const apiKey = await window.electronAPI.secureStorageGetApiKey('anthropic');
        if (!apiKey) {
          setAiError('Please configure your Anthropic API key in Settings');
          setIsAiGenerating(false);
          return;
        }
        const success = await window.electronAPI.agentInitialize(apiKey);
        if (!success) {
          setAiError('Failed to initialize AI service. Check your API key.');
          setIsAiGenerating(false);
          return;
        }
      }

      // Create a session for diagram editing
      const session = await window.electronAPI.agentCreateSession({
        systemPrompt: DIAGRAM_SYSTEM_PROMPT,
        model: 'claude-sonnet-4-6', // Use Sonnet for diagram generation
      });
      setAiSessionId(session.id);

      // Build the prompt with context
      const fullPrompt = code.trim()
        ? `Current Mermaid diagram:\n\`\`\`mermaid\n${code}\n\`\`\`\n\nUser request: ${aiPrompt}\n\nProvide the updated Mermaid diagram code only, no explanations.`
        : `Create a Mermaid diagram for: ${aiPrompt}\n\nProvide only the Mermaid code, no explanations.`;

      // Collect streamed response
      let generatedCode = '';

      // Set up stream listener
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
      streamCleanupRef.current = window.electronAPI.onAgentStreamChunk(
        (streamSessionId, chunk) => {
          if (streamSessionId === session.id) {
            if (chunk.type === 'text') {
              generatedCode += chunk.content;
              // Clean up the generated code (remove markdown fences if present)
              const cleanedCode = cleanMermaidCode(generatedCode);
              setCode(cleanedCode);
            } else if (chunk.type === 'done') {
              setIsAiGenerating(false);
            } else if (chunk.type === 'error') {
              setAiError(chunk.content);
              setIsAiGenerating(false);
            }
          }
        }
      );

      // Send the message with streaming
      await window.electronAPI.agentSendMessageStream(session.id, fullPrompt, {
        maxTokens: 2048,
        stream: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate diagram';
      setAiError(errorMessage);
      setIsAiGenerating(false);
    }
  }, [aiPrompt, code]);

  // Clean up Mermaid code by removing markdown fences
  const cleanMermaidCode = (text: string): string => {
    // Remove markdown code fences
    let cleaned = text.replace(/^```mermaid\n?/i, '').replace(/^```\n?/gm, '');
    // Remove trailing fence
    cleaned = cleaned.replace(/\n?```$/gm, '');
    return cleaned.trim();
  };

  // Toggle AI panel
  const toggleAiPanel = useCallback(() => {
    setShowAiPanel((prev) => {
      if (!prev) {
        // Focus AI input when panel opens
        setTimeout(() => aiInputRef.current?.focus(), 100);
      }
      return !prev;
    });
    setAiError(null);
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Cmd/Ctrl+Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Tab to insert spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newCode = code.substring(0, start) + '  ' + code.substring(end);
          setCode(newCode);
          // Set cursor position after tab
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }, 0);
        }
      }
    },
    [code, handleSave, onClose]
  );

  const hasError = preview !== null && 'error' in preview;

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-5xl max-h-[90vh] mx-4 bg-surface-overlay rounded-lg shadow-xl flex flex-col overflow-hidden"
      aria-labelledby="diagram-edit-title"
    >
      <div onKeyDown={handleKeyDown} className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h2 id="diagram-edit-title" className="text-lg font-semibold">
            Edit Diagram
          </h2>
          <div className="flex items-center gap-2">
            {/* AI Regenerate Button */}
            <button
              onClick={toggleAiPanel}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showAiPanel
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-surface-raised text-fg-secondary hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 dark:hover:text-purple-400'
              }`}
              aria-label="Toggle AI regeneration panel"
              aria-pressed={showAiPanel}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Regenerate with AI
            </button>
            <span className="text-xs text-fg-muted">
              Cmd+S to save • Esc to close
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-fg-muted hover:text-fg rounded hover:bg-surface-hover"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* AI Panel (collapsible with animation) */}
        <AnimatedCollapse isOpen={showAiPanel}>
          <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-200 dark:border-purple-800">
            <div className="flex flex-col gap-2">
              <label htmlFor="ai-diagram-input" className="text-sm font-medium text-purple-800 dark:text-purple-300">
                Describe the changes you want to make
              </label>
              <div className="flex gap-2">
                <textarea
                  ref={aiInputRef}
                  id="ai-diagram-input"
                  value={aiPrompt}
                  onChange={(e) => {
                    setAiPrompt(e.target.value);
                    setAiError(null);
                  }}
                  placeholder="e.g., Add a new node called 'Authentication' connected to 'User'"
                  className="flex-1 px-3 py-2 text-sm border border-purple-300 dark:border-purple-700 rounded-lg bg-input text-fg placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={2}
                  disabled={isAiGenerating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAiRegenerate();
                    }
                  }}
                  aria-label="AI prompt for diagram changes"
                />
                <button
                  onClick={handleAiRegenerate}
                  disabled={isAiGenerating || !aiPrompt.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  aria-label="Generate diagram with AI"
                >
                  {isAiGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate
                    </>
                  )}
                </button>
              </div>
              {aiError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {aiError}
                </p>
              )}
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Tip: Press Cmd+Enter to generate • The AI will update the code in the editor
              </p>
            </div>
          </div>
        </AnimatedCollapse>

        {/* Content - Split panes */}
        <div className="flex-1 flex min-h-0">
          {/* Code editor pane */}
          <div className="w-1/2 flex flex-col border-r border-border-default">
            <div className="px-3 py-2 bg-surface-raised border-b border-border-default">
              <span className="text-sm font-medium text-fg-muted">Mermaid Code</span>
            </div>
            <div className="flex-1 p-0 overflow-hidden">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-surface-raised text-fg resize-none focus:outline-none"
                placeholder="Enter Mermaid diagram code..."
                spellCheck={false}
                aria-label="Mermaid diagram code"
              />
            </div>
          </div>

          {/* Preview pane */}
          <div className="w-1/2 flex flex-col">
            <div className="px-3 py-2 bg-surface-raised border-b border-border-default flex items-center justify-between">
              <span className="text-sm font-medium text-fg-muted">Preview</span>
              {isRendering && (
                <span className="text-xs text-blue-500 animate-pulse">Rendering...</span>
              )}
            </div>
            <div
              ref={previewRef}
              className="flex-1 p-4 overflow-auto bg-surface-overlay"
            >
              {/* Loading state */}
              {isRendering && !preview && (
                <div className="flex items-center justify-center h-full text-fg-muted">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-border-default border-t-blue-500 rounded-full animate-spin" />
                    <span className="mt-2 text-sm">Rendering diagram...</span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {hasError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle size={18} className="text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400">Syntax Error</p>
                      <pre className="text-xs text-red-600 dark:text-red-300 mt-1 whitespace-pre-wrap">
                        {preview.error}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* SVG preview */}
              {preview && 'svg' in preview && (
                <div
                  className="mermaid-preview flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: preview.svg }}
                />
              )}

              {/* Empty state */}
              {!preview && !isRendering && (
                <div className="flex items-center justify-center h-full text-fg-muted">
                  <span className="text-sm">Enter diagram code to see preview</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border-default bg-surface-raised">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-fg-secondary bg-surface-overlay border border-border-default rounded-lg hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={hasError}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
}

export default DiagramEditModal;
