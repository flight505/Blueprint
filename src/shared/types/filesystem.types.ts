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

export interface QuickOpenFile {
  name: string;
  path: string;
  relativePath: string;
}

export interface SearchMatch {
  line: number;
  column: number;
  content: string;
  match: string;
}

export interface SearchResult {
  filePath: string;
  relativePath: string;
  matches: SearchMatch[];
}

export interface SearchOptions {
  useRegex?: boolean;
  caseSensitive?: boolean;
  maxResults?: number;
}
