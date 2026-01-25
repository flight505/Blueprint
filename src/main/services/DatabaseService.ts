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

// Re-export types for consumers
export interface StoredSession {
  id: string;
  projectPath: string;
  conversationHistory: string; // JSON serialized MessageParam[]
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDocument {
  id: string;
  sessionId: string;
  filePath: string;
  content: string;
  embedding: Buffer | null; // 1536-dim float array as blob
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
        model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
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

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_project_path ON sessions(project_path);
      CREATE INDEX IF NOT EXISTS idx_documents_session_id ON documents(session_id);
      CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path);
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
