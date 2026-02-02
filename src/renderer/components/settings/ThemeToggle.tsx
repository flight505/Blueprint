/**
 * Theme Toggle Component
 *
 * Provides UI for switching between light, dark, and system themes.
 * Uses Legend State store for theme persistence.
 */

import { store$, setTheme, type Theme } from '../../state/store';
import { THEME_ICONS } from '../icons';
import type { ReactNode } from 'react';

const THEME_OPTIONS: { value: Theme; label: string; icon: ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <THEME_ICONS.light size={16} /> },
  { value: 'dark', label: 'Dark', icon: <THEME_ICONS.dark size={16} /> },
  { value: 'system', label: 'System', icon: <THEME_ICONS.system size={16} /> },
];

export default function ThemeToggle() {
  const currentTheme = store$.ui.theme.get();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium mb-2 text-gray-200">Theme</p>
      <div className="flex gap-2">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-150 ${
              currentTheme === option.value
                ? 'border-purple-400/30 bg-white/[0.10] text-purple-400 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.2),0_0_12px_rgba(167,139,250,0.12)]'
                : 'border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/[0.10] text-gray-300'
            }`}
            aria-pressed={currentTheme === option.value}
            aria-label={`Set theme to ${option.label}`}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span className="text-sm">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {currentTheme === 'system'
          ? 'Theme follows your system preference'
          : `Using ${currentTheme} theme`}
      </p>
    </div>
  );
}
