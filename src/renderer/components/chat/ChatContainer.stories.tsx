import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { ChatContainer } from './ChatContainer';
import type { ChatMessageData } from './ChatMessage';

const sampleMessages: ChatMessageData[] = [
  {
    id: 'user-1',
    role: 'user',
    content: 'Help me plan a new React project with TypeScript.',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: 'assistant-1',
    role: 'assistant',
    content: `Great choice! Here's a recommended structure:\n\n\`\`\`\nsrc/\n  components/\n  hooks/\n  utils/\n  types/\n\`\`\`\n\nShall I set up the project scaffold?`,
    timestamp: new Date(Date.now() - 30000),
  },
];

const meta = {
  title: 'Components/Chat/ChatContainer',
  component: ChatContainer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    messages: [],
    onSendMessage: fn(),
    isLoading: false,
    placeholder: 'Type a message to start planning...',
  },
  decorators: [
    (Story) => (
      <div className="h-[500px] w-[360px] bg-surface-deep">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty state shown when no messages exist. */
export const Empty: Story = {};

/** With a conversation history. */
export const WithMessages: Story = {
  args: {
    messages: sampleMessages,
  },
};

/** Loading state while waiting for a response. */
export const Loading: Story = {
  args: {
    messages: [sampleMessages[0]],
    isLoading: true,
  },
};

/** Streaming a response in real-time. */
export const Streaming: Story = {
  args: {
    messages: [sampleMessages[0]],
    isStreaming: true,
    streamingContent: 'Here is a partial response being streamed...',
  },
};

/** With an active question from the agent. */
export const WithQuestion: Story = {
  args: {
    messages: sampleMessages,
    activeQuestion: {
      id: 'q-1',
      question: 'Which styling approach do you prefer?',
      options: [
        { id: 'opt-1', label: 'Tailwind CSS' },
        { id: 'opt-2', label: 'CSS Modules' },
        { id: 'opt-3', label: 'Styled Components' },
      ],
      multiSelect: false,
      timestamp: new Date(),
    },
    onAnswerQuestion: fn(),
  },
};
