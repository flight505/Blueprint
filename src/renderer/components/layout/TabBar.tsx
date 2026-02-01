import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ANIMATION_DURATION } from '../animations';

export interface TabData {
  id: string;
  label: string;
  path?: string;
  hasUnsavedChanges?: boolean;
}

export interface TabBarProps {
  tabs: TabData[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  /** If true, Cmd+1-9 will switch tabs. If false, keyboard shortcuts are disabled. */
  enableKeyboardShortcuts?: boolean;
}

/**
 * TabBar component for document tabs with:
 * - Close button on each tab
 * - Unsaved changes dot indicator
 * - Cmd+1-9 switches tabs (when enabled)
 */
export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  enableKeyboardShortcuts = true,
}: TabBarProps) {
  // Keyboard shortcuts for tab switching (Cmd+1-9)
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Only handle if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (!e.metaKey && !e.ctrlKey) return;

      // Check for number keys 1-9
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= 9) {
        const tabIndex = keyNum - 1;
        if (tabIndex < tabs.length) {
          e.preventDefault();
          e.stopPropagation();
          onTabSelect(tabs[tabIndex].id);
        }
      }
    }

    // Use capture phase to handle before Activity Bar shortcuts
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [tabs, onTabSelect, enableKeyboardShortcuts]);

  if (tabs.length === 0) {
    return (
      <div className="flex items-center gap-1 px-2">
        <Tab label="Welcome" active />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 px-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      role="tablist"
      aria-label="Document tabs"
    >
      <AnimatePresence mode="popLayout">
        {tabs.map((tab, index) => (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, scale: 0.9, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -10 }}
            transition={{ duration: ANIMATION_DURATION.normal }}
            layout
          >
            <Tab
              label={tab.label}
              active={tab.id === activeTabId}
              hasUnsavedChanges={tab.hasUnsavedChanges}
              shortcut={enableKeyboardShortcuts && index < 9 ? `Cmd+${index + 1}` : undefined}
              onClick={() => onTabSelect(tab.id)}
              onClose={() => onTabClose(tab.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface TabProps {
  label: string;
  active?: boolean;
  hasUnsavedChanges?: boolean;
  shortcut?: string;
  onClick?: () => void;
  onClose?: () => void;
}

function Tab({ label, active, hasUnsavedChanges, shortcut, onClick, onClose }: TabProps) {
  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose?.();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );

  const tooltipText = shortcut ? `${label} (${shortcut})` : label;

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={active}
      aria-label={tooltipText}
      title={tooltipText}
      className={`group flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-lg transition-colors cursor-pointer select-none ${
        active
          ? 'bg-gray-800 text-gray-100 border-t border-x border-gray-700'
          : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700/50'
      }`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <span
          className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
          aria-label="Unsaved changes"
          title="Unsaved changes"
        />
      )}

      {/* Tab label */}
      <span className="truncate max-w-[120px]">{label}</span>

      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          className={`ml-0.5 w-4 h-4 flex items-center justify-center rounded transition-colors ${
            active
              ? 'hover:bg-gray-600 text-gray-400'
              : 'opacity-0 group-hover:opacity-100 hover:bg-gray-600 text-gray-400'
          }`}
          aria-label={`Close ${label}`}
          title={`Close ${label}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default TabBar;
