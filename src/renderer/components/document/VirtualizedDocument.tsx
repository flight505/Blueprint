import { useMemo, memo, useCallback, useState, useEffect, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

/** Threshold for enabling virtual scrolling (in lines) */
const VIRTUALIZATION_THRESHOLD = 1000;

export interface VirtualizedDocumentProps {
  /** The document content as a string */
  content: string;
  /** File name for determining syntax highlighting */
  fileName?: string;
  /** Optional CSS class for the container */
  className?: string;
  /** Callback when a line is clicked */
  onLineClick?: (lineNumber: number) => void;
  /** Line number to scroll to */
  scrollToLine?: number;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
}

interface LineData {
  lineNumber: number;
  content: string;
}

/**
 * VirtualizedDocument - Optimized document viewer for large files
 *
 * Features:
 * - Virtual scrolling for documents over 1000 lines (configurable)
 * - Render time under 100ms for 1000 lines
 * - Line numbers with click-to-select
 * - Syntax-appropriate styling based on file extension
 *
 * For smaller documents, renders all content normally for simplicity.
 */
export function VirtualizedDocument({
  content,
  fileName = '',
  className = '',
  onLineClick,
  scrollToLine,
  showLineNumbers = true,
}: VirtualizedDocumentProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [renderTime, setRenderTime] = useState<number>(0);

  // Parse content into lines
  const lines = useMemo(() => {
    const startTime = performance.now();
    const lineArray = content.split('\n');
    const result: LineData[] = lineArray.map((line, index) => ({
      lineNumber: index + 1,
      content: line,
    }));
    const endTime = performance.now();
    setRenderTime(endTime - startTime);
    return result;
  }, [content]);

  // Determine if virtualization is needed
  const useVirtualization = lines.length >= VIRTUALIZATION_THRESHOLD;

  // Get file extension for styling
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isCode = ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'html', 'yml', 'yaml', 'py', 'rb', 'go', 'rs', 'md'].includes(ext);

  // Scroll to line when scrollToLine prop changes
  useEffect(() => {
    if (scrollToLine && virtuosoRef.current && useVirtualization) {
      virtuosoRef.current.scrollToIndex({
        index: scrollToLine - 1,
        align: 'center',
        behavior: 'smooth',
      });
    }
  }, [scrollToLine, useVirtualization]);

  // Line renderer for virtualized view
  const renderLine = useCallback(
    (_index: number, data: LineData) => (
      <DocumentLine
        key={data.lineNumber}
        lineNumber={data.lineNumber}
        content={data.content}
        showLineNumbers={showLineNumbers}
        onClick={onLineClick}
      />
    ),
    [showLineNumbers, onLineClick]
  );

  // For small documents, render all content at once (simpler, no overhead)
  if (!useVirtualization) {
    return (
      <div
        className={`virtualized-document ${className} ${isCode ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}
        role="document"
        aria-label={fileName || 'Document'}
      >
        <div className="p-4 font-mono text-sm overflow-x-auto">
          {showLineNumbers ? (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line) => (
                  <DocumentLine
                    key={line.lineNumber}
                    lineNumber={line.lineNumber}
                    content={line.content}
                    showLineNumbers={showLineNumbers}
                    onClick={onLineClick}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="whitespace-pre-wrap">
              <code>{content}</code>
            </pre>
          )}
        </div>
      </div>
    );
  }

  // For large documents, use virtual scrolling
  return (
    <div
      className={`virtualized-document h-full ${className} ${isCode ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`}
      role="document"
      aria-label={fileName || 'Document'}
    >
      {/* Performance indicator (dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-10 text-xs text-gray-400 dark:text-gray-500 bg-gray-100/80 dark:bg-gray-800/80 px-2 py-1 rounded">
          {lines.length.toLocaleString()} lines | Parse: {renderTime.toFixed(1)}ms
        </div>
      )}

      <div className="h-full font-mono text-sm">
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: '100%' }}
          data={lines}
          overscan={50}
          itemContent={(index, data) => renderLine(index, data)}
          components={{
            // Use table for proper line number alignment
            List: VirtualizedList,
          }}
        />
      </div>
    </div>
  );
}

// Virtualized list wrapper for table semantics
const VirtualizedList = memo<{ style?: React.CSSProperties; children?: React.ReactNode }>(
  ({ style, children }) => (
    <table className="w-full border-collapse" style={style}>
      <tbody>{children}</tbody>
    </table>
  )
);
VirtualizedList.displayName = 'VirtualizedList';

interface DocumentLineProps {
  lineNumber: number;
  content: string;
  showLineNumbers: boolean;
  onClick?: (lineNumber: number) => void;
}

/**
 * Memoized line component to prevent unnecessary re-renders
 */
const DocumentLine = memo<DocumentLineProps>(
  ({ lineNumber, content, showLineNumbers, onClick }) => {
    const handleClick = useCallback(() => {
      onClick?.(lineNumber);
    }, [onClick, lineNumber]);

    return (
      <tr
        className="hover:bg-gray-200/50 dark:hover:bg-gray-700/50 group"
        onClick={handleClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
      >
        {showLineNumbers && (
          <td
            className="select-none text-right pr-4 text-gray-400 dark:text-gray-500 w-12 sticky left-0 bg-inherit"
            aria-hidden="true"
          >
            {lineNumber}
          </td>
        )}
        <td className="whitespace-pre-wrap break-all">
          {content || '\u00A0' /* non-breaking space for empty lines */}
        </td>
      </tr>
    );
  }
);
DocumentLine.displayName = 'DocumentLine';

export default VirtualizedDocument;
