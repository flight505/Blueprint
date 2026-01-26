import { useState, useRef, useEffect, useCallback } from 'react';
import { MermaidDiagram, MermaidDiagramProps } from '../mermaid/MermaidDiagram';

export interface LazyMermaidDiagramProps extends MermaidDiagramProps {
  /** Root margin for IntersectionObserver (e.g., '100px' loads slightly before visible) */
  rootMargin?: string;
  /** Threshold for visibility (0-1, where 0 means any pixel visible) */
  threshold?: number;
  /** Placeholder height while loading */
  placeholderHeight?: number | string;
}

/**
 * LazyMermaidDiagram - Lazily loads Mermaid diagrams when scrolled into view
 *
 * Uses IntersectionObserver to detect when the component is about to become
 * visible and only then renders the actual MermaidDiagram component.
 *
 * Features:
 * - Deferred rendering until visible (performance optimization)
 * - Configurable root margin for pre-loading
 * - Placeholder with loading indicator
 * - Graceful fallback if IntersectionObserver is not supported
 */
export function LazyMermaidDiagram({
  code,
  className = '',
  enableZoomPan = true,
  onRender,
  onError,
  rootMargin = '100px',
  threshold = 0,
  placeholderHeight = 200,
}: LazyMermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Set up IntersectionObserver
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Fallback for environments without IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      setHasLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once visible, we can disconnect the observer
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  // Track when the diagram has actually loaded
  const handleRender = useCallback(
    (svg: string, renderTime: number) => {
      setHasLoaded(true);
      onRender?.(svg, renderTime);
    },
    [onRender]
  );

  // Placeholder while not visible or loading
  const showPlaceholder = !isVisible || !hasLoaded;

  return (
    <div
      ref={containerRef}
      className={`lazy-mermaid-diagram ${className}`}
      style={{ minHeight: showPlaceholder ? placeholderHeight : undefined }}
    >
      {!isVisible ? (
        // Waiting to scroll into view
        <div
          className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          style={{ height: placeholderHeight }}
          role="img"
          aria-label="Mermaid diagram (loading when visible)"
        >
          <div className="text-center text-gray-400 dark:text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-xs">Scroll to load diagram</span>
          </div>
        </div>
      ) : (
        // Render the actual diagram
        <MermaidDiagram
          code={code}
          className={className}
          enableZoomPan={enableZoomPan}
          onRender={handleRender}
          onError={onError}
        />
      )}
    </div>
  );
}

/**
 * Hook to use lazy loading behavior for any component
 */
export function useLazyLoad(options: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  const { rootMargin = '100px', threshold = 0 } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  return { ref, isVisible };
}

export default LazyMermaidDiagram;
