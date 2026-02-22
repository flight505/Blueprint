import { useState, useCallback } from 'react';
import { SkeletonFileTree } from '../skeleton';
import { AnimatedCollapse } from '../animations';
import { FileIcon, ChevronRight, ChevronDown } from '../icons';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileBrowserProps {
  onFileSelect: (filePath: string) => void;
  projectPath?: string | null;
  onProjectPathChange?: (path: string | null) => void;
}

function FileTreeNode({
  node,
  level,
  onFileSelect,
}: {
  node: FileNode;
  level: number;
  onFileSelect: (path: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 1);

  const handleClick = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  };

  const isDirectory = node.type === 'directory';

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-1.5 py-1 px-2 text-left text-sm hover:bg-surface-hover rounded transition-colors group"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        title={node.path}
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-label={`${isDirectory ? 'Folder' : 'File'}: ${node.name}`}
      >
        {isDirectory && (
          <span className="text-fg-muted w-3 flex-shrink-0" aria-hidden="true">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        {!isDirectory && <span className="w-3 flex-shrink-0" />}
        <span className="flex-shrink-0 text-fg-muted group-hover:text-fg-secondary" aria-hidden="true">
          <FileIcon filename={node.name} isDirectory={isDirectory} size="sm" />
        </span>
        <span className="truncate">{node.name}</span>
      </button>
      {isDirectory && node.children && (
        <AnimatedCollapse isOpen={isExpanded}>
          <div role="group">
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        </AnimatedCollapse>
      )}
    </div>
  );
}

export default function FileBrowser({
  onFileSelect,
  projectPath: controlledProjectPath,
  onProjectPathChange,
}: FileBrowserProps) {
  // Support both controlled and uncontrolled modes
  const [internalProjectPath, setInternalProjectPath] = useState<string | null>(null);
  const projectPath = controlledProjectPath !== undefined ? controlledProjectPath : internalProjectPath;

  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFolder = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const selectedPath = await window.electronAPI.selectDirectory();
      if (selectedPath) {
        // Update both internal and external state
        setInternalProjectPath(selectedPath);
        onProjectPathChange?.(selectedPath);
        const tree = await window.electronAPI.readDirectory(selectedPath);
        setFileTree(tree);
      }
    } catch (err) {
      setError('Failed to read directory');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onProjectPathChange]);

  if (!projectPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <p className="text-sm text-fg-muted mb-4 text-center">
          No project folder selected
        </p>
        <button
          onClick={handleSelectFolder}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Loading...' : 'Open Folder'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-border-default flex items-center justify-between">
        <span className="text-xs text-fg-muted truncate flex-1" title={projectPath}>
          {projectPath.split('/').pop()}
        </span>
        <button
          onClick={handleSelectFolder}
          className="text-xs text-blue-500 hover:text-blue-600"
          title="Change folder"
          aria-label="Change project folder"
        >
          Change
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2" role="tree" aria-label="File explorer">
        {error && (
          <p className="px-4 text-sm text-red-500">{error}</p>
        )}
        {isLoading && (
          <SkeletonFileTree items={8} className="px-2" />
        )}
        {!isLoading && fileTree.length === 0 && !error && (
          <p className="px-4 text-sm text-fg-muted">
            Empty folder
          </p>
        )}
        {!isLoading && fileTree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            level={0}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
}
