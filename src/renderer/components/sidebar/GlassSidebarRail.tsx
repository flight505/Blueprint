/**
 * GlassSidebarRail - The narrow 48px icon strip for the Glass Sidebar
 *
 * Contains:
 * - Brand logo (top)
 * - Primary navigation icons
 * - Utility icons (bottom - settings, help)
 * - Active indicator with violet glow
 */

import { ReactNode } from 'react';

export interface GlassSidebarRailProps {
  /** Brand/logo element for the top */
  brand?: ReactNode;
  /** Primary navigation items */
  children: ReactNode;
  /** Utility items (settings, help) for the bottom */
  footer?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function GlassSidebarRail({
  brand,
  children,
  footer,
  className = '',
}: GlassSidebarRailProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={`
        w-12 flex-shrink-0 flex flex-col
        bg-white/[0.02] backdrop-blur-sm
        border-r border-white/[0.06]
        ${className}
      `}
    >
      {/* Brand/Logo area */}
      {brand && (
        <div className="h-14 flex items-center justify-center border-b border-white/[0.06]">
          {brand}
        </div>
      )}

      {/* Primary navigation - grows to fill space */}
      <div className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
        {children}
      </div>

      {/* Footer/Utility items */}
      {footer && (
        <div className="flex flex-col items-center py-3 gap-1 border-t border-white/[0.06]">
          {footer}
        </div>
      )}
    </nav>
  );
}

export default GlassSidebarRail;
