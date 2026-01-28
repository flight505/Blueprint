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
| BF-001 | | | ⬚ |

---

## UI/UX Polish

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| UX-001 | macOS title bar and window dragging | High | ✅ |
| UX-002 | | | ⬚ |

---

## Feature Extensions

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| FE-001 | | | ⬚ |

---

## Plugins

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| PL-001 | **Nano Banana Image Editor** - AI-powered iterative image editing using Gemini 3 Image API. Upload images, edit with natural language, navigate editing history with click-to-revert. | Medium | 🔄 Research |

### PL-001: Nano Banana Image Editor Plugin

**Goal:** Extend Blueprint with iterative image editing capabilities for project diagrams, mockups, and visual assets.

**Features:**
- Upload images for AI-powered editing
- Natural language edit instructions
- Edit history with click-to-revert functionality
- Integration with Blueprint's document workflow

**Research:**
- [x] Analyze reference implementation (`nano-banana-editor-main/`)
- [ ] Define plugin architecture for Blueprint
- [ ] Determine Gemini 3 Image API integration approach
- [ ] Design UI/UX for editor panel

**Reference:** `nano-banana-editor-main/` - Next.js implementation (by Warp team)

---

#### Research Notes: Reference Implementation Analysis

**Tech Stack (Reference):**
- Next.js 15.5 with App Router
- `@google/genai` v1.17.0 for Gemini API
- TypeScript + Tailwind CSS
- Client-side state management with React hooks

**Core Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (page.tsx)                     │
├─────────────────────────────────────────────────────────────┤
│  State:                                                      │
│  - selectedImage: string | null     (current image base64)  │
│  - selectedFile: File | null        (for API submission)    │
│  - instructions: string             (edit prompt)           │
│  - imageHistory: ImageHistoryItem[] (revert stack)          │
│  - isSubmitting: boolean            (loading state)         │
├─────────────────────────────────────────────────────────────┤
│  Flow:                                                       │
│  1. Upload image → FileReader → base64                      │
│  2. Enter instructions → Submit form                        │
│  3. POST to /api/process-image                              │
│  4. Response: new image replaces current, old → history     │
│  5. Click history item → truncate & revert (like git reset) │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (route.ts)                         │
├─────────────────────────────────────────────────────────────┤
│  1. Parse FormData (image + instructions)                   │
│  2. Convert image to base64                                 │
│  3. Call Gemini API:                                        │
│     model: 'gemini-2.5-flash-image-preview'                 │
│     contents: [{ parts: [text, inlineData] }]               │
│  4. Extract generated image from response                   │
│  5. Return as data:image/png;base64,...                     │
└─────────────────────────────────────────────────────────────┘
```

**Key API Call:**
```typescript
const response = await genAI.models.generateContent({
  model: 'gemini-2.5-flash-image-preview',
  contents: [{
    parts: [
      { text: instructions },
      { inlineData: { mimeType: file.type, data: base64Data } }
    ]
  }]
});
```

**Blueprint Plugin Architecture (Proposed):**

```
src/
├── main/services/
│   └── ImageEditorService.ts      # Gemini API integration (main process)
├── renderer/components/
│   └── image-editor/
│       ├── ImageEditorPanel.tsx   # Main editor UI
│       ├── ImageHistory.tsx       # History strip component
│       ├── ImageUploader.tsx      # Drag & drop upload
│       └── index.ts
└── preload.ts                     # Add IPC handlers
```

**Integration Points:**
1. **Activity Bar** - New "Image" section icon
2. **IPC Handlers** - `imageEditor:process`, `imageEditor:getHistory`
3. **SecureStorageService** - Already has Gemini API key storage
4. **Document Integration** - Insert edited images into TipTap editor

**Dependencies Needed:**
- `@google/genai` (already in use via GeminiService.ts for Deep Research)

**Open Questions:**
- [ ] Separate panel or modal?
- [ ] Save history to database or session-only?
- [ ] Max image size limits?
- [ ] Integration with export (PDF/DOCX)?

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
- SH-001-004: Security hardening (path validation, IPC validation, CSP, encryption)
- DC-001: CLAUDE.md documentation
