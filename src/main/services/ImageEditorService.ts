/**
 * ImageEditorService - AI-powered image editing using Gemini 2.5 Flash Image API
 *
 * Provides iterative image editing capabilities with natural language instructions.
 * Supports edit history with click-to-revert functionality.
 */

import { GoogleGenAI } from '@google/genai';
import { secureStorageService } from './SecureStorageService';

// Gemini model for image editing (Nano Banana)
const IMAGE_EDIT_MODEL = 'gemini-2.5-flash-preview-05-20';

// Maximum image size (10MB - Gemini API limit)
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// Supported MIME types
const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/**
 * Request to process an image with AI
 */
export interface ImageEditRequest {
  /** Base64-encoded image data (without data URL prefix) */
  imageBase64: string;
  /** MIME type of the image */
  mimeType: SupportedMimeType;
  /** Natural language editing instructions */
  instructions: string;
}

/**
 * Response from image processing
 */
export interface ImageEditResponse {
  /** Whether the operation succeeded */
  success: boolean;
  /** Generated image as base64 data URL (data:image/png;base64,...) */
  generatedImage: string | null;
  /** AI response text (explanation or commentary) */
  responseText: string | null;
  /** Error message if failed */
  error?: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Image edit history item (for persistence)
 */
export interface ImageEditHistoryItem {
  id: string;
  projectId: string;
  /** Base64 data URL of the image */
  imageDataUrl: string;
  /** The prompt used for this edit */
  prompt: string;
  /** AI response text */
  responseText: string | null;
  /** Timestamp of the edit */
  createdAt: number;
}

/**
 * Service for AI-powered image editing using Gemini
 */
class ImageEditorService {
  private genAI: GoogleGenAI | null = null;
  private initialized = false;

  /**
   * Initialize the service with the stored Gemini API key
   */
  async initialize(): Promise<boolean> {
    try {
      const apiKey = await secureStorageService.getApiKey('gemini');

      if (!apiKey) {
        console.warn('ImageEditorService: No Gemini API key found');
        return false;
      }

      this.genAI = new GoogleGenAI({ apiKey });
      this.initialized = true;
      console.log('ImageEditorService initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize ImageEditorService:', error);
      this.genAI = null;
      this.initialized = false;
      return false;
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.genAI !== null;
  }

  /**
   * Validate image data before processing
   */
  validateImage(
    imageBase64: string,
    mimeType: string
  ): { valid: boolean; error?: string } {
    // Check MIME type
    if (!SUPPORTED_MIME_TYPES.includes(mimeType as SupportedMimeType)) {
      return {
        valid: false,
        error: `Unsupported image type: ${mimeType}. Supported: ${SUPPORTED_MIME_TYPES.join(', ')}`,
      };
    }

    // Check size (base64 is ~33% larger than binary)
    const estimatedBytes = (imageBase64.length * 3) / 4;
    if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (estimatedBytes / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `Image too large: ${sizeMB}MB. Maximum size is 10MB.`,
      };
    }

    return { valid: true };
  }

  /**
   * Process an image with AI editing instructions
   */
  async processImage(request: ImageEditRequest): Promise<ImageEditResponse> {
    const startTime = Date.now();

    // Check initialization
    if (!this.genAI) {
      // Try to initialize if not already
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          generatedImage: null,
          responseText: null,
          error:
            'ImageEditorService not initialized. Please configure your Gemini API key in Settings.',
          processingTimeMs: Date.now() - startTime,
        };
      }
    }

    // Validate input
    const validation = this.validateImage(request.imageBase64, request.mimeType);
    if (!validation.valid) {
      return {
        success: false,
        generatedImage: null,
        responseText: null,
        error: validation.error,
        processingTimeMs: Date.now() - startTime,
      };
    }

    if (!request.instructions.trim()) {
      return {
        success: false,
        generatedImage: null,
        responseText: null,
        error: 'Instructions cannot be empty',
        processingTimeMs: Date.now() - startTime,
      };
    }

    try {
      console.log('ImageEditorService: Processing image...');
      console.log('Instructions:', request.instructions);
      console.log('MIME type:', request.mimeType);
      console.log(
        'Image size (base64):',
        (request.imageBase64.length / 1024).toFixed(2),
        'KB'
      );

      // Call Gemini API with image and instructions
      const response = await this.genAI!.models.generateContent({
        model: IMAGE_EDIT_MODEL,
        contents: [
          {
            parts: [
              { text: request.instructions },
              {
                inlineData: {
                  mimeType: request.mimeType,
                  data: request.imageBase64,
                },
              },
            ],
          },
        ],
      });

      console.log('ImageEditorService: Response received');

      // Extract response parts
      let generatedImageData: string | null = null;
      let responseText: string | null = null;

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if ('text' in part && part.text) {
          responseText = part.text;
          console.log('Response text:', responseText);
        } else if ('inlineData' in part && part.inlineData?.data) {
          generatedImageData = part.inlineData.data;
          console.log(
            'Generated image received, size:',
            (generatedImageData.length / 1024).toFixed(2),
            'KB'
          );
        }
      }

      // Check if we got an image back
      if (!generatedImageData) {
        return {
          success: false,
          generatedImage: null,
          responseText,
          error:
            responseText ||
            'No image was generated. Try rephrasing your instructions.',
          processingTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        generatedImage: `data:image/png;base64,${generatedImageData}`,
        responseText,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('ImageEditorService: Processing failed:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      return {
        success: false,
        generatedImage: null,
        responseText: null,
        error: `Failed to process image: ${errorMessage}`,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate a unique ID for history items
   */
  generateHistoryId(): string {
    return `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return IMAGE_EDIT_MODEL;
  }

  /**
   * Get max image size in bytes
   */
  getMaxImageSize(): number {
    return MAX_IMAGE_SIZE_BYTES;
  }

  /**
   * Get supported MIME types
   */
  getSupportedMimeTypes(): readonly string[] {
    return SUPPORTED_MIME_TYPES;
  }
}

// Singleton instance for the main process
export const imageEditorService = new ImageEditorService();

// Re-export type for consumers
export type { ImageEditorService };
