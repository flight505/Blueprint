import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from '@storybook/test';
import { ModelSelector, type TaskClassification, type ModelInfo } from './ModelSelector';

// Mock models data
const mockModels: ModelInfo[] = [
  { id: 'claude-3-5-haiku-20241022', name: 'Haiku', complexity: 'simple', description: 'Fast, efficient model for quick tasks' },
  { id: 'claude-sonnet-4-20250514', name: 'Sonnet', complexity: 'medium', description: 'Balanced performance and capability' },
  { id: 'claude-opus-4-20250514', name: 'Opus', complexity: 'complex', description: 'Most capable for complex reasoning' },
];

// Mock classification results
const mockClassifications: Record<string, TaskClassification> = {
  simple: {
    complexity: 'simple',
    model: 'claude-3-5-haiku-20241022',
    confidence: 0.92,
    reasoning: 'Simple formatting task - Haiku is efficient for this',
  },
  medium: {
    complexity: 'medium',
    model: 'claude-sonnet-4-20250514',
    confidence: 0.85,
    reasoning: 'Code generation requires balanced capability',
  },
  complex: {
    complexity: 'complex',
    model: 'claude-opus-4-20250514',
    confidence: 0.78,
    reasoning: 'Architecture design needs deep reasoning capability',
  },
};

/**
 * ModelSelector allows users to choose which Claude model to use for AI tasks.
 * It supports automatic model selection based on task complexity, with the ability
 * to manually override.
 *
 * ## Usage
 * ```tsx
 * <ModelSelector
 *   selectedModel={model}
 *   classification={taskClassification}
 *   onModelChange={setModel}
 * />
 * ```
 *
 * ## Model Tiers
 * - **Haiku**: Fast and efficient for simple tasks (autocomplete, formatting)
 * - **Sonnet**: Balanced for standard tasks (code generation, refactoring)
 * - **Opus**: Most capable for complex tasks (architecture, planning)
 */
const meta = {
  title: 'Components/AI/ModelSelector',
  component: ModelSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Model selection component with auto-select based on task complexity and manual override capability.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedModel: {
      control: 'select',
      options: [null, ...mockModels.map(m => m.id)],
      description: 'Currently selected model ID',
    },
    showAutoSelect: {
      control: 'boolean',
      description: 'Show the auto-select toggle',
    },
    compact: {
      control: 'boolean',
      description: 'Use compact inline display',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the selector',
    },
  },
  args: {
    onModelChange: fn(),
  },
  decorators: [
    (Story) => {
      // Mock the electronAPI.modelRouterGetAvailableModels
      window.electronAPI.modelRouterGetAvailableModels = async () => mockModels;
      return (
        <div className="p-4 bg-gray-800 rounded-lg w-[420px]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof ModelSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic States
// ============================================================================

/**
 * Default state with auto-select enabled and a simple task classification.
 */
export const AutoSelectSimple: Story = {
  args: {
    selectedModel: 'claude-3-5-haiku-20241022',
    classification: mockClassifications.simple,
    showAutoSelect: true,
  },
};

/**
 * Auto-selected medium complexity task.
 */
export const AutoSelectMedium: Story = {
  args: {
    selectedModel: 'claude-sonnet-4-20250514',
    classification: mockClassifications.medium,
    showAutoSelect: true,
  },
};

/**
 * Auto-selected complex task using Opus.
 */
export const AutoSelectComplex: Story = {
  args: {
    selectedModel: 'claude-opus-4-20250514',
    classification: mockClassifications.complex,
    showAutoSelect: true,
  },
};

/**
 * Manual selection without classification info.
 */
export const ManualSelection: Story = {
  args: {
    selectedModel: 'claude-sonnet-4-20250514',
    classification: null,
    showAutoSelect: true,
  },
};

/**
 * Disabled state.
 */
export const Disabled: Story = {
  args: {
    selectedModel: 'claude-sonnet-4-20250514',
    classification: mockClassifications.medium,
    showAutoSelect: true,
    disabled: true,
  },
};

// ============================================================================
// Compact Mode
// ============================================================================

/**
 * Compact mode for inline display in toolbars or headers.
 */
export const CompactMode: Story = {
  args: {
    selectedModel: 'claude-sonnet-4-20250514',
    classification: mockClassifications.medium,
    showAutoSelect: true,
    compact: true,
  },
};

/**
 * Compact mode with no classification.
 */
export const CompactNoClassification: Story = {
  args: {
    selectedModel: 'claude-opus-4-20250514',
    classification: null,
    showAutoSelect: true,
    compact: true,
  },
};

/**
 * Compact mode disabled.
 */
export const CompactDisabled: Story = {
  args: {
    selectedModel: 'claude-3-5-haiku-20241022',
    classification: mockClassifications.simple,
    showAutoSelect: true,
    compact: true,
    disabled: true,
  },
};

// ============================================================================
// Interactive Examples
// ============================================================================

/**
 * Interactive model selector with state management.
 */
export const Interactive: StoryObj = {
  render: function InteractiveSelector() {
    const [model, setModel] = useState<string>('claude-sonnet-4-20250514');
    const [classification] = useState<TaskClassification>(mockClassifications.medium);

    return (
      <div className="space-y-4">
        <ModelSelector
          selectedModel={model}
          classification={classification}
          onModelChange={setModel}
          showAutoSelect={true}
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          Selected: <code className="bg-gray-700 px-1 rounded">{model}</code>
        </div>
      </div>
    );
  },
};

/**
 * Without auto-select option - forces manual selection.
 */
export const NoAutoSelect: Story = {
  args: {
    selectedModel: 'claude-sonnet-4-20250514',
    classification: null,
    showAutoSelect: false,
  },
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Model selector on glass surface.
 */
export const OnGlassSurface: StoryObj = {
  render: function GlassModelSelector() {
    const [model, setModel] = useState<string>('claude-sonnet-4-20250514');

    return (
      <div className="p-6 glass glass-border rounded-xl w-[420px]">
        <h3 className="text-sm font-medium text-glass-primary mb-4">AI Configuration</h3>
        <ModelSelector
          selectedModel={model}
          classification={mockClassifications.medium}
          onModelChange={setModel}
          showAutoSelect={true}
        />
      </div>
    );
  },
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};

/**
 * Compact selector in a glass toolbar.
 */
export const InGlassToolbar: StoryObj = {
  render: function GlassToolbar() {
    const [model, setModel] = useState<string>('claude-sonnet-4-20250514');

    return (
      <div className="flex items-center gap-4 px-4 py-2 glass-elevated glass-border rounded-lg">
        <span className="text-xs text-glass-secondary">Chat Settings</span>
        <div className="w-px h-4 bg-white/10" />
        <ModelSelector
          selectedModel={model}
          classification={mockClassifications.medium}
          onModelChange={setModel}
          showAutoSelect={true}
          compact={true}
        />
      </div>
    );
  },
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};
