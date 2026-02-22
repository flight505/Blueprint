import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PanelArea } from './PanelArea';
import type { ChatMessageData } from '../chat';

const sampleMessages: ChatMessageData[] = [
  {
    id: 'user-1',
    role: 'user',
    content: 'Hello!',
    timestamp: new Date(),
  },
  {
    id: 'assistant-1',
    role: 'assistant',
    content: 'Welcome to Blueprint! How can I help you plan your project?',
    timestamp: new Date(),
  },
];

const meta = {
  title: 'Components/Layout/PanelArea',
  component: PanelArea,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    section: 'chat',
    onFileSelect: fn(),
    chatMessages: [],
    isChatLoading: false,
    onSendMessage: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-[600px] w-[360px] bg-[#1f2335]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PanelArea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Chat section with empty conversation. */
export const ChatEmpty: Story = {
  args: {
    section: 'chat',
  },
};

/** Chat section with messages. */
export const ChatWithMessages: Story = {
  args: {
    section: 'chat',
    chatMessages: sampleMessages,
  },
};

/** Context section showing tabs. */
export const ContextTabs: Story = {
  args: {
    section: 'context',
  },
};

/** Planning section placeholder. */
export const Planning: Story = {
  args: {
    section: 'planning',
  },
};

/** Export section with format options. */
export const Export: Story = {
  args: {
    section: 'export',
    onOpenExportModal: fn(),
  },
};

/** Settings section. */
export const Settings: Story = {
  args: {
    section: 'settings',
  },
};

/** Help section with keyboard shortcuts. */
export const Help: Story = {
  args: {
    section: 'help',
  },
};
