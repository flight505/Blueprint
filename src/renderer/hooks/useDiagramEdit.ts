/**
 * useDiagramEdit - Hook for managing diagram edit modal state
 *
 * Listens to MermaidBlock extension events and provides state for showing
 * the diagram edit modal when user clicks "Edit" on a Mermaid diagram.
 */
import { useState, useEffect, useCallback } from 'react';

export interface DiagramEditState {
  isOpen: boolean;
  code: string;
  nodePos: number | undefined;
}

export interface UseDiagramEditReturn {
  state: DiagramEditState;
  open: (code: string, nodePos?: number) => void;
  close: () => void;
  save: (code: string, nodePos?: number) => void;
}

const initialState: DiagramEditState = {
  isOpen: false,
  code: '',
  nodePos: undefined,
};

// Callback for when diagram is saved - set by component that renders the editor
let onDiagramSaveCallback: ((code: string, nodePos?: number) => void) | null = null;

/**
 * Set the callback for handling diagram saves
 * Called from a component with access to the Tiptap editor
 */
export function setDiagramSaveCallback(
  callback: ((code: string, nodePos?: number) => void) | null
): void {
  onDiagramSaveCallback = callback;
}

export function useDiagramEdit(): UseDiagramEditReturn {
  const [state, setState] = useState<DiagramEditState>(initialState);

  // Open the diagram edit modal
  const open = useCallback((code: string, nodePos?: number) => {
    setState({
      isOpen: true,
      code,
      nodePos,
    });
  }, []);

  // Close the modal without saving
  const close = useCallback(() => {
    setState(initialState);
  }, []);

  // Save the diagram and close the modal
  const save = useCallback((code: string, nodePos?: number) => {
    // Emit save event for interested listeners
    const event = new CustomEvent('tiptap:mermaid-save', {
      detail: { code, pos: nodePos },
    });
    document.dispatchEvent(event);

    // Call the callback if set
    if (onDiagramSaveCallback) {
      onDiagramSaveCallback(code, nodePos);
    }

    // Close the modal
    setState(initialState);
  }, []);

  // Listen to MermaidBlock edit events
  useEffect(() => {
    const handleEditRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ code: string; pos: number }>;
      if (customEvent.detail) {
        open(customEvent.detail.code, customEvent.detail.pos);
      }
    };

    // Listen for edit requests from MermaidBlock extension
    document.addEventListener('tiptap:mermaid-edit', handleEditRequest);

    return () => {
      document.removeEventListener('tiptap:mermaid-edit', handleEditRequest);
    };
  }, [open]);

  return { state, open, close, save };
}

export default useDiagramEdit;
