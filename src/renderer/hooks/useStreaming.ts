/**
 * useStreaming - Hook for managing streaming AI responses
 *
 * Connects to the main process streaming IPC and updates Legend State
 * observables for fine-grained reactivity without full re-renders.
 */
import { useEffect, useCallback, useRef } from 'react';
import { useSelector } from '@legendapp/state/react';
import {
  store$,
  startStreamingMessage,
  appendStreamingContent,
  completeStreamingMessage,
  clearStreamingMessage,
  setAgentSessionId,
  type StreamingMessage,
} from '../state/store';

export interface UseStreamingOptions {
  /** Callback when streaming starts */
  onStreamStart?: (messageId: string) => void;
  /** Callback when a chunk is received */
  onChunk?: (chunk: string) => void;
  /** Callback when streaming completes */
  onStreamComplete?: (message: StreamingMessage) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseStreamingResult {
  /** Current streaming message (observable) */
  streamingMessage: StreamingMessage | null;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Content being streamed */
  streamingContent: string;
  /** Send a message and start streaming response */
  sendMessage: (sessionId: string, message: string) => Promise<void>;
  /** Cancel current streaming */
  cancelStreaming: () => void;
  /** Initialize agent with API key */
  initializeAgent: (apiKey: string) => Promise<boolean>;
  /** Create a new session */
  createSession: (options?: { model?: string; systemPrompt?: string }) => Promise<string>;
}

/**
 * Hook for managing streaming AI responses with fine-grained reactivity
 */
export function useStreaming(options: UseStreamingOptions = {}): UseStreamingResult {
  const { onStreamStart, onChunk, onStreamComplete, onError } = options;

  // Use selectors for fine-grained reactivity - only re-renders when specific values change
  const streamingMessage = useSelector(() => store$.session.streamingMessage.get());
  const isStreaming = useSelector(
    () => store$.session.streamingMessage.get()?.isStreaming ?? false
  );
  const streamingContent = useSelector(
    () => store$.session.streamingMessage.get()?.content ?? ''
  );

  // Track cleanup function for IPC listener
  const cleanupRef = useRef<(() => void) | null>(null);

  // Set up IPC listener for stream chunks
  useEffect(() => {
    // Register the stream chunk listener
    cleanupRef.current = window.electronAPI.onAgentStreamChunk(
      (sessionId: string, chunk) => {
        const currentMessage = store$.session.streamingMessage.get();

        // Only process chunks for the current streaming session
        if (!currentMessage || currentMessage.sessionId !== sessionId) {
          return;
        }

        switch (chunk.type) {
          case 'text':
            // Append text chunk to streaming content
            appendStreamingContent(chunk.content);
            onChunk?.(chunk.content);
            break;

          case 'thinking':
            // Could display thinking indicator
            break;

          case 'tool_use':
            // Could display tool use indicator
            break;

          case 'done':
            // Streaming complete
            const completedMessage = completeStreamingMessage();
            if (completedMessage) {
              onStreamComplete?.(completedMessage);
            }
            break;

          case 'error':
            // Handle error
            completeStreamingMessage();
            onError?.(chunk.content);
            break;
        }
      }
    );

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [onChunk, onStreamComplete, onError]);

  // Initialize the agent service
  const initializeAgent = useCallback(async (apiKey: string): Promise<boolean> => {
    try {
      return await window.electronAPI.agentInitialize(apiKey);
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      return false;
    }
  }, []);

  // Create a new session
  const createSession = useCallback(
    async (options?: { model?: string; systemPrompt?: string }): Promise<string> => {
      const session = await window.electronAPI.agentCreateSession(options);
      setAgentSessionId(session.id);
      return session.id;
    },
    []
  );

  // Send a message and start streaming
  const sendMessage = useCallback(
    async (sessionId: string, message: string): Promise<void> => {
      // Generate a unique message ID
      const messageId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Start streaming state
      startStreamingMessage(messageId, sessionId);
      onStreamStart?.(messageId);

      try {
        // This initiates streaming - chunks come via IPC events
        await window.electronAPI.agentSendMessageStream(sessionId, message);
      } catch (error) {
        // Handle error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        completeStreamingMessage();
        onError?.(errorMessage);
        throw error;
      }
    },
    [onStreamStart, onError]
  );

  // Cancel streaming
  const cancelStreaming = useCallback(() => {
    // Clear the streaming state
    // Note: This doesn't actually stop the backend stream (would need IPC call for that)
    clearStreamingMessage();
  }, []);

  return {
    streamingMessage,
    isStreaming,
    streamingContent,
    sendMessage,
    cancelStreaming,
    initializeAgent,
    createSession,
  };
}

export default useStreaming;
