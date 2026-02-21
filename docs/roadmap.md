# Blueprint — Roadmap

What has been done, what could be done, and what was deliberately skipped.

---

## Completed (v1.0.x)

### Core Application
- Electron app with React 19, TypeScript, TailwindCSS 4, Vite build
- Two-pane layout: chat/planning left, TipTap editor right
- macOS-native title bar with traffic lights and draggable region
- Legend State for reactive UI state; SQLite for persistent data
- File browser with tree view, fuzzy search, content search

### AI Integration
- Claude API via Anthropic SDK with streaming support (`.stream()` + `.finalMessage()`)
- Multi-model routing (Haiku/Sonnet/Opus) with deterministic task classification
- Adaptive thinking for Opus and Sonnet; budget-based thinking for Haiku
- Structured outputs with Zod schemas (`messages.parse()`) for typed AI responses
- Server-side compaction (beta) for long conversation sessions
- ContextManager bridged to AgentService via opt-in `trackContext` flag

### Research and Citations
- Perplexity (via OpenRouter) for fast lookups
- Gemini Deep Research for comprehensive analysis
- Citation tracking in `.citations.json` sidecar files
- Citation verification via OpenAlex and Crossref APIs
- Confidence scoring (heuristic-based: hedging language, citation density, specificity)

### Security
- Path traversal protection in FileSystemService
- IPC input validation on all handlers
- Content Security Policy headers
- API keys encrypted via OS keychain (SecureStorageService)

### Export
- PDF via Pandoc, DOCX via `docx`, PPTX via `pptxgenjs`
- Citation aggregation with IEEE formatting

### Image Editing (Nano Banana)
- Gemini 2.5 Flash Image API for natural-language image editing
- Upload, edit, history with click-to-revert
- SQLite-backed persistent history
- Insert edited images into TipTap documents

### Quality and Tech Debt Cleaned
- SDK updated to 0.77.0; model IDs migrated to current aliases
- Streaming content blocks preserved (tool_use, thinking, compaction)
- Session history rollback on API failure
- Unused code, redundant exports, stale imports removed
- KaTeX font warnings fixed; Storybook model IDs corrected

---

## Future Opportunities

### Performance (documented, not yet implemented)
- **Lazy-load Mermaid core** — saves ~400 KB from initial bundle
- **Lazy-load KaTeX** — saves ~250 KB, load only when math expressions present
- **Lazy-load export libraries** — dynamic import in ExportModal
- **Vite `manualChunks`** — split react-vendor, editor, markdown, animation for better caching
- **Trim KaTeX fonts** — keep woff2 only (Chromium), drop woff/ttf (~650 KB saved)

### Features
- **Collaborative export** — share projects via Git integration or exported bundles
- **Jira/Linear export** — convert sprint plans to issue tracker tickets
- **Custom slide themes** — user-defined color palettes and layouts for PPTX export
- **Diagram editing improvements** — live Mermaid preview in modal, AI-assisted diagram modification
- **Bulk edit operations** — find-and-replace across all project files

### Architecture
- **Full server-side compaction migration** — replace ContextManager's client-side summarization once the compaction API exits beta and sessions regularly exceed ~100K tokens
- **ContextManager event-message alignment** — currently tracks a parallel event system disconnected from API message history; reconciling these would enable unified context management

---

## Intentionally Deferred

| Decision | Rationale |
|----------|-----------|
| **Plugin system** | Adds API surface complexity with no current demand. Features ship as integrated modules using existing IPC, state, and database patterns. |
| **Cloud sync** | Local-first is a feature, not a limitation. Users control their data. Revisit only if multi-device usage becomes a real need. |
| **Real-time collaboration** | Single-user desktop app. The export pipeline (PDF/DOCX/PPTX) is the collaboration mechanism. |
| **Full compaction migration** | Beta API (`context-management-2025-06-27` header). Current sessions rarely hit the token threshold. Keep ContextManager's structured event tracking for its metadata value. |
| **framer-motion replacement** | ~120 KB in bundle, but works well. CSS animations would save size at the cost of animation quality and developer ergonomics. Low priority for an Electron app. |
| **Web-based viewer** | Would require a separate deployment target and authentication layer. Out of scope for a desktop-first tool. |
