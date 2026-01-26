import { useEffect, useCallback, useRef } from 'react';
import mermaid from 'mermaid';
import { emitMermaidResult } from '../components/editor/extensions/MermaidBlock';

/**
 * useMermaidRenderer hook
 *
 * Sets up a global listener for Tiptap MermaidBlock render requests
 * and handles the actual Mermaid rendering.
 *
 * This hook should be called once at the app level to handle all
 * Mermaid rendering requests from Tiptap editors.
 */
export function useMermaidRenderer() {
  const renderCountRef = useRef(0);

  const renderMermaid = useCallback(async (code: string, pos: number) => {
    renderCountRef.current += 1;
    const renderId = `mermaid-tiptap-${renderCountRef.current}`;

    try {
      // Check for dark mode
      const isDarkMode = document.documentElement.classList.contains('dark');

      // Configure mermaid for this render
      mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      });

      // Render the diagram
      const { svg } = await mermaid.render(renderId, code);

      // Emit success result
      emitMermaidResult(pos, svg);
    } catch (err) {
      // Emit error result
      const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
      emitMermaidResult(pos, '', errorMessage);
    }
  }, []);

  useEffect(() => {
    const handleRenderRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ code: string; pos: number }>;
      if (customEvent.detail) {
        renderMermaid(customEvent.detail.code, customEvent.detail.pos);
      }
    };

    document.addEventListener('tiptap:mermaid-render', handleRenderRequest);

    return () => {
      document.removeEventListener('tiptap:mermaid-render', handleRenderRequest);
    };
  }, [renderMermaid]);
}

/**
 * useMermaidRender hook
 *
 * Renders a single Mermaid diagram and returns the SVG.
 * Useful for one-off rendering outside of Tiptap context.
 */
export function useMermaidRender(code: string) {
  const renderIdRef = useRef(0);

  const render = useCallback(async (): Promise<{ svg: string; renderTime: number } | { error: string }> => {
    if (!code.trim()) {
      return { error: 'No diagram code provided' };
    }

    renderIdRef.current += 1;
    const renderId = `mermaid-hook-${renderIdRef.current}`;
    const startTime = performance.now();

    try {
      const isDarkMode = document.documentElement.classList.contains('dark');

      mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      });

      const { svg } = await mermaid.render(renderId, code);
      const renderTime = performance.now() - startTime;

      return { svg, renderTime };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
      return { error: errorMessage };
    }
  }, [code]);

  return { render };
}

export default useMermaidRenderer;
