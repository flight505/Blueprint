import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within, fn } from '@storybook/test';
import { Button } from './Button';

/**
 * Button is the primary interactive element for user actions.
 *
 * ## Usage
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 *
 * ## Accessibility
 * - Uses native `<button>` element for full keyboard support
 * - Loading state sets `aria-busy="true"`
 * - Disabled state prevents interaction and reduces opacity
 */
const meta = {
  title: 'Components/UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Primary button component with multiple variants, sizes, and states for Blueprint UI.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'glass'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the button',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button shows a loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic Variants
// ============================================================================

/**
 * Primary button for main actions like "Save", "Submit", or "Continue".
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

/**
 * Secondary button for less prominent actions.
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

/**
 * Outline button for actions that shouldn't compete with primary actions.
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

/**
 * Ghost button for subtle actions like toolbar buttons or navigation.
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

/**
 * Danger button for destructive actions like "Delete" or "Remove".
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
};

/**
 * Glass button for the Glass Design System - transparent with backdrop blur.
 * Features violet glow on active/focus states.
 */
export const Glass: Story = {
  args: {
    variant: 'glass',
    children: 'Glass Button',
  },
  parameters: {
    backgrounds: { default: 'tokyo-night-storm' },
  },
};

// ============================================================================
// Sizes
// ============================================================================

/**
 * Small is the default size for buttons in Blueprint.
 */
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

/**
 * Medium size for buttons that need more prominence.
 */
export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medium Button',
  },
};

/**
 * Large buttons for prominent calls to action.
 */
export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

// ============================================================================
// States
// ============================================================================

/**
 * Loading state shows a spinner and prevents interaction.
 */
export const Loading: Story = {
  args: {
    loading: true,
    children: 'Saving...',
  },
};

/**
 * Disabled state prevents interaction.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

// ============================================================================
// With Icons
// ============================================================================

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SaveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

/**
 * Button with an icon before the text.
 */
export const WithIcon: Story = {
  args: {
    variant: 'primary',
    icon: <PlusIcon />,
    children: 'New Project',
  },
};

/**
 * Icon-only button for compact UIs.
 */
export const IconOnly: Story = {
  args: {
    variant: 'ghost',
    icon: <SaveIcon />,
    'aria-label': 'Save document',
    children: undefined,
  },
};

// ============================================================================
// All Variants Gallery
// ============================================================================

/**
 * Gallery showing all button variants side by side.
 * All buttons default to small size. Glass variant shows backdrop blur.
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 p-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="glass">Glass</Button>
    </div>
  ),
};

/**
 * Gallery showing all button sizes side by side.
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

// ============================================================================
// Interaction Tests
// ============================================================================

/**
 * Interactive test to verify click behavior.
 */
export const ClickTest: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /click me/i });

    // Verify button exists and is clickable
    await expect(button).toBeInTheDocument();
    await expect(button).toBeEnabled();

    // Click the button
    await userEvent.click(button);

    // Verify onClick was called
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/**
 * Test that disabled button cannot be clicked.
 */
export const DisabledClickTest: Story = {
  args: {
    variant: 'primary',
    children: 'Disabled',
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /disabled/i });

    // Verify button is disabled
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('disabled');
  },
};

/**
 * Test loading state behavior.
 */
export const LoadingStateTest: Story = {
  args: {
    variant: 'primary',
    children: 'Saving...',
    loading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /saving/i });

    // Verify aria-busy is set
    await expect(button).toHaveAttribute('aria-busy', 'true');

    // Verify button is disabled while loading
    await expect(button).toBeDisabled();
  },
};
