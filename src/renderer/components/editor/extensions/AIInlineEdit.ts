import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * AIInlineEdit extension for Tiptap
 *
 * Provides functionality for AI-assisted inline editing:
 * - Track text selection for AI editing context
 * - Apply AI-generated edits with diff visualization
 * - Manage pending edits (accept/reject)
 * - Support for edit history
 */

export interface AIEditRequest {
  /** Unique ID for this edit request */
  id: string;
  /** The selected text to edit */
  selection: string;
  /** Start position of selection */
  from: number;
  /** End position of selection */
  to: number;
  /** User's instruction for the edit */
  instruction: string;
  /** Timestamp of the request */
  timestamp: number;
}

export interface AIEditResult {
  /** ID matching the request */
  id: string;
  /** The original text */
  original: string;
  /** The AI-generated replacement */
  replacement: string;
  /** Start position */
  from: number;
  /** End position */
  to: number;
  /** Status of the edit */
  status: 'pending' | 'accepted' | 'rejected';
}

export interface AIInlineEditOptions {
  /** Callback when user triggers AI edit (Cmd+K) */
  onEditRequest?: (request: AIEditRequest) => void;
  /** Callback when user accepts an edit */
  onEditAccept?: (result: AIEditResult) => void;
  /** Callback when user rejects an edit */
  onEditReject?: (result: AIEditResult) => void;
  /** Minimum selection length to trigger edit */
  minSelectionLength?: number;
  /** CSS class for pending edit highlights */
  pendingEditClass?: string;
}

export interface AIInlineEditStorage {
  /** Currently pending edit */
  pendingEdit: AIEditResult | null;
  /** History of edits for this session */
  editHistory: AIEditResult[];
}

const AIInlineEditPluginKey = new PluginKey('aiInlineEdit');

// Module-level storage that persists across extension instances
const moduleStorage: AIInlineEditStorage = {
  pendingEdit: null,
  editHistory: [],
};

/**
 * Get the current pending edit
 */
export function getPendingEdit(): AIEditResult | null {
  return moduleStorage.pendingEdit;
}

/**
 * Get edit history
 */
export function getEditHistory(): AIEditResult[] {
  return [...moduleStorage.editHistory];
}

/**
 * Apply a pending edit result (call from external component)
 */
export function applyPendingEdit(result: Omit<AIEditResult, 'status'>): void {
  moduleStorage.pendingEdit = { ...result, status: 'pending' };
  // Dispatch event to notify the editor
  document.dispatchEvent(new CustomEvent('tiptap:ai-edit-applied'));
}

/**
 * Clear the pending edit without applying
 */
export function clearPendingEdit(): void {
  moduleStorage.pendingEdit = null;
  document.dispatchEvent(new CustomEvent('tiptap:ai-edit-cleared'));
}

export const AIInlineEdit = Extension.create<AIInlineEditOptions, AIInlineEditStorage>({
  name: 'aiInlineEdit',

  addOptions() {
    return {
      onEditRequest: undefined,
      onEditAccept: undefined,
      onEditReject: undefined,
      minSelectionLength: 1,
      pendingEditClass: 'ai-pending-edit',
    };
  },

  addStorage() {
    return moduleStorage;
  },

  addKeyboardShortcuts() {
    return {
      // Cmd/Ctrl+K triggers inline edit
      'Mod-k': () => {
        const { from, to } = this.editor.state.selection;
        const selection = this.editor.state.doc.textBetween(from, to, ' ');

        if (selection.length >= (this.options.minSelectionLength ?? 1)) {
          // Emit a custom event that the UI can listen to
          const event = new CustomEvent('tiptap:ai-edit-trigger', {
            detail: { from, to, selection },
          });
          document.dispatchEvent(event);
          return true;
        }
        return false;
      },
      // Escape clears pending edit
      Escape: () => {
        if (moduleStorage.pendingEdit) {
          clearPendingEdit();
          return true;
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: AIInlineEditPluginKey,
        props: {
          decorations(state) {
            const pending = moduleStorage.pendingEdit;
            if (!pending) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            const pendingClass = extension.options.pendingEditClass ?? 'ai-pending-edit';

            // Highlight the original text that will be replaced
            if (pending.from < state.doc.content.size && pending.to <= state.doc.content.size) {
              const highlight = Decoration.inline(pending.from, pending.to, {
                class: pendingClass,
                'data-edit-id': pending.id,
              });
              decorations.push(highlight);
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

/**
 * Helper hook-like function to use in React components
 * Call this with the editor to set up accept/reject handlers
 */
export function setupAIEditHandlers(
  editor: { chain: () => { focus: () => { deleteRange: (range: { from: number; to: number }) => { insertContentAt: (pos: number, content: string) => { run: () => boolean } } } } },
  options?: Pick<AIInlineEditOptions, 'onEditAccept' | 'onEditReject'>
) {
  return {
    acceptEdit() {
      const pending = moduleStorage.pendingEdit;
      if (!pending) return false;

      // Apply the replacement text
      editor
        .chain()
        .focus()
        .deleteRange({ from: pending.from, to: pending.to })
        .insertContentAt(pending.from, pending.replacement)
        .run();

      // Record in history
      moduleStorage.editHistory.push({
        ...pending,
        status: 'accepted',
      });
      moduleStorage.pendingEdit = null;

      options?.onEditAccept?.({ ...pending, status: 'accepted' });
      return true;
    },
    rejectEdit() {
      const pending = moduleStorage.pendingEdit;
      if (!pending) return false;

      // Record in history
      moduleStorage.editHistory.push({
        ...pending,
        status: 'rejected',
      });
      moduleStorage.pendingEdit = null;

      options?.onEditReject?.({ ...pending, status: 'rejected' });
      return true;
    },
  };
}

export default AIInlineEdit;
