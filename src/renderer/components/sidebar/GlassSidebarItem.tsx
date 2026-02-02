/**
 * GlassSidebarItem - Individual navigation item for the Glass Sidebar
 *
 * Works in both rail mode (icon-only with tooltip) and panel mode (icon + label).
 * Features hover/active states with Tokyo Night Storm violet glow.
 */

import { forwardRef } from 'react';

export interface GlassSidebarItemProps {
  /** Icon to display (emoji or React node) */
  icon: React.ReactNode;
  /** Label text (shown in panel mode, tooltip in rail mode) */
  label: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Whether this item is currently active */
  active?: boolean;
  /** Whether to show the label (panel mode) or just icon (rail mode) */
  showLabel?: boolean;
  /** Optional badge count */
  badge?: number;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export const GlassSidebarItem = forwardRef<HTMLButtonElement, GlassSidebarItemProps>(
  (
    {
      icon,
      label,
      shortcut,
      active = false,
      showLabel = false,
      badge,
      onClick,
      className = '',
    },
    ref
  ) => {
    const tooltipText = shortcut ? `${label} (${shortcut})` : label;

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`
          group relative flex items-center gap-3 transition-all duration-200 ease-out
          ${showLabel ? 'w-full px-3 py-2 rounded-lg' : 'w-10 h-10 justify-center rounded-lg'}
          ${
            active
              ? 'bg-white/[0.12] text-purple-400 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.35),0_0_16px_rgba(167,139,250,0.2)]'
              : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.08] hover:shadow-[0_0_8px_rgba(167,139,250,0.08)]'
          }
          active:scale-95 active:bg-white/[0.14]
          ${className}
        `}
        title={!showLabel ? tooltipText : undefined}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        aria-keyshortcuts={shortcut}
      >
        {/* Active indicator - left border glow */}
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-400 rounded-full shadow-[0_0_8px_rgba(167,139,250,0.6)]"
            aria-hidden="true"
          />
        )}

        {/* Icon */}
        <span
          className={`flex-shrink-0 ${active ? 'scale-110 text-purple-400' : 'group-hover:scale-110 group-hover:text-gray-100'} transition-all duration-200`}
          aria-hidden="true"
        >
          {icon}
        </span>

        {/* Label (panel mode only) */}
        {showLabel && (
          <span className="flex-1 text-sm font-medium truncate">{label}</span>
        )}

        {/* Shortcut hint (panel mode only) */}
        {showLabel && shortcut && (
          <span className="text-xs text-gray-500 font-mono">{shortcut}</span>
        )}

        {/* Badge */}
        {badge !== undefined && badge > 0 && (
          <span
            className={`
              absolute flex items-center justify-center min-w-[18px] h-[18px] px-1
              text-[10px] font-bold rounded-full
              bg-purple-500 text-white
              ${showLabel ? 'right-2' : '-top-1 -right-1'}
            `}
            aria-label={`${badge} notifications`}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }
);

GlassSidebarItem.displayName = 'GlassSidebarItem';

export default GlassSidebarItem;
