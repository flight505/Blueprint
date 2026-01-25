import { Node, mergeAttributes } from '@tiptap/react';

/**
 * MermaidBlock extension for Tiptap
 *
 * Provides a custom code block that renders Mermaid diagrams:
 * - Detect ```mermaid code blocks
 * - Render SVG diagrams in preview mode
 * - Toggle between code and preview views
 * - Support editing through modal
 */

export interface MermaidBlockOptions {
  /** Callback when user wants to edit the diagram */
  onEdit?: (code: string, nodePos: number) => void;
  /** CSS class for the mermaid wrapper */
  wrapperClass?: string;
  /** CSS class for the code view */
  codeClass?: string;
  /** CSS class for the preview */
  previewClass?: string;
}

export interface MermaidBlockStorage {
  /** Map of node positions to their rendered SVG */
  renderedDiagrams: Map<number, string>;
}

// Module-level storage
const renderedDiagrams = new Map<number, string>();

/**
 * Request rendering of a Mermaid diagram
 */
export function requestMermaidRender(code: string, pos: number): void {
  const event = new CustomEvent('tiptap:mermaid-render', {
    detail: { code, pos },
  });
  document.dispatchEvent(event);
}

/**
 * Request editing of a Mermaid diagram
 * Emits an event that useDiagramEdit hook listens to
 */
export function requestMermaidEdit(code: string, pos: number): void {
  const event = new CustomEvent('tiptap:mermaid-edit', {
    detail: { code, pos },
  });
  document.dispatchEvent(event);
}

/**
 * Set the rendered SVG for a position
 */
export function setMermaidRendered(pos: number, svg: string): void {
  renderedDiagrams.set(pos, svg);
}

/**
 * Emit a render result event
 */
export function emitMermaidResult(pos: number, svg: string, error?: string): void {
  const event = new CustomEvent('tiptap:mermaid-rendered', {
    detail: { pos, svg, error },
  });
  document.dispatchEvent(event);
}

export const MermaidBlock = Node.create<MermaidBlockOptions, MermaidBlockStorage>({
  name: 'mermaidBlock',

  group: 'block',

  content: 'text*',

  marks: '',

  code: true,

  defining: true,

  addOptions() {
    return {
      onEdit: undefined,
      wrapperClass: 'mermaid-block',
      codeClass: 'mermaid-code',
      previewClass: 'mermaid-preview',
    };
  },

  addStorage() {
    return {
      renderedDiagrams,
    };
  },

  addAttributes() {
    return {
      language: {
        default: 'mermaid',
        parseHTML: (element) => {
          return element.getAttribute('data-language') || 'mermaid';
        },
        renderHTML: (attributes) => {
          return { 'data-language': attributes.language };
        },
      },
      showPreview: {
        default: true,
        parseHTML: (element) => {
          return element.getAttribute('data-show-preview') !== 'false';
        },
        renderHTML: (attributes) => {
          return { 'data-show-preview': String(attributes.showPreview) };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-language="mermaid"]',
      },
      {
        tag: 'pre',
        getAttrs: (node) => {
          const element = node as HTMLElement;
          const code = element.querySelector('code');
          if (code?.classList.contains('language-mermaid')) {
            return { language: 'mermaid' };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { class: this.options.wrapperClass },
        HTMLAttributes
      ),
      [
        'pre',
        { class: this.options.codeClass },
        ['code', { class: 'language-mermaid' }, 0],
      ],
    ];
  },

  addNodeView() {
    return ({ node, getPos }) => {
      const dom = document.createElement('div');
      dom.className = `${this.options.wrapperClass} relative group`;
      dom.setAttribute('data-mermaid-block', 'true');

      // Code container
      const codeContainer = document.createElement('div');
      codeContainer.className = `${this.options.codeClass} hidden`;

      const pre = document.createElement('pre');
      pre.className = 'p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto';

      const code = document.createElement('code');
      code.className = 'language-mermaid text-sm';
      code.textContent = node.textContent;

      pre.appendChild(code);
      codeContainer.appendChild(pre);

      // Preview container
      const previewContainer = document.createElement('div');
      previewContainer.className = `${this.options.previewClass} p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700`;

      // Placeholder while rendering
      const placeholder = document.createElement('div');
      placeholder.className = 'text-center text-gray-400 py-8';
      placeholder.innerHTML = `
        <div class="animate-pulse">Rendering diagram...</div>
        <div class="text-xs mt-2">Mermaid diagram will appear here</div>
      `;
      previewContainer.appendChild(placeholder);

      // Toggle button (Edit Diagram)
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'absolute top-2 right-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity';
      toggleBtn.textContent = 'Edit';
      toggleBtn.setAttribute('aria-label', 'Edit Mermaid diagram');
      toggleBtn.onclick = () => {
        const pos = typeof getPos === 'function' ? getPos() : undefined;
        if (pos !== undefined) {
          // Emit edit event for the DiagramEditModal
          requestMermaidEdit(node.textContent, pos);
          // Also call onEdit callback if provided
          if (this.options.onEdit) {
            this.options.onEdit(node.textContent, pos);
          }
        }
      };

      // View toggle button
      const viewToggle = document.createElement('button');
      viewToggle.className = 'absolute top-2 right-16 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity';
      viewToggle.textContent = 'Code';
      viewToggle.setAttribute('aria-label', 'Toggle code view');
      viewToggle.onclick = () => {
        const showingCode = codeContainer.classList.contains('hidden');
        codeContainer.classList.toggle('hidden');
        previewContainer.classList.toggle('hidden');
        viewToggle.textContent = showingCode ? 'Preview' : 'Code';
      };

      dom.appendChild(codeContainer);
      dom.appendChild(previewContainer);
      dom.appendChild(viewToggle);
      dom.appendChild(toggleBtn);

      // Request initial render
      const initialPos = typeof getPos === 'function' ? getPos() : undefined;
      if (initialPos !== undefined) {
        requestMermaidRender(node.textContent, initialPos);
      }

      // Listen for render results
      const handleRenderResult = (e: Event) => {
        const event = e as CustomEvent<{ pos: number; svg: string; error?: string }>;
        const currentPos = typeof getPos === 'function' ? getPos() : undefined;
        if (currentPos !== undefined && event.detail.pos === currentPos) {
          previewContainer.innerHTML = '';
          if (event.detail.error) {
            previewContainer.innerHTML = `
              <div class="text-red-500 p-4">
                <div class="font-bold">Mermaid Error</div>
                <pre class="text-xs mt-2 whitespace-pre-wrap">${event.detail.error}</pre>
              </div>
            `;
          } else {
            previewContainer.innerHTML = event.detail.svg;
            // Apply styling to SVG
            const svg = previewContainer.querySelector('svg');
            if (svg) {
              svg.style.maxWidth = '100%';
              svg.style.height = 'auto';
            }
          }
        }
      };

      document.addEventListener('tiptap:mermaid-rendered', handleRenderResult);

      return {
        dom,
        contentDOM: code,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          code.textContent = updatedNode.textContent;
          // Re-request render on content change
          const pos = typeof getPos === 'function' ? getPos() : undefined;
          if (pos !== undefined) {
            requestMermaidRender(updatedNode.textContent, pos);
          }
          return true;
        },
        destroy: () => {
          document.removeEventListener('tiptap:mermaid-rendered', handleRenderResult);
          const pos = typeof getPos === 'function' ? getPos() : undefined;
          if (pos !== undefined) {
            renderedDiagrams.delete(pos);
          }
        },
      };
    };
  },

  addInputRules() {
    // Return empty array - input rules have complex typing requirements
    // The markdown parser will handle ```mermaid blocks instead
    return [];
  },
});

export default MermaidBlock;
