import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WelcomeScreen } from './WelcomeScreen';

/**
 * WelcomeScreen is displayed when no project is open.
 * It provides quick actions for creating or opening projects,
 * shows recent projects, and displays keyboard shortcuts.
 *
 * ## Features
 * - New Project wizard button
 * - Open existing project button
 * - Recent projects list
 * - Getting started guide
 * - Keyboard shortcuts reference
 *
 * ## Glass Design System
 * Cards use hover effects that complement the glass interface,
 * with subtle shadows and border color changes.
 */
const meta = {
  title: 'Components/Welcome/WelcomeScreen',
  component: WelcomeScreen,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Welcome screen with project actions, recent projects, and getting started guide.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onNewProject: fn(),
    onOpenProject: fn(),
  },
} satisfies Meta<typeof WelcomeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Default States
// ============================================================================

/**
 * Default welcome screen.
 */
export const Default: Story = {};

/**
 * With recent projects in mock data.
 */
export const WithRecentProjects: Story = {
  decorators: [
    (Story) => {
      // Mock recent projects API
      window.electronAPI.recentProjectsList = async () => [
        { id: '1', path: '/Users/demo/my-app', name: 'my-app', lastOpenedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
        { id: '2', path: '/Users/demo/website', name: 'website', lastOpenedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date().toISOString() },
        { id: '3', path: '/Users/demo/api-server', name: 'api-server', lastOpenedAt: new Date(Date.now() - 172800000).toISOString(), createdAt: new Date().toISOString() },
      ];
      return <Story />;
    },
  ],
};

// ============================================================================
// Context Examples
// ============================================================================

/**
 * Welcome screen in full app context.
 */
export const InAppContext: StoryObj = {
  render: () => (
    <div className="h-screen flex">
      {/* Mock Rail */}
      <div className="w-12 bg-surface-raised border-r border-border-default" />
      {/* Main Content */}
      <div className="flex-1 bg-surface">
        <WelcomeScreen onNewProject={() => {}} onOpenProject={() => {}} />
      </div>
    </div>
  ),
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Welcome screen with glass styling.
 */
export const GlassStyled: Story = {
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-gradient-to-br from-surface-deep to-surface p-8">
        <div className="glass glass-border rounded-xl overflow-hidden">
          <Story />
        </div>
      </div>
    ),
  ],
};
