import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import FileBrowser from './FileBrowser';

/**
 * FileBrowser displays a file tree explorer with:
 * - Expandable/collapsible directories
 * - File type icons based on extension
 * - Folder selection dialog integration
 * - Loading and error states
 *
 * ## Integration
 * Uses Electron IPC for file system operations via window.electronAPI.
 *
 * ## Glass Design System
 * Designed to work within the glass sidebar panel with subtle
 * hover states and rounded corners.
 */
const meta = {
  title: 'Components/Explorer/FileBrowser',
  component: FileBrowser,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'File tree explorer with directory navigation and file selection.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onFileSelect: fn(),
    onProjectPathChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-64 h-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FileBrowser>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// States
// ============================================================================

/**
 * No project selected - shows folder selection button.
 */
export const NoProjectSelected: Story = {
  args: {
    projectPath: null,
  },
};

/**
 * Project path provided - shows file tree.
 * Note: In Storybook, the mock will return an empty tree.
 */
export const WithProjectPath: Story = {
  args: {
    projectPath: '/Users/demo/my-project',
  },
  decorators: [
    (Story) => {
      // Mock the readDirectory to return a sample tree
      window.electronAPI.readDirectory = async () => [
        {
          name: 'src',
          path: '/Users/demo/my-project/src',
          type: 'directory',
          children: [
            { name: 'index.ts', path: '/Users/demo/my-project/src/index.ts', type: 'file' },
            { name: 'App.tsx', path: '/Users/demo/my-project/src/App.tsx', type: 'file' },
            { name: 'styles.css', path: '/Users/demo/my-project/src/styles.css', type: 'file' },
          ],
        },
        { name: 'README.md', path: '/Users/demo/my-project/README.md', type: 'file' },
        { name: 'package.json', path: '/Users/demo/my-project/package.json', type: 'file' },
        { name: 'tsconfig.json', path: '/Users/demo/my-project/tsconfig.json', type: 'file' },
      ];
      return <Story />;
    },
  ],
};

/**
 * Large file tree with nested directories.
 */
export const LargeFileTree: Story = {
  args: {
    projectPath: '/Users/demo/large-project',
  },
  decorators: [
    (Story) => {
      window.electronAPI.readDirectory = async () => [
        {
          name: 'src',
          path: '/src',
          type: 'directory',
          children: [
            {
              name: 'components',
              path: '/src/components',
              type: 'directory',
              children: [
                { name: 'Button.tsx', path: '/src/components/Button.tsx', type: 'file' },
                { name: 'Input.tsx', path: '/src/components/Input.tsx', type: 'file' },
                { name: 'Modal.tsx', path: '/src/components/Modal.tsx', type: 'file' },
                { name: 'Dropdown.tsx', path: '/src/components/Dropdown.tsx', type: 'file' },
              ],
            },
            {
              name: 'hooks',
              path: '/src/hooks',
              type: 'directory',
              children: [
                { name: 'useAuth.ts', path: '/src/hooks/useAuth.ts', type: 'file' },
                { name: 'useApi.ts', path: '/src/hooks/useApi.ts', type: 'file' },
              ],
            },
            {
              name: 'utils',
              path: '/src/utils',
              type: 'directory',
              children: [
                { name: 'helpers.ts', path: '/src/utils/helpers.ts', type: 'file' },
                { name: 'constants.ts', path: '/src/utils/constants.ts', type: 'file' },
              ],
            },
            { name: 'App.tsx', path: '/src/App.tsx', type: 'file' },
            { name: 'index.tsx', path: '/src/index.tsx', type: 'file' },
          ],
        },
        {
          name: 'public',
          path: '/public',
          type: 'directory',
          children: [
            { name: 'index.html', path: '/public/index.html', type: 'file' },
            { name: 'favicon.svg', path: '/public/favicon.svg', type: 'file' },
          ],
        },
        { name: 'README.md', path: '/README.md', type: 'file' },
        { name: 'package.json', path: '/package.json', type: 'file' },
        { name: 'vite.config.ts', path: '/vite.config.ts', type: 'file' },
      ];
      return <Story />;
    },
  ],
};

/**
 * Various file types with icons.
 */
export const FileTypeIcons: Story = {
  args: {
    projectPath: '/Users/demo/icons-demo',
  },
  decorators: [
    (Story) => {
      window.electronAPI.readDirectory = async () => [
        { name: 'document.md', path: '/document.md', type: 'file' },
        { name: 'config.yml', path: '/config.yml', type: 'file' },
        { name: 'data.json', path: '/data.json', type: 'file' },
        { name: 'script.ts', path: '/script.ts', type: 'file' },
        { name: 'component.tsx', path: '/component.tsx', type: 'file' },
        { name: 'legacy.js', path: '/legacy.js', type: 'file' },
        { name: 'styles.css', path: '/styles.css', type: 'file' },
        { name: 'page.html', path: '/page.html', type: 'file' },
        { name: 'logo.png', path: '/logo.png', type: 'file' },
        { name: 'icon.svg', path: '/icon.svg', type: 'file' },
        { name: 'report.pdf', path: '/report.pdf', type: 'file' },
        { name: 'notes.txt', path: '/notes.txt', type: 'file' },
      ];
      return <Story />;
    },
  ],
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * FileBrowser in glass sidebar.
 */
export const InGlassSidebar: StoryObj = {
  render: () => (
    <FileBrowser
      projectPath="/Users/demo/project"
      onFileSelect={() => {}}
      onProjectPathChange={() => {}}
    />
  ),
  decorators: [
    (Story) => {
      window.electronAPI.readDirectory = async () => [
        {
          name: 'src',
          path: '/src',
          type: 'directory',
          children: [
            { name: 'App.tsx', path: '/src/App.tsx', type: 'file' },
            { name: 'index.ts', path: '/src/index.ts', type: 'file' },
          ],
        },
        { name: 'README.md', path: '/README.md', type: 'file' },
      ];
      return (
        <div className="w-64 h-96 glass glass-border rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-white/10">
            <span className="text-xs font-medium text-glass-secondary">Explorer</span>
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
