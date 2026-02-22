/**
 * GlassSidebarPanel - Expandable content area for the Glass Sidebar
 *
 * Features:
 * - Smooth slide animation (200ms)
 * - Glass background with backdrop blur
 * - Section headers and nested content support
 * - Width: 200-280px when expanded
 */

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ANIMATION_DURATION } from '../animations';

export interface GlassSidebarPanelProps {
  /** Whether the panel is expanded */
  isOpen: boolean;
  /** Panel title/header */
  title?: string;
  /** Panel content */
  children: ReactNode;
  /** Width when expanded (default: 240px) */
  width?: number;
  /** Additional CSS classes */
  className?: string;
}

export function GlassSidebarPanel({
  isOpen,
  title,
  children,
  width = 240,
  className = '',
}: GlassSidebarPanelProps) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: ANIMATION_DURATION.normal, ease: 'easeInOut' }}
          className={`
            flex-shrink-0 flex flex-col overflow-hidden
            bg-surface-raised backdrop-blur-md
            border-r border-border-default
            ${className}
          `}
          aria-label="Sidebar panel"
        >
          {/* Panel header */}
          {title && (
            <header className="h-10 flex items-center px-4 border-b border-border-default">
              <h2 className="text-sm font-medium text-fg">{title}</h2>
            </header>
          )}

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/**
 * Section header for organizing panel content
 */
export interface GlassSidebarSectionProps {
  /** Section title */
  title: string;
  /** Section content */
  children: ReactNode;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function GlassSidebarSection({
  title,
  children,
  className = '',
}: GlassSidebarSectionProps) {
  return (
    <section className={`py-2 ${className}`}>
      <h3 className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
        {title}
      </h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

export default GlassSidebarPanel;
