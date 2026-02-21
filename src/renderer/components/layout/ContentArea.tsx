/**
 * ContentArea - Main content area with tab bar and file viewer
 *
 * Renders the tab bar and either the WelcomeScreen (when no files are open)
 * or the active file's content. Extracted from App.tsx for clarity.
 */
import { useMemo } from 'react';
import type { OpenFile } from '../../hooks/useAppState';
import { TabBar, type TabData } from './TabBar';
import { WelcomeScreen } from '../welcome';
import { VirtualizedDocument } from '../document';

const MIN_PANE_WIDTH = 300;

/** Threshold for using virtualized rendering (in lines) */
const VIRTUALIZATION_THRESHOLD = 1000;

export interface ContentAreaProps {
  openFiles: OpenFile[];
  activeFileId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewProject: () => void;
  onOpenProject: (path: string) => Promise<void>;
}

export function ContentArea({
  openFiles,
  activeFileId,
  onTabSelect,
  onTabClose,
  onNewProject,
  onOpenProject,
}: ContentAreaProps) {
  const activeFile = activeFileId ? openFiles.find(f => f.id === activeFileId) : undefined;

  return (
    <main
      id="main-content"
      className="flex-1 flex flex-col"
      style={{ minWidth: MIN_PANE_WIDTH }}
      aria-label="Document content"
    >
      <header className="h-10 flex items-center border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
        <TabBar
          tabs={openFiles.map((file): TabData => ({
            id: file.id,
            label: file.name,
            path: file.path,
            hasUnsavedChanges: file.content !== file.originalContent,
          }))}
          activeTabId={activeFileId}
          onTabSelect={onTabSelect}
          onTabClose={onTabClose}
          enableKeyboardShortcuts={openFiles.length > 0}
        />
      </header>
      <div className="flex-1 overflow-y-auto">
        {openFiles.length === 0 || activeFileId === null || !activeFile ? (
          <WelcomeScreen
            onNewProject={onNewProject}
            onOpenProject={onOpenProject}
          />
        ) : (
          <FileContentView file={activeFile} />
        )}
      </div>
    </main>
  );
}

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
