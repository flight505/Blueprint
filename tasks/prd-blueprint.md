# PRD: Blueprint Electron Application

## Introduction

Blueprint is a standalone Electron desktop application for AI-powered project planning. It provides an interactive planning interface with dual-pane layout, real-time markdown rendering, inline AI editing, and comprehensive diagram support. The application integrates Claude Agent SDK V2 for intelligent planning workflows, supports multiple research providers (Perplexity, Gemini), and generates professional outputs (PDF, DOCX, PPTX).

**Problem:** CLI-based planning tools lack visual feedback, require constant context-switching, and make iterative editing cumbersome.

**Solution:** A VSCode-inspired desktop app with inline AI editing, rendered markdown previews, and theme-aware document generation.

## Goals

- Deliver a cross-platform Electron app (macOS, Windows, Linux) with hot reload development
- Integrate Claude Agent SDK V2 for session management and streaming conversations
- Render markdown with Mermaid diagrams, code highlighting, and math equations
- Enable selection-based inline AI editing with diff preview
- Support Perplexity (fast) and Gemini Deep Research (comprehensive) providers
- Generate professional PDF, DOCX, and PPTX exports with citations
- Provide familiar navigation: Activity Bar, Command Palette, tabs, search

## Non-Goals

- Mobile applications (iOS/Android)
- Real-time collaboration (v2.0 feature)
- Cloud sync or hosted version
- Git integration (v1.1 feature)
- Custom agent definitions (v2.0 feature)

## Tech Stack (Locked Versions)

| Technology | Version | Purpose |
|------------|---------|---------|
| Electron | 40.0.0 | Desktop framework |
| React | 19.x | UI components |
| TypeScript | 5.9.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Vite | 5.x | Build tool |
| Claude Agent SDK | v2 | AI integration |
| better-sqlite3 | latest | Session persistence + vector extensions |
| Legend State | latest | Signals-based state (fine-grained reactivity) |
| Tiptap | latest | Rich text editor (replaces Monaco) |
| react-markdown | latest | Markdown rendering |

### SOTA Technology Decisions (See docs/SOTA-TECHNOLOGY-RESEARCH.md)

| Decision | Rationale |
|----------|-----------|
| **Legend State over Redux** | Fine-grained reactivity for streaming UI (10x fewer re-renders) |
| **Tiptap over Monaco** | Native markdown WYSIWYG, Yjs collaboration, AI extension API |
| **SQLite + vectors** | Semantic search over documents without external infrastructure |
| **Multi-model routing** | Haiku (autocomplete) → Sonnet (inline edit) → Opus (planning) |
| **Context compaction** | Summarize older events to optimize token usage |

## Development Environment Setup

**Known Issue:** Electron Forge Vite plugin v7.11.1 exits immediately.

**Workaround:**
```bash
# Terminal 1: Start Vite manually
pnpm exec vite --config vite.renderer.config.ts --port 5173

# Terminal 2: Run Electron
pnpm exec electron .vite/build/main.js
```

**Required Files:**
- `postcss.config.js` with `@tailwindcss/postcss` plugin
- `vite.renderer.config.ts` with `base: './'`
- `src/main.ts` with retry logic for dev server

---

## User Stories

### Phase 1: Foundation (Week 1-2)

#### US-001: Initialize Electron Project ✅ COMPLETE
**As a** developer, **I want** a working Electron + TypeScript + Vite setup **so that** I can build the application.

**Acceptance Criteria:**
- [x] Electron Forge project initialized with TypeScript template
  - **Must verify:** `pnpm create @electron-forge/app@latest blueprint -- --template=vite-typescript`
  - **Expected:** Project scaffolded successfully
- [x] Application window opens on launch
  - **Must verify:** `pnpm run start` or dev workaround
  - **Expected:** Electron window displays without errors
- [x] Hot reload updates renderer without full restart
  - **Must verify:** Edit `src/renderer.tsx`, observe change in browser
  - **Expected:** UI updates within 2 seconds
- [x] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No TypeScript errors

---

#### US-002: Configure Tailwind CSS 4 ✅ COMPLETE
**As a** developer, **I want** Tailwind CSS configured **so that** I can style components efficiently.

**Acceptance Criteria:**
- [x] Tailwind CSS 4 installed with PostCSS
  - **Must verify:** `pnpm add -D tailwindcss @tailwindcss/postcss`
  - **Expected:** Packages in devDependencies
- [x] CSS classes apply correctly in renderer
  - **Must verify:** Add `className="bg-blue-500 text-white p-4"` to component
  - **Expected:** Blue background, white text, padding visible
- [x] Dark mode utilities work (`dark:` prefix)
  - **Must verify:** Add `dark:bg-gray-900` and toggle dark mode
  - **Expected:** Background changes in dark mode
- [x] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-003: Create Two-Pane Resizable Layout ✅ COMPLETE
**As a** user, **I want** a resizable split-pane layout **so that** I can view chat and content side by side.

**Acceptance Criteria:**
- [x] Left pane (40% default) and right pane (60% default) display
  - **Must verify:** Run dev server, inspect layout
  - **Expected:** Two panes visible with correct proportions
- [x] Divider is draggable between 300px minimum widths
  - **Must verify:** Drag divider left and right
  - **Expected:** Panes resize smoothly, stop at minimums
- [x] Double-click divider resets to default split
  - **Must verify:** Drag divider, then double-click it
  - **Expected:** Returns to 40/60 split
- [x] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-004: Implement Activity Bar ✅ COMPLETE
**As a** user, **I want** a vertical Activity Bar **so that** I can quickly navigate between sections.

**Acceptance Criteria:**
- [x] 48px vertical bar renders on far left with icon buttons
  - **Must verify:** Run dev server, measure Activity Bar width
  - **Expected:** Fixed 48px bar with vertical icons
- [x] Top icons: Chat, Explorer, Search, Planning, Export, History
  - **Must verify:** Count icons and verify tooltips
  - **Expected:** 6 icons with correct labels
- [x] Bottom icons: Settings, Help
  - **Must verify:** Scroll/check bottom of Activity Bar
  - **Expected:** 2 icons pinned to bottom
- [x] Clicking icon switches active section
  - **Must verify:** Click each icon, observe left pane change
  - **Expected:** Left pane content updates per section
- [x] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-005: Add Activity Bar Keyboard Shortcuts ✅ COMPLETE
**As a** user, **I want** keyboard shortcuts for Activity Bar **so that** I can navigate without mouse.

**Acceptance Criteria:**
- [x] Cmd+1 through Cmd+6 switch sections
  - **Must verify:** Press Cmd+1, Cmd+2, etc.
  - **Expected:** Corresponding section activates
- [x] Cmd+, opens Settings section
  - **Must verify:** Press Cmd+,
  - **Expected:** Settings panel displays
- [x] Cmd+? opens Help section
  - **Must verify:** Press Cmd+Shift+/
  - **Expected:** Help panel displays
- [x] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-006: Create File Browser Component
**As a** user, **I want** a file tree browser **so that** I can navigate project files.

**Acceptance Criteria:**
- [ ] Tree view displays directory structure from project path
  - **Must verify:** Open project, view Explorer section
  - **Expected:** Folders and files render hierarchically
- [ ] File type icons display (markdown, YAML, images)
  - **Must verify:** Check icons for different file types
  - **Expected:** Distinct icons per file type
- [ ] Click file opens it in right pane
  - **Must verify:** Click a .md file
  - **Expected:** Content displays in right pane
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-007: Implement Light/Dark Theme Toggle
**As a** user, **I want** to switch themes **so that** I can reduce eye strain.

**Acceptance Criteria:**
- [ ] Theme toggle in Settings section
  - **Must verify:** Navigate to Settings, find theme toggle
  - **Expected:** Toggle or dropdown for Light/Dark/System
- [ ] Theme persists across app restarts
  - **Must verify:** Set dark mode, restart app
  - **Expected:** Dark mode active on restart
- [ ] All components respect theme
  - **Must verify:** Toggle theme, inspect UI elements
  - **Expected:** Backgrounds, text, borders update
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

### Phase 2: Agent SDK Integration (Week 3-4)

#### US-008: Install Claude Agent SDK V2
**As a** developer, **I want** Agent SDK integrated **so that** I can run AI planning sessions.

**Acceptance Criteria:**
- [ ] @anthropic-ai/claude-agent-sdk installed
  - **Must verify:** `pnpm add @anthropic-ai/claude-agent-sdk`
  - **Expected:** Package in dependencies
- [ ] AgentService class created in main process
  - **Must verify:** Check `src/main/AgentService.ts` exists
  - **Expected:** Class with session methods
- [ ] Test session creation works with API key
  - **Must verify:** Run test with valid API key
  - **Expected:** Session ID returned
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-009: Build Chat Message UI
**As a** user, **I want** chat bubbles for conversations **so that** I can read agent responses clearly.

**Acceptance Criteria:**
- [ ] User messages display right-aligned with distinct style
  - **Must verify:** Send message, observe alignment
  - **Expected:** User bubble on right, blue/accent color
- [ ] Assistant messages display left-aligned
  - **Must verify:** Receive response, observe alignment
  - **Expected:** Assistant bubble on left, gray/neutral color
- [ ] Messages support markdown rendering
  - **Must verify:** Agent returns markdown, check rendering
  - **Expected:** Code blocks, lists, links render correctly
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-010: Implement Streaming Text Display
**As a** user, **I want** streaming responses **so that** I see progress in real-time.

**Acceptance Criteria:**
- [ ] Text streams with typewriter effect
  - **Must verify:** Send message, observe gradual text appearance
  - **Expected:** Characters/words appear incrementally
- [ ] Streaming indicator shows while generating
  - **Must verify:** Observe UI during streaming
  - **Expected:** Pulsing dot or "typing..." indicator
- [ ] Latency under 100ms between tokens
  - **Must verify:** Time gap between token appearances
  - **Expected:** Smooth, responsive streaming
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-011: Create AskUserQuestion Component
**As a** user, **I want** interactive question UI **so that** I can respond to agent queries.

**Acceptance Criteria:**
- [ ] Multiple choice options render as radio buttons
  - **Must verify:** Trigger AskUserQuestion, inspect UI
  - **Expected:** Radio buttons for single-select questions
- [ ] Multi-select options render as checkboxes
  - **Must verify:** Trigger multi-select question
  - **Expected:** Checkboxes allow multiple selections
- [ ] "Other" option allows custom text input
  - **Must verify:** Select "Other", type custom answer
  - **Expected:** Text field appears, accepts input
- [ ] Submit button sends answer back to agent
  - **Must verify:** Select answer, click Submit
  - **Expected:** Agent continues conversation
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-012: Set Up SQLite Session Persistence
**As a** user, **I want** sessions saved to database **so that** I can resume conversations.

**Acceptance Criteria:**
- [ ] better-sqlite3 installed and configured
  - **Must verify:** `pnpm add better-sqlite3`
  - **Expected:** Package installed
- [ ] Sessions table stores session_id, project_path, conversation_history
  - **Must verify:** Inspect database schema
  - **Expected:** Table with required columns
- [ ] Session resumes with full history on project reopen
  - **Must verify:** Close app, reopen, check history
  - **Expected:** All previous messages display
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-013: Build Context Panel / Token Visualizer
**As a** user, **I want** to see what context the agent uses **so that** I understand token usage.

**Acceptance Criteria:**
- [ ] Context panel displays in sidebar or collapsible section
  - **Must verify:** Open Context section via Activity Bar
  - **Expected:** Panel shows context information
- [ ] Token counter displays current/max tokens
  - **Must verify:** Start conversation, check counter
  - **Expected:** Shows format like "2,450 / 200,000 tokens"
- [ ] List of included context files with toggle to exclude
  - **Must verify:** View file list, toggle one off
  - **Expected:** File removed from context, counter updates
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-014: Add API Key Configuration UI
**As a** user, **I want** to configure API keys **so that** I can use the app with my accounts.

**Acceptance Criteria:**
- [ ] Settings section has API key input fields
  - **Must verify:** Navigate to Settings
  - **Expected:** Fields for Claude, OpenRouter, Gemini keys
- [ ] Keys stored securely (not in plaintext files)
  - **Must verify:** Check storage mechanism (keychain/credential store)
  - **Expected:** Keys in OS secure storage
- [ ] Validation tests key before saving
  - **Must verify:** Enter invalid key, click Save
  - **Expected:** Error message, key not saved
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

### Phase 3: Markdown Rendering & Navigation (Week 5-6)

#### US-015: Configure react-markdown with Plugins
**As a** user, **I want** rendered markdown **so that** I can read formatted content.

**Acceptance Criteria:**
- [ ] react-markdown installed with remark-gfm, rehype-highlight
  - **Must verify:** Check package.json dependencies
  - **Expected:** Packages listed
- [ ] GitHub-flavored markdown renders (tables, strikethrough, task lists)
  - **Must verify:** Open GFM test file
  - **Expected:** All elements render correctly
- [ ] Code blocks have syntax highlighting
  - **Must verify:** Open file with code blocks
  - **Expected:** Code colored by language
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-016: Implement Mermaid Diagram Rendering
**As a** user, **I want** Mermaid diagrams rendered **so that** I can visualize architecture.

**Acceptance Criteria:**
- [ ] Mermaid code blocks render as SVG diagrams
  - **Must verify:** Open file with ```mermaid block
  - **Expected:** Diagram displays instead of code
- [ ] Diagrams support zoom and pan
  - **Must verify:** Hover/click diagram, use scroll/drag
  - **Expected:** Can zoom in/out, pan around
- [ ] Render performance under 100ms for typical diagrams
  - **Must verify:** Time diagram rendering
  - **Expected:** Fast, no visible lag
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-017: Add Math Equation Rendering (KaTeX)
**As a** user, **I want** math equations rendered **so that** I can include formulas.

**Acceptance Criteria:**
- [ ] Inline math ($...$) renders correctly
  - **Must verify:** Add `$E = mc^2$` to file
  - **Expected:** Equation renders inline
- [ ] Block math ($$...$$) renders centered
  - **Must verify:** Add block equation
  - **Expected:** Equation displays centered
- [ ] Complex equations render without errors
  - **Must verify:** Test multi-line equation
  - **Expected:** Renders correctly
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-018: Build Tab System for Documents
**As a** user, **I want** tabs for open files **so that** I can work with multiple documents.

**Acceptance Criteria:**
- [ ] Tab bar displays above content area
  - **Must verify:** Open 2+ files
  - **Expected:** Tabs show file names
- [ ] Close button on each tab
  - **Must verify:** Hover tab, see X button
  - **Expected:** Click X closes tab
- [ ] Unsaved changes show dot indicator
  - **Must verify:** Edit file, observe tab
  - **Expected:** Dot or asterisk appears
- [ ] Cmd+1-9 switches tabs
  - **Must verify:** Open 3 tabs, press Cmd+2
  - **Expected:** Second tab activates
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-019: Implement Command Palette
**As a** user, **I want** a command palette **so that** I can quickly find actions.

**Acceptance Criteria:**
- [ ] Cmd+Shift+P opens command palette overlay
  - **Must verify:** Press Cmd+Shift+P
  - **Expected:** Modal with search input appears
- [ ] Fuzzy search filters commands as user types
  - **Must verify:** Type partial command name
  - **Expected:** Matching commands display
- [ ] Recent commands appear at top
  - **Must verify:** Execute command, reopen palette
  - **Expected:** Recent command listed first
- [ ] Enter executes selected command
  - **Must verify:** Select command, press Enter
  - **Expected:** Command executes, palette closes
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-020: Add File Quick Open (Cmd+P)
**As a** user, **I want** quick file open **so that** I can find files fast.

**Acceptance Criteria:**
- [ ] Cmd+P opens file search overlay
  - **Must verify:** Press Cmd+P
  - **Expected:** Modal with file search appears
- [ ] Fuzzy search matches file names
  - **Must verify:** Type partial file name
  - **Expected:** Matching files display
- [ ] File previews on arrow navigation
  - **Must verify:** Arrow down through results
  - **Expected:** Selected file previews
- [ ] Enter opens file in new tab
  - **Must verify:** Select file, press Enter
  - **Expected:** File opens in right pane
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-021: Build Content Search (Cmd+Shift+F)
**As a** user, **I want** project-wide search **so that** I can find content across files.

**Acceptance Criteria:**
- [ ] Cmd+Shift+F opens search panel
  - **Must verify:** Press Cmd+Shift+F
  - **Expected:** Search panel appears
- [ ] Results grouped by file with line numbers
  - **Must verify:** Search for term, view results
  - **Expected:** Results show file, line, context
- [ ] Click result opens file at line
  - **Must verify:** Click a search result
  - **Expected:** File opens, scrolls to line
- [ ] Search supports regex (toggle)
  - **Must verify:** Enable regex, search pattern
  - **Expected:** Pattern matches correctly
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-022: Add Search Result Highlighting
**As a** user, **I want** matches highlighted in content **so that** I can find them easily.

**Acceptance Criteria:**
- [ ] Matched text highlighted with yellow background
  - **Must verify:** Click search result, view in editor
  - **Expected:** Match has yellow highlight
- [ ] Previous/Next buttons navigate matches
  - **Must verify:** Click Next button
  - **Expected:** Scrolls to next match
- [ ] Current match position shown (e.g., "3 of 12")
  - **Must verify:** Navigate through matches
  - **Expected:** Counter updates
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

### Phase 4: Inline Editing (Week 7-8)

#### US-023: Implement Text Selection Detection
**As a** user, **I want** text selection tracked **so that** I can edit specific content.

**Acceptance Criteria:**
- [ ] Selected text highlighted with distinct color
  - **Must verify:** Click and drag to select text
  - **Expected:** Selection visible with background color
- [ ] Selection range captured (start/end positions)
  - **Must verify:** Log selection event
  - **Expected:** Positions captured correctly
- [ ] Selection clears on click elsewhere
  - **Must verify:** Select text, click outside
  - **Expected:** Selection clears
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-024: Create Context Menu for Editing
**As a** user, **I want** a context menu on selection **so that** I can trigger edits.

**Acceptance Criteria:**
- [ ] Right-click on selection shows context menu
  - **Must verify:** Select text, right-click
  - **Expected:** Menu appears with options
- [ ] Menu includes: Edit with AI, Copy, Search
  - **Must verify:** View menu items
  - **Expected:** All three options present
- [ ] Cmd+K hotkey triggers edit overlay
  - **Must verify:** Select text, press Cmd+K
  - **Expected:** Edit overlay appears
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-025: Build Inline Edit Overlay
**As a** user, **I want** an edit overlay **so that** I can describe changes.

**Acceptance Criteria:**
- [ ] Overlay appears near selection with input field
  - **Must verify:** Trigger edit, check overlay position
  - **Expected:** Overlay anchored to selection
- [ ] Model selector dropdown (Sonnet, Haiku, Opus)
  - **Must verify:** Click model dropdown
  - **Expected:** Model options available
- [ ] Generate button sends request
  - **Must verify:** Type instruction, click Generate
  - **Expected:** Request sent to agent
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-026: Implement Diff Preview
**As a** user, **I want** to preview changes **so that** I can review before accepting.

**Acceptance Criteria:**
- [ ] Side-by-side diff shows original vs proposed
  - **Must verify:** Generate edit, view diff
  - **Expected:** Two columns with changes
- [ ] Added text highlighted green, removed red
  - **Must verify:** View diff colors
  - **Expected:** Correct color coding
- [ ] Accept button applies changes
  - **Must verify:** Click Accept
  - **Expected:** File updated with changes
- [ ] Reject button discards changes
  - **Must verify:** Click Reject
  - **Expected:** Original text preserved
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-027: Add Undo/Redo for Edits
**As a** user, **I want** undo/redo **so that** I can revert mistakes.

**Acceptance Criteria:**
- [ ] Cmd+Z undoes last edit
  - **Must verify:** Make edit, press Cmd+Z
  - **Expected:** Edit reverted
- [ ] Cmd+Shift+Z redoes undone edit
  - **Must verify:** Undo, then press Cmd+Shift+Z
  - **Expected:** Edit restored
- [ ] Undo stack persists during session
  - **Must verify:** Make 5 edits, undo all 5
  - **Expected:** All edits reversible
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-028: Create Prompt Library
**As a** user, **I want** saved prompts **so that** I can reuse common instructions.

**Acceptance Criteria:**
- [ ] Prompt library accessible from edit overlay
  - **Must verify:** Open edit overlay, find library button
  - **Expected:** Library button/icon present
- [ ] Built-in templates: Improve clarity, Make concise, Expand details
  - **Must verify:** Open library
  - **Expected:** Default templates available
- [ ] User can save custom prompts
  - **Must verify:** Create prompt, save it
  - **Expected:** Prompt appears in library
- [ ] Prompts support variables: {selection}, {context}
  - **Must verify:** Use prompt with variable
  - **Expected:** Variable replaced with actual content
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-029: Build Diagram Edit Modal
**As a** user, **I want** to edit diagrams **so that** I can modify visualizations.

**Acceptance Criteria:**
- [ ] Edit Diagram button appears on diagram hover
  - **Must verify:** Hover over Mermaid diagram
  - **Expected:** Edit button visible
- [ ] Modal shows Monaco editor with Mermaid syntax
  - **Must verify:** Click Edit Diagram
  - **Expected:** Code editor with syntax highlighting
- [ ] Live preview updates as code changes
  - **Must verify:** Edit Mermaid code
  - **Expected:** Preview updates in real-time
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-030: Add AI-Assisted Diagram Editing
**As a** user, **I want** AI to modify diagrams **so that** I can describe changes naturally.

**Acceptance Criteria:**
- [ ] "Regenerate with AI" button in diagram modal
  - **Must verify:** Open diagram editor
  - **Expected:** AI button present
- [ ] Input field for describing diagram changes
  - **Must verify:** Click AI button
  - **Expected:** Text input appears
- [ ] Agent generates updated Mermaid code
  - **Must verify:** Describe change, submit
  - **Expected:** New Mermaid code generated
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

### Phase 5: Research & Export (Week 9-12)

#### US-031: Integrate Perplexity via OpenRouter
**As a** user, **I want** fast research queries **so that** I can get quick answers.

**Acceptance Criteria:**
- [ ] OpenRouter client configured for Perplexity
  - **Must verify:** Check API client setup
  - **Expected:** perplexity/sonar-pro model accessible
- [ ] Research queries return within 30 seconds
  - **Must verify:** Run sample query, time response
  - **Expected:** Results in under 30s
- [ ] Sources/citations extracted from response
  - **Must verify:** Check returned data
  - **Expected:** Sources array populated
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-032: Integrate Gemini Deep Research
**As a** user, **I want** comprehensive research **so that** I get thorough analysis.

**Acceptance Criteria:**
- [ ] Gemini API client configured
  - **Must verify:** Check @google/generative-ai setup
  - **Expected:** Client initialized
- [ ] Deep Research mode supports 60-minute queries
  - **Must verify:** Start Deep Research task
  - **Expected:** Long-running query progresses
- [ ] Progress checkpoints at 15%, 30%, 50%
  - **Must verify:** Monitor progress file
  - **Expected:** Checkpoints created
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-033: Implement Research Mode Routing
**As a** user, **I want** automatic provider selection **so that** I get appropriate speed/depth.

**Acceptance Criteria:**
- [ ] Quick mode routes all to Perplexity
  - **Must verify:** Set Quick mode, observe routing
  - **Expected:** All queries go to Perplexity
- [ ] Balanced mode uses Deep Research for Phase 1
  - **Must verify:** Start Balanced planning
  - **Expected:** Phase 1 uses Gemini
- [ ] Comprehensive mode uses Deep Research for all major
  - **Must verify:** Set Comprehensive mode
  - **Expected:** Major queries use Gemini
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-034: Build Research Progress UI
**As a** user, **I want** research progress shown **so that** I know status of long queries.

**Acceptance Criteria:**
- [ ] Progress bar shows percentage complete
  - **Must verify:** Start Deep Research, view UI
  - **Expected:** Progress bar updates
- [ ] Estimated time remaining displayed
  - **Must verify:** View progress panel
  - **Expected:** Time estimate shown
- [ ] Cancel button stops research gracefully
  - **Must verify:** Click Cancel during research
  - **Expected:** Research stops, partial results saved
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-035: Implement Citation Management
**As a** user, **I want** citations tracked **so that** I can reference sources.

**Acceptance Criteria:**
- [ ] Citations stored in .citations.json sidecar files
  - **Must verify:** Complete research, check file
  - **Expected:** JSON file with sources
- [ ] IEEE format numbering [1], [2] in text
  - **Must verify:** View generated markdown
  - **Expected:** Numbered citations inline
- [ ] Reference list generated for exports
  - **Must verify:** Generate PDF, check references
  - **Expected:** Bibliography section included
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-036: Create PDF Generation Pipeline
**As a** user, **I want** to generate PDFs **so that** I can share professional reports.

**Acceptance Criteria:**
- [ ] Pandoc integration via child_process
  - **Must verify:** Check Pandoc installed, run generation
  - **Expected:** Pandoc command executes
- [ ] Table of contents generated when option selected
  - **Must verify:** Enable TOC option
  - **Expected:** TOC in PDF
- [ ] Cover page with project metadata
  - **Must verify:** Generate PDF, check first page
  - **Expected:** Cover page with title, author, date
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-037: Create DOCX Generation Pipeline
**As a** user, **I want** Word documents **so that** I can share editable reports.

**Acceptance Criteria:**
- [ ] docx package generates Word files
  - **Must verify:** Click Generate DOCX
  - **Expected:** .docx file created
- [ ] Headings, lists, tables preserve formatting
  - **Must verify:** Open in Word, check formatting
  - **Expected:** All elements formatted correctly
- [ ] Code blocks use monospace font
  - **Must verify:** Check code sections
  - **Expected:** Monospace font applied
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-038: Create PPTX Generation Pipeline
**As a** user, **I want** PowerPoint slides **so that** I can present plans.

**Acceptance Criteria:**
- [ ] pptxgenjs generates slide decks
  - **Must verify:** Click Generate PPTX
  - **Expected:** .pptx file created
- [ ] H1 headings become section dividers
  - **Must verify:** Check slide structure
  - **Expected:** Section divider slides present
- [ ] H2 headings become content slides
  - **Must verify:** Check slide titles
  - **Expected:** Content slides have H2 as title
- [ ] Theme colors applied to slides
  - **Must verify:** View slides in PowerPoint
  - **Expected:** Consistent theme colors
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-039: Build Export Configuration Modal
**As a** user, **I want** export options **so that** I can customize output.

**Acceptance Criteria:**
- [ ] Modal shows section checkboxes for selection
  - **Must verify:** Open export modal
  - **Expected:** Section list with checkboxes
- [ ] Format selection (PDF, DOCX, PPTX)
  - **Must verify:** View format options
  - **Expected:** Three format buttons/tabs
- [ ] Options: Include TOC, citations, cover page
  - **Must verify:** View option toggles
  - **Expected:** Toggles for each option
- [ ] Generate button starts export
  - **Must verify:** Configure and click Generate
  - **Expected:** Export process begins
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

### Phase 6: Workflow & Onboarding (Week 12-14)

#### US-040: Create Welcome Screen
**As a** user, **I want** a welcome screen on launch **so that** I can start quickly.

**Acceptance Criteria:**
- [ ] Welcome screen displays when no project open
  - **Must verify:** Launch app fresh
  - **Expected:** Welcome screen with options
- [ ] New Project button starts wizard
  - **Must verify:** Click New Project
  - **Expected:** New project wizard opens
- [ ] Open Project button shows file picker
  - **Must verify:** Click Open Project
  - **Expected:** File dialog opens
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-041: Implement Recent Projects List
**As a** user, **I want** recent projects shown **so that** I can reopen quickly.

**Acceptance Criteria:**
- [ ] Recent projects list on welcome screen
  - **Must verify:** Open/close projects, relaunch
  - **Expected:** Recent projects listed
- [ ] Projects sorted by last-modified date
  - **Must verify:** Check order of list
  - **Expected:** Most recent first
- [ ] Click project opens it directly
  - **Must verify:** Click recent project
  - **Expected:** Project loads
- [ ] Right-click removes from list
  - **Must verify:** Right-click, select Remove
  - **Expected:** Project removed from recents
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-042: Build New Project Wizard
**As a** user, **I want** a guided wizard **so that** I can configure projects easily.

**Acceptance Criteria:**
- [ ] Multi-step form: Name, Research Mode, Phases
  - **Must verify:** Start wizard, navigate steps
  - **Expected:** Multiple steps with inputs
- [ ] Research mode options: Quick, Balanced, Comprehensive
  - **Must verify:** View research mode step
  - **Expected:** Three mode options
- [ ] Phase checkboxes with descriptions
  - **Must verify:** View phase selection step
  - **Expected:** Checkboxes with explanations
- [ ] Create button initializes project
  - **Must verify:** Complete wizard, click Create
  - **Expected:** Project directory created
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-043: Implement Phase Orchestration
**As a** user, **I want** phases to run in sequence **so that** planning proceeds automatically.

**Acceptance Criteria:**
- [ ] Selected phases execute in order
  - **Must verify:** Start planning, observe sequence
  - **Expected:** Phases run sequentially
- [ ] Phase dashboard shows current phase and progress
  - **Must verify:** View Planning section
  - **Expected:** Dashboard with phase status
- [ ] Pause button stops after current phase
  - **Must verify:** Click Pause during planning
  - **Expected:** Stops at phase boundary
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-044: Build Approval Gate UI
**As a** user, **I want** approval gates **so that** I can review before continuing.

**Acceptance Criteria:**
- [ ] Gate appears after each phase completion
  - **Must verify:** Complete phase 1
  - **Expected:** Approval gate displays
- [ ] Continue button proceeds to next phase
  - **Must verify:** Click Continue
  - **Expected:** Next phase starts
- [ ] Revise button reopens phase with feedback
  - **Must verify:** Enter feedback, click Revise
  - **Expected:** Phase re-runs with feedback
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-045: Add Checkpoint Save/Resume
**As a** user, **I want** checkpoints **so that** I can resume interrupted planning.

**Acceptance Criteria:**
- [ ] Checkpoint saved after each phase
  - **Must verify:** Complete phase, check .checkpoint.json
  - **Expected:** Checkpoint file updated
- [ ] Resume from checkpoint on project reopen
  - **Must verify:** Close during planning, reopen
  - **Expected:** Resumes from last checkpoint
- [ ] Checkpoint includes phase context and decisions
  - **Must verify:** Inspect checkpoint JSON
  - **Expected:** Context data preserved
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

### Phase 7: Polish & Testing (Week 14-15)

#### US-046: Optimize Large Document Rendering
**As a** user, **I want** fast rendering **so that** large files don't lag.

**Acceptance Criteria:**
- [ ] Virtual scrolling for documents over 1000 lines
  - **Must verify:** Open large file, check performance
  - **Expected:** Smooth scrolling
- [ ] Render time under 100ms for 1000 lines
  - **Must verify:** Time rendering
  - **Expected:** Fast initial render
- [ ] Diagram lazy loading on scroll into view
  - **Must verify:** Scroll to diagram
  - **Expected:** Diagram renders when visible
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-047: Add Loading Skeletons
**As a** user, **I want** loading indicators **so that** I know content is loading.

**Acceptance Criteria:**
- [ ] Skeleton placeholders during file load
  - **Must verify:** Open file, observe loading
  - **Expected:** Skeleton animation displays
- [ ] Skeleton during agent response generation
  - **Must verify:** Send message, observe chat
  - **Expected:** Typing indicator or skeleton
- [ ] Skeleton during search execution
  - **Must verify:** Start search, observe panel
  - **Expected:** Loading state visible
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-048: Implement Smooth Animations
**As a** user, **I want** polished animations **so that** the app feels professional.

**Acceptance Criteria:**
- [ ] Panel collapse/expand animations (200ms)
  - **Must verify:** Toggle sidebar
  - **Expected:** Smooth slide animation
- [ ] Tab switch transitions
  - **Must verify:** Switch between tabs
  - **Expected:** Subtle fade or slide
- [ ] Modal open/close animations
  - **Must verify:** Open/close command palette
  - **Expected:** Fade/scale animation
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-049: Write Unit Tests
**As a** developer, **I want** unit tests **so that** code changes don't break functionality.

**Acceptance Criteria:**
- [ ] Vitest configured for testing
  - **Must verify:** `pnpm add -D vitest`
  - **Expected:** Package installed
- [ ] Core utilities have 80%+ coverage
  - **Must verify:** `pnpm test --coverage`
  - **Expected:** Coverage report shows 80%+
- [ ] Tests run in CI pipeline
  - **Must verify:** Check GitHub Actions
  - **Expected:** Tests pass on PR
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-050: Write E2E Tests
**As a** developer, **I want** E2E tests **so that** workflows are verified.

**Acceptance Criteria:**
- [ ] Playwright configured for Electron
  - **Must verify:** Check Playwright config
  - **Expected:** Electron launch configured
- [ ] Critical workflow tests: new project, edit, export
  - **Must verify:** Run E2E suite
  - **Expected:** Workflows pass
- [ ] Tests run on all platforms (macOS, Windows, Linux)
  - **Must verify:** Check CI matrix
  - **Expected:** All platforms tested
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

### Phase 8: Packaging & Release (Week 16)

#### US-051: Configure electron-builder
**As a** developer, **I want** build configuration **so that** I can create installers.

**Acceptance Criteria:**
- [ ] electron-builder installed and configured
  - **Must verify:** Check electron-builder.yml or package.json
  - **Expected:** Build config present
- [ ] macOS, Windows, Linux targets defined
  - **Must verify:** View target configuration
  - **Expected:** All three platforms configured
- [ ] Build artifacts output to dist/
  - **Must verify:** Run build, check output
  - **Expected:** Installers in dist folder
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-052: Build macOS Installer
**As a** developer, **I want** macOS DMG **so that** Mac users can install.

**Acceptance Criteria:**
- [ ] Universal binary (Intel + Apple Silicon)
  - **Must verify:** Build with `--universal`
  - **Expected:** Universal DMG created
- [ ] Code signing with Developer ID
  - **Must verify:** Check signature
  - **Expected:** Signed by Developer ID
- [ ] Notarized for Gatekeeper
  - **Must verify:** Check notarization status
  - **Expected:** Notarization ticket attached
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-053: Build Windows Installer
**As a** developer, **I want** Windows EXE **so that** Windows users can install.

**Acceptance Criteria:**
- [ ] NSIS or MSI installer created
  - **Must verify:** Run Windows build
  - **Expected:** .exe installer generated
- [ ] Code signing certificate applied
  - **Must verify:** Check digital signature
  - **Expected:** Publisher name shows
- [ ] Installer works on clean Windows 10/11
  - **Must verify:** Test on fresh VM
  - **Expected:** Installs and runs
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-054: Build Linux Package
**As a** developer, **I want** Linux AppImage **so that** Linux users can install.

**Acceptance Criteria:**
- [ ] AppImage created for x64
  - **Must verify:** Run Linux build
  - **Expected:** .AppImage file generated
- [ ] AppImage runs on Ubuntu 22.04+
  - **Must verify:** Test on fresh Ubuntu
  - **Expected:** Application runs
- [ ] Desktop integration works
  - **Must verify:** Check desktop entry
  - **Expected:** Appears in application menu
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

#### US-055: Implement Auto-Update
**As a** user, **I want** automatic updates **so that** I get new features easily.

**Acceptance Criteria:**
- [ ] electron-updater configured
  - **Must verify:** Check updater setup
  - **Expected:** Updater initialized on startup
- [ ] Updates check on app launch
  - **Must verify:** Launch app, monitor network
  - **Expected:** Update check request made
- [ ] Update prompt shows release notes
  - **Must verify:** Release new version, check prompt
  - **Expected:** Dialog shows what's new
- [ ] Update installs and restarts app
  - **Must verify:** Accept update
  - **Expected:** New version running after restart
- [ ] Typecheck passes
  - **Must verify:** `pnpm exec tsc --noEmit`
  - **Expected:** No errors

---

## Known Blockers

### Electron Forge Vite Plugin Issue
**Status:** ✅ RESOLVED
**Impact:** None - `pnpm start` works correctly
**Resolution:** Added `.npmrc` with `node-linker=hoisted` and `"type": "module"` to package.json

## Demo Checkpoints

### Demo 1: Basic Agent Interaction (Week 4)
- [ ] Application launches with Activity Bar
- [ ] User can chat with agent
- [ ] Streaming text works smoothly
- [ ] AskUserQuestion renders and accepts input
- [ ] Session persists across restart

### Demo 2: Inline Editing (Week 8)
- [ ] Markdown renders with diagrams
- [ ] Text selection triggers edit overlay
- [ ] AI generates replacement text
- [ ] Diff preview shows changes
- [ ] Accept/reject works

### Demo 3: End-to-End Planning (Week 12)
- [ ] New project wizard works
- [ ] All phases execute with approval gates
- [ ] Inline editing during planning
- [ ] PDF/DOCX/PPTX generation works
- [ ] Resume from checkpoint works

---

## Summary

**Total Stories:** 55
**Completed:** 5 (US-001, US-002, US-003, US-004, US-005)
**Remaining:** 50

**Phase Distribution:**
- Foundation: 7 stories (2 complete)
- Agent SDK: 7 stories
- Markdown & Nav: 8 stories
- Inline Editing: 8 stories
- Research & Export: 9 stories
- Workflow: 6 stories
- Polish & Testing: 5 stories
- Packaging: 5 stories

**New Features Added:**
1. Activity Bar (US-004, US-005)
2. Command Palette (US-019)
3. Welcome Screen / Recent Projects (US-040, US-041)
4. Context Panel / Token Visualizer (US-013)
5. Prompt Library (US-028)
