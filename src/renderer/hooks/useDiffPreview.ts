/**
 * useDiffPreview - Hook for managing diff preview state
 *
 * Listens to AIInlineEdit extension events and provides state for showing
 * the diff preview modal when an AI edit is applied.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getPendingEdit,
  clearPendingEdit,
} from '../components/editor/extensions/AIInlineEdit';

export interface DiffPreviewState {
  isOpen: boolean;
  original: string;
  proposed: string;
  from: number;
  to: number;
  editId: string;
}

export interface UseDiffPreviewReturn {
  state: DiffPreviewState;
  acceptEdit: () => void;
  rejectEdit: () => void;
  close: () => void;
}

const initialState: DiffPreviewState = {
  isOpen: false,
  original: '',
  proposed: '',
  from: 0,
  to: 0,
  editId: '',
};

// Editor reference for applying edits
let editorRef: {
  chain: () => {
    focus: () => {
      deleteRange: (range: { from: number; to: number }) => {
        insertContentAt: (pos: number, content: string) => {
          run: () => boolean;
        };
      };
    };
  };
} | null = null;

/**
 * Set the editor reference for applying edits
 * Called from TiptapEditor component
 */
export function setDiffPreviewEditor(
  editor: typeof editorRef
): void {
  editorRef = editor;
}

export function useDiffPreview(): UseDiffPreviewReturn {
  const [state, setState] = useState<DiffPreviewState>(initialState);

  // Accept the pending edit - apply changes to editor
  const acceptEdit = useCallback(() => {
    const pending = getPendingEdit();
    if (!pending || !editorRef) {
      console.warn('No pending edit or editor available');
      return;
    }

    // Apply the replacement text to the editor
    editorRef
      .chain()
      .focus()
      .deleteRange({ from: pending.from, to: pending.to })
      .insertContentAt(pending.from, pending.replacement)
      .run();

    // Clear the pending edit
    clearPendingEdit();

    // Close the diff preview
    setState(initialState);
  }, []);

  // Reject the pending edit - discard changes
  const rejectEdit = useCallback(() => {
    // Clear the pending edit without applying
    clearPendingEdit();

    // Close the diff preview
    setState(initialState);
  }, []);

  // Close without action (same as reject for now)
  const close = useCallback(() => {
    clearPendingEdit();
    setState(initialState);
  }, []);

  // Listen to AIInlineEdit extension events
  useEffect(() => {
    const handleEditApplied = () => {
      const pending = getPendingEdit();
      if (pending) {
        setState({
          isOpen: true,
          original: pending.original,
          proposed: pending.replacement,
          from: pending.from,
          to: pending.to,
          editId: pending.id,
        });
      }
    };

    const handleEditCleared = () => {
      setState(initialState);
    };

    // Listen for the apply event from AIInlineEdit extension
    document.addEventListener('tiptap:ai-edit-applied', handleEditApplied);
    document.addEventListener('tiptap:ai-edit-cleared', handleEditCleared);

    return () => {
      document.removeEventListener('tiptap:ai-edit-applied', handleEditApplied);
      document.removeEventListener('tiptap:ai-edit-cleared', handleEditCleared);
    };
  }, []);

  return { state, acceptEdit, rejectEdit, close };
}

export default useDiffPreview;
