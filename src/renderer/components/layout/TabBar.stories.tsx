import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { TabBar, type TabData } from './TabBar';

// Mock tab data
const mockTabs: TabData[] = [
  { id: '1', label: 'README.md', path: '/project/README.md' },
  { id: '2', label: 'index.ts', path: '/project/src/index.ts' },
  { id: '3', label: 'App.tsx', path: '/project/src/App.tsx', hasUnsavedChanges: true },
  { id: '4', label: 'styles.css', path: '/project/src/styles.css' },
];

/**
 * TabBar displays document tabs with:
 * - Close button on each tab
 * - Unsaved changes dot indicator
 * - Cmd+1-9 keyboard shortcuts for quick navigation
 *
 * ## Glass Design System
 * Tabs integrate with the Tokyo Night theme using subtle borders
 * and hover states that complement glass surfaces.
 */
const meta = {
  title: 'Components/Layout/TabBar',
  component: TabBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Document tab bar with keyboard shortcuts and unsaved indicators.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    enableKeyboardShortcuts: {
      control: 'boolean',
      description: 'Enable Cmd+1-9 shortcuts for tab switching',
    },
  },
  args: {
    onTabSelect: fn(),
    onTabClose: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-surface-raised border-b border-border-default py-1">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic States
// ============================================================================

/**
 * Single tab selected.
 */
export const SingleTab: Story = {
  args: {
    tabs: [mockTabs[0]],
    activeTabId: '1',
    enableKeyboardShortcuts: true,
  },
};

/**
 * Multiple tabs with one selected.
 */
export const MultipleTabs: Story = {
  args: {
    tabs: mockTabs,
    activeTabId: '2',
    enableKeyboardShortcuts: true,
  },
};

/**
 * Tab with unsaved changes indicator.
 */
export const WithUnsavedChanges: Story = {
  args: {
    tabs: mockTabs,
    activeTabId: '3',
    enableKeyboardShortcuts: true,
  },
};

/**
 * No tabs - shows Welcome tab.
 */
export const Empty: Story = {
  args: {
    tabs: [],
    activeTabId: null,
    enableKeyboardShortcuts: true,
  },
};

/**
 * Keyboard shortcuts disabled.
 */
export const NoKeyboardShortcuts: Story = {
  args: {
    tabs: mockTabs,
    activeTabId: '1',
    enableKeyboardShortcuts: false,
  },
};

// ============================================================================
// Many Tabs (Overflow)
// ============================================================================

/**
 * Many tabs showing horizontal scroll behavior.
 */
export const ManyTabs: Story = {
  args: {
    tabs: [
      ...mockTabs,
      { id: '5', label: 'utils.ts', path: '/project/src/utils.ts' },
      { id: '6', label: 'config.json', path: '/project/config.json' },
      { id: '7', label: 'package.json', path: '/project/package.json' },
      { id: '8', label: 'tsconfig.json', path: '/project/tsconfig.json' },
      { id: '9', label: 'vite.config.ts', path: '/project/vite.config.ts' },
      { id: '10', label: 'tailwind.config.js', path: '/project/tailwind.config.js' },
    ],
    activeTabId: '5',
    enableKeyboardShortcuts: true,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xl bg-surface-raised border-b border-border-default py-1">
        <Story />
      </div>
    ),
  ],
};

// ============================================================================
// Interactive Examples
// ============================================================================

/**
 * Interactive tab management demo.
 */
export const Interactive: StoryObj = {
  render: function InteractiveTabs() {
    const [tabs, setTabs] = useState<TabData[]>([
      { id: '1', label: 'document.md', path: '/doc.md' },
      { id: '2', label: 'notes.md', path: '/notes.md', hasUnsavedChanges: true },
    ]);
    const [activeTabId, setActiveTabId] = useState<string | null>('1');
    let nextId = 3;

    const handleClose = (tabId: string) => {
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeTabId === tabId) {
        const remaining = tabs.filter((t) => t.id !== tabId);
        setActiveTabId(remaining[0]?.id || null);
      }
    };

    const addTab = () => {
      const newTab = { id: String(nextId++), label: `new-file-${nextId}.md`, path: `/new-${nextId}.md` };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    };

    return (
      <div className="space-y-4">
        <div className="bg-surface-raised border-b border-border-default py-1">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSelect={setActiveTabId}
            onTabClose={handleClose}
            enableKeyboardShortcuts={true}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={addTab}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Add Tab
          </button>
        </div>
        <p className="text-xs text-fg-muted">
          Active: <code className="bg-surface-raised px-1 rounded">{activeTabId || 'none'}</code>
        </p>
      </div>
    );
  },
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * TabBar on glass surface.
 */
export const OnGlassSurface: StoryObj = {
  render: () => (
    <TabBar
      tabs={mockTabs}
      activeTabId="2"
      onTabSelect={() => {}}
      onTabClose={() => {}}
      enableKeyboardShortcuts={true}
    />
  ),
  decorators: [
    (Story) => (
      <div className="p-4 glass glass-border rounded-t-xl">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};
