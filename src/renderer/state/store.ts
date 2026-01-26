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
  /** Whether confidence indicators are shown in editor */
  showConfidenceIndicators: boolean;
}

// Streaming message state
export interface StreamingMessage {
  id: string;
  sessionId: string;
  content: string;
  isStreaming: boolean;
  startedAt: Date;
}

// Question option for AskUserQuestion
export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

// Active question from agent
export interface ActiveQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
  timestamp: Date;
}

// Text selection state for editor
export interface TextSelection {
  /** The selected text content */
  text: string;
  /** Start position (ProseMirror position) */
  from: number;
  /** End position (ProseMirror position) */
  to: number;
  /** Whether there is an active selection */
  hasSelection: boolean;
  /** Length of selection in characters */
  length: number;
}

// Session state interface (not persisted)
interface SessionState {
  openFiles: OpenFile[];
  activeFileIndex: number | null;
  projectPath: string | null;
  isOnboarded: boolean;
  // Streaming state for real-time AI responses
  streamingMessage: StreamingMessage | null;
  // Active agent session ID
  agentSessionId: string | null;
  // Active question from agent awaiting user response
  activeQuestion: ActiveQuestion | null;
  // Current text selection in editor
  textSelection: TextSelection | null;
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
  showConfidenceIndicators: false,
};

const DEFAULT_SESSION_STATE: SessionState = {
  openFiles: [],
  activeFileIndex: null,
  projectPath: null,
  isOnboarded: false,
  streamingMessage: null,
  agentSessionId: null,
  activeQuestion: null,
  textSelection: null,
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

// Action: Set agent session ID
export function setAgentSessionId(sessionId: string | null): void {
  store$.session.agentSessionId.set(sessionId);
}

// Action: Start streaming message
export function startStreamingMessage(id: string, sessionId: string): void {
  store$.session.streamingMessage.set({
    id,
    sessionId,
    content: '',
    isStreaming: true,
    startedAt: new Date(),
  });
}

// Action: Append content to streaming message (O(1) operation via observable)
export function appendStreamingContent(chunk: string): void {
  const current = store$.session.streamingMessage.get();
  if (current && current.isStreaming) {
    store$.session.streamingMessage.content.set(current.content + chunk);
  }
}

// Action: Complete streaming message
export function completeStreamingMessage(): StreamingMessage | null {
  const current = store$.session.streamingMessage.get();
  if (current) {
    store$.session.streamingMessage.isStreaming.set(false);
    return { ...current, isStreaming: false };
  }
  return null;
}

// Action: Clear streaming message
export function clearStreamingMessage(): void {
  store$.session.streamingMessage.set(null);
}

// Action: Set active question from agent
export function setActiveQuestion(question: ActiveQuestion | null): void {
  store$.session.activeQuestion.set(question);
}

// Action: Clear active question (after user responds)
export function clearActiveQuestion(): void {
  store$.session.activeQuestion.set(null);
}

// Action: Set text selection
export function setTextSelection(selection: TextSelection | null): void {
  store$.session.textSelection.set(selection);
}

// Action: Clear text selection
export function clearTextSelection(): void {
  store$.session.textSelection.set(null);
}

// Action: Toggle confidence indicators visibility
export function toggleConfidenceIndicators(): void {
  const current = store$.ui.showConfidenceIndicators.get();
  store$.ui.showConfidenceIndicators.set(!current);
}

// Action: Set confidence indicators visibility
export function setShowConfidenceIndicators(show: boolean): void {
  store$.ui.showConfidenceIndicators.set(show);
}
