import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { AnimatedOverlay } from '../animations';

export interface QuickOpenFile {
  name: string;
  path: string;
  relativePath: string;
}

interface FileQuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (filePath: string) => void;
  projectPath: string | null;
}

export default function FileQuickOpen({
  isOpen,
  onClose,
  onFileSelect,
  projectPath,
}: FileQuickOpenProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<QuickOpenFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(files, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'relativePath', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });
  }, [files]);

  // Get filtered results
  const results = useMemo(() => {
    if (query.trim() === '') {
      // When no query, show all files sorted by name
      return files.slice(0, 50).map(file => ({ item: file }));
    }

    // Use Fuse.js for fuzzy search
    const searchResults = fuse.search(query);
    return searchResults.slice(0, 50);
  }, [query, files, fuse]);

  // Load files when opening and project path changes
  useEffect(() => {
    async function loadFiles() {
      if (!isOpen || !projectPath) {
        setFiles([]);
        return;
      }

      setIsLoading(true);
      try {
        const fileList = await window.electronAPI.listAllFiles(projectPath);
        setFiles(fileList);
      } catch (error) {
        console.error('Failed to load files:', error);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadFiles();
  }, [isOpen, projectPath]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setPreviewContent(null);
      // Focus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Load preview when selection changes
  useEffect(() => {
    async function loadPreview() {
      if (!results[selectedIndex]) {
        setPreviewContent(null);
        return;
      }

      const selectedFile = results[selectedIndex].item;
      try {
        const fileData = await window.electronAPI.readFile(selectedFile.path);
        // Limit preview to first 50 lines
        const lines = fileData.content.split('\n');
        const preview = lines.slice(0, 50).join('\n');
        setPreviewContent(preview + (lines.length > 50 ? '\n...' : ''));
      } catch (error) {
        setPreviewContent('Unable to preview file');
      }
    }

    // Debounce preview loading
    const timeout = setTimeout(loadPreview, 150);
    return () => clearTimeout(timeout);
  }, [results, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(
        '[data-selected="true"]'
      );
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            openFile(results[selectedIndex].item);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onClose]
  );

  const openFile = useCallback(
    (file: QuickOpenFile) => {
      onClose();
      onFileSelect(file.path);
    },
    [onClose, onFileSelect]
  );

  // Get file icon based on extension
  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      md: '📝',
      mdx: '📝',
      ts: '📘',
      tsx: '⚛️',
      js: '📒',
      jsx: '⚛️',
      json: '📋',
      yaml: '⚙️',
      yml: '⚙️',
      css: '🎨',
      scss: '🎨',
      html: '🌐',
      svg: '🖼️',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
      py: '🐍',
      rs: '🦀',
      go: '🐹',
    };
    return iconMap[ext] || '📄';
  };

  return (
    <AnimatedOverlay
      isOpen={isOpen}
      onClose={onClose}
      className="w-[800px] max-w-[90vw] bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
      position="top"
    >
      <div role="combobox" aria-expanded="true" aria-haspopup="listbox" className="flex flex-col h-full">
        {/* Search Input */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={projectPath ? "Type to search files..." : "Open a project folder first"}
            disabled={!projectPath}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Search files"
            aria-controls="file-list"
            aria-autocomplete="list"
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex min-h-0">
          {/* File List */}
          <div
            ref={listRef}
            id="file-list"
            className="w-1/2 overflow-y-auto border-r border-gray-200 dark:border-gray-700"
            role="listbox"
            aria-label="Files"
          >
            {!projectPath ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No project folder open
              </div>
            ) : isLoading ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p>Loading files...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                {query ? 'No matching files found' : 'No files in project'}
              </div>
            ) : (
              results.map((result, index) => (
                <FileItem
                  key={result.item.path}
                  file={result.item}
                  icon={getFileIcon(result.item.name)}
                  isSelected={index === selectedIndex}
                  onClick={() => openFile(result.item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                />
              ))
            )}
          </div>

          {/* Preview Pane */}
          <div className="w-1/2 overflow-hidden flex flex-col">
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              Preview
            </div>
            <div className="flex-1 overflow-auto p-3">
              {previewContent ? (
                <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {previewContent}
                </pre>
              ) : (
                <div className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">
                  {results.length > 0 ? 'Loading preview...' : 'Select a file to preview'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-750">
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              ↑↓
            </kbd>{' '}
            to navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              Enter
            </kbd>{' '}
            to open
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
              Esc
            </kbd>{' '}
            to close
          </span>
        </div>
      </div>
    </AnimatedOverlay>
  );
}

interface FileItemProps {
  file: QuickOpenFile;
  icon: string;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

function FileItem({
  file,
  icon,
  isSelected,
  onClick,
  onMouseEnter,
}: FileItemProps) {
  return (
    <div
      className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900/50'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      data-selected={isSelected}
      role="option"
      aria-selected={isSelected}
    >
      <span className="text-base flex-shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {file.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {file.relativePath}
        </div>
      </div>
    </div>
  );
}

// Hook for managing quick open state
export function useFileQuickOpen() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
