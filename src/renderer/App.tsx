import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PermissionsCheck from './components/PermissionsCheck';
import FileBrowser from './components/explorer/FileBrowser';
import ThemeToggle from './components/settings/ThemeToggle';
import ApiKeySettings from './components/settings/ApiKeySettings';
import { ContextPanel } from './components/context';
import { TabBar, TabData } from './components/layout';
import { CommandPalette, useCommandPalette, Command } from './components/command';
import { FileQuickOpen, useFileQuickOpen } from './components/quickopen';
import { useThemeEffect } from './hooks/useTheme';
import { useStreaming } from './hooks/useStreaming';
import { useMermaidRenderer } from './hooks/useMermaid';
import { ChatContainer, ChatMessageData, AskUserQuestionData } from './components/chat';
import { SearchPanel } from './components/search';

const DEFAULT_LEFT_WIDTH_PERCENT = 40;
const MIN_PANE_WIDTH = 300;

type Section = 'chat' | 'explorer' | 'search' | 'context' | 'planning' | 'export' | 'history' | 'settings' | 'help';

const SECTION_CONFIG: Record<Section, { icon: string; label: string; shortcut?: string }> = {
  chat: { icon: '💬', label: 'Chat', shortcut: 'Cmd+1' },
  explorer: { icon: '📁', label: 'Explorer', shortcut: 'Cmd+2' },
  search: { icon: '🔍', label: 'Search', shortcut: 'Cmd+3' },
  context: { icon: '📊', label: 'Context', shortcut: 'Cmd+4' },
  planning: { icon: '📋', label: 'Planning', shortcut: 'Cmd+5' },
  export: { icon: '📥', label: 'Export', shortcut: 'Cmd+6' },
  history: { icon: '🕐', label: 'History', shortcut: 'Cmd+7' },
  settings: { icon: '⚙️', label: 'Settings', shortcut: 'Cmd+,' },
  help: { icon: '❓', label: 'Help', shortcut: 'Cmd+?' },
};

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

  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidthPercent, setLeftWidthPercent] = useState(DEFAULT_LEFT_WIDTH_PERCENT);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('chat');
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<AskUserQuestionData | null>(null);

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
      id: 'view:reset-layout',
      label: 'Reset Pane Layout',
      category: 'View',
      action: () => setLeftWidthPercent(DEFAULT_LEFT_WIDTH_PERCENT),
    },
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const activityBarWidth = 48; // 12 * 4 = 48px (w-12)
    const availableWidth = containerRect.width - activityBarWidth;
    const mouseX = e.clientX - containerRect.left - activityBarWidth;

    // Calculate new width percent, respecting minimums
    const minPercent = (MIN_PANE_WIDTH / availableWidth) * 100;
    const maxPercent = 100 - minPercent;
    const newPercent = Math.max(minPercent, Math.min(maxPercent, (mouseX / availableWidth) * 100));

    setLeftWidthPercent(newPercent);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setLeftWidthPercent(DEFAULT_LEFT_WIDTH_PERCENT);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
      className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    >
      {/* Activity Bar */}
      <aside className="w-12 flex-shrink-0 flex flex-col bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex flex-col items-center pt-4 gap-2">
          {(['chat', 'explorer', 'search', 'context', 'planning', 'export', 'history'] as const).map((section) => (
            <ActivityBarButton
              key={section}
              icon={SECTION_CONFIG[section].icon}
              label={SECTION_CONFIG[section].label}
              shortcut={SECTION_CONFIG[section].shortcut}
              active={activeSection === section}
              onClick={() => setActiveSection(section)}
            />
          ))}
        </div>
        <div className="flex flex-col items-center pb-4 gap-2">
          {(['settings', 'help'] as const).map((section) => (
            <ActivityBarButton
              key={section}
              icon={SECTION_CONFIG[section].icon}
              label={SECTION_CONFIG[section].label}
              shortcut={SECTION_CONFIG[section].shortcut}
              active={activeSection === section}
              onClick={() => setActiveSection(section)}
            />
          ))}
        </div>
      </aside>

      {/* Left Pane */}
      <div
        className="flex flex-col border-r border-gray-200 dark:border-gray-700"
        style={{ width: `${leftWidthPercent}%`, minWidth: MIN_PANE_WIDTH }}
      >
        <header className="h-10 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="text-sm font-medium">{SECTION_CONFIG[activeSection].label}</h2>
        </header>
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
        />
      </div>

      {/* Resize Handle */}
      <div
        className={`w-1 flex-shrink-0 cursor-col-resize transition-colors ${
          isDragging
            ? 'bg-blue-500'
            : 'bg-gray-200 dark:bg-gray-700 hover:bg-blue-400'
        }`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title="Drag to resize, double-click to reset"
      />

      {/* Right Pane - Content */}
      <div
        className="flex-1 flex flex-col"
        style={{ minWidth: MIN_PANE_WIDTH }}
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
            <div className="p-8">
              <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">Blueprint</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  AI-powered project planning with Claude Agent SDK
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <WelcomeCard
                    title="New Project"
                    description="Start a new planning project with the wizard"
                    icon="✨"
                  />
                  <WelcomeCard
                    title="Open Project"
                    description="Open an existing project folder"
                    icon="📂"
                  />
                </div>

                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No recent projects</p>
                </div>
              </div>
            </div>
          ) : (
            <FileContentView file={openFiles.find(f => f.id === activeFileId)!} />
          )}
        </div>
      </div>

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
}: LeftPaneContentProps) {
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
        <ContextPanel
          sessionId={agentSessionId}
          maxTokens={200000}
        />
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
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium mb-2">Export Documents</p>
            <p className="text-xs">Generate PDF, DOCX, or PPTX from your project</p>
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

interface ActivityBarButtonProps {
  icon: string;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
}

function ActivityBarButton({ icon, label, shortcut, active, onClick }: ActivityBarButtonProps) {
  const tooltipText = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
        active
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
      title={tooltipText}
      aria-label={label}
      aria-keyshortcuts={shortcut}
    >
      <span className="text-lg" aria-hidden="true">{icon}</span>
    </button>
  );
}

function FileContentView({ file }: { file: OpenFile }) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isCode = ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'html', 'yml', 'yaml'].includes(ext);

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

function WelcomeCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left">
      <span className="text-2xl mb-2 block">{icon}</span>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  );
}
