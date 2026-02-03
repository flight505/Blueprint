/**
 * ImageUploader - Drag & drop upload zone for images
 *
 * Provides a visual drop zone with:
 * - Drag & drop support
 * - Click to select file
 * - Visual feedback for drag state
 * - Error display
 * - Supported format hints
 */

import { useCallback, useRef } from 'react';
import { Upload, ImagePlus, Loader2, AlertTriangle, X } from '../icons';

export interface ImageUploaderProps {
  /** Callback when a file is uploaded */
  onUpload: (file: File) => void;
  /** Whether an upload is in progress */
  isUploading?: boolean;
  /** Whether a file is being dragged over */
  isDragging?: boolean;
  /** Callback to update drag state */
  onDragChange?: (isDragging: boolean) => void;
  /** Error message to display */
  error?: string | null;
  /** Callback to clear error */
  onClearError?: () => void;
}

export function ImageUploader({
  onUpload,
  isUploading = false,
  isDragging = false,
  onDragChange,
  error,
  onClearError,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection from input
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [onUpload]);

  // Handle click to open file picker
  const handleClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragChange?.(true);
  }, [onDragChange]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    onDragChange?.(false);
  }, [onDragChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragChange?.(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUpload(file);
    }
  }, [onUpload, onDragChange]);

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Error display */}
      {error && (
        <div
          className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-red-300 flex-1">{error}</p>
          {onClearError && (
            <button
              onClick={onClearError}
              className="text-red-400 hover:text-red-300 flex-shrink-0"
              aria-label="Dismiss error"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="button"
        tabIndex={isUploading ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label="Upload image - click or drag and drop"
        aria-busy={isUploading}
        className={`
          flex-1 flex flex-col items-center justify-center
          border-2 border-dashed rounded-xl
          cursor-pointer transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-purple-400/50
          ${isDragging
            ? 'border-purple-400 bg-purple-400/10 shadow-[inset_0_0_20px_rgba(167,139,250,0.1)]'
            : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
          }
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        {isUploading ? (
          <>
            <Loader2 size={48} className="text-purple-400 animate-spin mb-4" aria-hidden="true" />
            <p className="text-sm text-gray-400">Uploading...</p>
          </>
        ) : isDragging ? (
          <>
            <Upload size={48} className="text-purple-400 mb-4" aria-hidden="true" />
            <p className="text-sm text-purple-300">Drop image here</p>
          </>
        ) : (
          <>
            <ImagePlus size={48} className="text-gray-500 mb-4" aria-hidden="true" />
            <p className="text-sm text-gray-400 mb-1">
              Drop an image here or click to upload
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPEG, GIF, WebP (max 10MB)
            </p>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Select image file"
        />
      </div>

      {/* Feature hints */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <p className="text-xs text-gray-400 font-medium mb-1">AI-Powered Editing</p>
          <p className="text-[10px] text-gray-500">
            Describe changes in natural language
          </p>
        </div>
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <p className="text-xs text-gray-400 font-medium mb-1">Edit History</p>
          <p className="text-[10px] text-gray-500">
            Click any version to revert
          </p>
        </div>
      </div>
    </div>
  );
}

export default ImageUploader;
