/**
 * WelcomeScreen Component
 *
 * Displays a welcome screen when no project is open.
 * Provides buttons to start a new project (wizard) or open an existing project.
 * Shows recent projects list with right-click to remove.
 */

import { useCallback } from 'react';
import { RecentProjectsList } from './RecentProjectsList';

interface WelcomeScreenProps {
  /** Callback when user wants to start a new project (opens wizard) */
  onNewProject: () => void;
  /** Callback when user opens a project folder */
  onOpenProject: (projectPath: string) => void;
}

export function WelcomeScreen({ onNewProject, onOpenProject }: WelcomeScreenProps) {
  const handleOpenProject = useCallback(async () => {
    try {
      const result = await window.electronAPI.selectDirectory();
      if (result) {
        onOpenProject(result);
      }
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  }, [onOpenProject]);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="max-w-2xl mx-auto flex-1">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-100">
            Blueprint
          </h1>
          <p className="text-gray-300">
            AI-powered project planning with Claude Agent SDK
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <WelcomeCard
            title="New Project"
            description="Start a new planning project with the wizard"
            icon="✨"
            onClick={onNewProject}
          />
          <WelcomeCard
            title="Open Project"
            description="Open an existing project folder"
            icon="📂"
            onClick={handleOpenProject}
          />
        </div>

        {/* Recent Projects */}
        <div className="mb-8">
          <RecentProjectsList onOpenProject={onOpenProject} maxProjects={5} />
        </div>

        {/* Getting Started */}
        <div className="bg-white/[0.04] backdrop-blur-sm rounded-lg p-6 mb-8 border border-white/[0.06]">
          <h2 className="text-lg font-semibold mb-4 text-gray-100">
            Getting Started
          </h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center text-xs font-medium">
                1
              </span>
              <p>Configure your API keys in Settings (Cmd+,)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center text-xs font-medium">
                2
              </span>
              <p>Create a new project or open an existing one</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center text-xs font-medium">
                3
              </span>
              <p>Use Chat (Cmd+1) to interact with the AI planning assistant</p>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-2">Keyboard Shortcuts</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Command Palette</span>
              <span className="text-gray-400">Cmd+Shift+P</span>
            </div>
            <div className="flex justify-between">
              <span>Quick Open</span>
              <span className="text-gray-400">Cmd+P</span>
            </div>
            <div className="flex justify-between">
              <span>Search in Project</span>
              <span className="text-gray-400">Cmd+Shift+F</span>
            </div>
            <div className="flex justify-between">
              <span>Settings</span>
              <span className="text-gray-400">Cmd+,</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WelcomeCardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}

function WelcomeCard({ title, description, icon, onClick }: WelcomeCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.07] hover:border-purple-400/30 hover:shadow-[0_0_16px_rgba(167,139,250,0.15)] transition-all duration-200 text-left group"
    >
      <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <h3 className="font-medium mb-1 text-gray-100">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </button>
  );
}

export default WelcomeScreen;
