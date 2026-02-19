# Blueprint v1.0.x Improvements

Tracking bug fixes, polish, and feature extensions before v1.1/v2.0.

---

## Status Legend
- ⬚ Todo
- 🔄 In Progress
- ✅ Complete

---

## Bug Fixes

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| BF-001 | **Streaming loses content blocks** — `AgentService.sendMessageStream` appends only text string to history instead of full `response.content` array. Loses tool_use, thinking, and compaction blocks. | High | ✅ |
| BF-002 | **Stale model ID in Storybook** — `ModelSelector.stories.tsx` references retired `claude-3-5-haiku-20241022` | Low | ✅ |

---

## UI/UX Polish

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| UX-001 | macOS title bar and window dragging | High | ✅ |
| UX-002 | Replace all emojis with Lucide icons for professional look | Medium | ✅ |
| UX-003 | Glass UI sidebar with hover/active violet glow effects | Medium | ✅ |
| UX-004 | | | ⬚ |

---

## Feature Extensions

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| FE-001 | **Update model IDs to current aliases** — `ModelRouter.ts` uses deprecated date-suffixed Claude 4.0 IDs (`claude-*-4-20250514`). Update to current aliases: `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6`. Also update hardcoded IDs in `DatabaseService.ts`, `DiagramEditModal.tsx`, `ModelSelector.stories.tsx` | Critical | ✅ |
| FE-002 | **Add adaptive thinking support** — Enable `thinking: { type: "adaptive" }` for Opus 4.6 in AgentService. Blueprint's planning use case would benefit significantly from extended thinking on complex tasks | High | ✅ |
| FE-003 | **Upgrade streaming to `client.messages.stream()`** — Replace low-level `create({ stream: true })` + manual event casting with SDK's `.stream()` helper. Provides `.finalMessage()` for reliable history append | Medium | ✅ |
| FE-004 | **Add structured outputs for data extraction** — Use `messages.parse()` with Zod schemas for confidence scoring, citation parsing, and phase planning. Guarantees valid JSON output | Medium | ⬚ |
| FE-005 | **Evaluate server-side compaction** — API now offers beta server-side compaction (`compact-2026-01-12`) for Opus 4.6. Could augment or replace custom `ContextManager` Haiku summarization for long sessions | Low | ⬚ |

---

## Plugins

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| PL-001 | **Nano Banana Image Editor** - AI-powered iterative image editing using Gemini 2.5 Flash Image API. Upload images, edit with natural language, navigate editing history with click-to-revert. | Medium | ✅ Complete |

### PL-001: Nano Banana Image Editor

**Goal:** Extend Blueprint with iterative image editing capabilities for project diagrams, mockups, and visual assets.

**Architecture Decision:** Integrated Feature Module (not a plugin system)
- Ships as first-class feature using existing Blueprint patterns
- Reuses IPC, SecureStorageService, Legend State, SQLite
- No external plugin API complexity

**Features:**
- Upload images (drag & drop, file picker)
- Natural language edit instructions via Gemini 2.5 Flash Image API
- Edit history with click-to-revert (git-like linear history)
- Insert edited images into TipTap documents
- Persistent history in SQLite (survives app restart)

**Research:** ✅ Complete
- [x] Analyze reference implementation (`nano-banana-editor-main/`)
- [x] Define architecture approach (Integrated Feature Module)
- [x] Determine Gemini API integration (reuse existing `@google/genai` package)

**Implementation Plan:**

| Phase | Task | Status |
|-------|------|--------|
| 1 | Create `ImageEditorService.ts` in main process | ✅ |
| 2 | Add IPC handlers in `main.ts` and `preload.ts` | ✅ |
| 3 | Create Legend State slice `imageEditorStore.ts` | ✅ |
| 4 | Build `ImageEditorPanel.tsx` UI component | ✅ |
| 5 | Build `ImageHistory.tsx` history strip | ✅ |
| 6 | Build `ImageUploader.tsx` upload zone | ✅ |
| 7 | Add "Image" section to Activity Bar | ✅ |
| 8 | SQLite schema for `image_edits` table | ✅ |
| 9 | TipTap integration (insert image command) | ✅ |
| 10 | Testing & polish | ✅ |

**Reference:** `nano-banana-editor-main/` - Next.js implementation (by Warp team)

---

#### Technical Specification

**File Structure:**
```
src/
├── main/services/
│   └── ImageEditorService.ts      # Gemini API integration (main process)
├── renderer/
│   ├── components/image-editor/
│   │   ├── ImageEditorPanel.tsx   # Main editor UI
│   │   ├── ImageHistory.tsx       # History strip (fixed bottom)
│   │   ├── ImageUploader.tsx      # Drag & drop upload zone
│   │   └── index.ts               # Barrel export
│   └── state/
│       └── imageEditorStore.ts    # Legend State observable
├── main.ts                        # Add IPC handlers
└── preload.ts                     # Expose imageEditor API
```

**Database Schema:**
```sql
CREATE TABLE image_edits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  image_data TEXT NOT NULL,           -- base64 encoded
  prompt TEXT NOT NULL,
  response_text TEXT,                 -- AI explanation (optional)
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_image_edits_project ON image_edits(project_id);
```

**IPC Handlers:**
```typescript
// main.ts
ipcMain.handle('imageEditor:process', async (_, { imageBase64, mimeType, instructions }) => {...});
ipcMain.handle('imageEditor:getHistory', async (_, projectId) => {...});
ipcMain.handle('imageEditor:revertTo', async (_, { projectId, editId }) => {...});
ipcMain.handle('imageEditor:clearHistory', async (_, projectId) => {...});
```

**Gemini API Call:**
```typescript
const response = await genAI.models.generateContent({
  model: 'gemini-2.5-flash-preview-05-20',  // Latest image model
  contents: [{
    parts: [
      { text: instructions },
      { inlineData: { mimeType, data: imageBase64 } }
    ]
  }]
});
```

**Design Decisions:**
- **Panel placement:** Dedicated section in Activity Bar (like Explorer, Planning)
- **History persistence:** SQLite database (survives restart)
- **Max image size:** 10MB (Gemini API limit)
- **Export integration:** Edited images can be inserted into documents, included in PDF/DOCX export

**Dependencies:**
- `@google/genai` - Already installed (used by GeminiService.ts)
- No new dependencies required

---

## Performance

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| PF-001 | | | ⬚ |

---

## Technical Debt

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| TD-001 | Remove unused variables (setExportSections, initializeAgent, createSession) | Low | ⬚ |
| TD-002 | Fix KaTeX font resolution warnings during build | Low | ⬚ |
| TD-003 | **Update `@anthropic-ai/sdk` from 0.71.2 to 0.77.0** — 6 releases behind. New features: tool runner helpers, structured output improvements, compaction support | High | ✅ |
| TD-004 | **Fix `systemPrompt` type hack in AgentService** — Uses `(session as AgentSession & { systemPrompt?: string })` cast. Add `systemPrompt` as proper optional field on `AgentSession` interface | Low | ✅ |
| TD-005 | **Use top-level SDK imports** — Deep imports from `@anthropic-ai/sdk/resources/messages/messages` may break across SDK versions. Use re-exports from `@anthropic-ai/sdk` instead | Medium | ✅ |

---

## Security Hardening

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| SH-001 | Path traversal protection in FileSystemService | High | ✅ |
| SH-002 | IPC input validation | High | ✅ |
| SH-003 | Content Security Policy headers | High | ✅ |
| SH-004 | Secure API key storage with encryption | High | ✅ |

---

## Documentation

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| DC-001 | Create CLAUDE.md project configuration | Medium | ✅ |
| DC-002 | | | ⬚ |

---

## Notes

### Adding Items
Use the next available ID in each category (e.g., BF-002, UX-003).

### Priority Levels
- **Critical** - Blocks usage, data loss risk
- **High** - Significant impact on UX or security
- **Medium** - Nice to have, improves experience
- **Low** - Minor polish, technical cleanup

### Completed Items Archive
Items marked ✅ can be moved here after release:

#### v1.0.1 (pending)
- UX-001: macOS title bar and window dragging
- UX-002: Lucide icons replacing emojis (centralized icon module)
- UX-003: Glass UI sidebar with violet glow hover/active states
- SH-001-004: Security hardening (path validation, IPC validation, CSP, encryption)
- DC-001: CLAUDE.md documentation
