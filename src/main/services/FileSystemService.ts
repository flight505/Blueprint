import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FileNode, FileContent, QuickOpenFile, SearchMatch, SearchResult } from '../../shared/types';

// Re-export for consumers
export type { FileNode, FileContent, QuickOpenFile, SearchMatch, SearchResult } from '../../shared/types';

// Security: Track allowed base directories
let allowedBasePaths: Set<string> = new Set();

/**
 * Set the allowed base paths for file operations.
 * All file operations will be restricted to these directories.
 */
export function setAllowedBasePaths(paths: string[]): void {
  allowedBasePaths = new Set(paths.map(p => path.resolve(p)));
}

/**
 * Add an allowed base path for file operations.
 */
export function addAllowedBasePath(basePath: string): void {
  allowedBasePaths.add(path.resolve(basePath));
}

/**
 * Clear all allowed base paths.
 */
export function clearAllowedBasePaths(): void {
  allowedBasePaths.clear();
}

/**
 * Security: Validate that a file path is within an allowed directory.
 * Prevents path traversal attacks (e.g., ../../etc/passwd)
 */
export function isPathAllowed(filePath: string): boolean {
  if (allowedBasePaths.size === 0) {
    // If no base paths set, allow nothing by default (secure by default)
    return false;
  }

  const resolvedPath = path.resolve(filePath);

  // Check if the resolved path starts with any allowed base path
  for (const basePath of allowedBasePaths) {
    // Ensure we check against the directory boundary (path.sep)
    // to prevent /allowed/path matching /allowed/pathevil
    if (resolvedPath === basePath || resolvedPath.startsWith(basePath + path.sep)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a path and throw if not allowed.
 * Use this at the entry point of all file operations.
 */
export function validatePath(filePath: string, operation: string): void {
  if (!isPathAllowed(filePath)) {
    const resolvedPath = path.resolve(filePath);
    throw new Error(
      `Security: Path "${resolvedPath}" is not within allowed directories for operation "${operation}". ` +
      `Allowed paths: ${Array.from(allowedBasePaths).join(', ') || 'none'}`
    );
  }
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
  // Security: Validate the path before reading
  validatePath(dirPath, 'readDirectory');

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
  // Security: Validate the path before reading
  validatePath(filePath, 'readFileContent');

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

/**
 * List all files in a directory recursively (flat list for quick open)
 * Returns files sorted by name, limited to common document/code file types
 */
export async function listAllFiles(basePath: string): Promise<QuickOpenFile[]> {
  // Security: Validate the base path before listing
  validatePath(basePath, 'listAllFiles');

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

// File extensions to include in search (text-based files)
const SEARCHABLE_EXTENSIONS = [
  'md', 'txt', 'json', 'yaml', 'yml', 'toml',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
  'html', 'css', 'scss', 'sass', 'less',
  'xml', 'svg', 'sh', 'bash', 'zsh',
  'sql', 'graphql', 'prisma',
  'env', 'gitignore', 'dockerignore', 'editorconfig',
];

function isSearchableFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  // Also search files with no extension (like Makefile, Dockerfile)
  if (ext === '') {
    const name = path.basename(filePath);
    return ['Makefile', 'Dockerfile', 'LICENSE', 'README', 'CHANGELOG'].includes(name);
  }
  return SEARCHABLE_EXTENSIONS.includes(ext);
}

/**
 * Search for content across all files in a directory
 * Returns results grouped by file with line numbers and context
 */
export async function searchInFiles(
  basePath: string,
  query: string,
  options: {
    useRegex?: boolean;
    caseSensitive?: boolean;
    maxResults?: number;
  } = {}
): Promise<SearchResult[]> {
  // Security: Validate the base path before searching
  validatePath(basePath, 'searchInFiles');

  const { useRegex = false, caseSensitive = false, maxResults = 500 } = options;
  const results: SearchResult[] = [];
  let totalMatches = 0;

  // Create the search pattern
  let pattern: RegExp;
  try {
    if (useRegex) {
      pattern = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } else {
      // Escape special regex characters for literal search
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    }
  } catch (error) {
    console.error('Invalid search pattern:', error);
    return [];
  }

  async function searchFile(filePath: string, relativePath: string): Promise<void> {
    if (totalMatches >= maxResults) return;
    if (!isSearchableFile(filePath)) return;

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const matches: SearchMatch[] = [];

      for (let i = 0; i < lines.length && totalMatches < maxResults; i++) {
        const line = lines[i];
        // Reset the regex for each line
        pattern.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = pattern.exec(line)) !== null && totalMatches < maxResults) {
          matches.push({
            line: i + 1, // 1-indexed line numbers
            column: match.index + 1, // 1-indexed column
            content: line.trim().slice(0, 200), // Truncate long lines
            match: match[0],
          });
          totalMatches++;

          // Prevent infinite loop for zero-width matches
          if (match[0].length === 0) break;
        }
      }

      if (matches.length > 0) {
        results.push({
          filePath,
          relativePath,
          matches,
        });
      }
    } catch (error) {
      // Skip files that can't be read (binary, permission issues, etc.)
      // Silently ignore to avoid cluttering results
    }
  }

  async function walk(dirPath: string): Promise<void> {
    if (totalMatches >= maxResults) return;

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (totalMatches >= maxResults) break;
        if (shouldIgnore(entry.name)) continue;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const relativePath = path.relative(basePath, fullPath);
          await searchFile(fullPath, relativePath);
        }
      }
    } catch (error) {
      console.error(`Error walking directory ${dirPath}:`, error);
    }
  }

  await walk(basePath);

  // Sort results by number of matches (most matches first)
  return results.sort((a, b) => b.matches.length - a.matches.length);
}

/**
 * Write content to a file, creating parent directories if needed
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  // Security: Validate the path before writing
  validatePath(filePath, 'writeFile');

  // Ensure parent directory exists
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });

  // Write file
  await fs.promises.writeFile(filePath, content, 'utf-8');
}
