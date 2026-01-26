import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { MermaidDiagram } from '../mermaid';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      role="article"
      aria-label={`${isUser ? 'Your' : 'Assistant'} message`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
              components={{
                // Custom rendering for code blocks and inline code
                code: ({ className, children, ...props }) => {
                  // Check if this is a mermaid code block
                  const isMermaid = className?.includes('language-mermaid');

                  if (isMermaid) {
                    // Extract the code content as string
                    const code = String(children).replace(/\n$/, '');
                    return <MermaidDiagram code={code} className="my-4" />;
                  }

                  // If no className, it's inline code - style it manually
                  // If className exists (from rehype-highlight), use it as-is
                  if (!className) {
                    return (
                      <code
                        className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                // Style pre blocks for code (mermaid blocks are handled by code component)
                pre: ({ children, ...props }) => {
                  // Check if child is a mermaid diagram (rendered by code component above)
                  // If so, just render the child directly without pre wrapper
                  const childElement = children as React.ReactElement;
                  if (childElement?.type === MermaidDiagram) {
                    return <>{children}</>;
                  }

                  return (
                    <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm" {...props}>
                      {children}
                    </pre>
                  );
                },
                // Style links
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-blue-500 dark:text-blue-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                // Style tables (GFM feature)
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gray-100 dark:bg-gray-700">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                    {children}
                  </td>
                ),
                // Style task lists (GFM feature)
                input: (props) => (
                  <input
                    {...props}
                    className="mr-2 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                    disabled
                  />
                ),
                // Style strikethrough (GFM feature)
                del: ({ children }) => (
                  <del className="text-gray-500 dark:text-gray-400 line-through">{children}</del>
                ),
              }}
            >
              {message.content}
            </Markdown>
          </div>
        )}
        <time
          className={`text-xs mt-1 block ${
            isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
          }`}
          dateTime={message.timestamp.toISOString()}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </div>
  );
}
