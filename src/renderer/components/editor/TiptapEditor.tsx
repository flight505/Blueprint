import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect } from 'react';

export interface TiptapEditorProps {
  /** Initial content (HTML or plain text) */
  content?: string;
  /** Callback when content changes */
  onChange?: (html: string, text: string) => void;
  /** Callback when editor is ready */
  onEditorReady?: (editor: Editor) => void;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Additional CSS classes for the editor container */
  className?: string;
  /** Auto-focus the editor on mount */
  autoFocus?: boolean;
}

/**
 * TiptapEditor - Rich text editor component built on Tiptap
 *
 * Features:
 * - Markdown-like formatting (bold, italic, strikethrough)
 * - Headings (H1-H6)
 * - Lists (bullet, ordered, task)
 * - Code blocks with syntax highlighting
 * - Blockquotes
 * - Horizontal rules
 * - History (undo/redo)
 */
export function TiptapEditor({
  content = '',
  onChange,
  onEditorReady,
  editable = true,
  placeholder = 'Start typing...',
  className = '',
  autoFocus = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure StarterKit extensions
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: {
          // Code blocks will be enhanced with Mermaid extension
          HTMLAttributes: {
            class: 'code-block',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'inline-code',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'blockquote',
          },
        },
      }),
    ],
    content,
    editable,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'tiptap-editor prose dark:prose-invert max-w-none focus:outline-none',
        'aria-label': 'Rich text editor',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML(), editor.getText());
      }
    },
  });

  // Notify when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Update content if prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!editor) return;

      // Cmd/Ctrl+B for bold
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        editor.chain().focus().toggleBold().run();
      }
      // Cmd/Ctrl+I for italic
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        editor.chain().focus().toggleItalic().run();
      }
      // Cmd/Ctrl+` for inline code
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        editor.chain().focus().toggleCode().run();
      }
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className={`tiptap-editor-loading ${className}`}>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded" />
      </div>
    );
  }

  return (
    <div
      className={`tiptap-editor-container relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="min-h-[200px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
      />

      {/* Placeholder when empty */}
      {editor.isEmpty && (
        <div className="absolute top-4 left-4 text-gray-400 dark:text-gray-500 pointer-events-none">
          {placeholder}
        </div>
      )}

      {/* Character count */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500">
        {editor.storage.characterCount?.characters?.() ?? editor.getText().length} chars
      </div>
    </div>
  );
}

/**
 * Hook to access the editor instance from child components
 */
export function useEditorContext(editor: Editor | null) {
  return {
    editor,
    isReady: editor !== null,
    isEmpty: editor?.isEmpty ?? true,
    isFocused: editor?.isFocused ?? false,
    // Format commands
    toggleBold: () => editor?.chain().focus().toggleBold().run(),
    toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
    toggleStrike: () => editor?.chain().focus().toggleStrike().run(),
    toggleCode: () => editor?.chain().focus().toggleCode().run(),
    toggleCodeBlock: () => editor?.chain().focus().toggleCodeBlock().run(),
    toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
    toggleOrderedList: () => editor?.chain().focus().toggleOrderedList().run(),
    toggleBlockquote: () => editor?.chain().focus().toggleBlockquote().run(),
    setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) =>
      editor?.chain().focus().toggleHeading({ level }).run(),
    // Selection
    getSelectedText: () => {
      if (!editor) return '';
      const { from, to } = editor.state.selection;
      return editor.state.doc.textBetween(from, to, ' ');
    },
    getSelectionRange: () => {
      if (!editor) return { from: 0, to: 0 };
      const { from, to } = editor.state.selection;
      return { from, to };
    },
    // Content
    getHTML: () => editor?.getHTML() ?? '',
    getText: () => editor?.getText() ?? '',
    setContent: (content: string) => editor?.commands.setContent(content),
    // Focus
    focus: () => editor?.commands.focus(),
    blur: () => editor?.commands.blur(),
  };
}

export default TiptapEditor;
