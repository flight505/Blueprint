import type { Meta, StoryObj } from '@storybook/react';
import { fn, expect, userEvent, within } from 'storybook/test';
import { AskUserQuestion, type AskUserQuestionData } from './AskUserQuestion';

// Mock question data
const singleSelectQuestion: AskUserQuestionData = {
  id: 'q-1',
  question: 'Which research mode should we use for this project?',
  options: [
    {
      id: 'quick',
      label: 'Quick Research',
      description: 'Fast results using Perplexity. Best for simple queries (~30 seconds).',
    },
    {
      id: 'balanced',
      label: 'Balanced Research',
      description: 'Good balance of speed and depth using mixed providers.',
    },
    {
      id: 'comprehensive',
      label: 'Comprehensive Research',
      description: 'Deep analysis using Gemini. Most thorough but slower (up to 60 minutes).',
    },
  ],
  multiSelect: false,
  timestamp: new Date(),
};

const multiSelectQuestion: AskUserQuestionData = {
  id: 'q-2',
  question: 'Which planning phases do you want to include?',
  options: [
    { id: 'market', label: 'Market Research', description: 'Market analysis and trends' },
    { id: 'competitive', label: 'Competitive Analysis', description: 'Competitor research' },
    { id: 'technical', label: 'Technical Feasibility', description: 'Tech stack evaluation' },
    { id: 'architecture', label: 'Architecture Design', description: 'System design decisions' },
  ],
  multiSelect: true,
  timestamp: new Date(),
};

const simpleQuestion: AskUserQuestionData = {
  id: 'q-3',
  question: 'Do you want to proceed with the current configuration?',
  options: [
    { id: 'yes', label: 'Yes, proceed' },
    { id: 'no', label: 'No, let me adjust' },
  ],
  multiSelect: false,
  timestamp: new Date(),
};

/**
 * AskUserQuestion renders interactive questions from the AI agent.
 *
 * Supports single-select (radio) and multi-select (checkbox) modes,
 * with an always-present "Other" option for custom text input.
 */
const meta = {
  title: 'Components/Chat/AskUserQuestion',
  component: AskUserQuestion,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Interactive question component for agent-to-user queries. Supports radio buttons, checkboxes, and custom "Other" input.',
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
  args: {
    onSubmit: fn(),
  },
} satisfies Meta<typeof AskUserQuestion>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Single Select
// ============================================================================

/**
 * Single-select question with radio buttons and descriptions.
 */
export const SingleSelect: Story = {
  args: {
    data: singleSelectQuestion,
  },
};

/**
 * Simple yes/no question without descriptions.
 */
export const SimpleYesNo: Story = {
  args: {
    data: simpleQuestion,
  },
};

// ============================================================================
// Multi Select
// ============================================================================

/**
 * Multi-select question with checkboxes.
 */
export const MultiSelect: Story = {
  args: {
    data: multiSelectQuestion,
  },
};

// ============================================================================
// States
// ============================================================================

/**
 * Disabled state — cannot interact with options or submit.
 */
export const Disabled: Story = {
  args: {
    data: singleSelectQuestion,
    disabled: true,
  },
};

// ============================================================================
// Interaction Tests
// ============================================================================

/**
 * Interaction test: select an option and submit.
 */
export const SelectAndSubmit: Story = {
  args: {
    data: singleSelectQuestion,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Click the "Balanced Research" option
    const balancedOption = canvas.getByLabelText(/Balanced Research/);
    await userEvent.click(balancedOption);

    // Verify submit button is enabled and click it
    const submitButton = canvas.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeEnabled();
    await userEvent.click(submitButton);

    // Verify onSubmit was called with the selected option
    await expect(args.onSubmit).toHaveBeenCalledWith('Balanced Research');
  },
};

/**
 * Interaction test: select multiple options and submit.
 */
export const MultiSelectAndSubmit: Story = {
  args: {
    data: multiSelectQuestion,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Select Market Research and Architecture Design
    await userEvent.click(canvas.getByLabelText(/Market Research/));
    await userEvent.click(canvas.getByLabelText(/Architecture Design/));

    // Submit
    const submitButton = canvas.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeEnabled();
    await userEvent.click(submitButton);

    await expect(args.onSubmit).toHaveBeenCalledWith([
      'Market Research',
      'Architecture Design',
    ]);
  },
};

/**
 * Interaction test: select "Other" and type a custom answer.
 */
export const OtherOption: Story = {
  args: {
    data: singleSelectQuestion,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Click the "Other" option
    const otherOption = canvas.getByLabelText('Other');
    await userEvent.click(otherOption);

    // Type a custom answer
    const textInput = canvas.getByPlaceholderText('Enter your answer...');
    await userEvent.type(textInput, 'Use a custom hybrid approach');

    // Submit
    const submitButton = canvas.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    await expect(args.onSubmit).toHaveBeenCalledWith('Use a custom hybrid approach');
  },
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Question on glass surface.
 */
export const OnGlassSurface: StoryObj = {
  render: () => (
    <AskUserQuestion
      data={singleSelectQuestion}
      onSubmit={fn()}
    />
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
