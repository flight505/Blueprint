# Blueprint Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the codebase agent-friendly by splitting monolithic files, consolidating types, and organizing documentation.

**Architecture:** Bottom-up refactoring in 5 phases. Each phase produces a buildable, testable codebase. Shared types module eliminates 2,000 lines of duplication. IPC domain modules replace a 1,500-line handler file. Documentation collapses from 4 locations to 1.

**Tech Stack:** TypeScript, Electron IPC, React hooks, Vitest

**Verification after every task:** `pnpm typecheck && pnpm test`

---

## Phase 1: Shared Types Module

### Task 1: Create shared type files

**Files:**
- Create: `src/shared/types/agent.types.ts`
- Create: `src/shared/types/database.types.ts`
- Create: `src/shared/types/filesystem.types.ts`
- Create: `src/shared/types/citation.types.ts`
- Create: `src/shared/types/context.types.ts`
- Create: `src/shared/types/research.types.ts`
- Create: `src/shared/types/confidence.types.ts`
- Create: `src/shared/types/models.types.ts`
- Create: `src/shared/types/orchestrator.types.ts`
- Create: `src/shared/types/common.types.ts`
- Create: `src/shared/types/index.ts`

**Step 1: Create the type files**

Extract types from `src/preload.ts` into domain files. Each file contains **only** `export interface` and `export type` declarations — no runtime code, no imports from `electron` or SDK packages.

Source mapping (preload.ts line numbers → type file):

| Type File | Source Lines in preload.ts | Types |
|-----------|--------------------------|-------|
| `common.types.ts` | 3-11, 181 | PermissionStatus, PermissionsResult, ApiKeyType |
| `filesystem.types.ts` | 13-49 | FileNode, FileContent, QuickOpenFile, SearchMatch, SearchResult, SearchOptions |
| `agent.types.ts` | 52-123 | AgentSession, StreamChunk, CreateSessionOptions, SendMessageOptions, SendMessageParsedOptions, StructuredOutputSchemaName, ParsedMessageResult, MessageParam, ContentBlock, MessageResponse, CompactionConfig, CompactionEvent |
| `database.types.ts` | 126-178, 270-286, 970-987 | StoredSession, StoredDocument, SessionInput, DocumentInput, DbStats, RecentProject, RecentProjectInput, StoredPrompt, PromptInput, StoredImageEdit, ImageEditInput |
| `models.types.ts` | 184-217 | TaskComplexity, ModelId, TaskType, TaskClassification, ModelInfo, ClaudeModels |
| `context.types.ts` | 220-267 | ContextEventType, ContextEvent, CompactionSummary, CompactionResult, ContextStats, ContextConfiguration |
| `research.types.ts` | 289-414 | Citation, ResearchResponse, ResearchOptions, OpenRouterStreamChunk, DeepResearchResponse, DeepResearchOptions, ProgressCheckpoint, GeminiStreamChunk, ResearchMode, ProjectPhase, ResearchProvider, PhaseConfig, UnifiedResearchResponse, RoutedResearchOptions, UnifiedStreamChunk |
| `citation.types.ts` | 417-549 | ManagedCitation, CitationUsage, CitationFile, ReferenceListOptions, FormattedReference, AddCitationInput, CitationVerificationResult, VerifiedCitationData, CitationVerificationQuery, CitationVerificationCacheStats, RAGSource, ExtractedClaim, AttachmentResult, AttachmentOptions, SourceClaimLink |
| `confidence.types.ts` | 552-683 | ConfidenceBreakdown, ParagraphConfidence, DocumentConfidence, ConfidenceScoringConfig, ConfidenceStreamUpdate, ReviewItemType, ReviewItemStatus, ReviewItemAction, ReviewSource, LowConfidenceReviewItem, CitationReviewItem, ReviewItem, DocumentReviewQueue, ReviewScanOptions |
| `orchestrator.types.ts` | 686-929 | DocumentMetrics, ProjectMetrics, TrendDataPoint, TrendData, DashboardExportOptions, PDFGenerationOptions, CoverPageMetadata, PDFMetadata, PDFGenerationResult, PDFSection, DOCXGenerationOptions, DOCXCoverPageMetadata, DOCXMetadata, DOCXGenerationResult, DOCXSection, PPTXTheme, PPTXGenerationOptions, PPTXTitleSlideMetadata, PPTXMetadata, PPTXGenerationResult, PPTXSection, PhaseStatus, OrchestrationStatus, PhaseState, ProjectExecutionState, PhaseOrchestratorConfig, CheckpointData, ImageEditorMimeType, ImageEditRequest, ImageEditResponse, ImageEditHistoryItem, UpdateStatus, UpdateInfo, UpdateProgressInfo, UpdateEventType, UpdateEvent |

Note: `orchestrator.types.ts` is a catch-all for the less commonly modified types (dashboard, export generators, orchestrator, image editor, update). If it grows too large, split further.

**Step 2: Create barrel export**

```typescript
// src/shared/types/index.ts
export * from './common.types';
export * from './filesystem.types';
export * from './agent.types';
export * from './database.types';
export * from './models.types';
export * from './context.types';
export * from './research.types';
export * from './citation.types';
export * from './confidence.types';
export * from './orchestrator.types';
```

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (new files have no consumers yet)

**Step 4: Commit**

```bash
git add src/shared/types/
git commit -m "refactor: create shared types module with 11 domain type files"
```

---

### Task 2: Migrate preload.ts to use shared types

**Files:**
- Modify: `src/preload.ts` (2,038 → ~200 lines)
- Modify: `src/shared/types/index.ts` (if naming conflicts need resolution)

**Step 1: Replace all type definitions in preload.ts with imports**

Replace the 122 type definitions (lines 3-1033) with:

```typescript
// Re-export all shared types for renderer consumption
export type {
  // common
  PermissionStatus, PermissionsResult, ApiKeyType,
  // filesystem
  FileNode, FileContent, QuickOpenFile, SearchMatch, SearchResult, SearchOptions,
  // agent
  AgentSession, StreamChunk, CreateSessionOptions, SendMessageOptions,
  SendMessageParsedOptions, StructuredOutputSchemaName, ParsedMessageResult,
  MessageParam, ContentBlock, MessageResponse, CompactionConfig, CompactionEvent,
  // ... all other types
} from '../shared/types';
```

Keep only the `contextBridge.exposeInMainWorld('electronAPI', { ... })` section — this is the runtime IPC wiring that must remain.

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — renderer imports from preload types should resolve through re-exports

**Step 3: Run tests**

Run: `pnpm test`
Expected: 235 tests pass

**Step 4: Commit**

```bash
git add src/preload.ts
git commit -m "refactor: replace 122 duplicated types in preload.ts with shared imports"
```

---

### Task 3: Migrate main process services to use shared types

**Files:**
- Modify: `src/main/services/AgentService.ts`
- Modify: `src/main/services/ContextManager.ts`
- Modify: `src/main/services/ModelRouter.ts`
- Modify: `src/main/services/CitationManager.ts`
- Modify: `src/main/services/CitationVerificationService.ts`
- Modify: `src/main/services/CitationAttachmentService.ts`
- Modify: `src/main/services/ConfidenceScoringService.ts`
- Modify: `src/main/services/ReviewQueueService.ts`
- Modify: `src/main/services/HallucinationDashboardService.ts`
- Modify: `src/main/services/ResearchRouter.ts`
- Modify: `src/main/services/OpenRouterService.ts`
- Modify: `src/main/services/GeminiService.ts`
- Modify: `src/main/services/PhaseOrchestrator.ts`
- Modify: `src/main/services/CheckpointService.ts`
- Modify: `src/main/services/PDFGenerator.ts`
- Modify: `src/main/services/DOCXGenerator.ts`
- Modify: `src/main/services/PPTXGenerator.ts`
- Modify: `src/main/services/ImageEditorService.ts`
- Modify: `src/main/services/UpdateService.ts`
- Modify: `src/main/services/FileSystemService.ts`
- Modify: `src/main/services/DatabaseService.ts`
- Modify: `src/main/services/SecureStorageService.ts`

**Step 1: For each service, decide import vs define**

Two strategies per type:
- **Types the service defines**: Keep the definition in the service, re-export from shared types file using `export type { X } from '../services/Y'`
- **Types the service consumes**: Import from shared types

The simplest approach: have each shared types file be the **canonical source** for the type. Services import what they need from `../../shared/types`. Remove duplicate type definitions from service files.

Where a service type requires SDK imports (e.g., `MessageParam` from `@anthropic-ai/sdk`), the shared types file re-exports the SDK type rather than redefining it.

**Step 2: Update services one at a time**

For each service:
1. Identify which exported interfaces/types match the shared types
2. Remove the local definition
3. Add `import type { X, Y } from '../../shared/types'`
4. Keep the `export` so downstream consumers don't break
5. Run `pnpm typecheck` after each service

**Step 3: Run full verification**

Run: `pnpm typecheck && pnpm test`
Expected: 235 tests pass

**Step 4: Commit**

```bash
git add src/main/services/ src/shared/types/
git commit -m "refactor: migrate services to import from shared types module"
```

---

## Phase 2: IPC Domain Modules

### Task 4: Create IPC module infrastructure

**Files:**
- Create: `src/main/ipc/index.ts`

**Step 1: Create the index file with registration function**

```typescript
// src/main/ipc/index.ts
import type { BrowserWindow } from 'electron';

// Domain registrations will be imported here as we extract them
export function registerAllHandlers(_mainWindow: BrowserWindow) {
  // Will be populated as each domain module is created
}
```

**Step 2: Commit**

```bash
git add src/main/ipc/
git commit -m "refactor: create IPC module infrastructure"
```

---

### Task 5: Extract IPC handlers — batch 1 (simple domains)

Extract the domains that have NO `webContents` / `mainWindow` dependency (pure request-response handlers).

**Files:**
- Create: `src/main/ipc/system.ipc.ts` (permissions, app, recentProjects)
- Create: `src/main/ipc/filesystem.ipc.ts` (fs:*)
- Create: `src/main/ipc/settings.ipc.ts` (secureStorage:*, prompt:*)
- Create: `src/main/ipc/models.ipc.ts` (modelRouter:*)
- Create: `src/main/ipc/database.ipc.ts` (db:*)
- Modify: `src/main/ipc/index.ts`
- Modify: `src/main.ts`

**Step 1: Create each IPC module**

Pattern for each module:

```typescript
// src/main/ipc/database.ipc.ts
import { ipcMain } from 'electron';
import { databaseService } from '../services/DatabaseService';
import type { SessionInput, DocumentInput } from '../../shared/types';

export function register() {
  ipcMain.handle('db:isInitialized', () => databaseService.isInitialized());
  ipcMain.handle('db:saveSession', (_, input: SessionInput) => databaseService.saveSession(input));
  // ... all db:* handlers from main.ts
}
```

Move the handlers verbatim — no logic changes. Also move `validateString`, `validatePath`, `validateObject` helper functions into a `src/main/ipc/validation.ts` utility since multiple IPC modules need them.

**Step 2: Update index.ts to register**

```typescript
import * as system from './system.ipc';
import * as filesystem from './filesystem.ipc';
import * as settings from './settings.ipc';
import * as models from './models.ipc';
import * as database from './database.ipc';

export function registerAllHandlers(_mainWindow: BrowserWindow) {
  system.register();
  filesystem.register();
  settings.register();
  models.register();
  database.register();
}
```

**Step 3: Remove extracted handlers from main.ts**

Delete the handler code from `main.ts` for these domains. Keep the remaining domains in main.ts for now.

**Step 4: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: 235 tests pass

**Step 5: Commit**

```bash
git add src/main/ipc/ src/main.ts
git commit -m "refactor: extract simple IPC handlers (system, fs, settings, models, db)"
```

---

### Task 6: Extract IPC handlers — batch 2 (domains with streaming)

Extract domains that require `event.sender` (webContents) for streaming.

**Files:**
- Create: `src/main/ipc/agent.ipc.ts` (agent:*)
- Create: `src/main/ipc/research.ipc.ts` (openRouter:*, gemini:*, researchRouter:*)
- Create: `src/main/ipc/context.ipc.ts` (contextManager:*)
- Create: `src/main/ipc/confidence.ipc.ts` (confidence:*)
- Modify: `src/main/ipc/index.ts`
- Modify: `src/main.ts`

**Step 1: Create modules with webContents access**

Streaming handlers need `event.sender` to push chunks to the renderer. Pass the main window reference:

```typescript
// src/main/ipc/agent.ipc.ts
import { ipcMain } from 'electron';
import { agentService } from '../services/AgentService';
import type { SendMessageOptions, CompactionEvent, Message } from '../../shared/types';

export function register() {
  // Non-streaming handlers
  ipcMain.handle('agent:initialize', async (_, apiKey: string) => {
    return agentService.initialize(apiKey);
  });

  // Streaming handler — uses event.sender
  ipcMain.handle('agent:sendMessageStream', async (event, sessionId: string, userMessage: string, options?: SendMessageOptions) => {
    const webContents = event.sender;
    await agentService.sendMessageStream(sessionId, userMessage, (chunk) => {
      webContents.send('agent:streamChunk', sessionId, chunk);
    }, options);
  });

  // ... all agent:* handlers
}
```

**Step 2: Update index.ts, remove from main.ts**

**Step 3: Verify**

Run: `pnpm typecheck && pnpm test`
Expected: 235 tests pass

**Step 4: Commit**

```bash
git add src/main/ipc/ src/main.ts
git commit -m "refactor: extract streaming IPC handlers (agent, research, context, confidence)"
```

---

### Task 7: Extract IPC handlers — batch 3 (remaining domains)

**Files:**
- Create: `src/main/ipc/citation.ipc.ts` (citation:*, citationVerification:*, citationAttachment:*)
- Create: `src/main/ipc/orchestrator.ipc.ts` (orchestrator:*, checkpoint:*)
- Create: `src/main/ipc/review.ipc.ts` (review:*)
- Create: `src/main/ipc/dashboard.ipc.ts` (dashboard:*)
- Create: `src/main/ipc/export.ipc.ts` (pdf:*, docx:*, pptx:*)
- Create: `src/main/ipc/imageEditor.ipc.ts` (imageEditor:*)
- Create: `src/main/ipc/update.ipc.ts` (update:*)
- Modify: `src/main/ipc/index.ts`
- Modify: `src/main.ts`

**Important:** `orchestrator:start` and `checkpoint:resumeFromCheckpoint` set up event listeners that send to `webContents`. These handlers need access to `event.sender`.

**Step 1: Create remaining IPC modules**

**Step 2: Update index.ts to register all 16 domain modules**

**Step 3: Slim main.ts**

After all handlers are extracted, `main.ts` should contain only:
- Imports
- `createWindow()` function
- `app.on('ready')` — calls `registerAllHandlers()`, `createWindow()`, initializes services
- `app.on('window-all-closed')`, `app.on('will-quit')`, `app.on('activate')`

Target: ~100-120 lines.

**Step 4: Verify**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: All pass, build succeeds

**Step 5: Commit**

```bash
git add src/main/ipc/ src/main.ts
git commit -m "refactor: extract all remaining IPC handlers, slim main.ts to ~100 lines"
```

---

## Phase 3: Documentation Cleanup

### Task 8: Create docs/architecture.md

**Files:**
- Create: `docs/architecture.md`

**Step 1: Write the architecture doc**

This is the **single file an agent reads to understand the codebase**. Contents:

1. **Project Overview** (2-3 sentences)
2. **Directory Structure** (tree with one-line descriptions)
3. **Service Map** (table: service name, file, responsibility, one line each)
4. **IPC Domain Index** (table: domain, file, handler count, key channels)
5. **Component Tree** (simplified tree of renderer components)
6. **Data Flow** (how a user message flows: renderer → IPC → AgentService → SDK → response → IPC → renderer)
7. **Database Schema** (tables, key columns, relationships)
8. **Shared Types** (which type file covers which domain)

Keep it concise — an agent should be able to read the entire file in one context window.

**Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: create architecture.md as single-file codebase guide"
```

---

### Task 9: Create docs/design.md and docs/roadmap.md

**Files:**
- Create: `docs/design.md` (distilled from `plans/electron-app-design.md`)
- Create: `docs/roadmap.md` (distilled from `IMPROVEMENTS.md` + `plans/electron-app-roadmap.md`)

**Step 1: Write design.md**

Distill the key design decisions from `plans/electron-app-design.md`:
- Why Electron (desktop, file system access, offline)
- IPC architecture pattern
- State management choice (Legend State)
- Editor choice (TipTap)
- Security model (CSP, path validation, encrypted API keys)
- macOS title bar approach

Keep it under 200 lines. Remove implementation details that are now in code.

**Step 2: Write roadmap.md**

Distill from `IMPROVEMENTS.md`:
- What's been completed (summary, not line-by-line)
- What's still possible (future opportunities from PF-001 bundle audit, etc.)
- What was intentionally deferred and why

Keep it under 150 lines.

**Step 3: Commit**

```bash
git add docs/design.md docs/roadmap.md
git commit -m "docs: create distilled design.md and roadmap.md"
```

---

### Task 10: Remove stale files and clean root

**Files:**
- Delete: `IMPROVEMENTS.md` (merged into docs/roadmap.md)
- Delete: `prd.json` (complete, in git history)
- Delete: `plans/electron-app-design.md` (merged into docs/design.md)
- Delete: `plans/electron-app-roadmap.md` (merged into docs/roadmap.md)
- Delete: `plans/` directory (empty after moves)
- Delete: `tasks/prd-blueprint.md` (complete, in git history)
- Delete: `tasks/` directory (empty after move)
- Delete: `docs/HALLUCINATION-DETECTION-RESEARCH.md` (stale research)
- Delete: `docs/SOTA-TECHNOLOGY-RESEARCH.md` (stale research)
- Delete: `docs/STORYBOOK_PATTERNS.md` (stale patterns)
- Delete: `docs/crossref_rest_api_documentation.txt` (external API docs)
- Delete: `docs/semantic_scholar_api_documentation.txt` (external API docs)
- Delete: `nano-banana-editor-main/` directory (external project)
- Modify: `CLAUDE.md` (update doc references to new locations)
- Modify: `.gitignore` (add `coverage/` if not already present)

**Step 1: Use `trash` for all deletions** (safe deletion per project conventions)

```bash
trash IMPROVEMENTS.md prd.json
trash plans/
trash tasks/
trash docs/HALLUCINATION-DETECTION-RESEARCH.md docs/SOTA-TECHNOLOGY-RESEARCH.md docs/STORYBOOK_PATTERNS.md
trash docs/crossref_rest_api_documentation.txt docs/semantic_scholar_api_documentation.txt
trash nano-banana-editor-main/
```

**Step 2: Update CLAUDE.md**

Update the Project Structure section to reflect new docs/ layout and IPC module structure.

**Step 3: Commit**

```bash
git add -A
git commit -m "docs: remove stale files, clean root, update CLAUDE.md references"
```

---

## Phase 4: App.tsx Extraction

### Task 11: Extract app hooks

**Files:**
- Create: `src/renderer/hooks/useAppState.ts`
- Create: `src/renderer/hooks/useAppCommands.ts`
- Create: `src/renderer/hooks/useAppNavigation.ts`
- Modify: `src/renderer/App.tsx`

**Step 1: Extract useAppState**

Move from App.tsx (lines 159-174):
- All `useState` declarations: activeSection, openFiles, activeFileId, chatMessages, isChatLoading, agentSessionId, activeQuestion, isExportModalOpen, exportSections, showNewProjectWizard, projectPath
- Return all state values and setters

**Step 2: Extract useAppCommands**

Move from App.tsx (lines 340-615):
- The `useMemo` block defining 27 commands
- The `useEffect` keyboard shortcut handler
- Accept dependencies as parameters

**Step 3: Extract useAppNavigation**

Move from App.tsx (lines 503-552):
- `handleFileSelect`, `handleTabSelect`, `handleTabClose` callbacks
- Accept openFiles, setOpenFiles, activeFileId, setActiveFileId as parameters

**Step 4: Update App.tsx to use extracted hooks**

Replace inline state/callbacks with hook calls:

```typescript
const appState = useAppState();
const { commands } = useAppCommands({ ...appState, toggleQuickOpen, toggleCommandPalette });
const { handleFileSelect, handleTabSelect, handleTabClose } = useAppNavigation(appState);
```

**Step 5: Verify**

Run: `pnpm typecheck && pnpm test`
Expected: 235 tests pass

**Step 6: Commit**

```bash
git add src/renderer/hooks/ src/renderer/App.tsx
git commit -m "refactor: extract useAppState, useAppCommands, useAppNavigation from App.tsx"
```

---

### Task 12: Extract layout components

**Files:**
- Create: `src/renderer/components/layout/ContentArea.tsx`
- Create: `src/renderer/components/layout/PanelArea.tsx`
- Modify: `src/renderer/App.tsx`

**Step 1: Extract ContentArea**

Move the right-side content area (TabBar + file content view) into its own component. This is the JSX after the GlassSidebar — it renders the tab bar and either WelcomeScreen or the file content view.

Props: openFiles, activeFileId, handleTabSelect, handleTabClose, projectPath

**Step 2: Extract PanelArea (LeftPaneContent)**

The `LeftPaneContent` function already exists inside App.tsx as a nested component. Move it to its own file.

Props: activeSection, projectPath, chatMessages, isChatLoading, etc.

**Step 3: Update App.tsx**

Replace inline JSX with `<ContentArea ... />` and `<PanelArea ... />` components.

Target: App.tsx should be ~250-300 lines after all extractions.

**Step 4: Verify**

Run: `pnpm typecheck && pnpm test`
Expected: 235 tests pass

**Step 5: Commit**

```bash
git add src/renderer/components/layout/ src/renderer/App.tsx
git commit -m "refactor: extract ContentArea and PanelArea from App.tsx"
```

---

## Phase 5: Tests for Critical Services

### Task 13: Write AgentService tests

**Files:**
- Create: `src/main/services/AgentService.test.ts`

**Step 1: Write tests**

Test categories (~30-40 tests):
- **Initialization**: initialize with valid/invalid key, isInitialized, validateApiKey
- **Session CRUD**: createSession (default model, auto-select, with taskType), getSession, deleteSession, listSessions
- **sendMessage**: mock Anthropic client, verify message sent, history appended, history rolled back on error
- **sendMessageStream**: mock stream, verify chunks emitted, finalMessage stored, error rollback
- **buildThinkingParams**: adaptive thinking for Opus/Sonnet, budget thinking for Haiku, no thinking
- **Model selection**: auto-select model based on content, explicit model override
- **extractTextContent**: static method for text extraction
- **Context bridging**: trackContext flag syncs to ContextManager

Mock strategy: Mock `Anthropic` constructor, return mock `client.messages.create()`, `client.messages.stream()`, `client.beta.messages.create()`.

Note: Do NOT duplicate tests from `AgentServiceCompaction.test.ts` (28 tests) or `AgentServiceBridge.test.ts` (15 tests).

**Step 2: Run tests**

Run: `pnpm test src/main/services/AgentService.test.ts`
Expected: All pass

**Step 3: Commit**

```bash
git add src/main/services/AgentService.test.ts
git commit -m "test: add AgentService unit tests"
```

---

### Task 14: Write DatabaseService tests

**Files:**
- Create: `src/main/services/DatabaseService.test.ts`

**Step 1: Write tests**

Test categories (~25-30 tests):
- **Initialization**: initialize creates tables, isInitialized
- **Session CRUD**: saveSession, getSession, getSessionByProjectPath, listSessions, deleteSession
- **Document CRUD**: saveDocument, getDocument, getDocumentsBySession, deleteDocument
- **Prompt Library**: savePrompt, getPrompt, listPrompts, deletePrompt
- **Recent Projects**: addRecentProject, listRecentProjects, removeRecentProject, getByPath
- **Image Edits**: saveImageEdit, getImageEdits, clearImageEdits, revertToEdit
- **Stats**: getStats returns correct counts

Mock strategy: Use in-memory SQLite (`':memory:'`) or mock `better-sqlite3`. Mock `electron.app.getPath()`.

**Step 2: Run tests**

Run: `pnpm test src/main/services/DatabaseService.test.ts`
Expected: All pass

**Step 3: Commit**

```bash
git add src/main/services/DatabaseService.test.ts
git commit -m "test: add DatabaseService unit tests"
```

---

### Task 15: Write ContextManager tests

**Files:**
- Create: `src/main/services/ContextManager.test.ts`

**Step 1: Write tests**

Test categories (~20-25 tests):
- **Session lifecycle**: getOrCreateSession, clearSession, session isolation
- **Event tracking**: addEvent (all types), getEvents, event ordering
- **Token estimation**: estimateTokens accuracy
- **Compaction trigger**: shouldCompact at threshold, not before
- **Compaction execution**: compact summarizes old events, keeps recent
- **Context retrieval**: getFullContext, getContextAsMessages
- **Configuration**: configure, getConfiguration, custom thresholds
- **Summaries**: getSummaries after compaction

Mock strategy: Mock Anthropic client for compaction (Haiku summarization call). Test event tracking without mocks.

**Step 2: Run tests**

Run: `pnpm test src/main/services/ContextManager.test.ts`
Expected: All pass

**Step 3: Commit**

```bash
git add src/main/services/ContextManager.test.ts
git commit -m "test: add ContextManager unit tests"
```

---

## Final Verification

### Task 16: Full build and verification

**Step 1: Run full verification**

```bash
pnpm typecheck && pnpm test && pnpm build
```

Expected: All pass, build succeeds.

**Step 2: Verify file counts improved**

```bash
wc -l src/preload.ts src/main.ts src/renderer/App.tsx
```

Expected: preload.ts ~200, main.ts ~100-120, App.tsx ~250-300

**Step 3: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "refactor: complete agent-friendly refactoring of Blueprint"
```
