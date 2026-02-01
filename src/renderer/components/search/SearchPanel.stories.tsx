import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from '@storybook/test';
import { SearchPanel } from './SearchPanel';

// Mock search results
const mockResults = [
  {
    filePath: '/project/src/components/Button.tsx',
    relativePath: 'src/components/Button.tsx',
    matches: [
      { line: 12, column: 5, content: 'function Button({ onClick, label }) {', match: 'Button' },
      { line: 24, column: 10, content: '  return <button className="btn">{label}</button>;', match: 'button' },
    ],
  },
  {
    filePath: '/project/src/components/Input.tsx',
    relativePath: 'src/components/Input.tsx',
    matches: [
      { line: 8, column: 3, content: 'export function Input({ value, onChange }) {', match: 'Input' },
    ],
  },
  {
    filePath: '/project/src/App.tsx',
    relativePath: 'src/App.tsx',
    matches: [
      { line: 3, column: 8, content: "import { Button } from './components/Button';", match: 'Button' },
      { line: 15, column: 12, content: '      <Button onClick={handleClick} label="Submit" />', match: 'Button' },
      { line: 16, column: 12, content: '      <Button onClick={handleReset} label="Reset" />', match: 'Button' },
    ],
  },
];

/**
 * SearchPanel provides project-wide search with:
 * - Fuzzy text search across all files
 * - Regex and case-sensitive options
 * - Match highlighting with navigation
 * - Keyboard shortcuts (F3, Cmd+G)
 *
 * ## Features
 * - Debounced search (300ms)
 * - Expandable file groups
 * - Match count and navigation
 * - Loading skeleton during search
 *
 * ## Keyboard Shortcuts
 * - `F3` / `Cmd+G` - Next match
 * - `Shift+F3` / `Cmd+Shift+G` - Previous match
 */
const meta = {
  title: 'Components/Search/SearchPanel',
  component: SearchPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Project search panel with regex, case-sensitivity, and match navigation.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onFileSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80 h-[500px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// States
// ============================================================================

/**
 * No project selected.
 */
export const NoProject: Story = {
  args: {
    projectPath: null,
  },
};

/**
 * Empty state - project selected but no search query.
 */
export const EmptyState: Story = {
  args: {
    projectPath: '/Users/demo/project',
  },
};

/**
 * With search results.
 */
export const WithResults: Story = {
  args: {
    projectPath: '/Users/demo/project',
  },
  decorators: [
    (Story) => {
      // Mock the search API
      window.electronAPI.searchInFiles = async () => mockResults;
      return <Story />;
    },
  ],
};

/**
 * No results found.
 */
export const NoResults: Story = {
  args: {
    projectPath: '/Users/demo/project',
  },
  decorators: [
    (Story) => {
      window.electronAPI.searchInFiles = async () => [];
      return <Story />;
    },
  ],
};

/**
 * Many results with scrolling.
 */
export const ManyResults: Story = {
  args: {
    projectPath: '/Users/demo/project',
  },
  decorators: [
    (Story) => {
      window.electronAPI.searchInFiles = async () => [
        ...mockResults,
        {
          filePath: '/project/src/utils/helpers.ts',
          relativePath: 'src/utils/helpers.ts',
          matches: Array.from({ length: 10 }, (_, i) => ({
            line: i * 5 + 1,
            column: 5,
            content: `  const helper${i} = () => doSomething();`,
            match: 'helper',
          })),
        },
        {
          filePath: '/project/src/hooks/useData.ts',
          relativePath: 'src/hooks/useData.ts',
          matches: [
            { line: 5, column: 10, content: 'export function useData() {', match: 'Data' },
            { line: 12, column: 15, content: '  const [data, setData] = useState(null);', match: 'data' },
          ],
        },
      ];
      return <Story />;
    },
  ],
};

// ============================================================================
// Interactive Examples
// ============================================================================

/**
 * Interactive search demo.
 */
export const Interactive: StoryObj = {
  render: function InteractiveSearch() {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [selectedLine, setSelectedLine] = useState<number | null>(null);

    // Mock search that returns results after a delay
    window.electronAPI.searchInFiles = async (_path, query) => {
      await new Promise((r) => setTimeout(r, 500));
      if (!query || query.length < 2) return [];

      // Filter mock results based on query
      return mockResults.filter((r) =>
        r.matches.some((m) =>
          m.content.toLowerCase().includes(query.toLowerCase())
        )
      );
    };

    const handleFileSelect = (path: string, line?: number) => {
      setSelectedFile(path);
      setSelectedLine(line || null);
    };

    return (
      <div className="flex gap-4">
        <div className="w-80 h-[500px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
          <SearchPanel projectPath="/Users/demo/project" onFileSelect={handleFileSelect} />
        </div>
        <div className="w-64 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Selection</h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>File: {selectedFile ? selectedFile.split('/').pop() : 'None'}</p>
            <p>Line: {selectedLine || 'None'}</p>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Try searching: "Button", "Input", "function"
          </p>
        </div>
      </div>
    );
  },
  decorators: [(Story) => <Story />],
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Search panel in glass sidebar.
 */
export const InGlassSidebar: StoryObj = {
  render: () => (
    <SearchPanel projectPath="/Users/demo/project" onFileSelect={() => {}} />
  ),
  decorators: [
    (Story) => {
      window.electronAPI.searchInFiles = async () => mockResults;
      return (
        <div className="w-80 h-[500px] glass glass-border rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-white/10">
            <span className="text-xs font-medium text-glass-secondary">Search</span>
          </div>
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};
