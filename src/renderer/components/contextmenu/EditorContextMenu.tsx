/**
 * EditorContextMenu - Context menu for text selection in the editor
 *
 * Provides quick actions for selected text:
 * - Edit with AI (Cmd+K)
 * - Copy
 * - Search in project
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector } from '@legendapp/state/react';
import { store$ } from '../../state/store';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface EditorContextMenuProps {
  /** Whether the menu is visible */
  isOpen: boolean;
  /** Position of the menu */
  position: ContextMenuPosition | null;
  /** Callback when menu should close */
  onClose: () => void;
  /** Callback when "Edit with AI" is clicked */
  onEditWithAI?: () => void;
  /** Callback when "Search" is clicked */
  onSearch?: (text: string) => void;
  /** Container element for positioning bounds */
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface MenuItemProps {
  label: string;
  shortcut?: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}

function MenuItem({ label, shortcut, icon, onClick, disabled = false }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
        disabled
          ? 'text-gray-500 cursor-not-allowed'
          : 'text-gray-200 hover:bg-gray-700'
      }`}
      role="menuitem"
      aria-disabled={disabled}
    >
      <span className="w-5 text-center" aria-hidden="true">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-4">
          {shortcut}
        </span>
      )}
    </button>
  );
}

function MenuDivider() {
  return <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" role="separator" />;
}

export function EditorContextMenu({
  isOpen,
  position,
  onClose,
  onEditWithAI,
  onSearch,
  // containerRef reserved for future viewport boundary calculations
}: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<ContextMenuPosition | null>(null);

  // Get current selection from store
  const selection = useSelector(() => store$.session.textSelection.get());

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!isOpen || !position || !menuRef.current) {
      setAdjustedPosition(position);
      return;
    }

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position if menu would overflow right edge
    if (x + menuRect.width > viewportWidth - 10) {
      x = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (y + menuRect.height > viewportHeight - 10) {
      y = viewportHeight - menuRect.height - 10;
    }

    // Ensure minimum positions
    x = Math.max(10, x);
    y = Math.max(10, y);

    setAdjustedPosition({ x, y });
  }, [isOpen, position]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    // Use capture phase to catch clicks before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Handle Copy action
  const handleCopy = useCallback(() => {
    if (selection?.text) {
      navigator.clipboard.writeText(selection.text).catch((err) => {
        console.error('Failed to copy text:', err);
      });
    }
    onClose();
  }, [selection, onClose]);

  // Handle Edit with AI action
  const handleEditWithAI = useCallback(() => {
    if (onEditWithAI) {
      onEditWithAI();
    }
    onClose();
  }, [onEditWithAI, onClose]);

  // Handle Search action
  const handleSearch = useCallback(() => {
    if (onSearch && selection?.text) {
      onSearch(selection.text);
    }
    onClose();
  }, [onSearch, selection, onClose]);

  // Don't render if not open or no position
  if (!isOpen || !adjustedPosition) return null;

  const hasSelection = selection?.hasSelection && selection.text.trim().length > 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] py-1 bg-gray-800 rounded-lg shadow-lg border border-gray-700"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      role="menu"
      aria-label="Editor context menu"
    >
      <MenuItem
        label="Edit with AI"
        shortcut="⌘K"
        icon="✨"
        onClick={handleEditWithAI}
        disabled={!hasSelection}
      />
      <MenuDivider />
      <MenuItem
        label="Copy"
        shortcut="⌘C"
        icon="📋"
        onClick={handleCopy}
        disabled={!hasSelection}
      />
      <MenuItem
        label="Search in Project"
        shortcut="⌘⇧F"
        icon="🔍"
        onClick={handleSearch}
        disabled={!hasSelection}
      />
    </div>
  );
}

/**
 * Hook to manage context menu state
 */
export function useEditorContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);

  const open = useCallback((pos: ContextMenuPosition) => {
    setPosition(pos);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Check if there's a selection
    const selection = store$.session.textSelection.get();
    if (selection?.hasSelection && selection.text.trim().length > 0) {
      e.preventDefault();
      open({ x: e.clientX, y: e.clientY });
    }
  }, [open]);

  return {
    isOpen,
    position,
    open,
    close,
    handleContextMenu,
  };
}

export default EditorContextMenu;
