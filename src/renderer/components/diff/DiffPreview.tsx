import { useMemo } from 'react';
import * as Diff from 'diff';
import { Check } from '../icons';

export interface DiffPreviewProps {
  /** The original text before editing */
  original: string;
  /** The proposed replacement text from AI */
  proposed: string;
  /** Callback when user accepts the edit */
  onAccept: () => void;
  /** Callback when user rejects the edit */
  onReject: () => void;
  /** Optional: display mode */
  mode?: 'side-by-side' | 'unified';
  /** Optional: custom class name */
  className?: string;
}

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * DiffPreview component shows a visual comparison between original and proposed text
 * with colored highlighting for additions (green) and removals (red).
 */
export function DiffPreview({
  original,
  proposed,
  onAccept,
  onReject,
  mode = 'side-by-side',
  className = '',
}: DiffPreviewProps) {
  // Compute the diff between original and proposed
  const diffResult = useMemo(() => {
    return Diff.diffWords(original, proposed) as DiffPart[];
  }, [original, proposed]);

  // For side-by-side: split into original (with removals) and proposed (with additions)
  const { originalParts, proposedParts } = useMemo(() => {
    const origParts: DiffPart[] = [];
    const propParts: DiffPart[] = [];

    for (const part of diffResult) {
      if (part.removed) {
        // Only show in original (as removed)
        origParts.push(part);
      } else if (part.added) {
        // Only show in proposed (as added)
        propParts.push(part);
      } else {
        // Unchanged - show in both
        origParts.push(part);
        propParts.push(part);
      }
    }

    return { originalParts: origParts, proposedParts: propParts };
  }, [diffResult]);

  return (
    <div
      className={`bg-surface-overlay rounded-lg shadow-lg border border-border-default overflow-hidden ${className}`}
      role="dialog"
      aria-label="Diff preview for AI edit"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-raised">
        <h3 className="text-sm font-medium text-fg-secondary">
          Review AI Changes
        </h3>
        <div className="flex items-center gap-1 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Removed
          </span>
          <span className="mx-2">|</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Added
          </span>
        </div>
      </div>

      {/* Diff content */}
      {mode === 'side-by-side' ? (
        <SideBySideDiff
          originalParts={originalParts}
          proposedParts={proposedParts}
        />
      ) : (
        <UnifiedDiff diffResult={diffResult} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-default bg-surface-raised">
        <button
          onClick={onReject}
          className="px-3 py-1.5 text-sm font-medium text-fg-secondary bg-surface-raised hover:bg-surface-hover rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Reject AI edit"
        >
          ✕ Reject
        </button>
        <button
          onClick={onAccept}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Accept AI edit"
        >
          <Check size={14} className="inline mr-1" /> Accept
        </button>
      </div>
    </div>
  );
}

/**
 * Side-by-side diff view showing original on left, proposed on right
 * Accessible to screen readers with change annotations
 */
function SideBySideDiff({
  originalParts,
  proposedParts,
}: {
  originalParts: DiffPart[];
  proposedParts: DiffPart[];
}) {
  // Count changes for screen reader summary
  const removedCount = originalParts.filter(p => p.removed).length;
  const addedCount = proposedParts.filter(p => p.added).length;

  return (
    <div className="grid grid-cols-2 divide-x divide-border-default max-h-64 overflow-auto">
      {/* Screen reader summary */}
      <div className="sr-only" aria-live="polite">
        Changes summary: {removedCount} removal{removedCount !== 1 ? 's' : ''}, {addedCount} addition{addedCount !== 1 ? 's' : ''}
      </div>

      {/* Original (left) */}
      <div className="p-4 overflow-x-auto" role="region" aria-label="Original text with removals highlighted">
        <div className="text-xs font-medium text-fg-muted mb-2 uppercase tracking-wide" id="original-label">
          Original
        </div>
        <div
          className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed"
          aria-labelledby="original-label"
        >
          {originalParts.map((part, idx) => (
            <span
              key={idx}
              className={
                part.removed
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 line-through'
                  : 'text-fg'
              }
              aria-label={part.removed ? `Removed: ${part.value}` : undefined}
              role={part.removed ? 'deletion' : undefined}
            >
              {part.value}
            </span>
          ))}
        </div>
      </div>

      {/* Proposed (right) */}
      <div className="p-4 overflow-x-auto bg-gray-25 dark:bg-gray-800/50" role="region" aria-label="Proposed text with additions highlighted">
        <div className="text-xs font-medium text-fg-muted mb-2 uppercase tracking-wide" id="proposed-label">
          Proposed
        </div>
        <div
          className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed"
          aria-labelledby="proposed-label"
        >
          {proposedParts.map((part, idx) => (
            <span
              key={idx}
              className={
                part.added
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                  : 'text-fg'
              }
              aria-label={part.added ? `Added: ${part.value}` : undefined}
              role={part.added ? 'insertion' : undefined}
            >
              {part.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Unified diff view showing all changes inline
 * Accessible to screen readers with change annotations
 */
function UnifiedDiff({ diffResult }: { diffResult: DiffPart[] }) {
  // Count changes for screen reader summary
  const addedCount = diffResult.filter(p => p.added).length;
  const removedCount = diffResult.filter(p => p.removed).length;

  return (
    <div className="p-4 max-h-64 overflow-auto" role="region" aria-label="Unified diff view">
      {/* Screen reader summary */}
      <div className="sr-only" aria-live="polite">
        Changes summary: {removedCount} removal{removedCount !== 1 ? 's' : ''}, {addedCount} addition{addedCount !== 1 ? 's' : ''}
      </div>
      <div
        className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed"
      >
        {diffResult.map((part, idx) => (
          <span
            key={idx}
            className={
              part.added
                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                : part.removed
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 line-through'
                  : 'text-fg'
            }
            aria-label={part.added ? `Added: ${part.value}` : part.removed ? `Removed: ${part.value}` : undefined}
            role={part.added ? 'insertion' : part.removed ? 'deletion' : undefined}
          >
            {part.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default DiffPreview;
