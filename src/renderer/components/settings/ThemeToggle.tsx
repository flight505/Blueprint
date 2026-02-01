/**
 * Theme Toggle Component
 *
 * Provides UI for switching between light, dark, and system themes.
 * Uses Legend State store for theme persistence.
 */

import { store$, setTheme, type Theme } from '../../state/store';

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export default function ThemeToggle() {
  const currentTheme = store$.ui.theme.get();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium mb-2">Theme</p>
      <div className="flex gap-2">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              currentTheme === option.value
                ? 'border-blue-500 bg-blue-900/30 text-blue-400'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
            aria-pressed={currentTheme === option.value}
            aria-label={`Set theme to ${option.label}`}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span className="text-sm">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {currentTheme === 'system'
          ? 'Theme follows your system preference'
          : `Using ${currentTheme} theme`}
      </p>
    </div>
  );
}
