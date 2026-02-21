# Blueprint — Design Decisions

Why things are built the way they are. For implementation details, read the code.

---

## Why Electron

Blueprint needs direct file system access (reading/writing project files, SQLite databases), offline capability (planning sessions without internet after initial setup), and native OS integration (macOS keychain for API keys, system notifications, window management). A web app would require a separate backend server and could not access local files securely. Electron provides all of this with a single TypeScript codebase.

**Trade-off accepted:** Larger binary size (~150 MB) in exchange for full native access and cross-platform distribution from one codebase.

---

## IPC Architecture

All communication between renderer (React UI) and main process (Node.js backend) goes through typed IPC channels via a preload bridge. This enforces Electron's security model: the renderer never has direct Node.js access.

**Pattern:**
- Main process registers handlers: `ipcMain.handle('namespace:method', handler)`
- Preload exposes safe API: `contextBridge.exposeInMainWorld('electronAPI', { ... })`
- Renderer calls: `window.electronAPI.method(args)`

**Why this matters:**
- Context isolation prevents renderer from accessing Node.js APIs directly
- All inputs are validated at the IPC boundary (path traversal, type checking)
- The preload bridge acts as an explicit contract between processes
- Handlers are organized by domain: `agent:*`, `fs:*`, `db:*`, `research:*`, etc.

---

## State Management — Legend State

Chose Legend State (`@legendapp/state`) over Zustand, Jotai, or Redux.

**Why:**
- Fine-grained reactivity without manual memoization — components re-render only when observed values change
- Observable-based model fits naturally with streaming data (AI responses, progress updates)
- Persistence plugins for SQLite integration without boilerplate
- Smaller API surface than Redux; more structured than Zustand for complex state

**What lives where:**
- **Legend State (renderer):** UI state, chat messages, editor state, panel visibility
- **SQLite (main process):** Sessions, projects, research cache, image edit history — anything that survives restart
- **IPC bridge:** Renderer requests persistent data from main; main pushes streaming updates to renderer

---

## Editor — TipTap

Chose TipTap (built on ProseMirror) over Monaco, CodeMirror, or raw `contentEditable`.

**Why:**
- Rich text editing with structured document model — not just code editing
- Extension architecture: Markdown input/output, Mermaid diagram rendering, KaTeX math, syntax highlighting all as composable extensions
- ProseMirror's transaction model provides reliable undo/redo and collaborative editing primitives
- Selection-based inline AI editing maps naturally to PipTap's selection and decoration APIs

**What we do NOT use TipTap for:**
- Diagram source editing (Mermaid code) — uses a simple textarea in a modal
- The chat input — uses a standard HTML input

---

## Security Model

Three layers of defense:

**1. Content Security Policy (CSP)**
Production builds set strict CSP headers that block inline scripts, restrict asset origins, and prevent XSS. Dev mode relaxes these for hot reload.

**2. Path Validation**
`FileSystemService` validates every file path against a list of allowed base directories before any read/write. Prevents path traversal attacks (`../../../etc/passwd`) even if a malicious prompt reaches the file system layer.

**3. Encrypted API Key Storage**
`SecureStorageService` uses OS-level encryption (macOS Keychain, Windows Credential Manager) via Electron's `safeStorage`. Keys are never stored in plain text, environment variables, or localStorage.

**Why all three:** An Electron app runs with full user privileges. A single compromised layer (e.g., an XSS in rendered markdown) must not grant access to the file system or API keys.

---

## macOS Title Bar

Uses `titleBarStyle: 'hiddenInset'` to hide the native title bar while keeping the traffic light buttons (close/minimize/maximize).

**Key constraints:**
- Traffic lights positioned at `(16, 12)` — standard macOS spacing
- Custom draggable region: 36px tall (`h-9`), CSS class `title-bar-drag-region`
- App content starts below the drag region to avoid click conflicts
- `-webkit-app-region: drag` on the title bar, `-webkit-app-region: no-drag` on interactive elements within it

**Why not `frameless`:** Frameless windows lose the traffic lights entirely, requiring custom recreation that never feels native on macOS.

---

## Database — SQLite via better-sqlite3

Chose SQLite over IndexedDB, LevelDB, or a JSON file store.

**Why:**
- Synchronous API (`better-sqlite3`) in the main process — no callback complexity for simple CRUD
- Single-file database, easy to backup and inspect
- SQL queries for complex lookups (sessions by date, research cache expiry, citation search)
- Multiple databases by concern: `blueprint.db` (main), `citation-cache.db`, `hallucination-metrics.db`

**Why not IndexedDB:** IndexedDB lives in the renderer process, which would require IPC round-trips for every database operation and complicates the security model. SQLite in the main process keeps data access centralized.

**Location:** `~/Library/Application Support/Blueprint/` (macOS), following Electron's `app.getPath('userData')` convention.

---

## Multi-Model Routing

`ModelRouter` classifies tasks by complexity and routes to the appropriate Claude model:

- **Haiku** — fast, cheap: simple lookups, formatting, short answers
- **Sonnet** — balanced: most planning tasks, editing, analysis
- **Opus** — powerful, expensive: complex architecture decisions, deep reasoning

Classification uses keyword analysis and query characteristics. Ties resolve deterministically to Sonnet (the safe middle ground). Models use current aliases (`claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6`) rather than date-suffixed IDs.

**Adaptive thinking** is enabled for Opus and Sonnet (extended thinking on complex tasks). Haiku uses budget-based thinking.

---

## Research Integration

`ResearchRouter` routes queries to external research providers:

- **Perplexity (via OpenRouter):** Fast factual lookups, competitive analysis, quick answers (~30s)
- **Gemini Deep Research:** Comprehensive multi-source analysis for major decisions (~60 min)

Routing depends on the configured research mode (Quick/Balanced/Comprehensive/Auto). Citations from research are stored in `.citations.json` sidecar files alongside markdown outputs, using IEEE-style `[1]` numbering.

---

## Document Export

Three export formats, each chosen for a specific use case:

- **PDF** (via Pandoc + LaTeX): Professional reports with TOC, cover page, citations
- **DOCX** (via `docx` npm): Editable documents for stakeholder review
- **PPTX** (via `pptxgenjs`): Slide decks with theme-matched backgrounds

All exports aggregate citations from `.citations.json` sidecar files and render Mermaid diagrams to images via `mmdc` CLI.

---

## What We Intentionally Did Not Build

- **Plugin system:** Features ship as integrated modules, not plugins. Avoids API surface complexity.
- **Cloud sync:** Local-first only. Users own their data. Cloud sync deferred until there is clear demand.
- **Real-time collaboration:** Single-user desktop app. Collaboration happens via exported documents.
- **Custom agent definitions:** Fixed planning workflow. Customization comes from research mode and phase selection, not custom agent scripting.
