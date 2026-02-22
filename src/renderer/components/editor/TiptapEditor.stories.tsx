import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { TiptapEditor } from './TiptapEditor';

/**
 * TiptapEditor is the rich text editor for document editing in Blueprint.
 *
 * Built on Tiptap with StarterKit extensions, it supports:
 * - Markdown formatting (bold, italic, strikethrough)
 * - Headings (H1-H6), lists, blockquotes, code blocks
 * - Image insertion, undo/redo history
 * - Context menu with AI edit and search
 * - Character count display
 *
 * Note: The editor initializes asynchronously — a loading skeleton
 * is shown briefly before the editor is ready.
 */
const meta = {
  title: 'Components/Editor/TiptapEditor',
  component: TiptapEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Rich text editor built on Tiptap with markdown formatting, code blocks, and AI-assisted editing.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'text',
      description: 'Initial HTML or plain text content',
    },
    editable: {
      control: 'boolean',
      description: 'Whether the editor is editable',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when empty',
    },
    autoFocus: {
      control: 'boolean',
      description: 'Auto-focus on mount',
    },
  },
  args: {
    onChange: fn(),
    onEditorReady: fn(),
    onEditWithAI: fn(),
    onSearch: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TiptapEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic States
// ============================================================================

/**
 * Empty editor with default placeholder.
 */
export const Empty: Story = {
  args: {
    content: '',
  },
};

/**
 * Editor with custom placeholder text.
 */
export const CustomPlaceholder: Story = {
  args: {
    content: '',
    placeholder: 'Write your market research findings here...',
  },
};

/**
 * Editor with plain text content.
 */
export const WithPlainText: Story = {
  args: {
    content: 'This is a simple document with plain text content. The editor supports rich formatting through keyboard shortcuts like Cmd+B for bold and Cmd+I for italic.',
  },
};

// ============================================================================
// Rich Content
// ============================================================================

/**
 * Editor with formatted HTML content including headings, lists, and code.
 */
export const WithRichContent: Story = {
  args: {
    content: `
      <h1>Project Overview</h1>
      <p>Blueprint is an <strong>Electron desktop application</strong> for AI-powered project planning.</p>
      <h2>Key Features</h2>
      <ul>
        <li>Research integration with Perplexity and Gemini</li>
        <li>Citation management and verification</li>
        <li>Confidence scoring for generated content</li>
        <li>Document generation (PDF, DOCX, PPTX)</li>
      </ul>
      <h2>Code Example</h2>
      <pre><code class="code-block">const result = await agentService.chat({
  model: 'claude-sonnet',
  messages: [{ role: 'user', content: 'Analyze this...' }],
});</code></pre>
      <blockquote><p>Note: The architecture follows a clean IPC-based separation between main and renderer processes.</p></blockquote>
    `,
  },
};

/**
 * Editor with a long document to test scrolling.
 */
export const LongDocument: Story = {
  args: {
    content: `
      <h1>Market Research Report</h1>
      <h2>Executive Summary</h2>
      <p>This report analyzes the competitive landscape for AI-powered project planning tools. The market is growing rapidly with an estimated CAGR of 25% through 2028.</p>
      <h2>Market Size and Growth</h2>
      <p>The global AI project management market was valued at $2.1 billion in 2024 and is projected to reach $6.5 billion by 2028. Key drivers include:</p>
      <ul>
        <li>Increasing adoption of AI in enterprise workflows</li>
        <li>Growing demand for automated planning and estimation</li>
        <li>Rising complexity of software projects</li>
        <li>Need for data-driven decision making</li>
      </ul>
      <h2>Competitive Analysis</h2>
      <p>The market is <strong>moderately competitive</strong> with several established players and emerging startups. Key competitors include:</p>
      <ol>
        <li><strong>Linear</strong> — Developer-focused project management</li>
        <li><strong>Notion AI</strong> — AI-enhanced workspace</li>
        <li><strong>Cursor</strong> — AI-powered code editor</li>
      </ol>
      <h2>Risk Assessment</h2>
      <p>Key risks identified in this analysis include API dependency, rapid model evolution, and the potential for market consolidation among LLM providers.</p>
      <blockquote><p>The biggest differentiator for Blueprint is its integrated research-to-planning pipeline with citation tracking and confidence scoring — a capability no competitor currently offers.</p></blockquote>
    `,
  },
};

// ============================================================================
// Editor States
// ============================================================================

/**
 * Read-only editor — content is visible but not editable.
 */
export const ReadOnly: Story = {
  args: {
    content: '<p>This content is <strong>read-only</strong>. You cannot edit it, but you can still select and copy text.</p>',
    editable: false,
  },
};

/**
 * Editor with auto-focus enabled.
 */
export const AutoFocused: Story = {
  args: {
    content: '',
    autoFocus: true,
    placeholder: 'Start typing — editor is auto-focused...',
  },
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Editor on a glass surface background.
 */
export const OnGlassSurface: StoryObj = {
  render: () => (
    <TiptapEditor
      content="<p>Editing within a glass container...</p>"
      onChange={fn()}
    />
  ),
  decorators: [
    (Story) => (
      <div className="p-6 glass glass-border rounded-xl w-[700px]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'tokyo-night-storm' },
  },
};
