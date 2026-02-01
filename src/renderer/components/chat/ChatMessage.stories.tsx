import type { Meta, StoryObj } from '@storybook/react';
import { ChatMessage, type ChatMessageData } from './ChatMessage';

// Mock messages
const userMessage: ChatMessageData = {
  id: '1',
  role: 'user',
  content: 'How do I create a new React component?',
  timestamp: new Date(),
};

const assistantMessage: ChatMessageData = {
  id: '2',
  role: 'assistant',
  content: `Here's how to create a React component:

\`\`\`tsx
function MyComponent({ name }: { name: string }) {
  return <div>Hello, {name}!</div>;
}
\`\`\`

This creates a functional component that accepts a \`name\` prop.`,
  timestamp: new Date(),
};

const markdownMessage: ChatMessageData = {
  id: '3',
  role: 'assistant',
  content: `# Project Overview

Here's a summary of the key features:

- **Fast** - Optimized for performance
- **Type-safe** - Full TypeScript support
- **Modern** - Uses latest React patterns

## Code Example

\`\`\`javascript
const result = await api.fetchData();
console.log(result);
\`\`\`

> Note: This requires Node.js 18+

For more details, see [the documentation](https://example.com).`,
  timestamp: new Date(),
};

const tableMessage: ChatMessageData = {
  id: '4',
  role: 'assistant',
  content: `Here's a comparison table:

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Users | 1 | 10 | Unlimited |
| Storage | 1GB | 100GB | Custom |
| Support | Community | Email | 24/7 |

The Pro plan is recommended for most teams.`,
  timestamp: new Date(),
};

const mathMessage: ChatMessageData = {
  id: '5',
  role: 'assistant',
  content: `The quadratic formula is:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

For inline math, we can write $E = mc^2$.`,
  timestamp: new Date(),
};

const mermaidMessage: ChatMessageData = {
  id: '6',
  role: 'assistant',
  content: `Here's a flowchart of the process:

\`\`\`mermaid
graph TD
    A[Start] --> B{Is valid?}
    B -->|Yes| C[Process]
    B -->|No| D[Show Error]
    C --> E[End]
    D --> E
\`\`\`

This shows the validation flow.`,
  timestamp: new Date(),
};

/**
 * ChatMessage renders user and assistant messages with rich formatting.
 *
 * ## Features
 * - Markdown rendering with GFM support
 * - Syntax highlighted code blocks
 * - LaTeX/KaTeX math rendering
 * - Mermaid diagram support
 * - Tables, links, and task lists
 *
 * ## Glass Design System
 * Assistant messages use glass-inspired backgrounds that complement
 * the Tokyo Night theme.
 */
const meta = {
  title: 'Components/Chat/ChatMessage',
  component: ChatMessage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Chat message component with Markdown, code highlighting, LaTeX, and Mermaid support.',
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
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic Messages
// ============================================================================

/**
 * User message - right-aligned with blue background.
 */
export const UserMessage: Story = {
  args: {
    message: userMessage,
  },
};

/**
 * Assistant message with code example.
 */
export const AssistantWithCode: Story = {
  args: {
    message: assistantMessage,
  },
};

/**
 * Simple text response.
 */
export const SimpleText: Story = {
  args: {
    message: {
      id: '1',
      role: 'assistant',
      content: 'I can help you with that! What would you like to know?',
      timestamp: new Date(),
    },
  },
};

// ============================================================================
// Rich Markdown
// ============================================================================

/**
 * Full markdown with headings, lists, code, and links.
 */
export const RichMarkdown: Story = {
  args: {
    message: markdownMessage,
  },
};

/**
 * Message with a GFM table.
 */
export const WithTable: Story = {
  args: {
    message: tableMessage,
  },
};

/**
 * Task list with checkboxes.
 */
export const TaskList: Story = {
  args: {
    message: {
      id: '1',
      role: 'assistant',
      content: `Here's your todo list:

- [x] Create project structure
- [x] Set up TypeScript
- [ ] Add tests
- [ ] Deploy to production`,
      timestamp: new Date(),
    },
  },
};

// ============================================================================
// Special Content
// ============================================================================

/**
 * LaTeX math rendering with KaTeX.
 */
export const WithMath: Story = {
  args: {
    message: mathMessage,
  },
};

/**
 * Mermaid diagram rendering.
 */
export const WithMermaidDiagram: Story = {
  args: {
    message: mermaidMessage,
  },
};

/**
 * Long code block with syntax highlighting.
 */
export const LongCodeBlock: Story = {
  args: {
    message: {
      id: '1',
      role: 'assistant',
      content: `Here's the complete implementation:

\`\`\`typescript
import { useState, useEffect } from 'react';

interface DataFetcherProps<T> {
  url: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useDataFetcher<T>({ url, onSuccess, onError }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(\`HTTP error! status: \${response.status}\`);
        }

        const result = await response.json();
        setData(result);
        onSuccess?.(result);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
          onError?.(err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    return () => controller.abort();
  }, [url, onSuccess, onError]);

  return { data, loading, error };
}
\`\`\`

This hook handles:
- Automatic loading state
- Error handling
- Request cancellation`,
      timestamp: new Date(),
    },
  },
};

// ============================================================================
// Conversation Flow
// ============================================================================

/**
 * Multiple messages showing conversation flow.
 */
export const Conversation: StoryObj = {
  render: () => (
    <div className="space-y-2">
      <ChatMessage message={userMessage} />
      <ChatMessage message={assistantMessage} />
      <ChatMessage
        message={{
          id: '3',
          role: 'user',
          content: 'Can you show me how to add props?',
          timestamp: new Date(),
        }}
      />
      <ChatMessage
        message={{
          id: '4',
          role: 'assistant',
          content: 'Sure! Here\'s an example with typed props using TypeScript.',
          timestamp: new Date(),
        }}
      />
    </div>
  ),
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Messages on glass surface.
 */
export const OnGlassSurface: StoryObj = {
  render: () => (
    <div className="space-y-2">
      <ChatMessage message={userMessage} />
      <ChatMessage message={assistantMessage} />
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
    backgrounds: { default: 'tokyo-night' },
  },
};
