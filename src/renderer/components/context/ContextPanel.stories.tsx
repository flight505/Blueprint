import type { Meta, StoryObj } from '@storybook/react';
import ContextPanel from './ContextPanel';

const meta = {
  title: 'Components/Context/ContextPanel',
  component: ContextPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    maxTokens: 200000,
  },
  decorators: [
    (Story) => (
      <div className="h-[500px] w-[360px] bg-surface-deep">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContextPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default state with no active session. */
export const Default: Story = {};

/** With an active session ID. */
export const WithSession: Story = {
  args: {
    sessionId: 'session-abc-123',
  },
};

/** With a smaller token budget. */
export const SmallTokenBudget: Story = {
  args: {
    maxTokens: 8000,
  },
};
