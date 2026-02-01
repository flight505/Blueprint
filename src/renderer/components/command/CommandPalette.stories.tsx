import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from '@storybook/test';
import CommandPalette, { type Command } from './CommandPalette';

// Mock commands
const mockCommands: Command[] = [
  { id: 'new-file', label: 'New File', shortcut: 'Cmd+N', category: 'File', action: fn() },
  { id: 'open-file', label: 'Open File', shortcut: 'Cmd+O', category: 'File', action: fn() },
  { id: 'save', label: 'Save', shortcut: 'Cmd+S', category: 'File', action: fn() },
  { id: 'save-as', label: 'Save As...', shortcut: 'Cmd+Shift+S', category: 'File', action: fn() },
  { id: 'find', label: 'Find in File', shortcut: 'Cmd+F', category: 'Edit', action: fn() },
  { id: 'replace', label: 'Find and Replace', shortcut: 'Cmd+H', category: 'Edit', action: fn() },
  { id: 'go-to-line', label: 'Go to Line...', shortcut: 'Cmd+G', category: 'Navigation', action: fn() },
  { id: 'quick-open', label: 'Quick Open', shortcut: 'Cmd+P', category: 'Navigation', action: fn() },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', shortcut: 'Cmd+B', category: 'View', action: fn() },
  { id: 'toggle-terminal', label: 'Toggle Terminal', shortcut: 'Cmd+`', category: 'View', action: fn() },
  { id: 'run-task', label: 'Run Task', shortcut: 'Cmd+Shift+B', category: 'Tasks', action: fn() },
  { id: 'git-commit', label: 'Git: Commit', category: 'Git', action: fn() },
  { id: 'git-push', label: 'Git: Push', category: 'Git', action: fn() },
  { id: 'git-pull', label: 'Git: Pull', category: 'Git', action: fn() },
  { id: 'settings', label: 'Open Settings', shortcut: 'Cmd+,', category: 'Preferences', action: fn() },
  { id: 'keyboard-shortcuts', label: 'Keyboard Shortcuts', shortcut: 'Cmd+K Cmd+S', category: 'Preferences', action: fn() },
];

/**
 * CommandPalette provides quick access to all commands via fuzzy search.
 *
 * ## Features
 * - Fuzzy search powered by Fuse.js
 * - Recent commands shown at top
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Keyboard shortcuts display
 * - Category grouping
 *
 * ## Keyboard
 * - `Cmd+Shift+P` - Open command palette
 * - `↑↓` - Navigate results
 * - `Enter` - Execute command
 * - `Esc` - Close
 *
 * ## Glass Design System
 * Uses semi-transparent backdrop with blur effect.
 */
const meta = {
  title: 'Components/Command/CommandPalette',
  component: CommandPalette,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Command palette with fuzzy search, recent commands, and keyboard navigation.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    onCommandExecuted: fn(),
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// States
// ============================================================================

/**
 * Open state with no search query - shows recent and all commands.
 */
export const Open: Story = {
  args: {
    commands: mockCommands,
    isOpen: true,
    recentCommandIds: ['save', 'find', 'toggle-sidebar'],
  },
};

/**
 * With search query showing filtered results.
 */
export const WithSearchQuery: StoryObj = {
  render: () => {
    const [isOpen] = useState(true);

    return (
      <CommandPalette
        commands={mockCommands}
        isOpen={isOpen}
        onClose={() => {}}
        recentCommandIds={[]}
      />
    );
  },
};

/**
 * Closed state (hidden).
 */
export const Closed: Story = {
  args: {
    commands: mockCommands,
    isOpen: false,
  },
};

/**
 * No recent commands.
 */
export const NoRecentCommands: Story = {
  args: {
    commands: mockCommands,
    isOpen: true,
    recentCommandIds: [],
  },
};

/**
 * Few commands available.
 */
export const FewCommands: Story = {
  args: {
    commands: mockCommands.slice(0, 4),
    isOpen: true,
    recentCommandIds: [],
  },
};

// ============================================================================
// Interactive Examples
// ============================================================================

/**
 * Interactive demo with toggle functionality.
 */
export const Interactive: StoryObj = {
  render: function InteractiveDemo() {
    const [isOpen, setIsOpen] = useState(false);
    const [recentIds, setRecentIds] = useState<string[]>(['save', 'find']);

    const handleExecute = (id: string) => {
      setRecentIds((prev) => [id, ...prev.filter((i) => i !== id)].slice(0, 5));
    };

    return (
      <div className="p-8">
        <div className="mb-4 space-y-2">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Open Command Palette
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Or press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Cmd+Shift+P</kbd>
          </p>
        </div>

        <CommandPalette
          commands={mockCommands}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          recentCommandIds={recentIds}
          onCommandExecuted={handleExecute}
        />
      </div>
    );
  },
};

/**
 * Simulating search behavior.
 */
export const SearchDemo: StoryObj = {
  render: function SearchDemo() {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <div>
        <CommandPalette
          commands={mockCommands}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          recentCommandIds={['git-commit', 'git-push']}
        />
        <div className="fixed bottom-4 left-4 text-sm text-gray-500 dark:text-gray-400">
          Try typing: "git", "file", "toggle"
        </div>
      </div>
    );
  },
};

// ============================================================================
// Special Cases
// ============================================================================

/**
 * Commands without shortcuts.
 */
export const NoShortcuts: Story = {
  args: {
    commands: mockCommands.map(({ shortcut: _shortcut, ...cmd }) => cmd),
    isOpen: true,
    recentCommandIds: [],
  },
};

/**
 * Commands without categories.
 */
export const NoCategories: Story = {
  args: {
    commands: mockCommands.map(({ category: _category, ...cmd }) => cmd),
    isOpen: true,
    recentCommandIds: [],
  },
};

/**
 * Many recent commands.
 */
export const ManyRecentCommands: Story = {
  args: {
    commands: mockCommands,
    isOpen: true,
    recentCommandIds: ['save', 'find', 'git-commit', 'toggle-sidebar', 'settings'],
  },
};
