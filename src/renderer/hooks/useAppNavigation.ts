/**
 * useAppNavigation - File and tab navigation handlers
 *
 * Manages file opening, tab selection, and tab closing logic,
 * extracted from MainApp for clarity and testability.
 */
import { useCallback } from 'react';
import type { OpenFile } from './useAppState';

interface UseAppNavigationDeps {
  openFiles: OpenFile[];
  setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
}

export interface AppNavigation {
  handleFileSelect: (filePath: string) => Promise<void>;
  handleTabSelect: (tabId: string) => void;
  handleTabClose: (tabId: string) => void;
}

/**
 * Hook that provides file/tab navigation callbacks.
 * Accepts the relevant state slices as dependencies.
 */
export function useAppNavigation({
  openFiles,
  setOpenFiles,
  activeFileId,
  setActiveFileId,
}: UseAppNavigationDeps): AppNavigation {
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
  }, [openFiles, setOpenFiles, setActiveFileId]);

  const handleTabSelect = useCallback((tabId: string) => {
    setActiveFileId(tabId);
  }, [setActiveFileId]);

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
  }, [openFiles, activeFileId, setOpenFiles, setActiveFileId]);

  return { handleFileSelect, handleTabSelect, handleTabClose };
}
