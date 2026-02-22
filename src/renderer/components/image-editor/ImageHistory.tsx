/**
 * ImageHistory - Edit history strip with click-to-revert
 *
 * Displays a horizontal strip of thumbnail images representing
 * the edit history. Users can:
 * - Click to view a previous version
 * - Click the revert button to discard later edits
 * - See the prompt used for each edit
 */

import { useCallback } from 'react';
import { useSelector } from '@legendapp/state/react';
import {
  imageEditorStore$,
  selectHistoryItem,
  revertToHistoryItem,
  type ImageHistoryItem,
} from '../../state/imageEditorStore';
import { RotateCcw, History, Clock } from '../icons';

export interface ImageHistoryProps {
  /** History items to display */
  history: ImageHistoryItem[];
  /** Project ID for persistence */
  projectId?: string;
}

export function ImageHistory({ history, projectId: _projectId }: ImageHistoryProps) {
  const selectedIndex = useSelector(imageEditorStore$.selectedHistoryIndex);

  // Handle clicking on a history item
  const handleItemClick = useCallback((index: number) => {
    selectHistoryItem(index);
  }, []);

  // Handle reverting to a history item
  const handleRevert = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    revertToHistoryItem(index);
  }, []);

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format processing time
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border-default bg-surface" role="region" aria-label="Edit history">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-default">
        <History size={14} className="text-fg-muted" aria-hidden="true" />
        <span className="text-xs text-fg-muted font-medium">
          Edit History ({history.length})
        </span>
      </div>

      {/* Thumbnail strip */}
      <div
        className="flex gap-2 p-3 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        role="listbox"
        aria-label="Edit history versions"
      >
        {history.map((item, index) => {
          const isSelected = selectedIndex === index;
          const isLatest = index === history.length - 1;
          const isInitial = item.prompt === '';

          return (
            <div
              key={item.id}
              className="flex-shrink-0 group relative"
            >
              {/* Thumbnail button */}
              <button
                onClick={() => handleItemClick(index)}
                className={`
                  relative w-16 h-16 rounded-lg overflow-hidden
                  border-2 transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-purple-400/50
                  ${isSelected
                    ? 'border-purple-400 shadow-[0_0_12px_rgba(167,139,250,0.3)]'
                    : isLatest
                      ? 'border-purple-400/50'
                      : 'border-border-default hover:border-border-strong'
                  }
                `}
                title={isInitial ? 'Original image' : item.prompt}
                role="option"
                aria-selected={isSelected}
                aria-label={isInitial ? 'Original image' : `Edit ${index + 1}: ${item.prompt.substring(0, 50)}`}
              >
                <img
                  src={item.imageDataUrl}
                  alt={isInitial ? 'Original' : `Edit ${index}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />

                {/* Initial badge */}
                {isInitial && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-fg-secondary text-center py-0.5">
                    Original
                  </div>
                )}

                {/* Latest badge */}
                {isLatest && !isInitial && (
                  <div className="absolute bottom-0 left-0 right-0 bg-purple-500/80 text-[8px] text-white text-center py-0.5">
                    Current
                  </div>
                )}
              </button>

              {/* Revert button (shown on hover, not for initial or latest) */}
              {!isInitial && !isLatest && (
                <button
                  onClick={(e) => handleRevert(index, e)}
                  className="
                    absolute -top-1 -right-1 w-5 h-5
                    flex items-center justify-center
                    bg-surface hover:bg-purple-500
                    border border-border-default
                    rounded-full shadow-lg
                    opacity-0 group-hover:opacity-100
                    focus:opacity-100
                    transition-all duration-150
                  "
                  title="Revert to this version"
                  aria-label={`Revert to version ${index + 1}`}
                >
                  <RotateCcw size={10} className="text-white" aria-hidden="true" />
                </button>
              )}

              {/* Processing time indicator */}
              {item.processingTimeMs > 0 && (
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-[8px] text-fg-muted"
                  aria-label={`Processing time: ${formatDuration(item.processingTimeMs)}`}
                >
                  <Clock size={8} aria-hidden="true" />
                  <span>{formatDuration(item.processingTimeMs)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected item details */}
      {selectedIndex !== null && history[selectedIndex] && (
        <div className="px-4 py-2 border-t border-border-default bg-surface">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-fg-muted">
              {formatTime(history[selectedIndex].createdAt)}
            </span>
            {selectedIndex !== history.length - 1 && (
              <button
                onClick={(e) => handleRevert(selectedIndex, e)}
                className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                aria-label="Revert to this version and discard later edits"
              >
                <RotateCcw size={10} aria-hidden="true" />
                <span>Revert to this version</span>
              </button>
            )}
          </div>
          {history[selectedIndex].prompt && (
            <p className="text-xs text-fg-muted line-clamp-2">
              "{history[selectedIndex].prompt}"
            </p>
          )}
          {history[selectedIndex].responseText && (
            <p className="text-[10px] text-fg-muted mt-1 line-clamp-1">
              {history[selectedIndex].responseText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageHistory;
