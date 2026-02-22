import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import FileQuickOpen from './FileQuickOpen';

const meta = {
  title: 'Components/QuickOpen/FileQuickOpen',
  component: FileQuickOpen,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onFileSelect: fn(),
    projectPath: '/Users/demo/my-project',
  },
  decorators: [
    (Story) => (
      <div className="h-[600px] bg-surface-deep">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FileQuickOpen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open state with a project path. */
export const Open: Story = {};

/** Closed state (renders nothing). */
export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

/** Without a project path (disabled input). */
export const NoProject: Story = {
  args: {
    projectPath: null,
  },
};
