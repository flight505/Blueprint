/**
 * Image Editor Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  imageEditorStore$,
  openImageEditor,
  closeImageEditor,
  toggleImageEditor,
  setProjectId,
  setCurrentImage,
  addHistoryItem,
  selectHistoryItem,
  revertToHistoryItem,
  clearHistory,
  loadHistory,
  setInstructions,
  clearInstructions,
  startProcessing,
  completeProcessing,
  failProcessing,
  clearProcessingError,
  setDragging,
  startUpload,
  completeUpload,
  failUpload,
  clearUploadError,
  setModelInfo,
  resetImageEditorState,
  getHistoryLength,
  hasImage,
  isReadyForEdit,
  type ImageHistoryItem,
} from './imageEditorStore';

describe('imageEditorStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    resetImageEditorState();
  });

  describe('panel visibility', () => {
    it('should start with panel closed', () => {
      expect(imageEditorStore$.isOpen.get()).toBe(false);
    });

    it('should open the panel', () => {
      openImageEditor();
      expect(imageEditorStore$.isOpen.get()).toBe(true);
    });

    it('should close the panel', () => {
      openImageEditor();
      closeImageEditor();
      expect(imageEditorStore$.isOpen.get()).toBe(false);
    });

    it('should toggle the panel', () => {
      expect(imageEditorStore$.isOpen.get()).toBe(false);
      toggleImageEditor();
      expect(imageEditorStore$.isOpen.get()).toBe(true);
      toggleImageEditor();
      expect(imageEditorStore$.isOpen.get()).toBe(false);
    });
  });

  describe('project management', () => {
    it('should set project ID', () => {
      setProjectId('test-project-123');
      expect(imageEditorStore$.projectId.get()).toBe('test-project-123');
    });

    it('should clear project ID', () => {
      setProjectId('test-project');
      setProjectId(null);
      expect(imageEditorStore$.projectId.get()).toBeNull();
    });
  });

  describe('current image', () => {
    it('should start with no image', () => {
      expect(imageEditorStore$.currentImage.get()).toBeNull();
      expect(hasImage()).toBe(false);
    });

    it('should set current image', () => {
      setCurrentImage('data:image/png;base64,abc123', 'image/png');
      expect(imageEditorStore$.currentImage.get()).toBe('data:image/png;base64,abc123');
      expect(imageEditorStore$.currentMimeType.get()).toBe('image/png');
      expect(hasImage()).toBe(true);
    });

    it('should clear selection when setting new image', () => {
      // Set up history and select an item
      const item: ImageHistoryItem = {
        id: 'img-1',
        imageDataUrl: 'data:image/png;base64,test',
        prompt: 'test',
        responseText: null,
        createdAt: Date.now(),
        processingTimeMs: 100,
      };
      addHistoryItem(item);
      selectHistoryItem(0);

      // Set new image should clear selection
      setCurrentImage('data:image/png;base64,new', 'image/png');
      expect(imageEditorStore$.selectedHistoryIndex.get()).toBeNull();
    });
  });

  describe('history management', () => {
    const createHistoryItem = (id: string, prompt: string): ImageHistoryItem => ({
      id,
      imageDataUrl: `data:image/png;base64,${id}`,
      prompt,
      responseText: `Response for ${prompt}`,
      createdAt: Date.now(),
      processingTimeMs: 100,
    });

    it('should start with empty history', () => {
      expect(getHistoryLength()).toBe(0);
    });

    it('should add history items', () => {
      const item = createHistoryItem('img-1', 'Make it blue');
      addHistoryItem(item);
      expect(getHistoryLength()).toBe(1);
      expect(imageEditorStore$.history.get()[0]).toEqual(item);
    });

    it('should update current image when adding history item', () => {
      const item = createHistoryItem('img-1', 'Make it red');
      addHistoryItem(item);
      expect(imageEditorStore$.currentImage.get()).toBe(item.imageDataUrl);
    });

    it('should select history items', () => {
      const item1 = createHistoryItem('img-1', 'Edit 1');
      const item2 = createHistoryItem('img-2', 'Edit 2');
      addHistoryItem(item1);
      addHistoryItem(item2);

      selectHistoryItem(0);
      expect(imageEditorStore$.selectedHistoryIndex.get()).toBe(0);
      expect(imageEditorStore$.currentImage.get()).toBe(item1.imageDataUrl);
    });

    it('should revert to history item', () => {
      const item1 = createHistoryItem('img-1', 'Edit 1');
      const item2 = createHistoryItem('img-2', 'Edit 2');
      const item3 = createHistoryItem('img-3', 'Edit 3');
      addHistoryItem(item1);
      addHistoryItem(item2);
      addHistoryItem(item3);

      expect(getHistoryLength()).toBe(3);

      revertToHistoryItem(1);
      expect(getHistoryLength()).toBe(2);
      expect(imageEditorStore$.currentImage.get()).toBe(item2.imageDataUrl);
      expect(imageEditorStore$.selectedHistoryIndex.get()).toBeNull();
    });

    it('should clear history', () => {
      addHistoryItem(createHistoryItem('img-1', 'Test'));
      addHistoryItem(createHistoryItem('img-2', 'Test 2'));

      clearHistory();

      expect(getHistoryLength()).toBe(0);
      expect(imageEditorStore$.currentImage.get()).toBeNull();
      expect(imageEditorStore$.currentMimeType.get()).toBeNull();
    });

    it('should load history from persistence', () => {
      const items = [
        createHistoryItem('img-1', 'Edit 1'),
        createHistoryItem('img-2', 'Edit 2'),
      ];

      loadHistory(items);

      expect(getHistoryLength()).toBe(2);
      expect(imageEditorStore$.currentImage.get()).toBe(items[1].imageDataUrl);
    });
  });

  describe('instructions', () => {
    it('should set instructions', () => {
      setInstructions('Make it more colorful');
      expect(imageEditorStore$.instructions.get()).toBe('Make it more colorful');
    });

    it('should clear instructions', () => {
      setInstructions('Some text');
      clearInstructions();
      expect(imageEditorStore$.instructions.get()).toBe('');
    });
  });

  describe('processing state', () => {
    it('should start not processing', () => {
      expect(imageEditorStore$.processing.isProcessing.get()).toBe(false);
    });

    it('should start processing with message', () => {
      startProcessing('Generating image...');
      expect(imageEditorStore$.processing.isProcessing.get()).toBe(true);
      expect(imageEditorStore$.processing.message.get()).toBe('Generating image...');
      expect(imageEditorStore$.processing.error.get()).toBeNull();
    });

    it('should complete processing', () => {
      startProcessing();
      completeProcessing();
      expect(imageEditorStore$.processing.isProcessing.get()).toBe(false);
      expect(imageEditorStore$.processing.message.get()).toBe('');
    });

    it('should fail processing with error', () => {
      startProcessing();
      failProcessing('API error occurred');
      expect(imageEditorStore$.processing.isProcessing.get()).toBe(false);
      expect(imageEditorStore$.processing.error.get()).toBe('API error occurred');
    });

    it('should clear processing error', () => {
      failProcessing('Some error');
      clearProcessingError();
      expect(imageEditorStore$.processing.error.get()).toBeNull();
    });

    it('should correctly report isReadyForEdit', () => {
      expect(isReadyForEdit()).toBe(false); // No image

      setCurrentImage('data:image/png;base64,test', 'image/png');
      expect(isReadyForEdit()).toBe(true); // Has image, not processing

      startProcessing();
      expect(isReadyForEdit()).toBe(false); // Has image but processing

      completeProcessing();
      expect(isReadyForEdit()).toBe(true); // Has image, done processing
    });
  });

  describe('upload state', () => {
    it('should start not uploading', () => {
      expect(imageEditorStore$.upload.isUploading.get()).toBe(false);
      expect(imageEditorStore$.upload.isDragging.get()).toBe(false);
    });

    it('should set dragging state', () => {
      setDragging(true);
      expect(imageEditorStore$.upload.isDragging.get()).toBe(true);
      setDragging(false);
      expect(imageEditorStore$.upload.isDragging.get()).toBe(false);
    });

    it('should start upload', () => {
      setDragging(true);
      startUpload();
      expect(imageEditorStore$.upload.isUploading.get()).toBe(true);
      expect(imageEditorStore$.upload.isDragging.get()).toBe(false);
    });

    it('should complete upload', () => {
      startUpload();
      completeUpload();
      expect(imageEditorStore$.upload.isUploading.get()).toBe(false);
      expect(imageEditorStore$.upload.error.get()).toBeNull();
    });

    it('should fail upload with error', () => {
      startUpload();
      failUpload('File too large');
      expect(imageEditorStore$.upload.isUploading.get()).toBe(false);
      expect(imageEditorStore$.upload.error.get()).toBe('File too large');
    });

    it('should clear upload error', () => {
      failUpload('Some error');
      clearUploadError();
      expect(imageEditorStore$.upload.error.get()).toBeNull();
    });
  });

  describe('model info', () => {
    it('should have default model info', () => {
      expect(imageEditorStore$.modelName.get()).toBe('gemini-2.5-flash-preview-05-20');
      expect(imageEditorStore$.maxImageSize.get()).toBe(10 * 1024 * 1024);
      expect(imageEditorStore$.supportedMimeTypes.get()).toContain('image/png');
    });

    it('should update model info', () => {
      setModelInfo('gemini-2.0-flash', 5 * 1024 * 1024, ['image/png', 'image/jpeg']);
      expect(imageEditorStore$.modelName.get()).toBe('gemini-2.0-flash');
      expect(imageEditorStore$.maxImageSize.get()).toBe(5 * 1024 * 1024);
      expect(imageEditorStore$.supportedMimeTypes.get()).toEqual(['image/png', 'image/jpeg']);
    });
  });

  describe('state reset', () => {
    it('should reset all state to defaults', () => {
      // Modify state
      openImageEditor();
      setProjectId('test-project');
      setCurrentImage('data:image/png;base64,test', 'image/png');
      setInstructions('Make changes');
      startProcessing();

      // Reset
      resetImageEditorState();

      // Verify defaults
      expect(imageEditorStore$.isOpen.get()).toBe(false);
      expect(imageEditorStore$.projectId.get()).toBeNull();
      expect(imageEditorStore$.currentImage.get()).toBeNull();
      expect(imageEditorStore$.instructions.get()).toBe('');
      expect(imageEditorStore$.processing.isProcessing.get()).toBe(false);
      expect(getHistoryLength()).toBe(0);
    });
  });
});
