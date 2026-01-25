/**
 * useTextSelection hook
 *
 * Tracks text selection in Tiptap editor with fine-grained reactivity.
 * Provides selection state and callbacks for other components to use.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { store$ } from '../state/store';
import { useSelector } from '@legendapp/state/react';

/**
 * Text selection state interface
 */
export interface TextSelection {
  /** The selected text content */
  text: string;
  /** Start position (ProseMirror position) */
  from: number;
  /** End position (ProseMirror position) */
  to: number;
  /** Whether there is an active selection */
  hasSelection: boolean;
  /** Length of selection in characters */
  length: number;
}

/**
 * Empty selection state
 */
export const EMPTY_SELECTION: TextSelection = {
  text: '',
  from: 0,
  to: 0,
  hasSelection: false,
  length: 0,
};

/**
 * Hook to track text selection in a Tiptap editor
 *
 * @param editor - The Tiptap editor instance
 * @param options - Configuration options
 * @returns Selection state and helper functions
 */
export function useTextSelection(
  editor: Editor | null,
  options: {
    /** Minimum selection length to be considered valid (default: 1) */
    minLength?: number;
    /** Callback when selection changes */
    onSelectionChange?: (selection: TextSelection) => void;
    /** Callback when selection is cleared */
    onSelectionClear?: () => void;
  } = {}
) {
  const { minLength = 1, onSelectionChange, onSelectionClear } = options;
  const lastSelectionRef = useRef<TextSelection>(EMPTY_SELECTION);

  // Subscribe to store selection state
  const storeSelection = useSelector(store$.session.textSelection);

  // Update selection state in store
  const updateSelection = useCallback(
    (selection: TextSelection) => {
      const changed =
        lastSelectionRef.current.from !== selection.from ||
        lastSelectionRef.current.to !== selection.to ||
        lastSelectionRef.current.text !== selection.text;

      if (changed) {
        lastSelectionRef.current = selection;
        store$.session.textSelection.set(selection);

        if (selection.hasSelection) {
          onSelectionChange?.(selection);
        } else {
          onSelectionClear?.();
        }
      }
    },
    [onSelectionChange, onSelectionClear]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    updateSelection(EMPTY_SELECTION);
  }, [updateSelection]);

  // Get current selection from editor
  const getSelection = useCallback((): TextSelection => {
    if (!editor) return EMPTY_SELECTION;

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    const length = to - from;
    const hasSelection = length >= minLength && text.trim().length > 0;

    return {
      text: hasSelection ? text : '',
      from,
      to,
      hasSelection,
      length: hasSelection ? length : 0,
    };
  }, [editor, minLength]);

  // Listen to editor selection changes
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const selection = getSelection();
      updateSelection(selection);
    };

    // Listen to selection changes
    editor.on('selectionUpdate', handleSelectionUpdate);

    // Also listen to blur to clear selection (click elsewhere)
    editor.on('blur', () => {
      // Small delay to check if focus moved to another element in the app
      setTimeout(() => {
        if (!editor.isFocused) {
          clearSelection();
        }
      }, 100);
    });

    // Initial selection check
    handleSelectionUpdate();

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('blur', clearSelection);
    };
  }, [editor, getSelection, updateSelection, clearSelection]);

  // Listen for click outside to clear selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!editor) return;

      const editorElement = editor.view.dom;
      const target = event.target as Node;

      // Check if click is outside the editor
      if (!editorElement.contains(target)) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editor, clearSelection]);

  return {
    /** Current selection state from store */
    selection: storeSelection ?? EMPTY_SELECTION,
    /** Clear the current selection */
    clearSelection,
    /** Get fresh selection from editor (not from store) */
    getSelection,
    /** Whether there is an active selection */
    hasSelection: (storeSelection ?? EMPTY_SELECTION).hasSelection,
    /** The selected text */
    selectedText: (storeSelection ?? EMPTY_SELECTION).text,
    /** Selection range { from, to } */
    selectionRange: {
      from: (storeSelection ?? EMPTY_SELECTION).from,
      to: (storeSelection ?? EMPTY_SELECTION).to,
    },
  };
}

export default useTextSelection;
