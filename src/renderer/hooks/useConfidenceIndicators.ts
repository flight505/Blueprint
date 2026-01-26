import { useState, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  setConfidenceIndicatorEnabled,
  setConfidenceData,
  clearConfidenceData,
  getConfidenceIndicatorEnabled,
  type ParagraphConfidenceData,
} from '../components/editor/extensions';

/**
 * useConfidenceIndicators - Hook for managing confidence indicators
 *
 * Integrates with the ConfidenceScoringService to compute and display
 * confidence scores as inline decorations in the Tiptap editor.
 */

interface UseConfidenceIndicatorsOptions {
  /** The Tiptap editor instance */
  editor: Editor | null;
  /** Document path for caching */
  documentPath?: string;
  /** Auto-compute confidence on content change */
  autoCompute?: boolean;
  /** Debounce delay for auto-compute (ms) */
  debounceDelay?: number;
}

interface UseConfidenceIndicatorsReturn {
  /** Whether indicators are currently shown */
  isEnabled: boolean;
  /** Toggle indicator visibility */
  toggleIndicators: () => void;
  /** Enable indicators */
  enableIndicators: () => void;
  /** Disable indicators */
  disableIndicators: () => void;
  /** Manually compute confidence for current content */
  computeConfidence: () => Promise<void>;
  /** Clear all confidence data */
  clearConfidence: () => void;
  /** Loading state */
  isLoading: boolean;
  /** Document-level confidence score */
  overallConfidence: number | null;
  /** Number of low-confidence paragraphs */
  lowConfidenceCount: number;
}

export function useConfidenceIndicators({
  editor,
  documentPath,
  autoCompute = false,
  debounceDelay = 1000,
}: UseConfidenceIndicatorsOptions): UseConfidenceIndicatorsReturn {
  const [isEnabled, setIsEnabled] = useState(getConfidenceIndicatorEnabled());
  const [isLoading, setIsLoading] = useState(false);
  const [overallConfidence, setOverallConfidence] = useState<number | null>(
    null
  );
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);

  // Sync enabled state with extension
  const toggleIndicators = useCallback(() => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    setConfidenceIndicatorEnabled(newState);
  }, [isEnabled]);

  const enableIndicators = useCallback(() => {
    setIsEnabled(true);
    setConfidenceIndicatorEnabled(true);
  }, []);

  const disableIndicators = useCallback(() => {
    setIsEnabled(false);
    setConfidenceIndicatorEnabled(false);
  }, []);

  // Compute confidence for current content
  const computeConfidence = useCallback(async () => {
    if (!editor) return;

    setIsLoading(true);

    try {
      const content = editor.getText();
      if (!content || content.trim().length < 20) {
        clearConfidenceData();
        setOverallConfidence(null);
        setLowConfidenceCount(0);
        return;
      }

      // Call the confidence scoring API
      const result = await window.electronAPI.confidenceComputeDocument(
        content,
        documentPath
      );

      // Convert paragraph data to decoration positions
      // We need to map paragraph indices to ProseMirror positions
      const doc = editor.state.doc;
      const paragraphPositions: ParagraphConfidenceData[] = [];

      // Find paragraph boundaries in the document
      let paragraphIndex = 0;

      doc.forEach((node, offset) => {
        // Check if this is a paragraph or block-level node
        if (node.isBlock && node.textContent.trim().length >= 20) {
          const paragraphConfidence = result.paragraphs.find(
            (p) => p.paragraphIndex === paragraphIndex
          );

          if (paragraphConfidence) {
            paragraphPositions.push({
              paragraphIndex,
              from: offset + 1, // +1 to skip into the node
              to: offset + node.nodeSize - 1, // -1 to stay before closing
              confidence: paragraphConfidence.confidence,
              isLowConfidence: paragraphConfidence.isLowConfidence,
              indicators: paragraphConfidence.indicators,
            });
          }

          paragraphIndex++;
        }
      });

      // Update the extension with confidence data
      setConfidenceData(paragraphPositions);

      // Update state
      setOverallConfidence(result.overallConfidence);
      setLowConfidenceCount(result.summary.lowConfidenceCount);
    } catch (error) {
      console.error('Failed to compute confidence:', error);
    } finally {
      setIsLoading(false);
    }
  }, [editor, documentPath]);

  // Clear confidence data
  const clearConfidence = useCallback(() => {
    clearConfidenceData();
    setOverallConfidence(null);
    setLowConfidenceCount(0);
  }, []);

  // Auto-compute on content change (debounced)
  useEffect(() => {
    if (!autoCompute || !editor || !isEnabled) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        computeConfidence();
      }, debounceDelay);
    };

    editor.on('update', handleUpdate);

    // Initial computation
    computeConfidence();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      editor.off('update', handleUpdate);
    };
  }, [autoCompute, editor, isEnabled, computeConfidence, debounceDelay]);

  // Listen for toggle events from extension
  useEffect(() => {
    const handleToggle = () => {
      setIsEnabled(getConfidenceIndicatorEnabled());
    };

    document.addEventListener('tiptap:confidence-toggle', handleToggle);
    return () => {
      document.removeEventListener('tiptap:confidence-toggle', handleToggle);
    };
  }, []);

  return {
    isEnabled,
    toggleIndicators,
    enableIndicators,
    disableIndicators,
    computeConfidence,
    clearConfidence,
    isLoading,
    overallConfidence,
    lowConfidenceCount,
  };
}

export default useConfidenceIndicators;
