import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { expect, within, userEvent } from '@storybook/test';
import { ConfidenceTooltip } from './ConfidenceTooltip';

/**
 * ConfidenceTooltip displays confidence scores and reasoning for AI-generated content.
 * It appears when hovering over paragraphs with confidence indicators in the editor.
 *
 * The tooltip shows:
 * - Confidence level (High/Medium/Low)
 * - Percentage score
 * - Visual progress bar
 * - Reasoning indicators (e.g., "Contains hedging language")
 */
const meta = {
  title: 'Components/Confidence/ConfidenceTooltip',
  component: ConfidenceTooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Displays confidence scores for AI-generated content. Appears on hover over paragraphs with confidence indicators.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-8 min-h-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConfidenceTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to dispatch confidence hover event
const dispatchConfidenceHover = (data: {
  confidence: number;
  paragraphIndex: number;
  indicators: string[];
}) => {
  const event = new CustomEvent('tiptap:confidence-hover', {
    detail: {
      ...data,
      rect: new DOMRect(200, 200, 400, 24),
    },
  });
  document.dispatchEvent(event);
};

const dispatchConfidenceHoverEnd = () => {
  document.dispatchEvent(new CustomEvent('tiptap:confidence-hover-end'));
};

/**
 * High confidence tooltip (>80%) shows a green indicator.
 * Used for well-supported claims with citations.
 */
export const HighConfidence: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const timer = setTimeout(() => {
          dispatchConfidenceHover({
            confidence: 0.92,
            paragraphIndex: 0,
            indicators: [
              'Contains specific citations',
              'Uses precise language',
              'Supported by multiple sources',
            ],
          });
        }, 100);
        return () => {
          clearTimeout(timer);
          dispatchConfidenceHoverEnd();
        };
      }, []);
      return <Story />;
    },
  ],
};

/**
 * Medium confidence tooltip (60-80%) shows an amber indicator.
 * Used for claims that may need additional verification.
 */
export const MediumConfidence: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const timer = setTimeout(() => {
          dispatchConfidenceHover({
            confidence: 0.72,
            paragraphIndex: 1,
            indicators: [
              'Some hedging language detected',
              'Limited citation support',
              'Contains general statements',
            ],
          });
        }, 100);
        return () => {
          clearTimeout(timer);
          dispatchConfidenceHoverEnd();
        };
      }, []);
      return <Story />;
    },
  ],
};

/**
 * Low confidence tooltip (<60%) shows a red indicator.
 * Used for claims that should be reviewed for accuracy.
 */
export const LowConfidence: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const timer = setTimeout(() => {
          dispatchConfidenceHover({
            confidence: 0.38,
            paragraphIndex: 2,
            indicators: [
              'Contains speculative language',
              'No citations provided',
              'Uses vague qualifiers',
              'May contain hallucinated content',
            ],
          });
        }, 100);
        return () => {
          clearTimeout(timer);
          dispatchConfidenceHoverEnd();
        };
      }, []);
      return <Story />;
    },
  ],
};

/**
 * Tooltip with no indicators shown (edge case).
 */
export const NoIndicators: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const timer = setTimeout(() => {
          dispatchConfidenceHover({
            confidence: 0.65,
            paragraphIndex: 3,
            indicators: [],
          });
        }, 100);
        return () => {
          clearTimeout(timer);
          dispatchConfidenceHoverEnd();
        };
      }, []);
      return <Story />;
    },
  ],
};

/**
 * Interactive story to test tooltip visibility and accessibility.
 */
export const Interactive: Story = {
  decorators: [
    (Story) => {
      return (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Click the buttons below to show different confidence levels:
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() =>
                dispatchConfidenceHover({
                  confidence: 0.95,
                  paragraphIndex: 0,
                  indicators: ['Well-supported claim', 'Multiple citations'],
                })
              }
              className="px-3 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md text-sm transition-colors"
            >
              Show High (95%)
            </button>
            <button
              onClick={() =>
                dispatchConfidenceHover({
                  confidence: 0.68,
                  paragraphIndex: 1,
                  indicators: ['Moderate support', 'Could use more sources'],
                })
              }
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-md text-sm transition-colors"
            >
              Show Medium (68%)
            </button>
            <button
              onClick={() =>
                dispatchConfidenceHover({
                  confidence: 0.25,
                  paragraphIndex: 2,
                  indicators: ['Likely hallucination', 'No sources found', 'Speculative'],
                })
              }
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm transition-colors"
            >
              Show Low (25%)
            </button>
            <button
              onClick={dispatchConfidenceHoverEnd}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm transition-colors"
            >
              Hide Tooltip
            </button>
          </div>
          <Story />
        </div>
      );
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click the high confidence button
    const highButton = canvas.getByRole('button', { name: /Show High/i });
    await userEvent.click(highButton);

    // Wait for tooltip to appear
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check that tooltip is visible
    const tooltip = document.querySelector('[role="tooltip"]');
    await expect(tooltip).toBeInTheDocument();

    // Check for high confidence content
    await expect(tooltip).toHaveTextContent('High Confidence');
    await expect(tooltip).toHaveTextContent('95%');

    // Hide tooltip
    const hideButton = canvas.getByRole('button', { name: /Hide Tooltip/i });
    await userEvent.click(hideButton);
  },
};
