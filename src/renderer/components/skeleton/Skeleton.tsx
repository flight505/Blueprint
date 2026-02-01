/**
 * Skeleton loading placeholder component with pulse animation
 * Used to show content loading state before data arrives
 */

interface SkeletonProps {
  /** Width of skeleton (CSS value or 'full') */
  width?: string | number;
  /** Height of skeleton (CSS value) */
  height?: string | number;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Additional CSS classes */
  className?: string;
}

const ROUNDED_CLASSES = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  const widthStyle = width === 'full' ? '100%' : typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`animate-pulse bg-gray-700 ${ROUNDED_CLASSES[rounded]} ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-hidden="true"
    />
  );
}

/** Skeleton for a single line of text */
export function SkeletonText({
  width = '100%',
  className = '',
}: {
  width?: string | number;
  className?: string;
}) {
  return <Skeleton width={width} height="0.875rem" rounded="sm" className={className} />;
}

/** Skeleton for a paragraph (multiple lines) */
export function SkeletonParagraph({
  lines = 3,
  lastLineWidth = '60%',
  className = '',
}: {
  lines?: number;
  lastLineWidth?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonText
          key={i}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

/** Skeleton for file tree items */
export function SkeletonFileTree({
  items = 5,
  className = '',
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1 px-2">
          {/* Folder/file icon */}
          <Skeleton width={16} height={16} rounded="sm" />
          {/* File name with varying widths */}
          <SkeletonText width={`${50 + Math.random() * 40}%`} />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a chat message bubble */
export function SkeletonChatMessage({
  isUser = false,
  className = '',
}: {
  isUser?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${className}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-500/20 rounded-br-sm'
            : 'bg-gray-700 rounded-bl-sm'
        }`}
      >
        <SkeletonParagraph lines={2} lastLineWidth="70%" />
      </div>
    </div>
  );
}

/** Skeleton for search results */
export function SkeletonSearchResults({
  files = 3,
  matchesPerFile = 2,
  className = '',
}: {
  files?: number;
  matchesPerFile?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: files }).map((_, fileIdx) => (
        <div key={fileIdx} className="border-b border-gray-700 pb-2">
          {/* File header */}
          <div className="flex items-center gap-2 px-4 py-2">
            <Skeleton width={10} height={10} rounded="sm" />
            <SkeletonText width="60%" />
            <Skeleton width={24} height={16} rounded="sm" className="ml-auto" />
          </div>
          {/* Matches */}
          <div className="bg-gray-800/50">
            {Array.from({ length: matchesPerFile }).map((_, matchIdx) => (
              <div key={matchIdx} className="flex items-center gap-3 px-4 py-1.5">
                <Skeleton width={32} height={14} rounded="sm" />
                <SkeletonText width={`${40 + Math.random() * 50}%`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton for file content viewer */
export function SkeletonFileContent({
  lines = 15,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`p-4 ${className}`}>
      <div className="bg-gray-800 rounded-lg p-4 space-y-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {/* Line number */}
            <Skeleton width={24} height={14} rounded="sm" className="flex-shrink-0" />
            {/* Code line with varying widths */}
            <SkeletonText width={`${20 + Math.random() * 70}%`} />
          </div>
        ))}
      </div>
    </div>
  );
}
