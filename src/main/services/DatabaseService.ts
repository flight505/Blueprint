/**
 * DatabaseService - SQLite persistence for sessions and documents
 *
 * Uses better-sqlite3 for synchronous database operations in the main process.
 * Stores session history and document embeddings for semantic search.
 */
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import type {
  StoredSession,
  SessionInput,
  StoredPrompt,
  PromptInput,
  RecentProject,
  RecentProjectInput,
  DocumentInput,
  StoredImageEdit,
  ImageEditInput,
} from '../../shared/types';

// Re-export shared types for consumers
export type {
  StoredSession,
  SessionInput,
  StoredPrompt,
  PromptInput,
  RecentProject,
  RecentProjectInput,
  DocumentInput,
  StoredImageEdit,
  ImageEditInput,
} from '../../shared/types';

// StoredDocument uses Buffer (Node.js) rather than ArrayBuffer (shared), so keep local
export interface StoredDocument {
  id: string;
  sessionId: string;
  filePath: string;
  content: string;
  embedding: Buffer | null; // 1536-dim float array as blob
  createdAt: string;
  updatedAt: string;
}

// Checkpoint types for phase save/resume (not in shared types)
export interface StoredCheckpoint {
  id: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  executionState: string; // JSON serialized ProjectExecutionState
  currentPhaseIndex: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckpointInput {
  id: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  executionState: string;
  currentPhaseIndex: number;
  status: string;
}

/**
 * Service for SQLite database operations
 */
export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Store database in app data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'blueprint.db');
  }

  /**
   * Initialize the database and create tables
   */
  initialize(): void {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Create sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_path TEXT NOT NULL,
        conversation_history TEXT NOT NULL DEFAULT '[]',
        model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create documents table with embeddings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Create prompts table for prompt library
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template TEXT NOT NULL,
        description TEXT,
        is_built_in INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create recent_projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recent_projects (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        last_opened_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create checkpoints table for phase save/resume
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_path TEXT NOT NULL,
        project_name TEXT NOT NULL,
        execution_state TEXT NOT NULL,
        current_phase_index INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create image_edits table for Nano Banana Image Editor
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS image_edits (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        image_data TEXT NOT NULL,
        prompt TEXT NOT NULL DEFAULT '',
        response_text TEXT,
        processing_time_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_project_path ON sessions(project_path);
      CREATE INDEX IF NOT EXISTS idx_documents_session_id ON documents(session_id);
      CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
      CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
      CREATE INDEX IF NOT EXISTS idx_recent_projects_last_opened ON recent_projects(last_opened_at);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_project_id ON checkpoints(project_id);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_project_path ON checkpoints(project_path);
      CREATE INDEX IF NOT EXISTS idx_image_edits_project ON image_edits(project_id);
    `);

    console.log(`DatabaseService initialized at ${this.dbPath}`);
  }

  /**
   * Check if the database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ========== Session Operations ==========

  /**
   * Save or update a session
   */
  saveSession(session: SessionInput): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, project_path, conversation_history, model, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        project_path = excluded.project_path,
        conversation_history = excluded.conversation_history,
        model = excluded.model,
        updated_at = datetime('now')
    `);

    stmt.run(
      session.id,
      session.projectPath,
      session.conversationHistory,
      session.model
    );
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): StoredSession | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, project_path as projectPath, conversation_history as conversationHistory,
             model, created_at as createdAt, updated_at as updatedAt
      FROM sessions WHERE id = ?
    `);

    return (stmt.get(sessionId) as StoredSession) || null;
  }

  /**
   * Get session by project path (most recent)
   */
  getSessionByProjectPath(projectPath: string): StoredSession | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, project_path as projectPath, conversation_history as conversationHistory,
             model, created_at as createdAt, updated_at as updatedAt
      FROM sessions WHERE project_path = ?
      ORDER BY updated_at DESC LIMIT 1
    `);

    return (stmt.get(projectPath) as StoredSession) || null;
  }

  /**
   * List all sessions
   */
  listSessions(): StoredSession[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, project_path as projectPath, conversation_history as conversationHistory,
             model, created_at as createdAt, updated_at as updatedAt
      FROM sessions ORDER BY updated_at DESC
    `);

    return stmt.all() as StoredSession[];
  }

  /**
   * Delete a session and its documents
   */
  deleteSession(sessionId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    // Documents will be deleted via CASCADE
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = stmt.run(sessionId);
    return result.changes > 0;
  }

  // ========== Document Operations ==========

  /**
   * Save or update a document
   */
  saveDocument(doc: DocumentInput): void {
    if (!this.db) throw new Error('Database not initialized');

    // Convert embedding array to Buffer if provided
    let embeddingBlob: Buffer | null = null;
    if (doc.embedding && doc.embedding.length > 0) {
      // Store as Float32Array buffer (1536 dimensions * 4 bytes = 6144 bytes)
      const floatArray = new Float32Array(doc.embedding);
      embeddingBlob = Buffer.from(floatArray.buffer);
    }

    const stmt = this.db.prepare(`
      INSERT INTO documents (id, session_id, file_path, content, embedding, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        file_path = excluded.file_path,
        content = excluded.content,
        embedding = excluded.embedding,
        updated_at = datetime('now')
    `);

    stmt.run(
      doc.id,
      doc.sessionId,
      doc.filePath,
      doc.content,
      embeddingBlob
    );
  }

  /**
   * Get a document by ID
   */
  getDocument(docId: string): StoredDocument | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, session_id as sessionId, file_path as filePath, content,
             embedding, created_at as createdAt, updated_at as updatedAt
      FROM documents WHERE id = ?
    `);

    return (stmt.get(docId) as StoredDocument) || null;
  }

  /**
   * Get all documents for a session
   */
  getDocumentsBySession(sessionId: string): StoredDocument[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, session_id as sessionId, file_path as filePath, content,
             embedding, created_at as createdAt, updated_at as updatedAt
      FROM documents WHERE session_id = ?
    `);

    return stmt.all(sessionId) as StoredDocument[];
  }

  /**
   * Delete a document
   */
  deleteDocument(docId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM documents WHERE id = ?');
    const result = stmt.run(docId);
    return result.changes > 0;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * This is a pure JavaScript implementation for semantic search
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Search documents by semantic similarity
   * Returns documents sorted by relevance to the query embedding
   */
  searchDocumentsByEmbedding(
    sessionId: string,
    queryEmbedding: number[],
    limit: number = 10
  ): Array<StoredDocument & { similarity: number }> {
    if (!this.db) throw new Error('Database not initialized');

    // Get all documents with embeddings for the session
    const docs = this.getDocumentsBySession(sessionId).filter(
      (doc) => doc.embedding !== null
    );

    if (docs.length === 0) return [];

    const queryVector = new Float32Array(queryEmbedding);

    // Calculate similarity for each document
    const results = docs.map((doc) => {
      const docVector = new Float32Array(
        doc.embedding!.buffer,
        doc.embedding!.byteOffset,
        doc.embedding!.byteLength / 4
      );
      const similarity = this.cosineSimilarity(queryVector, docVector);
      return { ...doc, similarity };
    });

    // Sort by similarity descending and take top N
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // ========== Prompt Operations ==========

  /**
   * Save or update a prompt
   */
  savePrompt(prompt: PromptInput): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO prompts (id, name, template, description, is_built_in, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        template = excluded.template,
        description = excluded.description,
        is_built_in = excluded.is_built_in,
        updated_at = datetime('now')
    `);

    stmt.run(
      prompt.id,
      prompt.name,
      prompt.template,
      prompt.description || null,
      prompt.isBuiltIn ? 1 : 0
    );
  }

  /**
   * Get a prompt by ID
   */
  getPrompt(promptId: string): StoredPrompt | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, name, template, description, is_built_in as isBuiltIn,
             created_at as createdAt, updated_at as updatedAt
      FROM prompts WHERE id = ?
    `);

    const result = stmt.get(promptId) as (Omit<StoredPrompt, 'isBuiltIn'> & { isBuiltIn: number }) | undefined;
    if (!result) return null;

    return {
      ...result,
      isBuiltIn: result.isBuiltIn === 1,
    };
  }

  /**
   * List all custom prompts (not built-in)
   */
  listPrompts(): StoredPrompt[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, name, template, description, is_built_in as isBuiltIn,
             created_at as createdAt, updated_at as updatedAt
      FROM prompts WHERE is_built_in = 0
      ORDER BY name ASC
    `);

    const results = stmt.all() as Array<Omit<StoredPrompt, 'isBuiltIn'> & { isBuiltIn: number }>;
    return results.map((r) => ({
      ...r,
      isBuiltIn: r.isBuiltIn === 1,
    }));
  }

  /**
   * Delete a prompt
   */
  deletePrompt(promptId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM prompts WHERE id = ? AND is_built_in = 0');
    const result = stmt.run(promptId);
    return result.changes > 0;
  }

  // ========== Recent Projects Operations ==========

  /**
   * Add or update a recent project
   * If project with same path exists, updates last_opened_at
   */
  addRecentProject(input: RecentProjectInput): RecentProject {
    if (!this.db) throw new Error('Database not initialized');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Use INSERT OR REPLACE to handle unique constraint on path
    const stmt = this.db.prepare(`
      INSERT INTO recent_projects (id, path, name, last_opened_at, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        name = excluded.name,
        last_opened_at = excluded.last_opened_at
    `);

    stmt.run(id, input.path, input.name, now, now);

    // Return the project (either newly created or existing one with updated timestamp)
    return this.getRecentProjectByPath(input.path)!;
  }

  /**
   * Get a recent project by path
   */
  getRecentProjectByPath(path: string): RecentProject | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, path, name, last_opened_at as lastOpenedAt, created_at as createdAt
      FROM recent_projects WHERE path = ?
    `);

    return (stmt.get(path) as RecentProject) || null;
  }

  /**
   * List all recent projects sorted by last opened date (most recent first)
   */
  listRecentProjects(limit: number = 10): RecentProject[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, path, name, last_opened_at as lastOpenedAt, created_at as createdAt
      FROM recent_projects
      ORDER BY last_opened_at DESC
      LIMIT ?
    `);

    return stmt.all(limit) as RecentProject[];
  }

  /**
   * Remove a recent project by ID
   */
  removeRecentProject(projectId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM recent_projects WHERE id = ?');
    const result = stmt.run(projectId);
    return result.changes > 0;
  }

  /**
   * Remove a recent project by path
   */
  removeRecentProjectByPath(path: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM recent_projects WHERE path = ?');
    const result = stmt.run(path);
    return result.changes > 0;
  }

  /**
   * Clear all recent projects
   */
  clearRecentProjects(): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM recent_projects');
    const result = stmt.run();
    return result.changes;
  }

  // ========== Checkpoint Operations ==========

  /**
   * Save or update a checkpoint
   */
  saveCheckpoint(checkpoint: CheckpointInput): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO checkpoints (id, project_id, project_path, project_name, execution_state, current_phase_index, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        project_path = excluded.project_path,
        project_name = excluded.project_name,
        execution_state = excluded.execution_state,
        current_phase_index = excluded.current_phase_index,
        status = excluded.status,
        updated_at = datetime('now')
    `);

    stmt.run(
      checkpoint.id,
      checkpoint.projectId,
      checkpoint.projectPath,
      checkpoint.projectName,
      checkpoint.executionState,
      checkpoint.currentPhaseIndex,
      checkpoint.status
    );
  }

  /**
   * Get a checkpoint by ID
   */
  getCheckpoint(checkpointId: string): StoredCheckpoint | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, project_id as projectId, project_path as projectPath, project_name as projectName,
             execution_state as executionState, current_phase_index as currentPhaseIndex,
             status, created_at as createdAt, updated_at as updatedAt
      FROM checkpoints WHERE id = ?
    `);

    return (stmt.get(checkpointId) as StoredCheckpoint) || null;
  }

  /**
   * Get the most recent checkpoint for a project by project ID
   */
  getCheckpointByProjectId(projectId: string): StoredCheckpoint | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, project_id as projectId, project_path as projectPath, project_name as projectName,
             execution_state as executionState, current_phase_index as currentPhaseIndex,
             status, created_at as createdAt, updated_at as updatedAt
      FROM checkpoints WHERE project_id = ?
      ORDER BY updated_at DESC LIMIT 1
    `);

    return (stmt.get(projectId) as StoredCheckpoint) || null;
  }

  /**
   * Get the most recent checkpoint for a project by project path
   */
  getCheckpointByProjectPath(projectPath: string): StoredCheckpoint | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, project_id as projectId, project_path as projectPath, project_name as projectName,
             execution_state as executionState, current_phase_index as currentPhaseIndex,
             status, created_at as createdAt, updated_at as updatedAt
      FROM checkpoints WHERE project_path = ?
      ORDER BY updated_at DESC LIMIT 1
    `);

    return (stmt.get(projectPath) as StoredCheckpoint) || null;
  }

  /**
   * List all checkpoints, optionally filtered by status
   */
  listCheckpoints(status?: string): StoredCheckpoint[] {
    if (!this.db) throw new Error('Database not initialized');

    let sql = `
      SELECT id, project_id as projectId, project_path as projectPath, project_name as projectName,
             execution_state as executionState, current_phase_index as currentPhaseIndex,
             status, created_at as createdAt, updated_at as updatedAt
      FROM checkpoints
    `;

    if (status) {
      sql += ` WHERE status = ? ORDER BY updated_at DESC`;
      const stmt = this.db.prepare(sql);
      return stmt.all(status) as StoredCheckpoint[];
    }

    sql += ` ORDER BY updated_at DESC`;
    const stmt = this.db.prepare(sql);
    return stmt.all() as StoredCheckpoint[];
  }

  /**
   * Delete a checkpoint
   */
  deleteCheckpoint(checkpointId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM checkpoints WHERE id = ?');
    const result = stmt.run(checkpointId);
    return result.changes > 0;
  }

  /**
   * Delete all checkpoints for a project
   */
  deleteCheckpointsByProjectId(projectId: string): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM checkpoints WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  }

  /**
   * Delete all checkpoints for a project by path
   */
  deleteCheckpointsByProjectPath(projectPath: string): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM checkpoints WHERE project_path = ?');
    const result = stmt.run(projectPath);
    return result.changes;
  }

  // ========== Image Edit Operations (Nano Banana) ==========

  /**
   * Save an image edit to history
   */
  saveImageEdit(edit: ImageEditInput): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO image_edits (id, project_id, image_data, prompt, response_text, processing_time_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      edit.id,
      edit.projectId,
      edit.imageData,
      edit.prompt,
      edit.responseText || null,
      edit.processingTimeMs || 0
    );
  }

  /**
   * Get all image edits for a project, ordered by creation time (oldest first)
   */
  getImageEditsByProject(projectId: string): StoredImageEdit[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, project_id as projectId, image_data as imageData, prompt,
             response_text as responseText, processing_time_ms as processingTimeMs,
             created_at as createdAt
      FROM image_edits WHERE project_id = ?
      ORDER BY created_at ASC
    `);

    return stmt.all(projectId) as StoredImageEdit[];
  }

  /**
   * Get a single image edit by ID
   */
  getImageEdit(editId: string): StoredImageEdit | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, project_id as projectId, image_data as imageData, prompt,
             response_text as responseText, processing_time_ms as processingTimeMs,
             created_at as createdAt
      FROM image_edits WHERE id = ?
    `);

    return (stmt.get(editId) as StoredImageEdit) || null;
  }

  /**
   * Delete an image edit by ID
   */
  deleteImageEdit(editId: string): boolean {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM image_edits WHERE id = ?');
    const result = stmt.run(editId);
    return result.changes > 0;
  }

  /**
   * Delete all image edits after a specific edit (for revert functionality)
   * Keeps the specified edit and all edits before it
   */
  deleteImageEditsAfter(projectId: string, editId: string): number {
    if (!this.db) throw new Error('Database not initialized');

    // Get the creation timestamp of the target edit
    const targetEdit = this.getImageEdit(editId);
    if (!targetEdit) return 0;

    const stmt = this.db.prepare(`
      DELETE FROM image_edits
      WHERE project_id = ? AND created_at > ?
    `);

    const result = stmt.run(projectId, targetEdit.createdAt);
    return result.changes;
  }

  /**
   * Clear all image edits for a project
   */
  clearImageEdits(projectId: string): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM image_edits WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  }

  /**
   * Get the count of image edits for a project
   */
  getImageEditCount(projectId: string): number {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM image_edits WHERE project_id = ?')
      .get(projectId) as { count: number };

    return result.count;
  }

  /**
   * Get database statistics
   */
  getStats(): { sessionCount: number; documentCount: number; dbSize: number } {
    if (!this.db) throw new Error('Database not initialized');

    const sessionCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as {
        count: number;
      }
    ).count;
    const documentCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM documents').get() as {
        count: number;
      }
    ).count;

    // Get database file size
    let dbSize = 0;
    try {
      const stats = fs.statSync(this.dbPath);
      dbSize = stats.size;
    } catch {
      // File might not exist yet
    }

    return { sessionCount, documentCount, dbSize };
  }
}

// Singleton instance for the main process
export const databaseService = new DatabaseService();
