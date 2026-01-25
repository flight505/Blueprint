/**
 * useInlineEdit - Hook for managing inline edit overlay state and AI interaction
 *
 * Listens to AIInlineEdit extension events and coordinates with the Agent SDK
 * for generating AI-powered text edits.
 */
import { useState, useCallback, useEffect } from 'react';
import { applyPendingEdit } from '../components/editor/extensions/AIInlineEdit';

export interface InlineEditState {
  isOpen: boolean;
  position: { x: number; y: number };
  selectedText: string;
  selectionRange: { from: number; to: number };
  isGenerating: boolean;
}

export interface UseInlineEditReturn {
  state: InlineEditState;
  open: (data: { x: number; y: number; selectedText: string; from: number; to: number }) => void;
  close: () => void;
  handleSubmit: (instruction: string, model: string, selectionRange: { from: number; to: number }) => Promise<void>;
}

const initialState: InlineEditState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  selectedText: '',
  selectionRange: { from: 0, to: 0 },
  isGenerating: false,
};

export function useInlineEdit(): UseInlineEditReturn {
  const [state, setState] = useState<InlineEditState>(initialState);

  // Open the overlay
  const open = useCallback(
    (data: { x: number; y: number; selectedText: string; from: number; to: number }) => {
      setState({
        isOpen: true,
        position: { x: data.x, y: data.y },
        selectedText: data.selectedText,
        selectionRange: { from: data.from, to: data.to },
        isGenerating: false,
      });
    },
    []
  );

  // Close the overlay
  const close = useCallback(() => {
    setState(initialState);
  }, []);

  // Handle edit submission - calls Agent SDK
  const handleSubmit = useCallback(
    async (instruction: string, model: string, selectionRange: { from: number; to: number }) => {
      setState((prev) => ({ ...prev, isGenerating: true }));

      try {
        // Build the prompt for the AI to edit the text
        const editPrompt = `You are editing a selected portion of text. Your task is to modify the text according to the user's instruction.

Selected text to edit:
"""
${state.selectedText}
"""

User's instruction: ${instruction}

Respond with ONLY the modified text. Do not include any explanation, markdown formatting, or quotes around the text. Just output the edited text directly.`;

        // Create a one-off session for inline edit
        const session = await window.electronAPI.agentCreateSession({ model });

        // Send to Agent SDK with the selected model
        const response = await window.electronAPI.agentSendMessage(session.id, editPrompt);

        // Extract the response text from content blocks
        let replacement = '';
        if (response?.content && Array.isArray(response.content)) {
          for (const block of response.content) {
            if (block.type === 'text' && block.text) {
              replacement += block.text;
            }
          }
        }

        // Apply the pending edit - this will trigger the diff preview
        const editId = `edit-${Date.now()}`;
        applyPendingEdit({
          id: editId,
          original: state.selectedText,
          replacement: replacement.trim(),
          from: selectionRange.from,
          to: selectionRange.to,
        });

        // Clean up the one-off session
        await window.electronAPI.agentDeleteSession(session.id);

        // Close the overlay (diff preview will show in the editor)
        close();
      } catch (error) {
        console.error('Failed to generate AI edit:', error);
        // Keep overlay open on error so user can retry
        setState((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [state.selectedText, close]
  );

  // Listen to AIInlineEdit extension events
  useEffect(() => {
    const handleEditTrigger = (e: CustomEvent<{ from: number; to: number; selection: string }>) => {
      const { from, to, selection } = e.detail;

      // Get selection coordinates for positioning the overlay
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position overlay below the selection
        open({
          x: rect.left,
          y: rect.bottom + 8,
          selectedText: selection,
          from,
          to,
        });
      } else {
        // Fallback: use center of screen if no DOM selection
        open({
          x: window.innerWidth / 2 - 192, // Half of overlay width
          y: window.innerHeight / 3,
          selectedText: selection,
          from,
          to,
        });
      }
    };

    // Listen for the Cmd+K trigger from the AIInlineEdit extension
    document.addEventListener('tiptap:ai-edit-trigger', handleEditTrigger as EventListener);

    return () => {
      document.removeEventListener('tiptap:ai-edit-trigger', handleEditTrigger as EventListener);
    };
  }, [open]);

  return { state, open, close, handleSubmit };
}

export default useInlineEdit;
