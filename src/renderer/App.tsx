import { useState, useEffect, useRef, useCallback } from 'react';
import PermissionsCheck from './components/PermissionsCheck';
import { ContentArea, PanelArea, ResizeHandle } from './components/layout';
import { GlassSidebar, type NavItem } from './components/sidebar';
import { CommandPalette, useCommandPalette } from './components/command';
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
import { useAppState, type Section } from './hooks/useAppState';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useAppCommands } from './hooks/useAppCommands';
import { ChatMessageData } from './components/chat';
import { ExportModal } from './components/export';
import { NewProjectWizard, ProjectConfig } from './components/wizard';
import { NAV_ICONS } from './components/icons';

// Section labels for panel titles
const SECTION_LABELS: Record<Section, string> = {
  chat: 'Chat',
  explorer: 'Explorer',
  search: 'Search',
  context: 'Context',
  planning: 'Planning',
  image: 'Image Editor',
  export: 'Export',
  history: 'History',
  settings: 'Settings',
  help: 'Help',
};

// Convert section config to NavItem array for GlassSidebar
const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'chat', icon: <NAV_ICONS.chat size={18} strokeWidth={1.25} />, label: 'Chat', shortcut: '⌘1' },
  { id: 'explorer', icon: <NAV_ICONS.explorer size={18} strokeWidth={1.25} />, label: 'Explorer', shortcut: '⌘2' },
  { id: 'search', icon: <NAV_ICONS.search size={18} strokeWidth={1.25} />, label: 'Search', shortcut: '⌘3' },
  { id: 'context', icon: <NAV_ICONS.context size={18} strokeWidth={1.25} />, label: 'Context', shortcut: '⌘4' },
  { id: 'planning', icon: <NAV_ICONS.planning size={18} strokeWidth={1.25} />, label: 'Planning', shortcut: '⌘5' },
  { id: 'image', icon: <NAV_ICONS.image size={18} strokeWidth={1.25} />, label: 'Image', shortcut: '⌘6' },
  { id: 'export', icon: <NAV_ICONS.export size={18} strokeWidth={1.25} />, label: 'Export', shortcut: '⌘7' },
  { id: 'history', icon: <NAV_ICONS.history size={18} strokeWidth={1.25} />, label: 'History', shortcut: '⌘8' },
];

const UTILITY_NAV_ITEMS: NavItem[] = [
  { id: 'settings', icon: <NAV_ICONS.settings size={18} strokeWidth={1.25} />, label: 'Settings', shortcut: '⌘,' },
  { id: 'help', icon: <NAV_ICONS.help size={18} strokeWidth={1.25} />, label: 'Help', shortcut: '⌘?' },
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

  // Resizable panel width with localStorage persistence
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('blueprint:panelWidth');
    return saved ? parseInt(saved, 10) : 320;
  });

  const handlePanelWidthChange = useCallback((width: number) => {
    setPanelWidth(width);
    localStorage.setItem('blueprint:panelWidth', String(width));
  }, []);

  // Centralized app state
  const state = useAppState();
  const {
    activeSection, setActiveSection,
    openFiles, setOpenFiles,
    activeFileId, setActiveFileId,
    chatMessages, setChatMessages,
    isChatLoading, setIsChatLoading,
    agentSessionId, setAgentSessionId,
    activeQuestion, setActiveQuestion,
    isExportModalOpen, setIsExportModalOpen,
    exportSections,
    showNewProjectWizard, setShowNewProjectWizard,
    projectPath, setProjectPath,
  } = state;

  // File/tab navigation handlers
  const { handleFileSelect, handleTabSelect, handleTabClose } = useAppNavigation({
    openFiles,
    setOpenFiles,
    activeFileId,
    setActiveFileId,
  });

  // Streaming hook for real-time AI responses
  const {
    streamingContent,
    isStreaming,
    sendMessage: sendStreamingMessage,
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

  // Command palette commands and keyboard shortcuts
  const { commands } = useAppCommands({
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
  });

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen w-screen overflow-hidden bg-[#1f2335] text-gray-100"
    >
      {/* macOS Title Bar - Draggable region for window movement */}
      <div className="title-bar-drag-region h-9 flex-shrink-0 flex items-center bg-white/[0.02] backdrop-blur-sm border-b border-white/[0.06]">
        {/* Left spacing for traffic lights (macOS) - approximately 72px */}
        <div className="w-[72px] flex-shrink-0" />
        <div className="flex-1 text-center text-xs text-gray-400 font-medium">
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
          panelTitle={SECTION_LABELS[activeSection]}
          panelWidth={panelWidth}
          panelContent={
            <PanelArea
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

        {/* Drag handle to resize panel */}
        <ResizeHandle
          currentWidth={panelWidth}
          onWidthChange={handlePanelWidthChange}
        />

        {/* Right Pane - Content */}
        <ContentArea
          openFiles={openFiles}
          activeFileId={activeFileId}
          onTabSelect={handleTabSelect}
          onTabClose={handleTabClose}
          onNewProject={() => setShowNewProjectWizard(true)}
          onOpenProject={handleOpenProject}
        />

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
