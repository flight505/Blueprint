export interface StoredSession {
  id: string;
  projectPath: string;
  conversationHistory: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDocument {
  id: string;
  sessionId: string;
  filePath: string;
  content: string;
  embedding: ArrayBuffer | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInput {
  id: string;
  projectPath: string;
  conversationHistory: string;
  model: string;
}

export interface DocumentInput {
  id: string;
  sessionId: string;
  filePath: string;
  content: string;
  embedding?: number[];
}

export interface DbStats {
  sessionCount: number;
  documentCount: number;
  dbSize: number;
}

export interface RecentProject {
  id: string;
  path: string;
  name: string;
  lastOpenedAt: string;
  createdAt: string;
}

export interface RecentProjectInput {
  path: string;
  name: string;
}

export interface StoredPrompt {
  id: string;
  name: string;
  template: string;
  description: string | null;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptInput {
  id: string;
  name: string;
  template: string;
  description?: string;
  isBuiltIn: boolean;
}

export interface StoredImageEdit {
  id: string;
  projectId: string;
  imageData: string;
  prompt: string;
  responseText: string | null;
  processingTimeMs: number;
  createdAt: string;
}

export interface ImageEditInput {
  id: string;
  projectId: string;
  imageData: string;
  prompt: string;
  responseText?: string | null;
  processingTimeMs?: number;
}
