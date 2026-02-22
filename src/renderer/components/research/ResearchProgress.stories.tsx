import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
import { fn } from 'storybook/test';
import ResearchProgress, { type ProgressCheckpoint } from './ResearchProgress';

/**
 * ResearchProgress displays the progress of AI research queries.
 * It shows a progress bar, percentage, estimated time remaining,
 * and provides cancel functionality for long-running operations.
 *
 * ## Research Modes
 * - **Quick**: Fast queries using Perplexity (~30s)
 * - **Balanced**: Standard queries (~5 min)
 * - **Comprehensive**: Deep research using Gemini (up to 60 min)
 *
 * ## Providers
 * - **Perplexity**: Fast web search with citations
 * - **Gemini Deep Research**: Comprehensive analysis with progress checkpoints
 */
const meta = {
  title: 'Components/Research/ResearchProgress',
  component: ResearchProgress,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Progress indicator for AI research operations with time estimation and cancel support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isActive: {
      control: 'boolean',
      description: 'Whether research is in progress',
    },
    provider: {
      control: 'select',
      options: ['perplexity', 'gemini'],
      description: 'Research provider being used',
    },
    mode: {
      control: 'select',
      options: ['quick', 'balanced', 'comprehensive'],
      description: 'Research mode',
    },
  },
  args: {
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResearchProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Static States
// ============================================================================

/**
 * Initial state - just started, no progress yet.
 */
export const JustStarted: Story = {
  args: {
    isActive: true,
    provider: 'perplexity',
    mode: 'quick',
    progress: {
      percentage: 0,
      timestamp: new Date(),
      message: 'Starting research...',
    },
    startTime: new Date(),
  },
};

/**
 * Early progress with Perplexity.
 */
export const EarlyProgress: Story = {
  args: {
    isActive: true,
    provider: 'perplexity',
    mode: 'balanced',
    progress: {
      percentage: 25,
      timestamp: new Date(),
      message: 'Searching web sources...',
    },
    startTime: new Date(Date.now() - 10000), // 10 seconds ago
  },
};

/**
 * Mid-progress with Gemini Deep Research.
 */
export const MidProgress: Story = {
  args: {
    isActive: true,
    provider: 'gemini',
    mode: 'comprehensive',
    progress: {
      percentage: 50,
      timestamp: new Date(),
      message: 'Analyzing market data and trends...',
    },
    startTime: new Date(Date.now() - 300000), // 5 minutes ago
  },
};

/**
 * Almost complete.
 */
export const AlmostComplete: Story = {
  args: {
    isActive: true,
    provider: 'gemini',
    mode: 'balanced',
    progress: {
      percentage: 92,
      timestamp: new Date(),
      message: 'Generating final report...',
    },
    startTime: new Date(Date.now() - 240000), // 4 minutes ago
  },
};

/**
 * Not active (hidden state).
 */
export const NotActive: Story = {
  args: {
    isActive: false,
    provider: 'perplexity',
    mode: 'quick',
  },
};

// ============================================================================
// Provider Variants
// ============================================================================

/**
 * Perplexity quick search.
 */
export const PerplexityQuick: Story = {
  args: {
    isActive: true,
    provider: 'perplexity',
    mode: 'quick',
    progress: {
      percentage: 65,
      timestamp: new Date(),
      message: 'Fetching search results...',
    },
    startTime: new Date(Date.now() - 15000),
  },
};

/**
 * Gemini comprehensive research (long-running).
 */
export const GeminiComprehensive: Story = {
  args: {
    isActive: true,
    provider: 'gemini',
    mode: 'comprehensive',
    progress: {
      percentage: 35,
      timestamp: new Date(),
      message: 'Deep analysis in progress - researching competitive landscape...',
    },
    startTime: new Date(Date.now() - 600000), // 10 minutes ago
  },
};

// ============================================================================
// Interactive Examples
// ============================================================================

/**
 * Animated progress simulation.
 */
export const AnimatedProgress: StoryObj = {
  render: function AnimatedProgressDemo() {
    const [progress, setProgress] = useState<ProgressCheckpoint>({
      percentage: 0,
      timestamp: new Date(),
      message: 'Starting research...',
    });
    const [startTime] = useState(new Date());

    const messages = [
      'Starting research...',
      'Searching web sources...',
      'Analyzing results...',
      'Cross-referencing data...',
      'Generating citations...',
      'Compiling report...',
    ];

    useEffect(() => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newPercentage = Math.min(prev.percentage + 5, 100);
          const messageIndex = Math.floor((newPercentage / 100) * (messages.length - 1));
          return {
            percentage: newPercentage,
            timestamp: new Date(),
            message: messages[messageIndex],
          };
        });
      }, 500);

      return () => clearInterval(interval);
    }, []);

    return (
      <ResearchProgress
        isActive={progress.percentage < 100}
        provider="perplexity"
        mode="balanced"
        progress={progress}
        startTime={startTime}
        onCancel={() => alert('Cancelled!')}
      />
    );
  },
};

/**
 * Gemini with checkpoint updates (simulates real deep research).
 */
export const GeminiWithCheckpoints: StoryObj = {
  render: function GeminiCheckpointsDemo() {
    const [progress, setProgress] = useState<ProgressCheckpoint>({
      percentage: 0,
      timestamp: new Date(),
      message: 'Initializing deep research...',
    });
    const [startTime] = useState(new Date());

    const checkpoints = [
      { percentage: 0, message: 'Initializing deep research...' },
      { percentage: 15, message: 'Gathering initial sources...' },
      { percentage: 30, message: 'Analyzing market segments...' },
      { percentage: 45, message: 'Researching competitor strategies...' },
      { percentage: 60, message: 'Evaluating technical feasibility...' },
      { percentage: 75, message: 'Synthesizing findings...' },
      { percentage: 90, message: 'Generating comprehensive report...' },
      { percentage: 100, message: 'Research complete!' },
    ];

    useEffect(() => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < checkpoints.length) {
          setProgress({
            percentage: checkpoints[index].percentage,
            timestamp: new Date(),
            message: checkpoints[index].message,
          });
          index++;
        } else {
          clearInterval(interval);
        }
      }, 1500);

      return () => clearInterval(interval);
    }, []);

    return (
      <ResearchProgress
        isActive={progress.percentage < 100}
        provider="gemini"
        mode="comprehensive"
        progress={progress}
        startTime={startTime}
        onCancel={() => alert('Cancelled!')}
      />
    );
  },
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Progress indicator on glass surface.
 */
export const OnGlassSurface: Story = {
  args: {
    isActive: true,
    provider: 'gemini',
    mode: 'balanced',
    progress: {
      percentage: 45,
      timestamp: new Date(),
      message: 'Analyzing research data...',
    },
    startTime: new Date(Date.now() - 120000),
  },
  decorators: [
    (Story) => (
      <div className="p-6 glass glass-border rounded-xl w-[420px]">
        <h3 className="text-sm font-medium text-glass-primary mb-4">Research Status</h3>
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};

/**
 * Multiple research operations (stacked).
 */
export const MultipleOperations: StoryObj = {
  render: () => (
    <div className="space-y-4 w-[420px]">
      <ResearchProgress
        isActive={true}
        provider="perplexity"
        mode="quick"
        progress={{
          percentage: 78,
          timestamp: new Date(),
          message: 'Fetching market data...',
        }}
        startTime={new Date(Date.now() - 20000)}
        onCancel={() => {}}
      />
      <ResearchProgress
        isActive={true}
        provider="gemini"
        mode="comprehensive"
        progress={{
          percentage: 23,
          timestamp: new Date(),
          message: 'Deep analysis: competitive landscape...',
        }}
        startTime={new Date(Date.now() - 180000)}
        onCancel={() => {}}
      />
    </div>
  ),
};
