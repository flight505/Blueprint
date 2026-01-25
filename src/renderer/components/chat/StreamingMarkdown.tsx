/**
 * StreamingMarkdown - O(n) incremental markdown rendering for streaming content
 *
 * Uses insertAdjacentHTML to append new content incrementally instead of
 * re-rendering the entire content on each chunk, achieving O(n) performance.
 * DOMPurify sanitizes all HTML to prevent XSS attacks.
 */
import { useRef, useEffect, useCallback, memo } from 'react';
import DOMPurify from 'dompurify';

// Simple markdown to HTML converter for streaming
// Handles common markdown patterns incrementally
function markdownToHtml(text: string): string {
  let html = text;

  // Escape HTML entities first (before we add our own HTML)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```language\n...\n```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm my-2"><code class="language-$1">$2</code></pre>'
  );

  // Inline code (`...`)
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>'
  );

  // Bold (**...**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic (*...*)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headers (# ... ## ... ###)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

  // Unordered lists (- ...)
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // Ordered lists (1. ...)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-500 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Line breaks (preserve single line breaks as <br> in streaming context)
  html = html.replace(/\n/g, '<br>');

  return html;
}

export interface StreamingMarkdownProps {
  /** Observable content that streams in chunks */
  content: string;
  /** Whether streaming is currently active */
  isStreaming: boolean;
  /** Optional CSS class name */
  className?: string;
  /** Called when content changes */
  onContentChange?: (content: string) => void;
}

/**
 * StreamingMarkdown renders markdown content incrementally as it streams in.
 * Uses insertAdjacentHTML for O(n) performance.
 */
export const StreamingMarkdown = memo(function StreamingMarkdown({
  content,
  isStreaming,
  className = '',
  onContentChange,
}: StreamingMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastContentLengthRef = useRef(0);
  const lastRenderedHtmlRef = useRef('');

  // Convert and sanitize new content incrementally
  const appendContent = useCallback((newChunk: string) => {
    if (!containerRef.current || !newChunk) return;

    // Convert markdown to HTML
    const html = markdownToHtml(newChunk);

    // Sanitize the HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'code', 'pre', 'a',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote',
        'span', 'div',
      ],
      ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
    });

    // Use insertAdjacentHTML for O(n) append performance
    containerRef.current.insertAdjacentHTML('beforeend', sanitizedHtml);
    lastRenderedHtmlRef.current += sanitizedHtml;
  }, []);

  // Handle streaming content updates
  useEffect(() => {
    if (!content) {
      // Reset on empty content
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      lastContentLengthRef.current = 0;
      lastRenderedHtmlRef.current = '';
      return;
    }

    // Calculate the new chunk (content that hasn't been rendered yet)
    const newChunk = content.slice(lastContentLengthRef.current);

    if (newChunk) {
      appendContent(newChunk);
      lastContentLengthRef.current = content.length;
      onContentChange?.(content);
    }
  }, [content, appendContent, onContentChange]);

  // When streaming ends, do a final cleanup/re-render if needed
  useEffect(() => {
    if (!isStreaming && content && containerRef.current) {
      // Final render - could do a full re-render here for proper markdown parsing
      // But for now, we keep the incremental content as-is
    }
  }, [isStreaming, content]);

  // Reset when content is cleared
  useEffect(() => {
    if (!content && containerRef.current) {
      containerRef.current.innerHTML = '';
      lastContentLengthRef.current = 0;
      lastRenderedHtmlRef.current = '';
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions"
      role="log"
    />
  );
});

export default StreamingMarkdown;
