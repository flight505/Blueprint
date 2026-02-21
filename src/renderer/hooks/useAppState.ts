/**
 * useAppState - Centralized state management for the main app
 *
 * Extracts all useState declarations from MainApp into a single hook,
 * keeping the App.tsx component focused on layout and composition.
 */
import { useState, useCallback } from 'react';
import { ChatMessageData, AskUserQuestionData } from '../components/chat';
import { ExportSection } from '../components/export';

export type Section = 'chat' | 'explorer' | 'search' | 'context' | 'planning' | 'image' | 'export' | 'history' | 'settings' | 'help';

export interface OpenFile {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
}

export interface AppState {
  // Navigation
  activeSection: Section;
  setActiveSection: (section: Section) => void;

  // File management
  openFiles: OpenFile[];
  setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;

  // Chat
  chatMessages: ChatMessageData[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessageData[]>>;
  isChatLoading: boolean;
  setIsChatLoading: (loading: boolean) => void;
  agentSessionId: string | null;
  setAgentSessionId: (id: string | null) => void;
  activeQuestion: AskUserQuestionData | null;
  setActiveQuestion: (question: AskUserQuestionData | null) => void;

  // Export
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  exportSections: ExportSection[];

  // Project wizard
  showNewProjectWizard: boolean;
  setShowNewProjectWizard: (show: boolean) => void;

  // Project path
  projectPath: string | null;
  setProjectPath: (path: string | null) => void;
}

/**
 * Hook that manages all top-level application state.
 * Returns state values and their setters as a flat object.
 */
export function useAppState(): AppState {
  const [activeSection, setActiveSection] = useState<Section>('chat');
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<AskUserQuestionData | null>(null);

  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSections] = useState<ExportSection[]>([]);

  // New project wizard state
  const [showNewProjectWizard, setShowNewProjectWizard] = useState(false);

  // Project path state
  const [projectPath, setProjectPath] = useState<string | null>(null);

  // Stable setActiveSection that accepts the union type
  const stableSetActiveSection = useCallback((section: Section) => {
    setActiveSection(section);
  }, []);

  return {
    activeSection,
    setActiveSection: stableSetActiveSection,
    openFiles,
    setOpenFiles,
    activeFileId,
    setActiveFileId,
    chatMessages,
    setChatMessages,
    isChatLoading,
    setIsChatLoading,
    agentSessionId,
    setAgentSessionId,
    activeQuestion,
    setActiveQuestion,
    isExportModalOpen,
    setIsExportModalOpen,
    exportSections,
    showNewProjectWizard,
    setShowNewProjectWizard,
    projectPath,
    setProjectPath,
  };
}
