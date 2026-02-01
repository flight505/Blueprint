/**
 * RecentProjectsList Component
 *
 * Displays a list of recently opened projects on the welcome screen.
 * Sorted by last-opened date (most recent first).
 * Click to open, right-click to remove from list.
 */

import { useState, useEffect, useCallback } from 'react';

interface RecentProject {
  id: string;
  path: string;
  name: string;
  lastOpenedAt: string;
  createdAt: string;
}

interface RecentProjectsListProps {
  /** Callback when user selects a project to open */
  onOpenProject: (projectPath: string) => void;
  /** Maximum number of projects to display */
  maxProjects?: number;
}

export function RecentProjectsList({
  onOpenProject,
  maxProjects = 10,
}: RecentProjectsListProps) {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    projectId: string;
  } | null>(null);

  // Load recent projects on mount
  const loadProjects = useCallback(async () => {
    try {
      const recentProjects = await window.electronAPI.recentProjectsList(maxProjects);
      setProjects(recentProjects);
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    } finally {
      setLoading(false);
    }
  }, [maxProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Handle project click
  const handleProjectClick = useCallback(
    (projectPath: string) => {
      onOpenProject(projectPath);
    },
    [onOpenProject]
  );

  // Handle right-click context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, projectId: string) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        projectId,
      });
    },
    []
  );

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Remove project from recent list
  const handleRemoveProject = useCallback(
    async (projectId: string) => {
      try {
        const removed = await window.electronAPI.recentProjectsRemove(projectId);
        if (removed) {
          setProjects((prev) => prev.filter((p) => p.id !== projectId));
        }
      } catch (error) {
        console.error('Failed to remove project:', error);
      }
      setContextMenu(null);
    },
    []
  );

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Get short path for display
  const getShortPath = (fullPath: string): string => {
    const parts = fullPath.split('/');
    if (parts.length <= 3) return fullPath;
    return `~/${parts.slice(-2).join('/')}`;
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
        Loading recent projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
        No recent projects
      </div>
    );
  }

  return (
    <div className="relative">
      <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
        Recent Projects
      </h2>

      <ul className="space-y-1" role="list" aria-label="Recent projects">
        {projects.map((project) => (
          <li key={project.id}>
            <button
              onClick={() => handleProjectClick(project.path)}
              onContextMenu={(e) => handleContextMenu(e, project.id)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-800 transition-colors group"
              aria-label={`Open ${project.name}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📁</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {project.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {getShortPath(project.path)}
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {formatRelativeTime(project.lastOpenedAt)}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          role="menu"
          aria-label="Project options"
        >
          <button
            onClick={() => handleRemoveProject(contextMenu.projectId)}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
            role="menuitem"
          >
            Remove from Recent
          </button>
        </div>
      )}
    </div>
  );
}

export default RecentProjectsList;
