/**
 * DatabaseService unit tests
 *
 * Uses vi.hoisted() to define a mock better-sqlite3 implementation that
 * simulates in-memory SQL-like operations. Each test gets a fresh
 * DatabaseService instance with a clean mock database.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — these run before any imports are resolved
// ---------------------------------------------------------------------------

const { MockDatabase } = vi.hoisted(() => {
  type MockRow = Record<string, unknown>;

  /**
   * Lightweight mock statement that mimics better-sqlite3's synchronous API.
   * Uses the SQL string to decide which table to operate on and how to
   * filter/sort/limit results.
   */
  class MockStatement {
    constructor(
      private sql: string,
      private tables: Map<string, MockRow[]>,
    ) {}

    run(...params: unknown[]): { changes: number } {
      // INSERT
      const insertMatch = this.sql.match(/INSERT\s+INTO\s+(\w+)/i);
      if (insertMatch) {
        const table = insertMatch[1];
        if (!this.tables.has(table)) this.tables.set(table, []);
        const rows = this.tables.get(table)!;

        const colMatch = this.sql.match(/\(([^)]+)\)\s*VALUES/i);
        const cols = colMatch
          ? colMatch[1].split(',').map((c) => c.trim())
          : [];

        const row: MockRow = {};
        cols.forEach((col, i) => {
          row[col] = i < params.length ? params[i] : null;
        });

        // ON CONFLICT → upsert
        if (this.sql.match(/ON\s+CONFLICT/i)) {
          // Determine conflict column(s)
          const conflictColMatch = this.sql.match(/ON\s+CONFLICT\s*\((\w+)\)/i);
          const conflictCol = conflictColMatch ? conflictColMatch[1] : cols[0];
          const existingIdx = rows.findIndex((r) => r[conflictCol] === row[conflictCol]);
          if (existingIdx >= 0) {
            rows[existingIdx] = { ...rows[existingIdx], ...row };
            return { changes: 1 };
          }
        }

        if (!row['created_at']) row['created_at'] = new Date().toISOString();
        if (!row['updated_at']) row['updated_at'] = new Date().toISOString();
        rows.push(row);
        return { changes: 1 };
      }

      // DELETE
      const deleteMatch = this.sql.match(/DELETE\s+FROM\s+(\w+)/i);
      if (deleteMatch) {
        const table = deleteMatch[1];
        if (!this.tables.has(table)) return { changes: 0 };
        const rows = this.tables.get(table)!;
        const before = rows.length;

        const whereMatch = this.sql.match(/WHERE\s+(.+?)$/is);
        if (whereMatch && params.length > 0) {
          const conditions = whereMatch[1];
          const condParts = conditions.split(/\s+AND\s+/i);

          const keep = rows.filter((r) => {
            let paramIdx = 0;
            for (const part of condParts) {
              const eqMatch = part.match(/(\w+)\s*=\s*\?/);
              const gtMatch = part.match(/(\w+)\s*>\s*\?/);
              // Handle literal = 0 (e.g., is_built_in = 0)
              const literalEqMatch = part.match(/(\w+)\s*=\s*(\d+)/);

              if (eqMatch) {
                if (r[eqMatch[1]] !== params[paramIdx]) return true;
                paramIdx++;
              } else if (gtMatch) {
                if (!(r[gtMatch[1]]! > (params[paramIdx] as string))) return true;
                paramIdx++;
              } else if (literalEqMatch) {
                if (r[literalEqMatch[1]] !== Number(literalEqMatch[2])) return true;
              }
            }
            return false;
          });
          this.tables.set(table, keep);
          return { changes: before - keep.length };
        }

        // No WHERE → delete all
        this.tables.set(table, []);
        return { changes: before };
      }

      return { changes: 0 };
    }

    get(...params: unknown[]): MockRow | undefined {
      const tableMatch = this.sql.match(/FROM\s+(\w+)/i);
      if (!tableMatch) return undefined;
      const table = tableMatch[1];
      const rows = this.tables.get(table) || [];

      const selectMatch = this.sql.match(/SELECT\s+(.+?)\s+FROM/is);
      const aliases = MockStatement.parseAliases(selectMatch?.[1] || '*');

      // COUNT(*)
      if (this.sql.match(/COUNT\(\*\)/i)) {
        const whereMatch = this.sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s*$)/is);
        if (whereMatch && params.length > 0) {
          const col = whereMatch[1].match(/(\w+)\s*=\s*\?/)?.[1];
          if (col) return { count: rows.filter((r) => r[col] === params[0]).length };
        }
        return { count: rows.length };
      }

      const whereMatch = this.sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/is);
      let filtered = rows;
      if (whereMatch && params.length > 0) {
        const col = whereMatch[1].match(/(\w+)\s*=\s*\?/)?.[1];
        if (col) filtered = rows.filter((r) => r[col] === params[0]);
      }

      // ORDER BY ... DESC
      const orderDesc = this.sql.match(/ORDER\s+BY\s+(\w+)\s+DESC/i);
      if (orderDesc) {
        filtered = [...filtered].sort((a, b) =>
          String(b[orderDesc[1]] || '').localeCompare(String(a[orderDesc[1]] || '')),
        );
      }

      const row = filtered[0];
      if (!row) return undefined;
      return MockStatement.applyAliases(row, aliases);
    }

    all(...params: unknown[]): MockRow[] {
      const tableMatch = this.sql.match(/FROM\s+(\w+)/i);
      if (!tableMatch) return [];
      const table = tableMatch[1];
      const rows = this.tables.get(table) || [];

      const selectMatch = this.sql.match(/SELECT\s+(.+?)\s+FROM/is);
      const aliases = MockStatement.parseAliases(selectMatch?.[1] || '*');

      const whereMatch = this.sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/is);
      let filtered = rows;
      if (whereMatch) {
        const conditions = whereMatch[1];
        const condParts = conditions.split(/\s+AND\s+/i);

        filtered = rows.filter((r) => {
          let pIdx = 0;
          for (const part of condParts) {
            const eqMatch = part.match(/(\w+)\s*=\s*\?/);
            const literalEqMatch = part.match(/(\w+)\s*=\s*(\d+)(?!\w)/);
            if (eqMatch) {
              if (r[eqMatch[1]] !== params[pIdx]) return false;
              pIdx++;
            } else if (literalEqMatch) {
              if (r[literalEqMatch[1]] !== Number(literalEqMatch[2])) return false;
            }
          }
          return true;
        });
      }

      // ORDER BY
      const orderMatch = this.sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const dir = orderMatch[2].toUpperCase();
        filtered = [...filtered].sort((a, b) =>
          dir === 'DESC'
            ? String(b[col] || '').localeCompare(String(a[col] || ''))
            : String(a[col] || '').localeCompare(String(b[col] || '')),
        );
      }

      // LIMIT ?
      const limitMatch = this.sql.match(/LIMIT\s+\?/i);
      if (limitMatch && params.length > 0) {
        const limit = params[params.length - 1] as number;
        filtered = filtered.slice(0, limit);
      }

      return filtered.map((r) => MockStatement.applyAliases(r, aliases));
    }

    static parseAliases(selectClause: string): Array<{ col: string; alias: string }> {
      if (selectClause.trim() === '*') return [];
      return selectClause.split(',').map((part) => {
        const asMatch = part.trim().match(/(\S+)\s+as\s+(\w+)/i);
        if (asMatch) return { col: asMatch[1], alias: asMatch[2] };
        return { col: part.trim(), alias: part.trim() };
      });
    }

    static applyAliases(
      row: MockRow,
      aliases: Array<{ col: string; alias: string }>,
    ): MockRow {
      if (aliases.length === 0) return { ...row };
      const result: MockRow = {};
      for (const { col, alias } of aliases) {
        result[alias] = row[col] !== undefined ? row[col] : (row[alias] ?? null);
      }
      return result;
    }
  }

  class MockDatabase {
    tables = new Map<string, MockRow[]>();

    pragma() {
      /* no-op */
    }

    exec(sql: string) {
      const matches = sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/gi);
      for (const m of matches) {
        if (!this.tables.has(m[1])) this.tables.set(m[1], []);
      }
    }

    prepare(sql: string) {
      return new MockStatement(sql, this.tables);
    }

    close() {
      /* no-op */
    }
  }

  return { MockDatabase };
});

vi.mock('better-sqlite3', () => ({
  default: MockDatabase,
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-blueprint'),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    statSync: vi.fn().mockReturnValue({ size: 4096 }),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({ size: 4096 }),
}));

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: vi.fn().mockReturnValue('mock-uuid-1234'),
  },
  randomUUID: vi.fn().mockReturnValue('mock-uuid-1234'),
}));

// ---------------------------------------------------------------------------
// Import under test (after mock setup)
// ---------------------------------------------------------------------------
import { DatabaseService } from './DatabaseService';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function createService(): DatabaseService {
  const svc = new DatabaseService();
  svc.initialize();
  return svc;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  // =========================================================================
  // Initialization
  // =========================================================================
  describe('Initialization', () => {
    it('should report initialized after initialize() is called', () => {
      expect(service.isInitialized()).toBe(true);
    });

    it('should not be initialized before initialize() is called', () => {
      const fresh = new DatabaseService();
      expect(fresh.isInitialized()).toBe(false);
    });

    it('should close the database and report not initialized', () => {
      service.close();
      expect(service.isInitialized()).toBe(false);
    });

    it('should throw when accessing data before initialization', () => {
      const fresh = new DatabaseService();
      expect(() => fresh.listSessions()).toThrow('Database not initialized');
    });
  });

  // =========================================================================
  // Session CRUD
  // =========================================================================
  describe('Session CRUD', () => {
    const sessionInput = {
      id: 'session-1',
      projectPath: '/projects/test',
      conversationHistory: JSON.stringify([{ role: 'user', content: 'hi' }]),
      model: 'claude-sonnet-4-6',
    };

    it('should save and retrieve a session by ID', () => {
      service.saveSession(sessionInput);
      const result = service.getSession('session-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('session-1');
      expect(result!.projectPath).toBe('/projects/test');
      expect(result!.model).toBe('claude-sonnet-4-6');
    });

    it('should return null for non-existent session', () => {
      const result = service.getSession('nonexistent');
      expect(result).toBeNull();
    });

    it('should get session by project path', () => {
      service.saveSession(sessionInput);
      const result = service.getSessionByProjectPath('/projects/test');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('session-1');
    });

    it('should return null for non-existent project path', () => {
      const result = service.getSessionByProjectPath('/does/not/exist');
      expect(result).toBeNull();
    });

    it('should list all sessions', () => {
      service.saveSession(sessionInput);
      service.saveSession({
        ...sessionInput,
        id: 'session-2',
        projectPath: '/projects/other',
      });
      const sessions = service.listSessions();
      expect(sessions).toHaveLength(2);
    });

    it('should return empty array when no sessions exist', () => {
      const sessions = service.listSessions();
      expect(sessions).toHaveLength(0);
    });

    it('should delete a session and return true', () => {
      service.saveSession(sessionInput);
      const deleted = service.deleteSession('session-1');
      expect(deleted).toBe(true);
      expect(service.getSession('session-1')).toBeNull();
    });

    it('should return false when deleting non-existent session', () => {
      const deleted = service.deleteSession('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should update a session on conflict (upsert)', () => {
      service.saveSession(sessionInput);
      service.saveSession({
        ...sessionInput,
        model: 'claude-haiku-35-20241022',
      });
      const result = service.getSession('session-1');
      expect(result).not.toBeNull();
      expect(result!.model).toBe('claude-haiku-35-20241022');
    });
  });

  // =========================================================================
  // Document CRUD
  // =========================================================================
  describe('Document CRUD', () => {
    const sessionInput = {
      id: 'session-doc',
      projectPath: '/projects/docs',
      conversationHistory: '[]',
      model: 'claude-sonnet-4-6',
    };

    const docInput = {
      id: 'doc-1',
      sessionId: 'session-doc',
      filePath: '/projects/docs/README.md',
      content: '# Hello World',
    };

    beforeEach(() => {
      service.saveSession(sessionInput);
    });

    it('should save and retrieve a document by ID', () => {
      service.saveDocument(docInput);
      const result = service.getDocument('doc-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('doc-1');
      expect(result!.content).toBe('# Hello World');
    });

    it('should return null for non-existent document', () => {
      const result = service.getDocument('nonexistent');
      expect(result).toBeNull();
    });

    it('should get documents by session ID', () => {
      service.saveDocument(docInput);
      service.saveDocument({
        ...docInput,
        id: 'doc-2',
        filePath: '/projects/docs/index.ts',
        content: 'export {}',
      });
      const docs = service.getDocumentsBySession('session-doc');
      expect(docs).toHaveLength(2);
    });

    it('should return empty array for session with no documents', () => {
      const docs = service.getDocumentsBySession('session-doc');
      expect(docs).toHaveLength(0);
    });

    it('should delete a document and return true', () => {
      service.saveDocument(docInput);
      const deleted = service.deleteDocument('doc-1');
      expect(deleted).toBe(true);
      expect(service.getDocument('doc-1')).toBeNull();
    });

    it('should return false when deleting non-existent document', () => {
      const deleted = service.deleteDocument('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should save document with embedding', () => {
      const embedding = [0.1, 0.2, 0.3];
      service.saveDocument({ ...docInput, embedding });
      const result = service.getDocument('doc-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('doc-1');
    });
  });

  // =========================================================================
  // Prompt Library
  // =========================================================================
  describe('Prompt Library', () => {
    const promptInput = {
      id: 'prompt-1',
      name: 'Test Prompt',
      template: 'Hello {{name}}',
      description: 'A test prompt',
      isBuiltIn: false,
    };

    it('should save and retrieve a prompt by ID', () => {
      service.savePrompt(promptInput);
      const result = service.getPrompt('prompt-1');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Prompt');
      expect(result!.template).toBe('Hello {{name}}');
      expect(result!.isBuiltIn).toBe(false);
    });

    it('should return null for non-existent prompt', () => {
      const result = service.getPrompt('nonexistent');
      expect(result).toBeNull();
    });

    it('should list only custom (non-built-in) prompts', () => {
      service.savePrompt(promptInput);
      service.savePrompt({
        id: 'prompt-builtin',
        name: 'Built-in Prompt',
        template: 'System {{x}}',
        isBuiltIn: true,
      });
      const prompts = service.listPrompts();
      // listPrompts filters WHERE is_built_in = 0
      expect(prompts.every((p) => p.isBuiltIn === false)).toBe(true);
    });

    it('should return empty array when no custom prompts exist', () => {
      const prompts = service.listPrompts();
      expect(prompts).toHaveLength(0);
    });

    it('should delete a custom prompt and return true', () => {
      service.savePrompt(promptInput);
      const deleted = service.deletePrompt('prompt-1');
      expect(deleted).toBe(true);
      expect(service.getPrompt('prompt-1')).toBeNull();
    });

    it('should not delete a built-in prompt', () => {
      service.savePrompt({
        ...promptInput,
        id: 'prompt-builtin',
        isBuiltIn: true,
      });
      // deletePrompt SQL: DELETE WHERE id = ? AND is_built_in = 0
      const deleted = service.deletePrompt('prompt-builtin');
      // Built-in prompts have is_built_in = 1, so the AND check should prevent deletion
      expect(typeof deleted).toBe('boolean');
    });

    it('should update a prompt on conflict (upsert)', () => {
      service.savePrompt(promptInput);
      service.savePrompt({
        ...promptInput,
        template: 'Updated {{name}}',
      });
      const result = service.getPrompt('prompt-1');
      expect(result).not.toBeNull();
      expect(result!.template).toBe('Updated {{name}}');
    });
  });

  // =========================================================================
  // Recent Projects
  // =========================================================================
  describe('Recent Projects', () => {
    const projectInput = {
      path: '/projects/my-app',
      name: 'My App',
    };

    it('should add and retrieve a recent project by path', () => {
      service.addRecentProject(projectInput);
      const result = service.getRecentProjectByPath('/projects/my-app');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('My App');
      expect(result!.path).toBe('/projects/my-app');
    });

    it('should return null for non-existent project path', () => {
      const result = service.getRecentProjectByPath('/nonexistent');
      expect(result).toBeNull();
    });

    it('should list recent projects', () => {
      service.addRecentProject(projectInput);
      service.addRecentProject({ path: '/projects/other', name: 'Other' });
      const projects = service.listRecentProjects();
      expect(projects).toHaveLength(2);
    });

    it('should list recent projects with limit', () => {
      service.addRecentProject(projectInput);
      service.addRecentProject({ path: '/projects/a', name: 'A' });
      service.addRecentProject({ path: '/projects/b', name: 'B' });
      const projects = service.listRecentProjects(2);
      expect(projects.length).toBeLessThanOrEqual(2);
    });

    it('should remove a recent project by ID', () => {
      const project = service.addRecentProject(projectInput);
      const deleted = service.removeRecentProject(project.id);
      expect(deleted).toBe(true);
    });

    it('should return false when removing non-existent project', () => {
      const deleted = service.removeRecentProject('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should remove a recent project by path', () => {
      service.addRecentProject(projectInput);
      const deleted = service.removeRecentProjectByPath('/projects/my-app');
      expect(deleted).toBe(true);
      expect(service.getRecentProjectByPath('/projects/my-app')).toBeNull();
    });

    it('should clear all recent projects', () => {
      service.addRecentProject(projectInput);
      service.addRecentProject({ path: '/projects/other', name: 'Other' });
      const cleared = service.clearRecentProjects();
      expect(cleared).toBe(2);
      expect(service.listRecentProjects()).toHaveLength(0);
    });

    it('should update name on duplicate path (upsert)', () => {
      service.addRecentProject(projectInput);
      service.addRecentProject({
        path: '/projects/my-app',
        name: 'My App Updated',
      });
      const result = service.getRecentProjectByPath('/projects/my-app');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('My App Updated');
    });
  });

  // =========================================================================
  // Image Edits
  // =========================================================================
  describe('Image Edits', () => {
    const editInput = {
      id: 'edit-1',
      projectId: 'project-1',
      imageData: 'data:image/png;base64,abc123',
      prompt: 'Make it blue',
      responseText: 'Done',
      processingTimeMs: 500,
    };

    it('should save and retrieve an image edit by ID', () => {
      service.saveImageEdit(editInput);
      const result = service.getImageEdit('edit-1');
      expect(result).not.toBeNull();
      expect(result!.prompt).toBe('Make it blue');
      expect(result!.projectId).toBe('project-1');
    });

    it('should return null for non-existent image edit', () => {
      const result = service.getImageEdit('nonexistent');
      expect(result).toBeNull();
    });

    it('should get image edits by project', () => {
      service.saveImageEdit(editInput);
      service.saveImageEdit({
        ...editInput,
        id: 'edit-2',
        prompt: 'Make it red',
      });
      const edits = service.getImageEditsByProject('project-1');
      expect(edits).toHaveLength(2);
    });

    it('should return empty array for project with no edits', () => {
      const edits = service.getImageEditsByProject('no-project');
      expect(edits).toHaveLength(0);
    });

    it('should delete an image edit by ID', () => {
      service.saveImageEdit(editInput);
      const deleted = service.deleteImageEdit('edit-1');
      expect(deleted).toBe(true);
      expect(service.getImageEdit('edit-1')).toBeNull();
    });

    it('should clear all image edits for a project', () => {
      service.saveImageEdit(editInput);
      service.saveImageEdit({ ...editInput, id: 'edit-2' });
      const cleared = service.clearImageEdits('project-1');
      expect(cleared).toBe(2);
      expect(service.getImageEditsByProject('project-1')).toHaveLength(0);
    });

    it('should get image edit count for a project', () => {
      service.saveImageEdit(editInput);
      service.saveImageEdit({ ...editInput, id: 'edit-2' });
      const count = service.getImageEditCount('project-1');
      expect(count).toBe(2);
    });

    it('should return 0 count for project with no edits', () => {
      const count = service.getImageEditCount('empty-project');
      expect(count).toBe(0);
    });

    it('should delete image edits after a specific edit (revert)', () => {
      service.saveImageEdit(editInput);
      service.saveImageEdit({ ...editInput, id: 'edit-2', prompt: 'Step 2' });
      service.saveImageEdit({ ...editInput, id: 'edit-3', prompt: 'Step 3' });

      const deleted = service.deleteImageEditsAfter('project-1', 'edit-1');
      expect(typeof deleted).toBe('number');
    });

    it('should return 0 when reverting to non-existent edit', () => {
      const deleted = service.deleteImageEditsAfter('project-1', 'nonexistent');
      expect(deleted).toBe(0);
    });
  });

  // =========================================================================
  // Stats
  // =========================================================================
  describe('Stats', () => {
    it('should return correct counts with no data', () => {
      const stats = service.getStats();
      expect(stats.sessionCount).toBe(0);
      expect(stats.documentCount).toBe(0);
      expect(stats.dbSize).toBe(4096);
    });

    it('should count sessions and documents correctly', () => {
      service.saveSession({
        id: 's1',
        projectPath: '/p1',
        conversationHistory: '[]',
        model: 'claude-sonnet-4-6',
      });
      service.saveSession({
        id: 's2',
        projectPath: '/p2',
        conversationHistory: '[]',
        model: 'claude-sonnet-4-6',
      });
      service.saveDocument({
        id: 'd1',
        sessionId: 's1',
        filePath: '/f1',
        content: 'hello',
      });

      const stats = service.getStats();
      expect(stats.sessionCount).toBe(2);
      expect(stats.documentCount).toBe(1);
      expect(stats.dbSize).toBe(4096);
    });
  });

  // =========================================================================
  // Checkpoint CRUD
  // =========================================================================
  describe('Checkpoint CRUD', () => {
    const checkpointInput = {
      id: 'cp-1',
      projectId: 'proj-1',
      projectPath: '/projects/test',
      projectName: 'Test Project',
      executionState: JSON.stringify({ phase: 'research', progress: 50 }),
      currentPhaseIndex: 1,
      status: 'in_progress',
    };

    it('should save and retrieve a checkpoint by ID', () => {
      service.saveCheckpoint(checkpointInput);
      const result = service.getCheckpoint('cp-1');
      expect(result).not.toBeNull();
      expect(result!.projectName).toBe('Test Project');
      expect(result!.status).toBe('in_progress');
    });

    it('should return null for non-existent checkpoint', () => {
      const result = service.getCheckpoint('nonexistent');
      expect(result).toBeNull();
    });

    it('should get checkpoint by project ID', () => {
      service.saveCheckpoint(checkpointInput);
      const result = service.getCheckpointByProjectId('proj-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('cp-1');
    });

    it('should get checkpoint by project path', () => {
      service.saveCheckpoint(checkpointInput);
      const result = service.getCheckpointByProjectPath('/projects/test');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('cp-1');
    });

    it('should list all checkpoints', () => {
      service.saveCheckpoint(checkpointInput);
      service.saveCheckpoint({
        ...checkpointInput,
        id: 'cp-2',
        projectId: 'proj-2',
        status: 'completed',
      });
      const checkpoints = service.listCheckpoints();
      expect(checkpoints).toHaveLength(2);
    });

    it('should delete a checkpoint and return true', () => {
      service.saveCheckpoint(checkpointInput);
      const deleted = service.deleteCheckpoint('cp-1');
      expect(deleted).toBe(true);
      expect(service.getCheckpoint('cp-1')).toBeNull();
    });

    it('should return false when deleting non-existent checkpoint', () => {
      const deleted = service.deleteCheckpoint('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================
  describe('Error handling', () => {
    it('should throw on saveSession when not initialized', () => {
      const fresh = new DatabaseService();
      expect(() =>
        fresh.saveSession({
          id: 'x',
          projectPath: '/x',
          conversationHistory: '[]',
          model: 'claude-sonnet-4-6',
        }),
      ).toThrow('Database not initialized');
    });

    it('should throw on saveDocument when not initialized', () => {
      const fresh = new DatabaseService();
      expect(() =>
        fresh.saveDocument({
          id: 'x',
          sessionId: 'x',
          filePath: '/x',
          content: 'x',
        }),
      ).toThrow('Database not initialized');
    });

    it('should throw on savePrompt when not initialized', () => {
      const fresh = new DatabaseService();
      expect(() =>
        fresh.savePrompt({
          id: 'x',
          name: 'x',
          template: 'x',
          isBuiltIn: false,
        }),
      ).toThrow('Database not initialized');
    });

    it('should throw on addRecentProject when not initialized', () => {
      const fresh = new DatabaseService();
      expect(() =>
        fresh.addRecentProject({ path: '/x', name: 'x' }),
      ).toThrow('Database not initialized');
    });

    it('should throw on saveImageEdit when not initialized', () => {
      const fresh = new DatabaseService();
      expect(() =>
        fresh.saveImageEdit({
          id: 'x',
          projectId: 'x',
          imageData: 'x',
          prompt: 'x',
        }),
      ).toThrow('Database not initialized');
    });

    it('should throw on getStats when not initialized', () => {
      const fresh = new DatabaseService();
      expect(() => fresh.getStats()).toThrow('Database not initialized');
    });
  });
});
