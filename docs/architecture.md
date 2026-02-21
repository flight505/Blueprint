# Blueprint Architecture

## Project Overview

Blueprint is an Electron desktop application for AI-powered project planning using the Claude API. It provides a chat-driven interface with a rich document editor, research integration (Perplexity + Gemini), citation management, confidence scoring for hallucination detection, and multi-format document export (PDF/DOCX/PPTX).

## Directory Structure

```
src/
├── main.ts                        # Electron main process entry point
├── preload.ts                     # IPC bridge (contextBridge.exposeInMainWorld)
├── vite-env.d.ts                  # Vite type declarations
├── main/
│   ├── permissions.ts             # macOS file/network permission checks
│   ├── ipc/                       # IPC handler modules (16 domain files)
│   │   ├── index.ts               # registerAllHandlers() barrel
│   │   ├── validation.ts          # Input validation (validatePath, validateString, validateObject)
│   │   └── *.ipc.ts               # Domain-specific handler registrations
│   └── services/                  # Backend services (23 files)
│       └── *.ts                   # Service classes + singletons
├── shared/
│   └── types/                     # Shared type definitions (10 domain files + barrel)
│       ├── index.ts               # Re-exports all type modules
│       └── *.types.ts             # Domain-specific interfaces and types
├── renderer/
│   ├── App.tsx                    # Root component (sidebar + panel layout)
│   ├── index.tsx                  # React entry point
│   ├── index.css                  # Global styles + TailwindCSS
│   ├── state/
│   │   ├── store.ts               # Legend State observable store
│   │   └── imageEditorStore.ts    # Image editor state
│   ├── hooks/                     # React hooks (10 files)
│   └── components/                # UI components (34 directories)
└── test/
    └── setup.ts                   # Vitest test setup
```

## Service Map

| Service | File | Responsibility |
|---------|------|----------------|
| AgentService | `AgentService.ts` | Claude API sessions, message streaming, conversation management |
| CheckpointService | `CheckpointService.ts` | Save/resume phase execution checkpoints |
| CitationAttachmentService | `CitationAttachmentService.ts` | Attach citations from RAG sources to generated text |
| CitationManager | `CitationManager.ts` | CRUD for `.citations.json` sidecar files per document |
| CitationVerificationService | `CitationVerificationService.ts` | Verify citations via OpenAlex and Crossref APIs |
| ConfidenceScoringService | `ConfidenceScoringService.ts` | Paragraph-level confidence scoring using linguistic indicators |
| ContextManager | `ContextManager.ts` | Session context tracking with automatic Haiku-based compaction |
| DatabaseService | `DatabaseService.ts` | SQLite persistence (better-sqlite3) for sessions, documents, prompts, checkpoints, image edits |
| DOCXGenerator | `DOCXGenerator.ts` | Markdown-to-DOCX export |
| FileSystemService | `FileSystemService.ts` | Secure file I/O with path traversal protection and allowed base paths |
| GeminiService | `GeminiService.ts` | Google Gemini API for deep research with progress checkpoints |
| HallucinationDashboardService | `HallucinationDashboardService.ts` | Aggregate hallucination and verification metrics per project |
| ImageEditorService | `ImageEditorService.ts` | AI image editing via Gemini 2.5 Flash Image API |
| ModelRouter | `ModelRouter.ts` | Task complexity classification and Claude model selection (haiku/sonnet/opus) |
| OpenRouterService | `OpenRouterService.ts` | Perplexity Sonar Pro queries via OpenRouter API |
| PDFGenerator | `PDFGenerator.ts` | Markdown-to-PDF export via Pandoc |
| PhaseOrchestrator | `PhaseOrchestrator.ts` | Sequential phase execution with pause/resume/approval gates |
| PPTXGenerator | `PPTXGenerator.ts` | Markdown-to-PPTX export with theming |
| ResearchRouter | `ResearchRouter.ts` | Route research queries to Perplexity (quick) or Gemini (comprehensive) |
| ReviewQueueService | `ReviewQueueService.ts` | Aggregate low-confidence content for human review |
| SecureStorageService | `SecureStorageService.ts` | Encrypted API key storage via Electron safeStorage |
| StructuredOutputSchemas | `StructuredOutputSchemas.ts` | Zod schemas for Claude structured outputs (confidence, citations, plans) |
| UpdateService | `UpdateService.ts` | Auto-update via electron-updater |

All services are in `src/main/services/`. Each exports a singleton instance.

## IPC Domain Index

| Domain | File | Handlers | Key Channels |
|--------|------|----------|--------------|
| System | `system.ipc.ts` | 9 | `permissions:check`, `app:getVersion`, `recentProjects:*` |
| Filesystem | `filesystem.ipc.ts` | 8 | `fs:selectDirectory`, `fs:readDirectory`, `fs:readFile`, `fs:writeFile`, `fs:searchInFiles` |
| Settings | `settings.ipc.ts` | 10 | `secureStorage:setApiKey`, `secureStorage:getApiKey`, `prompt:save`, `prompt:listAll` |
| Models | `models.ipc.ts` | 7 | `modelRouter:classifyTask`, `modelRouter:getAvailableModels`, `modelRouter:setDefaultModel` |
| Database | `database.ipc.ts` | 12 | `db:saveSession`, `db:getSession`, `db:saveDocument`, `db:searchDocumentsByEmbedding` |
| Agent | `agent.ipc.ts` | 16 | `agent:initialize`, `agent:sendMessage`, `agent:sendMessageStream`, `agent:sendMessageParsed` |
| Research | `research.ipc.ts` | 24 | `openRouter:research`, `gemini:deepResearch`, `researchRouter:research`, `researchRouter:researchStream` |
| Context | `context.ipc.ts` | 13 | `contextManager:addEvent`, `contextManager:compact`, `contextManager:getFullContext` |
| Confidence | `confidence.ipc.ts` | 9 | `confidence:computeParagraph`, `confidence:computeDocument`, `confidence:processStreaming` |
| Citation | `citation.ipc.ts` | 21 | `citation:addCitation`, `citation:loadCitations`, `citationVerification:verifyCitation`, `citationAttachment:attachCitations` |
| Orchestrator | `orchestrator.ipc.ts` | 24 | `orchestrator:start`, `orchestrator:pause`, `orchestrator:approveAndContinue`, `checkpoint:save` |
| Review | `review.ipc.ts` | 12 | `review:scanDocument`, `review:acceptItem`, `review:editItem`, `review:dismissItem` |
| Dashboard | `dashboard.ipc.ts` | 7 | `dashboard:analyzeDocument`, `dashboard:getProjectMetrics`, `dashboard:exportReport` |
| Export | `export.ipc.ts` | 14 | `pdf:generatePDF`, `docx:generateDOCX`, `pptx:generatePPTX`, `pptx:getAvailableThemes` |
| ImageEditor | `imageEditor.ipc.ts` | 13 | `imageEditor:processImage`, `imageEditor:saveToHistory`, `imageEditor:getHistory` |
| Update | `update.ipc.ts` | 10 | `update:checkForUpdates`, `update:downloadUpdate`, `update:quitAndInstall` |

All IPC modules are in `src/main/ipc/`. Registration is batched in `index.ts`: simple handlers first, then streaming, then remaining domains.

## Component Tree

```
App.tsx
├── WelcomeScreen                  # Onboarding + recent projects
├── NewProjectWizard               # Project setup flow
├── PermissionsCheck               # macOS permissions gate
├── CommandPalette                 # ⌘K command palette
├── FileQuickOpen                  # ⌘P file quick open
├── GlassSidebar                   # Navigation rail + panel
│   ├── GlassSidebarBrand
│   ├── GlassSidebarRail
│   ├── GlassSidebarPanel
│   └── GlassSidebarFooter
├── TabBar                         # Document tabs
├── [Left Panel - by section]
│   ├── ChatContainer              # Chat UI
│   │   ├── ChatMessage
│   │   ├── StreamingChatMessage
│   │   └── AskUserQuestion
│   ├── FileBrowser                # File explorer
│   ├── SearchPanel                # File search
│   ├── ContextPanel               # Context window viewer
│   ├── PhaseDashboard             # Phase execution
│   │   └── ApprovalGate
│   ├── ImageEditorPanel           # Image editing
│   │   ├── ImageUploader
│   │   └── ImageHistory
│   ├── ExportModal                # PDF/DOCX/PPTX export
│   ├── HallucinationDashboard     # Metrics dashboard
│   ├── CitationVerificationPanel  # Citation verification
│   ├── ReviewQueue                # Human review queue
│   └── ApiKeySettings / ThemeToggle
├── [Right Panel]
│   └── VirtualizedDocument        # Document viewer with TipTap editor
│       └── TiptapEditor
│           └── extensions/
│               ├── AIInlineEdit
│               ├── ConfidenceIndicator
│               ├── MermaidBlock
│               └── CollaborationSetup
├── InlineEditOverlay              # Floating inline edit UI
├── DiffPreview                    # Change diff modal
├── DiagramEditModal               # Mermaid diagram editor
├── ConfidenceTooltip              # Confidence score tooltip
└── UpdateNotification             # Auto-update notification
```

## Data Flow

A user message flows through the system as follows:

```
Renderer (ChatContainer)
  │  user types message, calls window.electronAPI.agentSendMessageStream()
  ▼
Preload (preload.ts)
  │  ipcRenderer.invoke('agent:sendMessageStream', sessionId, message, options)
  ▼
IPC Handler (agent.ipc.ts)
  │  validates args, calls agentService.sendMessageStream()
  ▼
AgentService
  │  builds message array, selects model via ModelRouter
  │  calls Anthropic SDK client.messages.stream()
  ▼
Anthropic API
  │  returns streaming response chunks
  ▼
AgentService (callback)
  │  fires chunk callback with { type, content }
  ▼
IPC Handler (agent.ipc.ts)
  │  webContents.send('agent:streamChunk', sessionId, chunk)
  ▼
Preload (preload.ts)
  │  ipcRenderer.on('agent:streamChunk') fires registered callback
  ▼
Renderer (useStreaming hook → ChatContainer)
  │  updates streaming state, renders StreamingChatMessage
  ▼
ConfidenceScoringService (optional)
  │  processes completed text for confidence indicators
```

## Database Schema

Single SQLite database at `~/Library/Application Support/Blueprint/blueprint.db`. WAL mode enabled.

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `sessions` | `id` PK, `project_path`, `conversation_history` (JSON), `model`, `created_at`, `updated_at` | Chat session persistence |
| `documents` | `id` PK, `session_id` FK→sessions, `file_path`, `content`, `embedding` (BLOB, 1536-dim float32), `created_at`, `updated_at` | Document storage with vector embeddings for semantic search |
| `prompts` | `id` PK, `name`, `template`, `description`, `is_built_in`, `created_at`, `updated_at` | Prompt library templates |
| `recent_projects` | `id` PK, `path` UNIQUE, `name`, `last_opened_at`, `created_at` | Recently opened project paths |
| `checkpoints` | `id` PK, `project_id`, `project_path`, `project_name`, `execution_state` (JSON), `current_phase_index`, `status`, `created_at`, `updated_at` | Phase orchestration save/resume state |
| `image_edits` | `id` PK, `project_id`, `image_data` (base64), `prompt`, `response_text`, `processing_time_ms`, `created_at` | Image editor history (Nano Banana) |

**Indexes:** `sessions(project_path)`, `documents(session_id)`, `documents(file_path)`, `prompts(name)`, `recent_projects(last_opened_at)`, `checkpoints(project_id)`, `checkpoints(project_path)`, `image_edits(project_id)`.

**Relationships:** `documents.session_id` → `sessions.id` (CASCADE delete).

Additional service-specific databases (managed outside DatabaseService):
- `citation-cache.db` -- Citation verification cache (CitationVerificationService)
- `hallucination-metrics.db` -- Dashboard metrics (HallucinationDashboardService)

## Shared Types

All shared types live in `src/shared/types/` and are re-exported through `index.ts`.

| File | Domain | Key Types |
|------|--------|-----------|
| `common.types.ts` | Cross-cutting | `PermissionStatus`, `PermissionsResult`, `ApiKeyType` |
| `filesystem.types.ts` | File I/O | `FileNode`, `FileContent`, `QuickOpenFile`, `SearchResult`, `SearchMatch` |
| `agent.types.ts` | Claude API | `AgentSession`, `StreamChunk`, `CreateSessionOptions`, `SendMessageOptions`, `MessageParam`, `ContentBlock` |
| `database.types.ts` | Persistence | `StoredSession`, `SessionInput`, `StoredDocument`, `DocumentInput`, `StoredPrompt`, `PromptInput`, `RecentProject`, `StoredImageEdit` |
| `models.types.ts` | Model routing | `TaskComplexity`, `ModelId`, `TaskType`, `TaskClassification` |
| `context.types.ts` | Context management | `ContextEvent`, `ContextStats`, `CompactionResult`, `CompactionSummary` |
| `research.types.ts` | Research providers | `ResearchResponse`, `ResearchMode`, `ProjectPhase`, `ResearchProvider`, `UnifiedResearchResponse` |
| `citation.types.ts` | Citations | `ManagedCitation`, `CitationFile`, `CitationVerificationResult`, `RAGSource`, `AttachmentResult` |
| `confidence.types.ts` | Confidence scoring | `ParagraphConfidence`, `DocumentConfidence`, `ConfidenceBreakdown`, `ConfidenceScoringConfig` |
| `orchestrator.types.ts` | Phase execution | `DocumentMetrics`, `ProjectMetrics`, `TrendData`, `PhaseState`, `ProjectExecutionState`, `PhaseOrchestratorConfig` |

The preload script (`src/preload.ts`) re-exports all shared types for renderer consumption.
