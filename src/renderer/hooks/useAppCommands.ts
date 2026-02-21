/**
 * useAppCommands - Command palette commands and keyboard shortcuts
 *
 * Defines all command palette commands and registers global keyboard
 * shortcuts, extracted from MainApp for maintainability.
 */
import { useMemo, useEffect } from 'react';
import { Command } from '../components/command';
import { store$, toggleConfidenceIndicators } from '../state/store';
import { setConfidenceIndicatorEnabled } from '../components/editor/extensions';
import type { Section, OpenFile } from './useAppState';
import type { ChatMessageData, AskUserQuestionData } from '../components/chat';

interface UseAppCommandsDeps {
  activeFileId: string | null;
  setActiveSection: (section: Section) => void;
  setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>;
  setActiveFileId: (id: string | null) => void;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessageData[]>>;
  setActiveQuestion: (question: AskUserQuestionData | null) => void;
  setAgentSessionId: (id: string | null) => void;
  handleTabClose: (tabId: string) => void;
  toggleCommandPalette: () => void;
  toggleQuickOpen: () => void;
}

export interface AppCommands {
  commands: Command[];
}

/**
 * Hook that defines command palette commands and registers keyboard shortcuts.
 * Accepts callbacks and state needed by commands as dependencies.
 */
export function useAppCommands({
  activeFileId,
  setActiveSection,
  setOpenFiles,
  setActiveFileId,
  setChatMessages,
  setActiveQuestion,
  setAgentSessionId,
  handleTabClose,
  toggleCommandPalette,
  toggleQuickOpen,
}: UseAppCommandsDeps): AppCommands {
  const commands: Command[] = useMemo(() => [
    // Section navigation
    {
      id: 'nav:chat',
      label: 'Go to Chat',
      shortcut: 'Cmd+1',
      category: 'Navigation',
      action: () => setActiveSection('chat'),
    },
    {
      id: 'nav:explorer',
      label: 'Go to Explorer',
      shortcut: 'Cmd+2',
      category: 'Navigation',
      action: () => setActiveSection('explorer'),
    },
    {
      id: 'nav:search',
      label: 'Go to Search',
      shortcut: 'Cmd+3',
      category: 'Navigation',
      action: () => setActiveSection('search'),
    },
    {
      id: 'nav:context',
      label: 'Go to Context',
      shortcut: 'Cmd+4',
      category: 'Navigation',
      action: () => setActiveSection('context'),
    },
    {
      id: 'nav:planning',
      label: 'Go to Planning',
      shortcut: 'Cmd+5',
      category: 'Navigation',
      action: () => setActiveSection('planning'),
    },
    {
      id: 'nav:image',
      label: 'Go to Image Editor',
      shortcut: 'Cmd+6',
      category: 'Navigation',
      action: () => setActiveSection('image'),
    },
    {
      id: 'nav:export',
      label: 'Go to Export',
      shortcut: 'Cmd+7',
      category: 'Navigation',
      action: () => setActiveSection('export'),
    },
    {
      id: 'nav:history',
      label: 'Go to History',
      shortcut: 'Cmd+8',
      category: 'Navigation',
      action: () => setActiveSection('history'),
    },
    {
      id: 'nav:settings',
      label: 'Open Settings',
      shortcut: 'Cmd+,',
      category: 'Navigation',
      action: () => setActiveSection('settings'),
    },
    {
      id: 'nav:help',
      label: 'Open Help',
      shortcut: 'Cmd+?',
      category: 'Navigation',
      action: () => setActiveSection('help'),
    },
    // View commands
    {
      id: 'view:toggle-theme',
      label: 'Toggle Dark Mode',
      category: 'View',
      action: () => {
        const currentTheme = localStorage.getItem('blueprint:ui')
          ? JSON.parse(localStorage.getItem('blueprint:ui')!).theme
          : 'system';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        const ui = localStorage.getItem('blueprint:ui')
          ? JSON.parse(localStorage.getItem('blueprint:ui')!)
          : {};
        ui.theme = newTheme;
        localStorage.setItem('blueprint:ui', JSON.stringify(ui));
        window.location.reload();
      },
    },
    {
      id: 'view:toggle-confidence',
      label: 'Toggle Confidence Indicators',
      category: 'View',
      action: () => {
        toggleConfidenceIndicators();
        const newState = store$.ui.showConfidenceIndicators.get();
        setConfidenceIndicatorEnabled(newState);
      },
    },
    // File commands
    {
      id: 'file:close-tab',
      label: 'Close Current Tab',
      shortcut: 'Cmd+W',
      category: 'File',
      action: () => {
        if (activeFileId) {
          handleTabClose(activeFileId);
        }
      },
    },
    {
      id: 'file:close-all-tabs',
      label: 'Close All Tabs',
      category: 'File',
      action: () => {
        setOpenFiles([]);
        setActiveFileId(null);
      },
    },
    // Chat commands
    {
      id: 'chat:clear',
      label: 'Clear Chat History',
      category: 'Chat',
      action: () => {
        setChatMessages([]);
        setActiveQuestion(null);
      },
    },
    {
      id: 'chat:new-session',
      label: 'Start New Chat Session',
      category: 'Chat',
      action: () => {
        setChatMessages([]);
        setActiveQuestion(null);
        setAgentSessionId(null);
        setActiveSection('chat');
      },
    },
    // Quick open command
    {
      id: 'file:quick-open',
      label: 'Quick Open File',
      shortcut: 'Cmd+P',
      category: 'File',
      action: () => toggleQuickOpen(),
    },
    // Search command
    {
      id: 'search:in-project',
      label: 'Search in Project',
      shortcut: 'Cmd+Shift+F',
      category: 'Search',
      action: () => setActiveSection('search'),
    },
  ], [activeFileId, setActiveSection, setOpenFiles, setActiveFileId, setChatMessages, setActiveQuestion, setAgentSessionId, handleTabClose, toggleQuickOpen]);

  // Keyboard shortcuts for Activity Bar navigation and Command Palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;

      // Cmd+Shift+P for Command Palette
      if (e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Cmd+Shift+F for Search
      if (e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setActiveSection('search');
        return;
      }

      // Cmd+P for File Quick Open
      if (!e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        toggleQuickOpen();
        return;
      }

      const sectionByNumber: Record<string, Section> = {
        '1': 'chat',
        '2': 'explorer',
        '3': 'search',
        '4': 'context',
        '5': 'planning',
        '6': 'image',
        '7': 'export',
        '8': 'history',
      };

      if (e.key in sectionByNumber) {
        e.preventDefault();
        setActiveSection(sectionByNumber[e.key]);
        return;
      }

      // Cmd+, for Settings
      if (e.key === ',') {
        e.preventDefault();
        setActiveSection('settings');
        return;
      }

      // Cmd+Shift+/ (which produces ?) for Help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setActiveSection('help');
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette, toggleQuickOpen, setActiveSection]);

  return { commands };
}
