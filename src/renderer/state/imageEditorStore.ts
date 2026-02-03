/**
 * Image Editor State Store using Legend State
 *
 * Manages state for the Nano Banana Image Editor feature including:
 * - Current image being edited
 * - Edit history with click-to-revert
 * - Processing state for AI operations
 * - Upload state for drag & drop
 */

import { observable } from '@legendapp/state';

/**
 * History item representing a single edit in the history
 */
export interface ImageHistoryItem {
  /** Unique ID for this history item */
  id: string;
  /** Base64 data URL of the image at this point */
  imageDataUrl: string;
  /** The prompt/instructions used for this edit (empty for initial upload) */
  prompt: string;
  /** AI response text explaining what was done */
  responseText: string | null;
  /** Timestamp when this edit was created */
  createdAt: number;
  /** Processing time in milliseconds (0 for initial upload) */
  processingTimeMs: number;
}

/**
 * Processing state for async operations
 */
export interface ProcessingState {
  /** Whether an operation is in progress */
  isProcessing: boolean;
  /** Progress message to display */
  message: string;
  /** Error message if operation failed */
  error: string | null;
}

/**
 * Upload state for drag & drop operations
 */
export interface UploadState {
  /** Whether a file is being dragged over the drop zone */
  isDragging: boolean;
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Error message if upload failed */
  error: string | null;
}

/**
 * Complete Image Editor state
 */
interface ImageEditorState {
  /** Whether the image editor panel is open */
  isOpen: boolean;
  /** Current project ID for history persistence */
  projectId: string | null;
  /** Current image being displayed/edited (data URL) */
  currentImage: string | null;
  /** Current MIME type of the image */
  currentMimeType: string | null;
  /** Edit history (newest first for display, but we store in chronological order) */
  history: ImageHistoryItem[];
  /** Currently selected history item index (for viewing/reverting) */
  selectedHistoryIndex: number | null;
  /** Current edit instructions input */
  instructions: string;
  /** Processing state for AI operations */
  processing: ProcessingState;
  /** Upload state for drag & drop */
  upload: UploadState;
  /** Model name being used */
  modelName: string;
  /** Max image size in bytes */
  maxImageSize: number;
  /** Supported MIME types */
  supportedMimeTypes: string[];
}

// Default values
const DEFAULT_PROCESSING_STATE: ProcessingState = {
  isProcessing: false,
  message: '',
  error: null,
};

const DEFAULT_UPLOAD_STATE: UploadState = {
  isDragging: false,
  isUploading: false,
  error: null,
};

const DEFAULT_IMAGE_EDITOR_STATE: ImageEditorState = {
  isOpen: false,
  projectId: null,
  currentImage: null,
  currentMimeType: null,
  history: [],
  selectedHistoryIndex: null,
  instructions: '',
  processing: { ...DEFAULT_PROCESSING_STATE },
  upload: { ...DEFAULT_UPLOAD_STATE },
  modelName: 'gemini-2.5-flash-preview-05-20',
  maxImageSize: 10 * 1024 * 1024, // 10MB
  supportedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
};

// Create the observable store for Image Editor
export const imageEditorStore$ = observable<ImageEditorState>({
  ...DEFAULT_IMAGE_EDITOR_STATE,
});

// ============================================
// Actions
// ============================================

/**
 * Open the image editor panel
 */
export function openImageEditor(): void {
  imageEditorStore$.isOpen.set(true);
}

/**
 * Close the image editor panel
 */
export function closeImageEditor(): void {
  imageEditorStore$.isOpen.set(false);
}

/**
 * Toggle the image editor panel
 */
export function toggleImageEditor(): void {
  imageEditorStore$.isOpen.set(!imageEditorStore$.isOpen.get());
}

/**
 * Set the current project ID for history persistence
 */
export function setProjectId(projectId: string | null): void {
  imageEditorStore$.projectId.set(projectId);
}

/**
 * Set the current image being edited
 */
export function setCurrentImage(imageDataUrl: string | null, mimeType: string | null = null): void {
  imageEditorStore$.currentImage.set(imageDataUrl);
  imageEditorStore$.currentMimeType.set(mimeType);
  // Clear selection when setting new image
  imageEditorStore$.selectedHistoryIndex.set(null);
}

/**
 * Add a new item to the edit history
 */
export function addHistoryItem(item: ImageHistoryItem): void {
  const currentHistory = imageEditorStore$.history.get();
  imageEditorStore$.history.set([...currentHistory, item]);
  // Update current image to the new item
  imageEditorStore$.currentImage.set(item.imageDataUrl);
  imageEditorStore$.selectedHistoryIndex.set(null);
}

/**
 * Select a history item (for viewing or reverting)
 */
export function selectHistoryItem(index: number | null): void {
  imageEditorStore$.selectedHistoryIndex.set(index);
  if (index !== null) {
    const history = imageEditorStore$.history.get();
    if (history[index]) {
      imageEditorStore$.currentImage.set(history[index].imageDataUrl);
    }
  }
}

/**
 * Revert to a specific history item (removes all items after it)
 */
export function revertToHistoryItem(index: number): void {
  const history = imageEditorStore$.history.get();
  if (index >= 0 && index < history.length) {
    // Keep only items up to and including the selected index
    const newHistory = history.slice(0, index + 1);
    imageEditorStore$.history.set(newHistory);
    imageEditorStore$.currentImage.set(newHistory[index].imageDataUrl);
    imageEditorStore$.selectedHistoryIndex.set(null);
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  imageEditorStore$.history.set([]);
  imageEditorStore$.currentImage.set(null);
  imageEditorStore$.currentMimeType.set(null);
  imageEditorStore$.selectedHistoryIndex.set(null);
}

/**
 * Load history from persistence (e.g., SQLite via IPC)
 */
export function loadHistory(items: ImageHistoryItem[]): void {
  imageEditorStore$.history.set(items);
  if (items.length > 0) {
    // Set current image to the latest in history
    const latest = items[items.length - 1];
    imageEditorStore$.currentImage.set(latest.imageDataUrl);
  }
}

/**
 * Set the edit instructions input
 */
export function setInstructions(instructions: string): void {
  imageEditorStore$.instructions.set(instructions);
}

/**
 * Clear the edit instructions input
 */
export function clearInstructions(): void {
  imageEditorStore$.instructions.set('');
}

/**
 * Start processing (AI operation in progress)
 */
export function startProcessing(message: string = 'Processing image...'): void {
  imageEditorStore$.processing.set({
    isProcessing: true,
    message,
    error: null,
  });
}

/**
 * Complete processing successfully
 */
export function completeProcessing(): void {
  imageEditorStore$.processing.set({
    isProcessing: false,
    message: '',
    error: null,
  });
}

/**
 * Fail processing with an error
 */
export function failProcessing(error: string): void {
  imageEditorStore$.processing.set({
    isProcessing: false,
    message: '',
    error,
  });
}

/**
 * Clear processing error
 */
export function clearProcessingError(): void {
  imageEditorStore$.processing.error.set(null);
}

/**
 * Set drag state (for visual feedback)
 */
export function setDragging(isDragging: boolean): void {
  imageEditorStore$.upload.isDragging.set(isDragging);
}

/**
 * Start upload
 */
export function startUpload(): void {
  imageEditorStore$.upload.set({
    isDragging: false,
    isUploading: true,
    error: null,
  });
}

/**
 * Complete upload successfully
 */
export function completeUpload(): void {
  imageEditorStore$.upload.set({
    isDragging: false,
    isUploading: false,
    error: null,
  });
}

/**
 * Fail upload with an error
 */
export function failUpload(error: string): void {
  imageEditorStore$.upload.set({
    isDragging: false,
    isUploading: false,
    error,
  });
}

/**
 * Clear upload error
 */
export function clearUploadError(): void {
  imageEditorStore$.upload.error.set(null);
}

/**
 * Update model info from the service
 */
export function setModelInfo(modelName: string, maxImageSize: number, supportedMimeTypes: string[]): void {
  imageEditorStore$.modelName.set(modelName);
  imageEditorStore$.maxImageSize.set(maxImageSize);
  imageEditorStore$.supportedMimeTypes.set(supportedMimeTypes);
}

/**
 * Reset the entire image editor state to defaults
 */
export function resetImageEditorState(): void {
  imageEditorStore$.set({ ...DEFAULT_IMAGE_EDITOR_STATE });
}

/**
 * Get the current history length
 */
export function getHistoryLength(): number {
  return imageEditorStore$.history.get().length;
}

/**
 * Check if an image is loaded
 */
export function hasImage(): boolean {
  return imageEditorStore$.currentImage.get() !== null;
}

/**
 * Check if the editor is ready for editing (has image and not processing)
 */
export function isReadyForEdit(): boolean {
  return hasImage() && !imageEditorStore$.processing.isProcessing.get();
}
