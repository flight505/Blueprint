import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PermissionsCheck from './components/PermissionsCheck';
import FileBrowser from './components/explorer/FileBrowser';
import ThemeToggle from './components/settings/ThemeToggle';
import ApiKeySettings from './components/settings/ApiKeySettings';
import { ContextPanel } from './components/context';
import { CitationVerificationPanel } from './components/citation';
import { ReviewQueue } from './components/review';
import { HallucinationDashboard } from './components/dashboard';
import { TabBar, TabData } from './components/layout';
import { GlassSidebar, GlassSidebarSection, type NavItem } from './components/sidebar';
import { CommandPalette, useCommandPalette, Command } from './components/command';
import { FileQuickOpen, useFileQuickOpen } from './components/quickopen';
import { InlineEditOverlay } from './components/inline-edit';
import { DiffPreview } from './components/diff';
import { AnimatedModal } from './components/animations';
import { DiagramEditModal } from './components/diagram';
import { ConfidenceTooltip } from './components/confidence';
import { useThemeEffect } from './hooks/useTheme';
import { useStreaming } from './hooks/useStreaming';
import { useMermaidRenderer } from './hooks/useMermaid';
import { useInlineEdit } from './hooks/useInlineEdit';
import { useDiffPreview } from './hooks/useDiffPreview';
import { useDiagramEdit } from './hooks/useDiagramEdit';
import { ChatContainer, ChatMessageData, AskUserQuestionData } from './components/chat';
import { SearchPanel } from './components/search';
import { ExportModal, ExportSection } from './components/export';
import { WelcomeScreen } from './components/welcome';
import { NewProjectWizard, ProjectConfig } from './components/wizard';
import { VirtualizedDocument } from './components/document';
import { store$, toggleConfidenceIndicators } from './state/store';
import { setConfidenceIndicatorEnabled } from './components/editor/extensions';

const MIN_PANE_WIDTH = 300;

type Section = 'chat' | 'explorer' | 'search' | 'context' | 'planning' | 'export' | 'history' | 'settings' | 'help';

const SECTION_CONFIG: Record<Section, { icon: string; label: string; shortcut?: string }> = {
  chat: { icon: '💬', label: 'Chat', shortcut: '⌘1' },
  explorer: { icon: '📁', label: 'Explorer', shortcut: '⌘2' },
  search: { icon: '🔍', label: 'Search', shortcut: '⌘3' },
  context: { icon: '📊', label: 'Context', shortcut: '⌘4' },
  planning: { icon: '📋', label: 'Planning', shortcut: '⌘5' },
  export: { icon: '📥', label: 'Export', shortcut: '⌘6' },
  history: { icon: '🕐', label: 'History', shortcut: '⌘7' },
  settings: { icon: '⚙️', label: 'Settings', shortcut: '⌘,' },
  help: { icon: '❓', label: 'Help', shortcut: '⌘?' },
};

// Convert section config to NavItem array for GlassSidebar
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'chat', icon: '💬', label: 'Chat', shortcut: '⌘1' },
  { id: 'explorer', icon: '📁', label: 'Explorer', shortcut: '⌘2' },
  { id: 'search', icon: '🔍', label: 'Search', shortcut: '⌘3' },
  { id: 'context', icon: '📊', label: 'Context', shortcut: '⌘4' },
  { id: 'planning', icon: '📋', label: 'Planning', shortcut: '⌘5' },
  { id: 'export', icon: '📥', label: 'Export', shortcut: '⌘6' },
  { id: 'history', icon: '🕐', label: 'History', shortcut: '⌘7' },
];

const UTILITY_NAV_ITEMS: NavItem[] = [
  { id: 'settings', icon: '⚙️', label: 'Settings', shortcut: '⌘,' },
  { id: 'help', icon: '❓', label: 'Help', shortcut: '⌘?' },
];

type OnboardingStep = 'permissions' | 'complete';

export default function App() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem('blueprint:onboarded');
    if (completed === 'true') {
      setIsOnboarded(true);
    } else {
      setIsOnboarded(false);
      setOnboardingStep('permissions');
    }
  }, []);

  function completeOnboarding() {
    localStorage.setItem('blueprint:onboarded', 'true');
    setIsOnboarded(true);
    setOnboardingStep('complete');
  }

  function skipOnboarding() {
    // Allow skipping but mark as incomplete for next launch
    setIsOnboarded(true);
  }

  // Loading state
  if (isOnboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Onboarding flow
  if (!isOnboarded && onboardingStep === 'permissions') {
    return (
      <PermissionsCheck
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
    );
  }

  // Main app
  return <MainApp />;
}

interface OpenFile {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string; // Track original content for unsaved detection
}

function MainApp() {
  // Apply theme class to document element
  useThemeEffect();

  // Set up global Mermaid renderer for Tiptap extension events
  useMermaidRenderer();

  // Set up inline edit overlay for AI-powered text editing
  const {
    state: inlineEditState,
    close: closeInlineEdit,
    handleSubmit: handleInlineEditSubmit,
  } = useInlineEdit();

  // Set up diff preview for reviewing AI edits
  const {
    state: diffPreviewState,
    acceptEdit: acceptDiffEdit,
    rejectEdit: rejectDiffEdit,
  } = useDiffPreview();

  // Set up diagram edit modal for editing Mermaid diagrams
  const {
    state: diagramEditState,
    close: closeDiagramEdit,
    save: saveDiagramEdit,
  } = useDiagramEdit();

  const containerRef = useRef<HTMLDivElement>(null);
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
  const [exportSections, setExportSections] = useState<ExportSection[]>([]);

  // New project wizard state (will be used by US-042)
  const [showNewProjectWizard, setShowNewProjectWizard] = useState(false);

  // Streaming hook for real-time AI responses
  const {
    streamingContent,
    isStreaming,
    sendMessage: sendStreamingMessage,
    initializeAgent,
    createSession,
  } = useStreaming({
    onStreamComplete: (completedMessage) => {
      // Convert completed streaming message to chat message
      const assistantMessage: ChatMessageData = {
        id: completedMessage.id,
        role: 'assistant',
        content: completedMessage.content,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      setIsChatLoading(false);
    },
    onError: (error) => {
      console.error('Streaming error:', error);
      setIsChatLoading(false);
      // Could show error toast here
    },
  });

  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    // If we have an active session, use streaming
    if (agentSessionId) {
      try {
        await sendStreamingMessage(agentSessionId, content);
      } catch (error) {
        console.error('Failed to send message:', error);
        setIsChatLoading(false);
        // Fallback to demo response on error
        fallbackDemoResponse(content);
      }
    } else {
      // Demo mode - simulate response when no agent session
      fallbackDemoResponse(content);
    }
  }, [agentSessionId, sendStreamingMessage]);

  // Fallback demo response when agent is not connected
  const fallbackDemoResponse = useCallback((content: string) => {
    setTimeout(() => {
      const assistantMessage: ChatMessageData = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `This is a **demo response** to: "${content}"\n\nTo enable real AI responses:\n1. Configure your API key in Settings\n2. The app will use Claude Agent SDK for streaming responses\n\n\`\`\`typescript\n// Streaming is now integrated!\nconst { streamingContent, isStreaming } = useStreaming();\n\`\`\``,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      setIsChatLoading(false);
    }, 1000);
  }, []);

  // Handler for answering agent questions
  const handleAnswerQuestion = useCallback((_questionId: string, answer: string | string[]) => {
    // Clear the active question
    setActiveQuestion(null);

    // Add the answer as a user message
    const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: answerText,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    // In a real implementation, this would send the answer to the agent
    // For now, simulate a response
    if (agentSessionId) {
      sendStreamingMessage(agentSessionId, answerText).catch((error) => {
        console.error('Failed to send answer:', error);
        setIsChatLoading(false);
        fallbackDemoResponse(answerText);
      });
    } else {
      fallbackDemoResponse(answerText);
    }
  }, [agentSessionId, sendStreamingMessage, fallbackDemoResponse]);

  // Project path state (for file browser and quick open)
  const [projectPath, setProjectPath] = useState<string | null>(null);

  // Handle opening a project (sets path and saves to recent projects)
  const handleOpenProject = useCallback(async (path: string) => {
    setProjectPath(path);
    setActiveSection('explorer');

    // Extract project name from path
    const name = path.split('/').pop() || path;

    // Add to recent projects (async, don't block UI)
    try {
      await window.electronAPI.recentProjectsAdd({ path, name });
    } catch (error) {
      console.error('Failed to save to recent projects:', error);
    }
  }, []);

  // Handle creating a new project from wizard
  const handleCreateProject = useCallback(async (config: ProjectConfig) => {
    try {
      // Create project directory
      const projectDir = `${config.path}/${config.name.replace(/\s+/g, '-').toLowerCase()}`;

      // Create project configuration file
      const projectConfig = {
        name: config.name,
        researchMode: config.researchMode,
        phases: config.phases,
        createdAt: new Date().toISOString(),
      };

      // Save project config (this will create the directory and file)
      await window.electronAPI.writeFile(
        `${projectDir}/blueprint.json`,
        JSON.stringify(projectConfig, null, 2)
      );

      // Open the project
      await handleOpenProject(projectDir);

      // Close wizard
      setShowNewProjectWizard(false);

      // Switch to planning section
      setActiveSection('planning');
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error; // Re-throw so wizard can show error
    }
  }, [handleOpenProject]);

  // Command palette state
  const {
    isOpen: isCommandPaletteOpen,
    close: closeCommandPalette,
    toggle: toggleCommandPalette,
    recentCommandIds,
    recordCommandUsage,
  } = useCommandPalette();

  // File quick open state
  const {
    isOpen: isQuickOpenOpen,
    close: closeQuickOpen,
    toggle: toggleQuickOpen,
  } = useFileQuickOpen();

  // Define available commands
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
      id: 'nav:export',
      label: 'Go to Export',
      shortcut: 'Cmd+6',
      category: 'Navigation',
      action: () => setActiveSection('export'),
    },
    {
      id: 'nav:history',
      label: 'Go to History',
      shortcut: 'Cmd+7',
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
        // Toggle theme via Legend State store
        const currentTheme = localStorage.getItem('blueprint:ui')
          ? JSON.parse(localStorage.getItem('blueprint:ui')!).theme
          : 'system';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        const ui = localStorage.getItem('blueprint:ui')
          ? JSON.parse(localStorage.getItem('blueprint:ui')!)
          : {};
        ui.theme = newTheme;
        localStorage.setItem('blueprint:ui', JSON.stringify(ui));
        // Force refresh to apply theme
        window.location.reload();
      },
    },
    {
      id: 'view:toggle-confidence',
      label: 'Toggle Confidence Indicators',
      category: 'View',
      action: () => {
        // Toggle confidence indicators
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
  ], [activeFileId, toggleQuickOpen]);

  const handleFileSelect = useCallback(async (filePath: string) => {
    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === filePath);
    if (existingFile) {
      setActiveFileId(existingFile.id);
      return;
    }

    try {
      const fileData = await window.electronAPI.readFile(filePath);
      const fileName = filePath.split('/').pop() || 'Untitled';
      const newFileId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newFile: OpenFile = {
        id: newFileId,
        path: filePath,
        name: fileName,
        content: fileData.content,
        originalContent: fileData.content,
      };
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(newFileId);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [openFiles]);

  // Tab selection handler
  const handleTabSelect = useCallback((tabId: string) => {
    setActiveFileId(tabId);
  }, []);

  // Tab close handler
  const handleTabClose = useCallback((tabId: string) => {
    const tabIndex = openFiles.findIndex(f => f.id === tabId);
    if (tabIndex === -1) return;

    const newFiles = openFiles.filter(f => f.id !== tabId);
    setOpenFiles(newFiles);

    // Update active file if needed
    if (activeFileId === tabId) {
      if (newFiles.length > 0) {
        // Select the previous tab, or the first one if closing the first tab
        const newActiveIndex = Math.max(0, tabIndex - 1);
        setActiveFileId(newFiles[newActiveIndex].id);
      } else {
        setActiveFileId(null);
      }
    }
  }, [openFiles, activeFileId]);

  // Keyboard shortcuts for Activity Bar navigation and Command Palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (!e.metaKey && !e.ctrlKey) return;

      // Cmd+Shift+P for Command Palette (check first, before other handlers)
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
        '6': 'export',
        '7': 'history',
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
  }, [toggleCommandPalette, toggleQuickOpen]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    >
      {/* macOS Title Bar - Draggable region for window movement */}
      <div className="title-bar-drag-region h-9 flex-shrink-0 flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Left spacing for traffic lights (macOS) - approximately 72px */}
        <div className="w-[72px] flex-shrink-0" />
        {/* Optional: App title or window controls could go here */}
        <div className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
          Blueprint
        </div>
        {/* Right spacing for balance */}
        <div className="w-[72px] flex-shrink-0" />
      </div>

      {/* Main content area below title bar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Skip link for keyboard navigation - WCAG 2.2 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
        >
          Skip to main content
        </a>

        {/* Glass Sidebar - Rail + Panel */}
        <GlassSidebar
          mode="expanded"
          items={PRIMARY_NAV_ITEMS}
          utilityItems={UTILITY_NAV_ITEMS}
          activeId={activeSection}
          onItemSelect={(id) => setActiveSection(id as Section)}
          panelTitle={SECTION_CONFIG[activeSection].label}
          panelWidth={320}
          panelContent={
            <LeftPaneContent
              section={activeSection}
              onFileSelect={handleFileSelect}
              chatMessages={chatMessages}
              isChatLoading={isChatLoading}
              onSendMessage={handleSendMessage}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              activeQuestion={activeQuestion}
              onAnswerQuestion={handleAnswerQuestion}
              agentSessionId={agentSessionId}
              projectPath={projectPath}
              onProjectPathChange={setProjectPath}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              activeDocumentPath={activeFileId ? openFiles.find(f => f.id === activeFileId)?.path ?? null : null}
              onScrollToCitation={(citationNumber, line) => {
                // Scroll to citation in the active document (basic implementation)
                console.log(`Scroll to citation [${citationNumber}] at line ${line ?? 'unknown'}`);
                // Future: implement actual scrolling via editor reference
              }}
            />
          }
          version="1.0.0"
        />


      {/* Right Pane - Content */}
      <main
        id="main-content"
        className="flex-1 flex flex-col"
        style={{ minWidth: MIN_PANE_WIDTH }}
        aria-label="Document content"
      >
        <header className="h-10 flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <TabBar
            tabs={openFiles.map((file): TabData => ({
              id: file.id,
              label: file.name,
              path: file.path,
              hasUnsavedChanges: file.content !== file.originalContent,
            }))}
            activeTabId={activeFileId}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            enableKeyboardShortcuts={openFiles.length > 0}
          />
        </header>
        <div className="flex-1 overflow-y-auto">
          {openFiles.length === 0 || activeFileId === null ? (
            <WelcomeScreen
              onNewProject={() => setShowNewProjectWizard(true)}
              onOpenProject={handleOpenProject}
            />
          ) : (
            <FileContentView file={openFiles.find(f => f.id === activeFileId)!} />
          )}
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette
        commands={commands}
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        recentCommandIds={recentCommandIds}
        onCommandExecuted={recordCommandUsage}
      />

      {/* File Quick Open */}
      <FileQuickOpen
        isOpen={isQuickOpenOpen}
        onClose={closeQuickOpen}
        onFileSelect={handleFileSelect}
        projectPath={projectPath}
      />

      {/* Inline Edit Overlay for AI-powered text editing */}
      <InlineEditOverlay
        isOpen={inlineEditState.isOpen}
        position={inlineEditState.position}
        selectedText={inlineEditState.selectedText}
        selectionRange={inlineEditState.selectionRange}
        onSubmit={handleInlineEditSubmit}
        onClose={closeInlineEdit}
        isGenerating={inlineEditState.isGenerating}
      />

      {/* Diff Preview for reviewing AI edits (with animation) */}
      <AnimatedModal
        isOpen={diffPreviewState.isOpen}
        onClose={rejectDiffEdit}
        className="max-w-3xl w-full mx-4"
      >
        <DiffPreview
          original={diffPreviewState.original}
          proposed={diffPreviewState.proposed}
          onAccept={acceptDiffEdit}
          onReject={rejectDiffEdit}
          mode="side-by-side"
        />
      </AnimatedModal>

      {/* Diagram Edit Modal for editing Mermaid diagrams */}
      <DiagramEditModal
        isOpen={diagramEditState.isOpen}
        initialCode={diagramEditState.code}
        nodePos={diagramEditState.nodePos}
        onSave={saveDiagramEdit}
        onClose={closeDiagramEdit}
      />

      {/* Export Modal for generating PDF, DOCX, PPTX */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sections={exportSections}
        projectPath={projectPath}
        projectTitle="Blueprint Project"
      />

        {/* New Project Wizard */}
        <NewProjectWizard
          isOpen={showNewProjectWizard}
          onClose={() => setShowNewProjectWizard(false)}
          onCreateProject={handleCreateProject}
        />

        {/* Confidence Indicator Tooltip (global, positioned via events) */}
        <ConfidenceTooltip />
      </div>
    </div>
  );
}

interface LeftPaneContentProps {
  section: Section;
  onFileSelect: (path: string) => void;
  chatMessages: ChatMessageData[];
  isChatLoading: boolean;
  onSendMessage: (content: string) => void;
  streamingContent?: string;
  isStreaming?: boolean;
  activeQuestion?: AskUserQuestionData | null;
  onAnswerQuestion?: (questionId: string, answer: string | string[]) => void;
  agentSessionId?: string | null;
  projectPath?: string | null;
  onProjectPathChange?: (path: string | null) => void;
  onOpenExportModal?: () => void;
  activeDocumentPath?: string | null;
  onScrollToCitation?: (citationNumber: number, line?: number, offset?: number) => void;
}

function LeftPaneContent({
  section,
  onFileSelect,
  chatMessages,
  isChatLoading,
  onSendMessage,
  streamingContent,
  isStreaming,
  activeQuestion,
  onAnswerQuestion,
  agentSessionId,
  projectPath,
  onProjectPathChange,
  onOpenExportModal,
  activeDocumentPath,
  onScrollToCitation,
}: LeftPaneContentProps) {
  // Context section tab state
  const [contextTab, setContextTab] = useState<'context' | 'citations' | 'review' | 'dashboard'>('context');

  switch (section) {
    case 'chat':
      return (
        <ChatContainer
          messages={chatMessages}
          onSendMessage={onSendMessage}
          isLoading={isChatLoading}
          placeholder="Type a message to start planning..."
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          activeQuestion={activeQuestion}
          onAnswerQuestion={onAnswerQuestion}
        />
      );
    case 'explorer':
      return (
        <FileBrowser
          onFileSelect={onFileSelect}
          projectPath={projectPath}
          onProjectPathChange={onProjectPathChange}
        />
      );
    case 'search':
      return (
        <SearchPanel
          projectPath={projectPath ?? null}
          onFileSelect={onFileSelect}
        />
      );
    case 'context':
      return (
        <div className="flex flex-col h-full">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => setContextTab('context')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                contextTab === 'context'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-selected={contextTab === 'context'}
              role="tab"
            >
              Context
            </button>
            <button
              onClick={() => setContextTab('citations')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                contextTab === 'citations'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-selected={contextTab === 'citations'}
              role="tab"
            >
              Citations
            </button>
            <button
              onClick={() => setContextTab('review')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                contextTab === 'review'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-selected={contextTab === 'review'}
              role="tab"
            >
              Review
            </button>
            <button
              onClick={() => setContextTab('dashboard')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                contextTab === 'dashboard'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-selected={contextTab === 'dashboard'}
              role="tab"
            >
              Dashboard
            </button>
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {contextTab === 'context' ? (
              <ContextPanel
                sessionId={agentSessionId}
                maxTokens={200000}
              />
            ) : contextTab === 'citations' ? (
              <CitationVerificationPanel
                documentPath={activeDocumentPath ?? null}
                onScrollToCitation={onScrollToCitation}
              />
            ) : contextTab === 'review' ? (
              <ReviewQueue
                documentPath={activeDocumentPath ?? null}
              />
            ) : (
              <HallucinationDashboard
                projectPath={projectPath}
              />
            )}
          </div>
        </div>
      );
    case 'planning':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium mb-2">Planning Dashboard</p>
            <p className="text-xs">Create a new project to see planning phases</p>
          </div>
        </div>
      );
    case 'export':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="text-gray-500 dark:text-gray-400">
              <p className="text-sm font-medium mb-2">Export Documents</p>
              <p className="text-xs mb-4">Generate PDF, DOCX, or PPTX from your project</p>
            </div>

            {/* Export format options */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={onOpenExportModal}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">PDF Document</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Professional format with precise layout</p>
                  </div>
                </div>
              </button>

              <button
                onClick={onOpenExportModal}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Word Document</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Editable DOCX for collaboration</p>
                  </div>
                </div>
              </button>

              <button
                onClick={onOpenExportModal}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">PowerPoint</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Presentation slides for meetings</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    case 'history':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium mb-2">Session History</p>
            <p className="text-xs">No previous sessions</p>
          </div>
        </div>
      );
    case 'settings':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <ApiKeySettings />
            <hr className="border-gray-200 dark:border-gray-700" />
            <ThemeToggle />
          </div>
        </div>
      );
    case 'help':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Keyboard Shortcuts</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Cmd+1-7 - Switch sections</p>
                <p>Cmd+Shift+P - Command palette</p>
                <p>Cmd+Shift+F - Search in project</p>
                <p>Cmd+P - Quick open file</p>
                <p>Cmd+K - Inline edit</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Documentation</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">View docs at github.com/flight505/Blueprint</p>
            </div>
          </div>
        </div>
      );
  }
}


/** Threshold for using virtualized rendering (in lines) */
const VIRTUALIZATION_THRESHOLD = 1000;

function FileContentView({ file }: { file: OpenFile }) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isCode = ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'html', 'yml', 'yaml', 'py', 'rb', 'go', 'rs', 'md'].includes(ext);

  // Count lines to determine if we need virtualization
  const lineCount = useMemo(() => file.content.split('\n').length, [file.content]);
  const useVirtualization = lineCount >= VIRTUALIZATION_THRESHOLD;

  // Use virtualized document for large files (1000+ lines)
  if (useVirtualization) {
    return (
      <div className="h-full">
        <VirtualizedDocument
          content={file.content}
          fileName={file.name}
          showLineNumbers={true}
        />
      </div>
    );
  }

  // Standard rendering for smaller files
  return (
    <div className="p-4 h-full">
      <pre
        className={`text-sm font-mono overflow-auto h-full p-4 rounded-lg ${
          isCode
            ? 'bg-gray-100 dark:bg-gray-800'
            : 'bg-white dark:bg-gray-900'
        }`}
      >
        <code>{file.content}</code>
      </pre>
    </div>
  );
}

