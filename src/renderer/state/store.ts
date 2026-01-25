/**
 * Global State Store using Legend State
 *
 * Provides signals-based state management with fine-grained reactivity
 * and localStorage persistence for UI preferences.
 */

import { observable } from '@legendapp/state';
import { persistObservable } from '@legendapp/state/persist';
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage';

// Theme type
export type Theme = 'light' | 'dark' | 'system';

// Section type for Activity Bar navigation
export type Section =
  | 'chat'
  | 'explorer'
  | 'search'
  | 'planning'
  | 'export'
  | 'history'
  | 'settings'
  | 'help';

// Open file interface
export interface OpenFile {
  path: string;
  name: string;
  content: string;
}

// UI preferences interface
interface UIPreferences {
  theme: Theme;
  leftPaneWidthPercent: number;
  activeSection: Section;
}

// Session state interface (not persisted)
interface SessionState {
  openFiles: OpenFile[];
  activeFileIndex: number | null;
  projectPath: string | null;
  isOnboarded: boolean;
}

// Complete store interface
interface AppStore {
  ui: UIPreferences;
  session: SessionState;
}

// Default values
const DEFAULT_UI_PREFERENCES: UIPreferences = {
  theme: 'system',
  leftPaneWidthPercent: 40,
  activeSection: 'chat',
};

const DEFAULT_SESSION_STATE: SessionState = {
  openFiles: [],
  activeFileIndex: null,
  projectPath: null,
  isOnboarded: false,
};

// Create the global observable store
export const store$ = observable<AppStore>({
  ui: { ...DEFAULT_UI_PREFERENCES },
  session: { ...DEFAULT_SESSION_STATE },
});

// Persist UI preferences to localStorage
persistObservable(store$.ui, {
  pluginLocal: ObservablePersistLocalStorage,
  local: 'blueprint:ui-preferences',
});

// Helper to get resolved theme (handles 'system' preference)
export function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }
  return theme;
}

// Action: Set theme
export function setTheme(theme: Theme): void {
  store$.ui.theme.set(theme);
}

// Action: Toggle between light and dark (ignores system)
export function toggleTheme(): void {
  const current = store$.ui.theme.get();
  const resolved = getResolvedTheme(current);
  store$.ui.theme.set(resolved === 'dark' ? 'light' : 'dark');
}

// Action: Set active section
export function setActiveSection(section: Section): void {
  store$.ui.activeSection.set(section);
}

// Action: Set left pane width
export function setLeftPaneWidth(percent: number): void {
  store$.ui.leftPaneWidthPercent.set(percent);
}

// Action: Reset left pane width to default
export function resetLeftPaneWidth(): void {
  store$.ui.leftPaneWidthPercent.set(DEFAULT_UI_PREFERENCES.leftPaneWidthPercent);
}

// Action: Open a file
export function openFile(file: OpenFile): void {
  const currentFiles = store$.session.openFiles.get();
  const existingIndex = currentFiles.findIndex((f) => f.path === file.path);

  if (existingIndex !== -1) {
    // File already open, just activate it
    store$.session.activeFileIndex.set(existingIndex);
  } else {
    // Add new file
    store$.session.openFiles.set([...currentFiles, file]);
    store$.session.activeFileIndex.set(currentFiles.length);
  }
}

// Action: Close a file
export function closeFile(index: number): void {
  const currentFiles = store$.session.openFiles.get();
  const currentActiveIndex = store$.session.activeFileIndex.get();

  const newFiles = currentFiles.filter((_, i) => i !== index);
  store$.session.openFiles.set(newFiles);

  if (newFiles.length === 0) {
    store$.session.activeFileIndex.set(null);
  } else if (currentActiveIndex === index) {
    store$.session.activeFileIndex.set(Math.max(0, index - 1));
  } else if (currentActiveIndex !== null && currentActiveIndex > index) {
    store$.session.activeFileIndex.set(currentActiveIndex - 1);
  }
}

// Action: Set active file index
export function setActiveFileIndex(index: number | null): void {
  store$.session.activeFileIndex.set(index);
}

// Action: Set project path
export function setProjectPath(path: string | null): void {
  store$.session.projectPath.set(path);
}

// Action: Set onboarded status
export function setOnboarded(onboarded: boolean): void {
  store$.session.isOnboarded.set(onboarded);
}
