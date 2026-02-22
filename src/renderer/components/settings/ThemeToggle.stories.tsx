import type { Meta, StoryObj } from '@storybook/react';
import ThemeToggle from './ThemeToggle';

/**
 * ThemeToggle provides UI for switching between light, dark, and system themes.
 * Uses Legend State store for theme persistence.
 *
 * ## Design
 * - Three options: Light, Dark, System
 * - Visual feedback with icons and pressed state
 * - Accessible with proper ARIA attributes
 *
 * ## Glass Design System
 * The toggle buttons use borders and backgrounds that complement
 * the glass surfaces in the Blueprint interface.
 */
const meta = {
  title: 'Components/Settings/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Theme toggle with light, dark, and system options.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      // Mock the store for Storybook
      return (
        <div className="w-[320px] p-4 bg-surface-raised rounded-lg">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Default State
// ============================================================================

/**
 * Default theme toggle.
 */
export const Default: Story = {};

// ============================================================================
// Context Examples
// ============================================================================

/**
 * In settings panel context.
 */
export const InSettingsPanel: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Appearance</h3>
        <ThemeToggle />
      </div>
      <div className="pt-4 border-t border-border-default">
        <p className="text-sm text-fg-muted">
          Other settings would appear here...
        </p>
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-[400px] p-6 bg-surface-raised rounded-lg border border-border-default">
        <Story />
      </div>
    ),
  ],
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Theme toggle on glass surface.
 */
export const OnGlassSurface: StoryObj = {
  render: () => <ThemeToggle />,
  decorators: [
    (Story) => (
      <div className="p-6 glass glass-border rounded-xl w-[360px]">
        <h3 className="text-sm font-medium text-glass-primary mb-4">Settings</h3>
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};
