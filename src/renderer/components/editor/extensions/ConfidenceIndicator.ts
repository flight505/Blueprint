import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * ConfidenceIndicator extension for Tiptap
 *
 * Provides inline visual indicators for paragraph-level confidence scores:
 * - Green underlines for high confidence (>0.8)
 * - Yellow/amber underlines for medium confidence (0.6-0.8)
 * - Red underlines for low confidence (<0.6)
 *
 * Uses Tiptap decorations to render underlines on paragraphs based on
 * confidence data from the ConfidenceScoringService.
 */

export interface ParagraphConfidenceData {
  /** Paragraph index (0-based) */
  paragraphIndex: number;
  /** Start position in document (ProseMirror position) */
  from: number;
  /** End position in document (ProseMirror position) */
  to: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether below threshold */
  isLowConfidence: boolean;
  /** Human-readable indicators/reasons */
  indicators: string[];
}

export interface ConfidenceIndicatorOptions {
  /** Whether confidence indicators are shown */
  enabled?: boolean;
  /** High confidence threshold (default 0.8) */
  highThreshold?: number;
  /** Low confidence threshold (default 0.6) */
  lowThreshold?: number;
  /** Callback when paragraph is clicked/hovered */
  onParagraphInteract?: (data: ParagraphConfidenceData, event: 'hover' | 'click') => void;
}

export interface ConfidenceIndicatorStorage {
  /** Whether indicators are enabled */
  enabled: boolean;
  /** Confidence data for all paragraphs */
  paragraphData: ParagraphConfidenceData[];
}

const ConfidenceIndicatorPluginKey = new PluginKey('confidenceIndicator');

// Module-level storage for cross-instance access
const moduleStorage: ConfidenceIndicatorStorage = {
  enabled: false,
  paragraphData: [],
};

/**
 * Get the current enabled state
 */
export function getConfidenceIndicatorEnabled(): boolean {
  return moduleStorage.enabled;
}

/**
 * Set whether confidence indicators are enabled
 */
export function setConfidenceIndicatorEnabled(enabled: boolean): void {
  moduleStorage.enabled = enabled;
  document.dispatchEvent(new CustomEvent('tiptap:confidence-toggle'));
}

/**
 * Update confidence data for paragraphs
 */
export function setConfidenceData(data: ParagraphConfidenceData[]): void {
  moduleStorage.paragraphData = data;
  document.dispatchEvent(new CustomEvent('tiptap:confidence-update'));
}

/**
 * Get current confidence data
 */
export function getConfidenceData(): ParagraphConfidenceData[] {
  return [...moduleStorage.paragraphData];
}

/**
 * Clear confidence data
 */
export function clearConfidenceData(): void {
  moduleStorage.paragraphData = [];
  document.dispatchEvent(new CustomEvent('tiptap:confidence-update'));
}

/**
 * Get confidence color based on score and thresholds
 */
function getConfidenceColor(
  confidence: number,
  highThreshold: number,
  lowThreshold: number
): string {
  if (confidence >= highThreshold) {
    return 'confidence-high'; // Green
  } else if (confidence >= lowThreshold) {
    return 'confidence-medium'; // Yellow/amber
  } else {
    return 'confidence-low'; // Red
  }
}

export const ConfidenceIndicator = Extension.create<
  ConfidenceIndicatorOptions,
  ConfidenceIndicatorStorage
>({
  name: 'confidenceIndicator',

  addOptions() {
    return {
      enabled: false,
      highThreshold: 0.8,
      lowThreshold: 0.6,
      onParagraphInteract: undefined,
    };
  },

  addStorage() {
    return moduleStorage;
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: ConfidenceIndicatorPluginKey,
        props: {
          decorations(state) {
            if (!moduleStorage.enabled || moduleStorage.paragraphData.length === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            const highThreshold = extension.options.highThreshold ?? 0.8;
            const lowThreshold = extension.options.lowThreshold ?? 0.6;

            for (const data of moduleStorage.paragraphData) {
              // Validate positions are within document bounds
              if (data.from < 0 || data.to > state.doc.content.size) {
                continue;
              }

              const colorClass = getConfidenceColor(
                data.confidence,
                highThreshold,
                lowThreshold
              );

              // Create inline decoration for the paragraph
              const decoration = Decoration.inline(data.from, data.to, {
                class: `confidence-indicator ${colorClass}`,
                'data-confidence': String(data.confidence),
                'data-paragraph-index': String(data.paragraphIndex),
                'data-indicators': data.indicators.join('|'),
              });

              decorations.push(decoration);
            }

            return DecorationSet.create(state.doc, decorations);
          },

          handleDOMEvents: {
            mouseover(_view, event) {
              const target = event.target as HTMLElement;
              const indicatorEl = target.closest('.confidence-indicator');

              if (indicatorEl) {
                const confidence = parseFloat(
                  indicatorEl.getAttribute('data-confidence') || '0'
                );
                const paragraphIndex = parseInt(
                  indicatorEl.getAttribute('data-paragraph-index') || '0',
                  10
                );
                const indicators = (
                  indicatorEl.getAttribute('data-indicators') || ''
                ).split('|').filter(Boolean);

                // Dispatch event for tooltip
                document.dispatchEvent(
                  new CustomEvent('tiptap:confidence-hover', {
                    detail: {
                      confidence,
                      paragraphIndex,
                      indicators,
                      event: 'hover',
                      rect: indicatorEl.getBoundingClientRect(),
                    },
                  })
                );
              }

              return false;
            },

            mouseout(_view, event) {
              const target = event.target as HTMLElement;
              const relatedTarget = event.relatedTarget as HTMLElement | null;

              // Check if we're leaving a confidence indicator
              const fromIndicator = target.closest('.confidence-indicator');
              const toIndicator = relatedTarget?.closest('.confidence-indicator');

              if (fromIndicator && !toIndicator) {
                document.dispatchEvent(
                  new CustomEvent('tiptap:confidence-hover-end')
                );
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});

export default ConfidenceIndicator;
