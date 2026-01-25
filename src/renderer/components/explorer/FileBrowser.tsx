import { useState, useCallback } from 'react';

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

const FILE_ICONS: Record<string, string> = {
  md: '📝',
  mdx: '📝',
  markdown: '📝',
  yml: '⚙️',
  yaml: '⚙️',
  json: '📋',
  ts: '🔷',
  tsx: '🔷',
  js: '🟡',
  jsx: '🟡',
  css: '🎨',
  scss: '🎨',
  html: '🌐',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  gif: '🖼️',
  svg: '🎯',
  pdf: '📕',
  txt: '📄',
};

function getFileIcon(name: string, isDirectory: boolean): string {
  if (isDirectory) return '📁';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📄';
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

  const icon = getFileIcon(node.name, node.type === 'directory');
  const chevron = node.type === 'directory' ? (isExpanded ? '▼' : '▶') : null;

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-1 py-1 px-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        title={node.path}
        aria-expanded={node.type === 'directory' ? isExpanded : undefined}
        aria-label={`${node.type === 'directory' ? 'Folder' : 'File'}: ${node.name}`}
      >
        {node.type === 'directory' && (
          <span className="text-[10px] text-gray-400 w-3" aria-hidden="true">{chevron}</span>
        )}
        {node.type === 'file' && <span className="w-3" />}
        <span aria-hidden="true">{icon}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {node.type === 'directory' && isExpanded && node.children && (
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
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
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1" title={projectPath}>
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
        {fileTree.length === 0 && !error && (
          <p className="px-4 text-sm text-gray-500 dark:text-gray-400">
            Empty folder
          </p>
        )}
        {fileTree.map((node) => (
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
