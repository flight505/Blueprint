import type { Meta, StoryObj } from '@storybook/react';
import { StreamingChatMessage } from './StreamingChatMessage';

/**
 * StreamingChatMessage displays assistant responses during streaming.
 *
 * Shows animated dots while streaming and a timestamp when complete.
 * Uses StreamingMarkdown for O(n) incremental rendering.
 */
const meta = {
  title: 'Components/Chat/StreamingChatMessage',
  component: StreamingChatMessage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Assistant message bubble with streaming indicator and incremental markdown rendering.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StreamingChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Streaming States
// ============================================================================

/**
 * Currently streaming with animated dots indicator.
 */
export const Streaming: Story = {
  args: {
    content: 'Here is the beginning of my response. Let me analyze that for you...',
    isStreaming: true,
  },
};

/**
 * Empty content — just started streaming.
 */
export const StreamingEmpty: Story = {
  args: {
    content: '',
    isStreaming: true,
  },
};

/**
 * Streaming with a longer response in progress.
 */
export const StreamingLongContent: Story = {
  args: {
    content: `Here's what I found about your project:

**Key Findings:**
- The architecture follows a clean separation of concerns
- TypeScript is used consistently throughout
- Test coverage could be improved in the services layer

Let me dig deeper into the services...`,
    isStreaming: true,
  },
};

// ============================================================================
// Complete States
// ============================================================================

/**
 * Completed response with timestamp visible.
 */
export const Complete: Story = {
  args: {
    content: 'I can help you with that! The solution is to use a custom hook for state management.',
    isStreaming: false,
    timestamp: new Date(),
  },
};

/**
 * Completed response with rich markdown content.
 */
export const CompleteWithMarkdown: Story = {
  args: {
    content: `Here's how to create a React component:

\`\`\`tsx
function MyComponent({ name }: { name: string }) {
  return <div>Hello, {name}!</div>;
}
\`\`\`

This creates a functional component that accepts a \`name\` prop.

**Key points:**
- Use **TypeScript** for type safety
- Keep components *focused* and small
- Follow the [React docs](https://react.dev) for best practices`,
    isStreaming: false,
    timestamp: new Date(),
  },
};

/**
 * Complete without timestamp.
 */
export const CompleteNoTimestamp: Story = {
  args: {
    content: 'Done! The project has been created successfully.',
    isStreaming: false,
  },
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Streaming message on a glass surface background.
 */
export const OnGlassSurface: StoryObj = {
  render: () => (
    <div className="space-y-3">
      <StreamingChatMessage
        content="Analyzing your codebase structure..."
        isStreaming={true}
      />
      <StreamingChatMessage
        content="The analysis is complete. Your project follows solid architectural patterns."
        isStreaming={false}
        timestamp={new Date()}
      />
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="p-6 glass glass-border rounded-xl w-[520px]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'tokyo-night-storm' },
  },
};
