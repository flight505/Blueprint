import { useEffect, useRef, useState, useCallback, useId } from 'react';
import mermaid from 'mermaid';
import panzoom, { PanZoom } from 'panzoom';

// Initialize mermaid with default settings
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'system-ui, -apple-system, sans-serif',
});

export interface MermaidDiagramProps {
  /** The Mermaid diagram code */
  code: string;
  /** Optional CSS class for the container */
  className?: string;
  /** Whether to enable zoom/pan controls */
  enableZoomPan?: boolean;
  /** Callback when diagram is rendered */
  onRender?: (svg: string, renderTime: number) => void;
  /** Callback when rendering fails */
  onError?: (error: string) => void;
}

/**
 * MermaidDiagram component renders Mermaid diagrams as SVG
 * with optional zoom and pan support.
 *
 * Features:
 * - Renders Mermaid code to SVG
 * - Optional zoom/pan with panzoom library
 * - Dark mode support
 * - Render performance tracking
 * - Error handling with fallback display
 */
export function MermaidDiagram({
  code,
  className = '',
  enableZoomPan = true,
  onRender,
  onError,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanZoom | null>(null);
  const uniqueId = useId();
  const diagramId = `mermaid-${uniqueId.replace(/:/g, '-')}`;

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Check for dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');

  // Render mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!code.trim()) {
      setError('No diagram code provided');
      setIsRendering(false);
      return;
    }

    const startTime = performance.now();
    setIsRendering(true);
    setError(null);

    try {
      // Update theme based on dark mode
      mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      });

      // Validate syntax first
      const isValid = await mermaid.parse(code);
      if (!isValid) {
        throw new Error('Invalid Mermaid syntax');
      }

      // Render the diagram
      const { svg } = await mermaid.render(diagramId, code);

      const renderTime = performance.now() - startTime;
      setSvgContent(svg);
      setIsRendering(false);

      if (onRender) {
        onRender(svg, renderTime);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
      setError(errorMessage);
      setSvgContent(null);
      setIsRendering(false);

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [code, diagramId, isDarkMode, onRender, onError]);

  // Render on code change
  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // Set up panzoom
  useEffect(() => {
    if (!enableZoomPan || !svgContainerRef.current || !svgContent) {
      return;
    }

    // Clean up previous panzoom instance
    if (panzoomRef.current) {
      panzoomRef.current.dispose();
    }

    // Initialize panzoom
    const instance = panzoom(svgContainerRef.current, {
      maxZoom: 5,
      minZoom: 0.25,
      initialZoom: 1,
      bounds: true,
      boundsPadding: 0.1,
    });

    // Track zoom level
    instance.on('zoom', () => {
      const transform = instance.getTransform();
      setZoom(transform.scale);
    });

    panzoomRef.current = instance;

    return () => {
      if (panzoomRef.current) {
        panzoomRef.current.dispose();
        panzoomRef.current = null;
      }
    };
  }, [enableZoomPan, svgContent]);

  // Reset zoom handler
  const handleResetZoom = useCallback(() => {
    if (panzoomRef.current && svgContainerRef.current) {
      panzoomRef.current.moveTo(0, 0);
      panzoomRef.current.zoomAbs(0, 0, 1);
      setZoom(1);
    }
  }, []);

  // Zoom in/out handlers
  const handleZoomIn = useCallback(() => {
    if (panzoomRef.current && svgContainerRef.current) {
      const rect = svgContainerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      panzoomRef.current.smoothZoom(centerX, centerY, 1.5);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (panzoomRef.current && svgContainerRef.current) {
      const rect = svgContainerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      panzoomRef.current.smoothZoom(centerX, centerY, 0.67);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`mermaid-diagram relative group ${className}`}
      role="img"
      aria-label="Mermaid diagram"
    >
      {/* Loading state */}
      {isRendering && (
        <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            <span className="mt-2 text-sm">Rendering diagram...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isRendering && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <span className="text-red-500 mr-2">⚠️</span>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">Diagram Error</p>
              <pre className="text-xs text-red-600 dark:text-red-300 mt-1 whitespace-pre-wrap">
                {error}
              </pre>
            </div>
          </div>
          <details className="mt-2">
            <summary className="text-xs text-red-500 cursor-pointer hover:underline">
              Show diagram code
            </summary>
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs overflow-x-auto">
              {code}
            </pre>
          </details>
        </div>
      )}

      {/* SVG container */}
      {svgContent && !isRendering && (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Zoom controls */}
          {enableZoomPan && (
            <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleZoomIn}
                className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                aria-label="Zoom in"
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                aria-label="Zoom out"
                title="Zoom out"
              >
                −
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs"
                aria-label="Reset zoom"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
            </div>
          )}

          {/* Panzoom hint */}
          {enableZoomPan && (
            <div className="absolute bottom-2 left-2 z-10 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
              Scroll to zoom • Drag to pan
            </div>
          )}

          {/* SVG render container */}
          <div
            ref={svgContainerRef}
            className="mermaid-svg-container p-4"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{ cursor: enableZoomPan ? 'grab' : 'default' }}
          />
        </div>
      )}
    </div>
  );
}

export default MermaidDiagram;
