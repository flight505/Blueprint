import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { ChatMessage, ChatMessageData } from './ChatMessage';
import { StreamingChatMessage } from './StreamingChatMessage';
import { AskUserQuestion, AskUserQuestionData } from './AskUserQuestion';
import { SkeletonChatMessage } from '../skeleton';
import { ArrowRight, Loader2 } from 'lucide-react';

/** Union type for all chat items */
export type ChatItem =
  | { type: 'message'; data: ChatMessageData }
  | { type: 'question'; data: AskUserQuestionData };

interface ChatContainerProps {
  messages: ChatMessageData[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  /** Current streaming content (for real-time display) */
  streamingContent?: string;
  /** Whether currently streaming a response */
  isStreaming?: boolean;
  /** Active question from the agent (if any) */
  activeQuestion?: AskUserQuestionData | null;
  /** Handler for question answers */
  onAnswerQuestion?: (questionId: string, answer: string | string[]) => void;
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = 'Type a message...',
  streamingContent = '',
  isStreaming = false,
  activeQuestion = null,
  onAnswerQuestion,
}: ChatContainerProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive, streaming content updates, or questions appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, activeQuestion]);

  // Handler for question submission
  const handleQuestionAnswer = useCallback(
    (answer: string | string[]) => {
      if (activeQuestion && onAnswerQuestion) {
        onAnswerQuestion(activeQuestion.id, answer);
      }
    },
    [activeQuestion, onAnswerQuestion]
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  const handleSend = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !isLoading) {
      onSendMessage(trimmedValue);
      setInputValue('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [inputValue, isLoading, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter (without Shift for newline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p className="text-lg mb-2">Welcome to Blueprint</p>
            <p className="text-sm">Start a conversation with the AI assistant</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {/* Streaming message (real-time AI response) */}
            {isStreaming && streamingContent && (
              <StreamingChatMessage
                content={streamingContent}
                isStreaming={isStreaming}
              />
            )}
            {/* Active question from agent */}
            {activeQuestion && (
              <AskUserQuestion
                data={activeQuestion}
                onSubmit={handleQuestionAnswer}
                disabled={isLoading}
              />
            )}
            {/* Loading indicator (shown when waiting for stream to start) */}
            {isLoading && !isStreaming && !activeQuestion && (
              <SkeletonChatMessage isUser={false} />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="px-3 py-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] focus-within:border-purple-400/30 focus-within:shadow-[0_0_0_1px_rgba(167,139,250,0.2),0_0_12px_rgba(167,139,250,0.12)] transition-all duration-150">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="w-full px-3.5 pt-3 pb-1 bg-transparent text-gray-100 resize-none disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500 text-sm outline-none"
            aria-label="Message input"
          />
          {/* Action bar */}
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-[11px] text-gray-500 pl-1.5">
              Enter to send, Shift+Enter for new line
            </p>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.10] border border-white/[0.06] text-gray-300 hover:bg-white/[0.18] hover:text-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-all duration-150 shrink-0 focus-visible:outline-none"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowRight size={14} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
