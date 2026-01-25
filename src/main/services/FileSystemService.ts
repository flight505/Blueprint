import * as fs from 'node:fs';
import * as path from 'node:path';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
}

const IGNORED_PATTERNS = [
  'node_modules',
  '.git',
  '.DS_Store',
  'dist',
  '.vite',
  '.next',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.env',
];

function shouldIgnore(name: string): boolean {
  return IGNORED_PATTERNS.some(pattern =>
    name === pattern || name.startsWith('.')
  );
}

export async function readDirectory(dirPath: string): Promise<FileNode[]> {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (shouldIgnore(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const node: FileNode = {
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
      };

      if (entry.isDirectory()) {
        node.children = await readDirectory(fullPath);
      }

      nodes.push(node);
    }

    // Sort: directories first, then alphabetically
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

export async function readFileContent(filePath: string): Promise<FileContent> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return {
    path: filePath,
    content,
    encoding: 'utf-8',
  };
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().slice(1);
}

export interface QuickOpenFile {
  name: string;
  path: string;
  relativePath: string;
}

/**
 * List all files in a directory recursively (flat list for quick open)
 * Returns files sorted by name, limited to common document/code file types
 */
export async function listAllFiles(basePath: string): Promise<QuickOpenFile[]> {
  const files: QuickOpenFile[] = [];

  async function walk(dirPath: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (shouldIgnore(entry.name)) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          // Get path relative to basePath
          const relativePath = path.relative(basePath, fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            relativePath,
          });
        }
      }
    } catch (error) {
      console.error(`Error walking directory ${dirPath}:`, error);
    }
  }

  await walk(basePath);

  // Sort alphabetically by name
  return files.sort((a, b) => a.name.localeCompare(b.name));
}
