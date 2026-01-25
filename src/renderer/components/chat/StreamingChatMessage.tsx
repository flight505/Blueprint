/**
 * StreamingChatMessage - Chat bubble with streaming content support
 *
 * Displays an assistant message with streaming markdown content.
 * Shows a streaming indicator while content is being generated.
 */
import { memo } from 'react';
import { StreamingMarkdown } from './StreamingMarkdown';

export interface StreamingChatMessageProps {
  /** The streaming content */
  content: string;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Optional timestamp */
  timestamp?: Date;
}

/**
 * StreamingChatMessage renders an assistant message with streaming content
 */
export const StreamingChatMessage = memo(function StreamingChatMessage({
  content,
  isStreaming,
  timestamp,
}: StreamingChatMessageProps) {
  return (
    <div
      className="flex justify-start mb-4"
      role="article"
      aria-label="Assistant message"
    >
      <div className="max-w-[85%] rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm">
        {/* Streaming content */}
        <StreamingMarkdown
          content={content}
          isStreaming={isStreaming}
          className="text-sm"
        />

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 mt-2 text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1" aria-live="polite" aria-label="Generating response">
              <span
                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span className="text-xs">Generating...</span>
          </div>
        )}

        {/* Timestamp (only shown when not streaming) */}
        {!isStreaming && timestamp && (
          <time
            className="text-xs mt-1 block text-gray-500 dark:text-gray-400"
            dateTime={timestamp.toISOString()}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>
        )}
      </div>
    </div>
  );
});

export default StreamingChatMessage;
