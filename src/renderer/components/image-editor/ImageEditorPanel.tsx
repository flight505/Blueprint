/**
 * ImageEditorPanel - Main UI for the Nano Banana Image Editor
 *
 * Provides:
 * - Image upload zone (drag & drop)
 * - Current image preview
 * - Natural language edit instructions input
 * - Edit history strip with click-to-revert
 * - Processing state indicators
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useSelector } from '@legendapp/state/react';
import {
  imageEditorStore$,
  setInstructions,
  startProcessing,
  completeProcessing,
  failProcessing,
  addHistoryItem,
  clearInstructions,
  setCurrentImage,
  setDragging,
  startUpload,
  completeUpload,
  failUpload,
  clearHistory,
  type ImageHistoryItem,
} from '../../state/imageEditorStore';
import { ImageUploader } from './ImageUploader';
import { ImageHistory } from './ImageHistory';
import {
  Wand2,
  Send,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
  Copy,
  Check,
} from '../icons';

export interface ImageEditorPanelProps {
  /** Project ID for history persistence */
  projectId?: string;
  /** Callback when an image is ready to be inserted into the document */
  onInsertImage?: (imageDataUrl: string) => void;
}

export function ImageEditorPanel({
  projectId,
  onInsertImage,
}: ImageEditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Subscribe to store state
  const currentImage = useSelector(imageEditorStore$.currentImage);
  const instructions = useSelector(imageEditorStore$.instructions);
  const processing = useSelector(imageEditorStore$.processing);
  const history = useSelector(imageEditorStore$.history);
  const upload = useSelector(imageEditorStore$.upload);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [instructions]);

  // Handle image upload from file or drop
  const handleImageUpload = useCallback(async (file: File) => {
    startUpload();

    try {
      // Validate file type
      const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      if (!supportedTypes.includes(file.type)) {
        failUpload(`Unsupported file type: ${file.type}`);
        return;
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        failUpload(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum is 10MB.`);
        return;
      }

      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        // Clear existing history when uploading new image
        clearHistory();

        // Set as current image
        setCurrentImage(dataUrl, file.type);

        // Add to history as initial upload
        const historyId = await window.electronAPI.imageEditorGenerateHistoryId();
        const historyItem: ImageHistoryItem = {
          id: historyId,
          imageDataUrl: dataUrl,
          prompt: '',
          responseText: null,
          createdAt: Date.now(),
          processingTimeMs: 0,
        };
        addHistoryItem(historyItem);

        completeUpload();
      };

      reader.onerror = () => {
        failUpload('Failed to read file');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      failUpload(error instanceof Error ? error.message : 'Upload failed');
    }
  }, []);

  // Handle edit submission
  const handleSubmit = useCallback(async () => {
    if (!currentImage || !instructions.trim() || processing.isProcessing) {
      return;
    }

    startProcessing('Processing your edit...');

    try {
      // Extract base64 data from data URL
      const base64Match = currentImage.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        failProcessing('Invalid image data format');
        return;
      }

      const mimeType = base64Match[1];
      const imageBase64 = base64Match[2];

      // Call the image editor service
      const result = await window.electronAPI.imageEditorProcessImage({
        imageBase64,
        mimeType: mimeType as 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/gif' | 'image/webp',
        instructions: instructions.trim(),
      });

      if (!result.success || !result.generatedImage) {
        failProcessing(result.error || 'Failed to process image');
        return;
      }

      // Add to history
      const historyId = await window.electronAPI.imageEditorGenerateHistoryId();
      const historyItem: ImageHistoryItem = {
        id: historyId,
        imageDataUrl: result.generatedImage,
        prompt: instructions.trim(),
        responseText: result.responseText,
        createdAt: Date.now(),
        processingTimeMs: result.processingTimeMs,
      };
      addHistoryItem(historyItem);

      // Clear instructions after successful edit
      clearInstructions();
      completeProcessing();
    } catch (error) {
      failProcessing(error instanceof Error ? error.message : 'Processing failed');
    }
  }, [currentImage, instructions, processing.isProcessing]);

  // Handle keyboard shortcut (Cmd/Ctrl + Enter to submit)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Handle copy to clipboard / insert into document
  const handleCopyOrInsert = useCallback(async () => {
    if (!currentImage) return;

    // Call the callback if provided
    if (onInsertImage) {
      onInsertImage(currentImage);
    }

    // Also copy to clipboard for easy pasting
    try {
      // Convert data URL to blob
      const response = await fetch(currentImage);
      const blob = await response.blob();

      // Use Clipboard API to copy image
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      // Show feedback
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error('Failed to copy image to clipboard:', error);
    }
  }, [currentImage, onInsertImage]);

  // Handle clear all
  const handleClear = useCallback(() => {
    clearHistory();
    clearInstructions();
  }, []);

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Image Editor">
      {/* Upload zone or image preview */}
      <div className="flex-1 min-h-0 flex flex-col">
        {!currentImage ? (
          <ImageUploader
            onUpload={handleImageUpload}
            isUploading={upload.isUploading}
            isDragging={upload.isDragging}
            onDragChange={setDragging}
            error={upload.error}
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Image preview */}
            <div className="flex-1 min-h-0 p-4 flex items-center justify-center overflow-hidden">
              <img
                src={currentImage}
                alt="Current image"
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                draggable={false}
              />
            </div>

            {/* Processing overlay with live region for screen readers */}
            {processing.isProcessing && (
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="bg-gray-900/90 border border-white/10 rounded-xl p-6 flex flex-col items-center gap-3 shadow-xl">
                  <Loader2 size={32} className="text-purple-400 animate-spin" aria-hidden="true" />
                  <p className="text-sm text-gray-300">{processing.message}</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] bg-white/[0.02]">
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] rounded-md transition-all duration-150"
                title="Clear and start over"
                aria-label="Clear image and start over"
              >
                <Trash2 size={14} aria-hidden="true" />
                <span>Clear</span>
              </button>

              {/* Copy/Insert button - always show when image is present */}
              <button
                onClick={handleCopyOrInsert}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all duration-150 ${
                  copyFeedback
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-purple-400 hover:text-purple-300 hover:bg-purple-400/10'
                }`}
                title="Copy image to clipboard"
                aria-label={copyFeedback ? 'Image copied to clipboard' : 'Copy image to clipboard'}
              >
                {copyFeedback ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} aria-hidden="true" />
                    <span>Copy Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {processing.error && (
        <div
          className="mx-4 mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-red-300 flex-1">{processing.error}</p>
          <button
            onClick={() => imageEditorStore$.processing.error.set(null)}
            className="text-red-400 hover:text-red-300 flex-shrink-0"
            aria-label="Dismiss error"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Edit instructions input */}
      {currentImage && (
        <div className="p-4 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-3 text-purple-400">
                <Wand2 size={16} />
              </div>
              <textarea
                ref={textareaRef}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your edit... (e.g., 'Make the background blue')"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-gray-100 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/30 text-sm placeholder-gray-500 transition-all duration-150 resize-none min-h-[44px]"
                disabled={processing.isProcessing}
                rows={1}
                aria-label="Edit instructions"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!instructions.trim() || processing.isProcessing}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-white transition-all duration-150 flex-shrink-0"
              title="Apply edit (Cmd+Enter)"
              aria-label={processing.isProcessing ? 'Processing edit...' : 'Apply edit'}
            >
              {processing.isProcessing ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-gray-500">
            Press <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-gray-400">Cmd+Enter</kbd> to apply
          </p>
        </div>
      )}

      {/* History strip */}
      {history.length > 0 && (
        <ImageHistory
          history={history as ImageHistoryItem[]}
          projectId={projectId}
        />
      )}
    </div>
  );
}

export default ImageEditorPanel;
