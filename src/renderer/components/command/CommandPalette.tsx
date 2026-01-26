import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { AnimatedOverlay } from '../animations';

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category?: string;
  action: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
  recentCommandIds?: string[];
  onCommandExecuted?: (commandId: string) => void;
}

const MAX_RECENT_COMMANDS = 5;

export default function CommandPalette({
  commands,
  isOpen,
  onClose,
  recentCommandIds = [],
  onCommandExecuted,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(commands, {
      keys: ['label', 'category'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });
  }, [commands]);

  // Get filtered results
  const results = useMemo(() => {
    if (query.trim() === '') {
      // When no query, show recent commands at top, then all commands
      const recentCommands = recentCommandIds
        .map(id => commands.find(cmd => cmd.id === id))
        .filter((cmd): cmd is Command => cmd !== undefined)
        .slice(0, MAX_RECENT_COMMANDS);

      const otherCommands = commands.filter(
        cmd => !recentCommandIds.includes(cmd.id)
      );

      return [
        ...recentCommands.map(cmd => ({ item: cmd, isRecent: true })),
        ...otherCommands.map(cmd => ({ item: cmd, isRecent: false })),
      ];
    }

    // Use Fuse.js for fuzzy search
    const searchResults = fuse.search(query);
    return searchResults.map(result => ({
      item: result.item,
      isRecent: recentCommandIds.includes(result.item.id),
    }));
  }, [query, commands, fuse, recentCommandIds]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after a short delay to ensure overlay is visible
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(
        '[data-selected="true"]'
      );
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            executeCommand(results[selectedIndex].item);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onClose]
  );

  const executeCommand = useCallback(
    (command: Command) => {
      onClose();
      command.action();
      onCommandExecuted?.(command.id);
    },
    [onClose, onCommandExecuted]
  );

  return (
    <AnimatedOverlay
      isOpen={isOpen}
      onClose={onClose}
      className="w-[600px] max-w-[90vw] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden"
      position="top"
    >
      <div role="combobox" aria-expanded="true" aria-haspopup="listbox">
        {/* Search Input */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search commands"
            aria-controls="command-list"
            aria-autocomplete="list"
          />
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          id="command-list"
          className="max-h-[300px] overflow-y-auto"
          role="listbox"
          aria-label="Commands"
        >
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              No commands found
            </div>
          ) : (
            results.map((result, index) => (
              <CommandItem
                key={result.item.id}
                command={result.item}
                isRecent={result.isRecent && query.trim() === ''}
                isSelected={index === selectedIndex}
                onClick={() => executeCommand(result.item)}
                onMouseEnter={() => setSelectedIndex(index)}
              />
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              ↑↓
            </kbd>{' '}
            to navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              Enter
            </kbd>{' '}
            to select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              Esc
            </kbd>{' '}
            to close
          </span>
        </div>
      </div>
    </AnimatedOverlay>
  );
}

interface CommandItemProps {
  command: Command;
  isRecent: boolean;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function CommandItem({
  command,
  isRecent,
  isSelected,
  onClick,
  onMouseEnter,
}: CommandItemProps) {
  return (
    <div
      className={`px-4 py-2.5 cursor-pointer flex items-center justify-between ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900/50'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      data-selected={isSelected}
      role="option"
      aria-selected={isSelected}
    >
      <div className="flex items-center gap-3">
        {isRecent && (
          <span
            className="text-xs text-gray-400 dark:text-gray-500"
            aria-label="Recent command"
          >
            🕐
          </span>
        )}
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {command.label}
          </div>
          {command.category && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {command.category}
            </div>
          )}
        </div>
      </div>
      {command.shortcut && (
        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 font-mono">
          {command.shortcut}
        </kbd>
      )}
    </div>
  );
}

// Hook for managing command palette state and recent commands
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>(() => {
    // Load recent commands from localStorage
    const stored = localStorage.getItem('blueprint:recentCommands');
    return stored ? JSON.parse(stored) : [];
  });

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const recordCommandUsage = useCallback((commandId: string) => {
    setRecentCommandIds(prev => {
      // Remove the command if it's already in the list
      const filtered = prev.filter(id => id !== commandId);
      // Add it to the front
      const updated = [commandId, ...filtered].slice(0, MAX_RECENT_COMMANDS);
      // Persist to localStorage
      localStorage.setItem('blueprint:recentCommands', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    recentCommandIds,
    recordCommandUsage,
  };
}
