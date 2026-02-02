/**
 * GlassSidebar - Main sidebar component combining Rail and Panel
 *
 * Supports three modes:
 * - Collapsed: Rail icons only, panel hidden (max content space)
 * - Expanded: Rail icons + panel visible (standard desktop)
 * - Inline: Single column with icons + labels (simple apps)
 *
 * For Blueprint, we use Rail + Panel (Expanded) mode.
 */

import { useState, useCallback, ReactNode } from 'react';
import { GlassSidebarRail } from './GlassSidebarRail';
import { GlassSidebarPanel } from './GlassSidebarPanel';
import { GlassSidebarBrand } from './GlassSidebarBrand';
import { GlassSidebarItem } from './GlassSidebarItem';

export type SidebarMode = 'collapsed' | 'expanded' | 'inline';

export interface NavItem {
  id: string;
  icon: ReactNode;
  label: string;
  shortcut?: string;
  badge?: number;
}

export interface GlassSidebarProps {
  /** Sidebar display mode */
  mode?: SidebarMode;
  /** Brand/logo element */
  brand?: ReactNode;
  /** Primary navigation items */
  items: NavItem[];
  /** Utility items (settings, help) */
  utilityItems?: NavItem[];
  /** Currently active item ID */
  activeId: string;
  /** Callback when an item is selected */
  onItemSelect: (id: string) => void;
  /** Panel title */
  panelTitle?: string;
  /** Panel content (rendered when expanded) */
  panelContent?: ReactNode;
  /** Panel width when expanded */
  panelWidth?: number;
  /** App version for footer */
  version?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

export function GlassSidebar({
  mode = 'expanded',
  brand,
  items,
  utilityItems = [],
  activeId,
  onItemSelect,
  panelTitle,
  panelContent,
  panelWidth = 240,
  version,
  className = '',
}: GlassSidebarProps) {
  // For expanded mode, track if panel is manually toggled
  const [isPanelOpen, setIsPanelOpen] = useState(mode === 'expanded');

  const handleItemClick = useCallback(
    (id: string) => {
      onItemSelect(id);
      // In expanded mode, ensure panel is open when selecting an item
      if (mode === 'expanded') {
        setIsPanelOpen(true);
      }
    },
    [mode, onItemSelect]
  );

  // Toggle panel visibility (for collapsed/expanded switching)
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  // Inline mode - single column with labels
  if (mode === 'inline') {
    return (
      <nav
        aria-label="Main navigation"
        className={`
          w-56 flex-shrink-0 flex flex-col
          bg-white/[0.02] backdrop-blur-sm
          border-r border-white/[0.06]
          ${className}
        `}
      >
        {/* Brand */}
        {brand && (
          <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
            {brand}
          </div>
        )}

        {/* Items with labels */}
        <div className="flex-1 flex flex-col py-3 px-2 gap-1 overflow-y-auto">
          {items.map((item) => (
            <GlassSidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              badge={item.badge}
              active={activeId === item.id}
              showLabel={true}
              onClick={() => handleItemClick(item.id)}
            />
          ))}
        </div>

        {/* Utility items */}
        {utilityItems.length > 0 && (
          <div className="flex flex-col py-3 px-2 gap-1 border-t border-white/[0.06]">
            {utilityItems.map((item) => (
              <GlassSidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                shortcut={item.shortcut}
                badge={item.badge}
                active={activeId === item.id}
                showLabel={true}
                onClick={() => handleItemClick(item.id)}
              />
            ))}
          </div>
        )}

        {/* Version */}
        {version && (
          <div className="px-4 py-2 border-t border-white/[0.06]">
            <span className="text-[10px] text-gray-600 font-mono">v{version}</span>
          </div>
        )}
      </nav>
    );
  }

  // Rail + Panel mode (collapsed or expanded)
  return (
    <div className={`flex ${className}`}>
      {/* Rail */}
      <GlassSidebarRail
        brand={
          brand || (
            <GlassSidebarBrand
              onClick={togglePanel}
            />
          )
        }
        footer={
          <>
            {utilityItems.map((item) => (
              <GlassSidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                shortcut={item.shortcut}
                badge={item.badge}
                active={activeId === item.id}
                onClick={() => handleItemClick(item.id)}
              />
            ))}
          </>
        }
      >
        {items.map((item) => (
          <GlassSidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            shortcut={item.shortcut}
            badge={item.badge}
            active={activeId === item.id}
            onClick={() => handleItemClick(item.id)}
          />
        ))}
      </GlassSidebarRail>

      {/* Panel (only in expanded mode or when manually opened) */}
      <GlassSidebarPanel
        isOpen={isPanelOpen && mode !== 'collapsed'}
        title={panelTitle}
        width={panelWidth}
      >
        {panelContent}
      </GlassSidebarPanel>
    </div>
  );
}

export default GlassSidebar;
