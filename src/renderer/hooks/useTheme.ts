/**
 * Theme hook for applying dark mode class to document element
 *
 * Listens to theme changes from the Legend State store and
 * applies/removes the 'dark' class on document.documentElement
 */

import { useEffect } from 'react';
import { store$, getResolvedTheme, type Theme } from '../state/store';

/**
 * Hook that syncs theme state with document class.
 * Should be called once at the root of the app.
 */
export function useThemeEffect(): void {
  useEffect(() => {
    // Initial application of theme
    applyTheme(store$.ui.theme.get());

    // Subscribe to theme changes
    const unsubscribe = store$.ui.theme.onChange((change) => {
      applyTheme(change.value);
    });

    // Listen to system preference changes when theme is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const currentTheme = store$.ui.theme.get();
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      unsubscribe();
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);
}

function applyTheme(theme: Theme): void {
  const resolved = getResolvedTheme(theme);
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
