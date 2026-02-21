# Blueprint Refactoring Design

**Date:** 2026-02-21
**Goal:** Agent-friendliness — restructure so coding agents can navigate, understand, and modify the codebase faster.

## Current State

- 149 source files, 42K lines of TypeScript
- `preload.ts`: 2,038 lines, 122 manually duplicated type definitions
- `main.ts`: 1,509 lines, 217 IPC handlers across 27 service domains
- `App.tsx`: 1,091 lines, monolithic renderer root
- 17 of 22 services have zero tests (~8,900 untested lines)
- Docs scattered across 4 directories with stale research files

## Approach: Bottom-Up Refactoring

Work from foundation up: types → IPC → docs → UI → tests. Each step is independently verifiable via `pnpm typecheck && pnpm test`.

---

## Phase 1: Shared Types Module

Extract 122 duplicated type definitions from `preload.ts` into `src/shared/types/`.

### Structure

```
src/shared/types/
  index.ts              # barrel export
  agent.types.ts        # AgentSession, StreamChunk, SendMessageOptions, CompactionConfig, etc.
  database.types.ts     # StoredSession, StoredDocument, DbStats, SessionInput, etc.
  filesystem.types.ts   # FileNode, FileContent, SearchResult, QuickOpenFile, etc.
  citation.types.ts     # CitationQuery, VerificationResult, FieldMatchScore, etc.
  context.types.ts      # ContextEvent, CompactionSummary, CompactionResult, ContextStats, etc.
  research.types.ts     # ResearchResponse, Citation, DeepResearchResponse, ResearchOptions, etc.
  confidence.types.ts   # ConfidenceBreakdown, ParagraphConfidence, DocumentConfidence, etc.
  models.types.ts       # TaskClassification, ModelInfo, ClaudeModels, TaskType, etc.
  orchestrator.types.ts # PhaseState, ProjectExecutionState, PhaseStatus, etc.
  common.types.ts       # ApiKeyType, PermissionStatus, PermissionsResult, etc.
```

### Rules

- Types are **pure interfaces/type aliases** — no runtime code, no imports from electron or SDK
- Services import types from `src/shared/types/` and implement them
- `preload.ts` imports types from `src/shared/types/` and uses them in `contextBridge`
- Renderer components import from `src/shared/types/`

### Result

- `preload.ts`: 2,038 → ~200 lines (just `contextBridge.exposeInMainWorld` wiring)
- Single source of truth for all IPC types

---

## Phase 2: IPC Domain Modules

Split 217 `ipcMain.handle()` calls from `main.ts` into domain-specific modules.

### Structure

```
src/main/ipc/
  index.ts              # registerAllHandlers() — imports and calls each domain
  agent.ipc.ts          # 16 handlers: agent:*
  database.ipc.ts       # 12 handlers: db:*
  filesystem.ipc.ts     # 8 handlers: fs:*
  citation.ipc.ts       # 24 handlers: citation*, citationAttachment*, citationVerification*
  research.ipc.ts       # 29 handlers: researchRouter*, openRouter*, gemini*
  orchestrator.ipc.ts   # 23 handlers: orchestrator*, checkpoint*
  confidence.ipc.ts     # 9 handlers: confidence:*
  review.ipc.ts         # 12 handlers: review:*
  dashboard.ipc.ts      # 7 handlers: dashboard:*
  export.ipc.ts         # 15 handlers: pdf:*, pptx:*, docx:*
  models.ipc.ts         # 7 handlers: modelRouter:*
  context.ipc.ts        # 13 handlers: contextManager:*
  imageEditor.ipc.ts    # 13 handlers: imageEditor:*
  settings.ipc.ts       # 10 handlers: secureStorage:*, prompt:*
  system.ipc.ts         # 19 handlers: permissions:*, app:*, recentProjects:*, update:*
```

### Pattern

```typescript
// src/main/ipc/agent.ipc.ts
import { ipcMain } from 'electron';
import { agentService } from '../services/AgentService';
import type { SendMessageOptions } from '../../shared/types';

export function register() {
  ipcMain.handle('agent:initialize', async (_, apiKey: string) => {
    return agentService.initialize(apiKey);
  });
  // ... remaining handlers
}
```

```typescript
// src/main/ipc/index.ts
import * as agent from './agent.ipc';
import * as database from './database.ipc';
// ...

export function registerAllHandlers() {
  agent.register();
  database.register();
  // ...
}
```

### Result

- `main.ts`: 1,509 → ~100 lines (app lifecycle + window creation + `registerAllHandlers()`)
- Each IPC file: 50-150 lines, single domain

---

## Phase 3: Documentation Cleanup

Consolidate to 3 focused docs, delete stale files, clean root.

### Target Structure

```
docs/
  architecture.md    # Service map, IPC index, component tree, data flow (NEW)
  design.md          # Design decisions (distilled from electron-app-design.md)
  roadmap.md         # What's done, what's next (from IMPROVEMENTS.md + roadmap)

# Root keeps only:
CLAUDE.md            # Agent instructions
README.md            # Project readme
```

### Files to Remove

- `IMPROVEMENTS.md` → relevant parts merged into `docs/roadmap.md`
- `prd.json` → complete (62/62), in git history
- `plans/` → content merged into `docs/`
- `tasks/` → content merged into `docs/`
- `docs/HALLUCINATION-DETECTION-RESEARCH.md` → stale research
- `docs/SOTA-TECHNOLOGY-RESEARCH.md` → stale research
- `docs/STORYBOOK_PATTERNS.md` → stale patterns
- `docs/crossref_rest_api_documentation.txt` → external API docs
- `docs/semantic_scholar_api_documentation.txt` → external API docs
- `nano-banana-editor-main/` → external project
- `coverage/` → build artifact (should be gitignored)

### architecture.md Content

This is the **single file an agent reads to understand the codebase**:
- Service map: what each service does (one line each)
- IPC domain index: which file handles which commands
- Component tree: what renders where
- Data flow: how a user message flows through the system
- Database schema summary

---

## Phase 4: App.tsx Extraction

Split the 1,091-line monolith into focused hooks and layout components.

### New Files

```
src/renderer/
  hooks/
    useAppState.ts       # Tab state, panel visibility, active views
    useAppCommands.ts    # Command palette commands, keyboard shortcuts
    useAppNavigation.ts  # Sidebar nav items, tab switching logic
  components/layout/
    AppLayout.tsx        # Main layout grid: sidebar + content + panels
    ContentArea.tsx      # Tab content switching (editor, chat, welcome, etc.)
    PanelArea.tsx        # Right-side panel routing (citations, review, etc.)
```

### What Stays in App.tsx (~250 lines)

- Top-level providers (theme, state)
- Component composition (AppLayout with ContentArea + PanelArea)
- Modal rendering (overlays stay at top level)

### What Gets Extracted

- Sidebar navigation config (~100 lines) → `useAppNavigation`
- Tab state management (~150 lines) → `useAppState`
- Command palette setup (~80 lines) → `useAppCommands`
- Content panel switching (~200 lines) → `ContentArea`
- Right panel switching (~150 lines) → `PanelArea`

---

## Phase 5: Tests for Critical Services

Add tests for the 3 most critical untested services.

### Files

```
src/main/services/
  AgentService.test.ts     # ~30-40 tests: session CRUD, sendMessage (mock SDK), model selection, history rollback, thinking params
  DatabaseService.test.ts  # ~25-30 tests: init/close, session/document CRUD, prompt library, recent projects, stats
  ContextManager.test.ts   # ~20-25 tests: session lifecycle, event tracking, compaction trigger, token estimation
```

### Testing Pattern

- Mock external dependencies (Anthropic SDK, better-sqlite3, electron `app`)
- Test service logic in isolation
- Note: `AgentServiceCompaction.test.ts` (28 tests) and `AgentServiceBridge.test.ts` (15 tests) already exist

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| `preload.ts` | 2,038 lines | ~200 lines |
| `main.ts` | 1,509 lines | ~100 lines |
| `App.tsx` | 1,091 lines | ~250 lines |
| Doc locations | 4 scattered | 1 (`docs/`) |
| Root files | 6+ markdown/json | 2 (CLAUDE.md, README.md) |
| Test coverage (critical services) | 0/3 tested | 3/3 tested |
| Max file to scan for agent | 2,038 lines | ~250 lines |

## Verification

After each phase: `pnpm typecheck && pnpm test && pnpm build`
