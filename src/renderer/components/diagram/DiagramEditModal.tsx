import { useState, useEffect, useCallback, useRef, useId } from 'react';
import mermaid from 'mermaid';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uniqueId = useId();
  const renderIdRef = useRef(0);

  // Reset state when modal opens with new code
  useEffect(() => {
    if (isOpen) {
      setCode(initialCode);
      setPreview(null);
      // Focus textarea when modal opens
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, initialCode]);

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

  // Don't render if not open
  if (!isOpen) return null;

  const hasError = preview !== null && 'error' in preview;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagram-edit-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className="relative z-10 w-full max-w-5xl max-h-[90vh] mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 id="diagram-edit-title" className="text-lg font-semibold">
            Edit Diagram
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Cmd+S to save • Esc to close
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Split panes */}
        <div className="flex-1 flex min-h-0">
          {/* Code editor pane */}
          <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Mermaid Code</span>
            </div>
            <div className="flex-1 p-0 overflow-hidden">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
                placeholder="Enter Mermaid diagram code..."
                spellCheck={false}
                aria-label="Mermaid diagram code"
              />
            </div>
          </div>

          {/* Preview pane */}
          <div className="w-1/2 flex flex-col">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Preview</span>
              {isRendering && (
                <span className="text-xs text-blue-500 animate-pulse">Rendering...</span>
              )}
            </div>
            <div
              ref={previewRef}
              className="flex-1 p-4 overflow-auto bg-white dark:bg-gray-800"
            >
              {/* Loading state */}
              {isRendering && !preview && (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                    <span className="mt-2 text-sm">Rendering diagram...</span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {hasError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2">⚠️</span>
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
                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  <span className="text-sm">Enter diagram code to see preview</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
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
    </div>
  );
}

export default DiagramEditModal;
