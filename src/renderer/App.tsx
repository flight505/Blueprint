import { useState, useEffect, useRef, useCallback } from 'react';
import PermissionsCheck from './components/PermissionsCheck';

const DEFAULT_LEFT_WIDTH_PERCENT = 40;
const MIN_PANE_WIDTH = 300;

type Section = 'chat' | 'explorer' | 'search' | 'planning' | 'export' | 'history' | 'settings' | 'help';

const SECTION_CONFIG: Record<Section, { icon: string; label: string; shortcut?: string }> = {
  chat: { icon: '💬', label: 'Chat', shortcut: 'Cmd+1' },
  explorer: { icon: '📁', label: 'Explorer', shortcut: 'Cmd+2' },
  search: { icon: '🔍', label: 'Search', shortcut: 'Cmd+3' },
  planning: { icon: '📋', label: 'Planning', shortcut: 'Cmd+4' },
  export: { icon: '📥', label: 'Export', shortcut: 'Cmd+5' },
  history: { icon: '🕐', label: 'History', shortcut: 'Cmd+6' },
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

function MainApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidthPercent, setLeftWidthPercent] = useState(DEFAULT_LEFT_WIDTH_PERCENT);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('chat');

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

  // Keyboard shortcuts for Activity Bar navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (!e.metaKey && !e.ctrlKey) return;

      const sectionByNumber: Record<string, Section> = {
        '1': 'chat',
        '2': 'explorer',
        '3': 'search',
        '4': 'planning',
        '5': 'export',
        '6': 'history',
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
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
    >
      {/* Activity Bar */}
      <aside className="w-12 flex-shrink-0 flex flex-col bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex flex-col items-center pt-4 gap-2">
          {(['chat', 'explorer', 'search', 'planning', 'export', 'history'] as const).map((section) => (
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
        <LeftPaneContent section={activeSection} />
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
        <header className="h-10 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-1">
            <Tab label="Welcome" active />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
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
      </div>
    </div>
  );
}

function LeftPaneContent({ section }: { section: Section }) {
  switch (section) {
    case 'chat':
      return (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p className="text-lg mb-2">Welcome to Blueprint</p>
              <p className="text-sm">Start a new project or open an existing one</p>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <input
              type="text"
              placeholder="Type a message..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </>
      );
    case 'explorer':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium mb-2">File Explorer</p>
            <p className="text-xs">Open a project to browse files</p>
          </div>
        </div>
      );
    case 'search':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <input
            type="text"
            placeholder="Search in project..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">Enter a search term to find content across all files</p>
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
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">API Keys</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure your API keys for Claude, OpenRouter, and Gemini</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Theme</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Light / Dark / System</p>
            </div>
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
                <p>Cmd+1-6 - Switch sections</p>
                <p>Cmd+Shift+P - Command palette</p>
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

function Tab({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`px-3 py-1 text-sm rounded-t-lg transition-colors ${
        active
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-t border-x border-gray-200 dark:border-gray-700'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
      }`}
    >
      {label}
    </button>
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
