import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  SkeletonText,
  SkeletonParagraph,
  SkeletonFileTree,
  SkeletonChatMessage,
  SkeletonSearchResults,
  SkeletonFileContent,
} from './Skeleton';

/**
 * Skeleton components provide loading placeholders with pulse animations.
 * Use these to indicate content is being loaded while maintaining layout stability.
 *
 * ## Glass Design System Integration
 * Skeletons use subtle gray tones that work well on glass surfaces.
 * In dark mode, they use `bg-gray-700` which complements the Tokyo Night theme.
 */
const meta = {
  title: 'Components/Feedback/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Loading placeholder components with pulse animation. Maintains layout stability while content loads.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Base Skeleton
// ============================================================================

/**
 * Basic skeleton with default dimensions.
 */
export const Default: Story = {
  args: {
    width: 200,
    height: 20,
  },
};

/**
 * Full-width skeleton for headers or titles.
 */
export const FullWidth: Story = {
  args: {
    width: 'full',
    height: 32,
  },
};

/**
 * Different border radius options.
 */
export const BorderRadiusVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton width={100} height={40} rounded="none" />
        <span className="text-sm text-gray-500">none</span>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton width={100} height={40} rounded="sm" />
        <span className="text-sm text-gray-500">sm</span>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton width={100} height={40} rounded="md" />
        <span className="text-sm text-gray-500">md (default)</span>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton width={100} height={40} rounded="lg" />
        <span className="text-sm text-gray-500">lg</span>
      </div>
      <div className="flex items-center gap-4">
        <Skeleton width={40} height={40} rounded="full" />
        <span className="text-sm text-gray-500">full (avatar)</span>
      </div>
    </div>
  ),
};

// ============================================================================
// Text Skeletons
// ============================================================================

/**
 * Single line of text placeholder.
 */
export const TextLine: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonText width="100%" />
    </div>
  ),
};

/**
 * Paragraph placeholder with multiple lines.
 */
export const Paragraph: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonParagraph lines={4} lastLineWidth="60%" />
    </div>
  ),
};

// ============================================================================
// Composite Skeletons
// ============================================================================

/**
 * File tree skeleton for the explorer panel.
 */
export const FileTree: Story = {
  render: () => (
    <div className="w-64 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <SkeletonFileTree items={6} />
    </div>
  ),
};

/**
 * Chat message skeletons for loading conversations.
 */
export const ChatMessages: Story = {
  render: () => (
    <div className="w-96 p-4 space-y-2">
      <SkeletonChatMessage isUser={false} />
      <SkeletonChatMessage isUser={true} />
      <SkeletonChatMessage isUser={false} />
    </div>
  ),
};

/**
 * Search results skeleton for the search panel.
 */
export const SearchResults: Story = {
  render: () => (
    <div className="w-96 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <SkeletonSearchResults files={3} matchesPerFile={2} />
    </div>
  ),
};

/**
 * File content skeleton for the code viewer.
 */
export const FileContent: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <SkeletonFileContent lines={12} />
    </div>
  ),
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Skeleton on glass surface - demonstrates how loading states look
 * on the glass sidebar and panels.
 */
export const OnGlassSurface: Story = {
  render: () => (
    <div className="p-6 glass glass-border rounded-xl w-80">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton width={40} height={40} rounded="full" />
          <div className="flex-1 space-y-2">
            <SkeletonText width="80%" />
            <SkeletonText width="50%" />
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <SkeletonParagraph lines={3} />
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};

/**
 * Card loading state with glass styling.
 */
export const GlassCard: Story = {
  render: () => (
    <div className="p-4 glass-elevated glass-border rounded-lg w-72">
      <div className="space-y-3">
        <Skeleton width="100%" height={120} rounded="md" />
        <SkeletonText width="70%" />
        <SkeletonText width="90%" />
        <div className="flex gap-2 pt-2">
          <Skeleton width={60} height={28} rounded="md" />
          <Skeleton width={60} height={28} rounded="md" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};

// ============================================================================
// Layout Examples
// ============================================================================

/**
 * Complete page loading skeleton matching Blueprint's layout.
 */
export const FullPageLayout: Story = {
  render: () => (
    <div className="flex h-96 w-full max-w-4xl border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Rail */}
      <div className="w-12 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-2 space-y-2">
        <Skeleton width={32} height={32} rounded="md" />
        <Skeleton width={32} height={32} rounded="md" />
        <Skeleton width={32} height={32} rounded="md" />
      </div>

      {/* Panel */}
      <div className="w-56 bg-gray-50 dark:bg-gray-850 border-r border-gray-200 dark:border-gray-700 p-3">
        <SkeletonText width="60%" className="mb-4" />
        <SkeletonFileTree items={8} />
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton width={24} height={24} rounded="sm" />
          <SkeletonText width="40%" />
        </div>
        <SkeletonFileContent lines={15} />
      </div>
    </div>
  ),
  parameters: {
    layout: 'centered',
  },
};
