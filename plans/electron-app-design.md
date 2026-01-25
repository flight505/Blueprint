# Blueprint - Electron Application Design

**Date:** 2026-01-22
**Version:** 1.0
**Status:** Design Complete - Ready for Implementation
**Author:** Jesper Vang

---

## Executive Summary

This document outlines the design for Blueprint, a standalone Electron desktop application for AI-powered project planning. Blueprint provides an interactive planning interface with dual-pane layout, real-time markdown rendering, inline AI-powered editing, and comprehensive diagram support.

**Key Design Decisions:**
- **Architecture:** Electron desktop application (cross-platform)
- **Backend:** Full TypeScript rewrite using Claude Agent SDK v2
- **UI Pattern:** Two-pane split layout with collapsible file browser
- **Editing Model:** Selection-based inline editing with context menus
- **Rendering:** React Markdown with extensive plugin ecosystem
- **Model Selection:** Per-edit with smart defaults and cost awareness

**Expected Outcomes:**
- Faster iteration on project plans with inline editing
- Visual markdown rendering with interactive diagrams
- Offline-capable desktop application
- Multi-format export (PDF, DOCX, PPTX)
- Theme-aware image generation for professional slide decks

---

## 1. System Architecture

### 1.1 High-Level Architecture

The application follows a standard Electron architecture with three main processes:

**Main Process (Node.js)**
- Manages application lifecycle and window creation
- Handles file system operations and native OS integration
- Runs Claude Agent SDK and coordinates AI workflows
- Manages IPC communication between renderer processes
- Handles background tasks (research, document generation)

**Renderer Process (React + TypeScript)**
- Implements the user interface using React components
- Renders markdown content with diagrams and interactive elements
- Handles user input and selection-based editing
- Communicates with main process via IPC for agent interactions

**Preload Scripts**
- Provides secure bridge between renderer and main process
- Exposes limited, safe APIs to the renderer
- Implements security best practices for IPC

### 1.2 Technology Stack

**Frontend Framework:**
- React with TypeScript for type safety
- Vite for fast development and optimized builds
- Tailwind CSS for styling with customizable themes
- Electron for native desktop capabilities

**Markdown Rendering:**
- react-markdown as base renderer
- remark-gfm for GitHub-flavored markdown
- rehype-katex for mathematical equations
- rehype-highlight for code syntax highlighting
- mermaid with react-mermaid2 for diagrams
- viz.js for Graphviz DOT diagrams

**Agent SDK Integration:**
- @anthropic-ai/claude-agent-sdk (V2 preview for sessions)
  - *Documentation available via claude-docs-skill for API reference and patterns*
- openai npm client for OpenRouter (Perplexity research, Flux images)
- @google/generative-ai for Gemini Deep Research
- Custom session management with SQLite persistence

**Document Generation:**
- docx npm package for Word document creation
- pptxgenjs for PowerPoint slide decks
- child_process to call Pandoc for PDF generation via LaTeX
- child_process to call mmdc (Mermaid CLI) for diagram rendering

**State Management:**
- Zustand for lightweight client state
- SQLite (better-sqlite3) for session persistence
- File-based checkpoints for resume capability
- IndexedDB for caching rendered diagrams

**File Browser:**
- react-arborist or similar tree view component
- fuse.js for fuzzy file search
- Custom content search with regex support

**Code Editor (for inline editing):**
- Monaco Editor (VSCode's editor) for advanced editing features
- Built-in diff viewer for showing changes
- Syntax highlighting for markdown, YAML, JSON

---

## 2. User Interface Design

### 2.1 Layout Architecture

**Two-Pane Split Layout**

The application uses a resizable two-pane layout inspired by VSCode:

**Left Pane (40% default width):**
- Agent chat interface at top
- Interactive question UI for approval gates
- Live progress indicators during planning phases
- Collapsible file browser (slides out from left edge)
- Bottom panel for logs and terminal output (optional, slides up)

**Right Pane (60% default width):**
- Tab system for multiple open documents
- Rendered markdown with live preview
- Interactive diagrams with zoom and pan
- Selection-based inline editing mode
- Search result highlights

**Divider:**
- Draggable resize handle between panes
- Double-click to reset to default split
- Minimum widths enforced (300px each pane)

### 2.2 Component Breakdown

**Application Shell:**
- Custom titlebar with window controls (macOS/Windows/Linux)
- Menu bar with File, Edit, View, Planning, Help menus
- Status bar at bottom showing session info, model, API status

**Left Pane Components:**

*Agent Chat Panel:*
- Message history with user/assistant bubbles
- Streaming text support with typewriter effect
- Tool use indicators (showing Read, Write, Grep calls)
- Collapsible system messages
- Input field with model selector dropdown

*Interactive Questions UI:*
- Rendered when AskUserQuestion tool is called
- Multiple choice with radio buttons or checkboxes
- Multi-select support with clear visual indicators
- Custom "Other" option with text input
- Validation and submission feedback

*Progress Tracker:*
- Phase-based progress bars with percentage
- Current task description with activity status
- Estimated time remaining (based on research mode)
- Pause, Skip Phase, Cancel buttons
- Phase completion checkmarks

*File Browser Drawer:*
- Collapsible sidebar with hamburger menu icon
- Tree view of planning output directory structure
- File type icons (markdown, YAML, JSON, images)
- Right-click context menu (Open, Rename, Delete, Reveal in Finder)
- Drag-and-drop file organization

**Right Pane Components:**

*Tab Bar:*
- Horizontal tabs for open documents
- Close button on each tab
- Active tab highlighting
- Tab overflow menu when too many tabs
- Keyboard shortcuts (Cmd/Ctrl + 1-9 to switch)

*Markdown Viewer:*
- Fully rendered markdown with GitHub styling
- Interactive elements (clickable links, collapsible sections)
- Syntax-highlighted code blocks
- Rendered diagrams (Mermaid, PlantUML, Graphviz)
- Zoomable images
- Table sorting and filtering
- Mathematical equations via KaTeX

*Inline Edit Mode:*
- Text selection triggers edit affordances
- Context menu on right-click or hotkey (Cmd/Ctrl+K)
- Inline input overlay with model selector
- Streaming diff preview with accept/reject buttons
- Undo/redo support for edits
- Visual diff highlighting (green for additions, red for deletions)

*Search Panel:*
- Search bar at top of right pane
- Results list with file path, line number, context
- Yellow highlights in rendered content
- Navigation buttons (Previous/Next result)
- Filter controls (case sensitivity, whole word, regex)

### 2.3 Visual Design Language

**Color Scheme:**
- Light mode: Clean whites and grays with blue accents
- Dark mode: Charcoal backgrounds with reduced eye strain
- Syntax highlighting themes: One Dark Pro (dark), One Light (light)
- Semantic colors: Green (success), Red (error), Yellow (warning), Blue (info)

**Typography:**
- System font stack for UI (San Francisco on macOS, Segoe UI on Windows)
- Monospace font for code: JetBrains Mono or Fira Code
- Markdown content: Inter or System UI for readability
- Heading hierarchy with clear size differentiation

**Spacing and Layout:**
- 8px grid system for consistent spacing
- Generous padding in content areas for readability
- Compact UI elements in sidebar for information density
- Responsive breakpoints (minimum window size: 1024x768)

---

## 3. Core Workflows

### 3.1 New Project Planning Workflow

**User Journey:**

1. **Project Initialization**
   - User clicks "New Project" in File menu or welcome screen
   - Setup wizard appears in left pane with multi-step form
   - User provides project name and description
   - System creates new directory structure in planning_outputs/

2. **Configuration Selection**
   - Research mode selection: Quick (30 min), Balanced (120 min), Comprehensive (240 min), Auto
   - Phase selection with checkboxes: Market Research, Architecture, Feasibility, Sprints, Go-to-Market
   - Interactive approval mode toggle (pause after each phase vs continuous)
   - Parallelization option (enable for time savings)

3. **Planning Execution**
   - Agent begins Phase 1 in background
   - Left pane shows live progress with phase name, percentage, current activity
   - Right pane auto-opens SUMMARY.md tab showing executive summary (updates live)
   - User can switch tabs to view other outputs as they're generated
   - Deep Research tasks show estimated completion time and progress checkpoints

4. **Phase Approval Gates**
   - When phase completes, approval gate appears in left pane
   - Shows phase summary, key decisions, time taken, next phase preview
   - User options: Continue, Revise (with feedback field), Pause (save checkpoint)
   - If user chooses Revise, feedback is incorporated and phase re-runs
   - System automatically handles dependent phase updates

5. **Completion and Review**
   - After all phases complete, success message appears
   - Right pane shows all generated outputs in tabbed interface
   - User reviews markdown content, edits inline as needed
   - File browser shows complete directory structure with all artifacts

6. **Output Generation**
   - User clicks "Generate PDF" button in left pane
   - Configuration modal appears with section selection, options (TOC, citations, cover)
   - User confirms and Pandoc generates PDF in background
   - Notification appears when PDF is ready with "Open File" button
   - Same workflow for DOCX and PPTX generation with format-specific options

### 3.2 Inline Editing Workflow

**User Journey:**

1. **Text Selection**
   - User opens architecture.md in right pane (rendered markdown)
   - Selects paragraph about JWT authentication
   - Selection highlights with subtle background color

2. **Edit Trigger**
   - User right-clicks selection → context menu appears
   - Options: "Edit with AI", "Copy", "Search", "Regenerate Section"
   - Or user presses Cmd/Ctrl+K hotkey
   - Inline edit overlay appears anchored to selection

3. **Edit Request**
   - Overlay shows input field: "What would you like to change?"
   - Model selector dropdown with smart default (Claude Sonnet for text)
   - User types: "Change to OAuth2 with PKCE flow instead of JWT"
   - Clicks "Generate" button

4. **AI Processing**
   - System sends structured prompt to Claude Agent SDK:
     - Selected text
     - 500 characters before and after for context
     - User instruction
     - Document type metadata
   - Agent streams response back with replacement text
   - Left pane shows minimal progress indicator

5. **Diff Preview**
   - Inline overlay expands to show side-by-side diff
   - Left: Original text, Right: Proposed changes
   - Visual highlighting of added (green) and removed (red) text
   - User can scroll through changes if multiple paragraphs

6. **Accept/Reject**
   - User reviews diff and clicks "Accept" or "Reject"
   - Accept: Changes applied to markdown file, tab marked as unsaved (dot indicator)
   - Reject: Overlay closes, original text remains
   - Option to "Edit Again" with different instruction
   - Undo/redo buttons available in toolbar

### 3.3 Diagram Editing Workflow

**User Journey:**

1. **Diagram Selection**
   - User scrolls to rendered Mermaid diagram in architecture.md
   - Hovers over diagram → "Edit Diagram" button appears in top-right corner
   - Or user selects the diagram block

2. **Edit Mode Activation**
   - User clicks "Edit Diagram" or uses context menu
   - Inline overlay appears showing Mermaid source code
   - Monaco editor with syntax highlighting for Mermaid syntax
   - Live preview pane shows rendered diagram updates as user types

3. **AI-Assisted Editing**
   - User clicks "Regenerate with AI" button in overlay
   - Input field appears: "Describe the changes..."
   - User types: "Add PostgreSQL database connected to API Gateway"
   - Agent receives Mermaid source and instruction

4. **Diagram Regeneration**
   - Agent generates updated Mermaid code with new node and edge
   - Diff view shows old vs new Mermaid syntax
   - Live preview shows before/after diagram rendering
   - User can manually tweak Mermaid code if needed

5. **Acceptance and Rendering**
   - User accepts changes → Mermaid code updated in markdown file
   - Diagram re-renders immediately in right pane
   - SVG diagram is cached in IndexedDB for fast re-rendering
   - Option to "Export as SVG" or "Export as PNG" for presentations

### 3.4 Image Generation for Slides Workflow

**User Journey:**

1. **Theme Configuration**
   - During project setup or in Settings, user defines project theme
   - Color picker for primary color, background color, accent color
   - Preview shows how colors will appear in slides
   - Theme saved to project metadata

2. **Slide Content Generation**
   - Planning phase generates slide outline in marketing campaign section
   - Each slide has title, bullet points, and image placeholder

3. **Image Request**
   - User selects slide content in markdown
   - Context menu: "Generate Slide Image"
   - Input appears: "Describe the image you want..."
   - User types: "Modern SaaS dashboard with charts"

4. **NanoBanana Integration**
   - System constructs prompt including:
     - User's image description
     - Theme background color: "Generate with background color #F3F4F6"
     - Note about avoiding transparent backgrounds
   - Sends to NanoBanana via OpenRouter API
   - Progress indicator shows image generation status

5. **Image Insertion**
   - Generated image appears in preview pane
   - User can accept or regenerate with modified prompt
   - Accepted image saved to diagrams/ directory with theme-matching background
   - Markdown updated with image reference
   - Image appears in rendered view with proper background color matching slide theme

### 3.5 Search and Navigation Workflow

**User Journey:**

1. **File Search**
   - User clicks file browser icon in left sidebar
   - Browser slides out showing directory tree
   - User types in fuzzy search: "arc" → finds "architecture.md"
   - Click to open in new tab in right pane

2. **Content Search**
   - User presses Cmd/Ctrl+Shift+F for global search
   - Search panel appears at top of right pane
   - User types: "JWT authentication"
   - Search bar shows options: [Case sensitive] [Whole word] [Regex]

3. **Results Display**
   - Results panel shows matches grouped by file:
     - architecture.md (3 matches)
     - building_blocks.yaml (1 match)
   - Each result shows line number and context excerpt
   - Matched text highlighted in yellow

4. **Navigation**
   - User clicks first result → file opens in tab, scrolls to line
   - Matched text highlighted with yellow background
   - Previous/Next buttons navigate between results
   - Sidebar shows current result position (Result 1 of 4)

5. **Advanced Search**
   - User enables regex mode and searches: `JWT.*token`
   - Filter by file type: only .md files
   - Search within selection: user selects architecture section, right-click → "Search in Selection"

---

## 4. Technical Implementation Details

### 4.1 TypeScript Agent SDK Integration

**Documentation Reference:**
For implementation details, use the claude-docs-skill to access up-to-date Agent SDK documentation. Trigger phrases: "agent sdk", "claude api", "anthropic api", "claude models". The skill provides 4-tier routing from quick reference to deep API docs.

**Session Management**

The application uses Claude Agent SDK V2's simplified session API for managing multi-turn conversations. Each planning project creates a persistent session that can be resumed across application restarts.

**Session Lifecycle:**
- Session creation during "New Project" wizard with configuration options
- Session ID stored in project metadata file alongside planning outputs
- Session persisted to SQLite database with conversation history
- Session resumption when user opens existing project
- Session forking for revision workflows (create branch to try different approach)

**Message Streaming:**
- V2's send and stream pattern handles all agent communication
- Streaming text displayed in left pane chat with typewriter effect
- Tool use messages parsed and displayed as activity indicators
- Result messages trigger phase completion UI
- Error messages shown with actionable recovery suggestions

**Hook Integration:**
- PreToolUse hooks for permission validation (especially for file operations)
- PostToolUse hooks for progress tracking and checkpoint creation
- SessionStart hooks for environment initialization
- SessionEnd hooks for cleanup and final checkpoint
- Custom hooks for research progress tracking with callback updates

**Options Configuration:**
- System prompt uses Claude Code preset with custom append for planning instructions
- Tools array includes Read, Write, Edit, Grep, Glob, Bash, AskUserQuestion
- Permission mode defaults to "default" with canUseTool callback for dangerous operations
- MCP servers configured for any external integrations
- File checkpointing enabled for rewind capability
- Max budget USD configurable per project to prevent runaway costs

### 4.2 Research Provider Integration

**Multi-Provider Routing**

The application intelligently routes research queries based on configured research mode and query characteristics.

**Provider Implementations:**

*Perplexity via OpenRouter:*
- Uses openai npm client with OpenRouter base URL override
- Model: perplexity/sonar-pro for fast research queries
- Streaming responses with real-time progress callbacks
- Result caching to avoid redundant API calls
- Fallback to Anthropic if OpenRouter unavailable

*Gemini Deep Research:*
- Uses official @google/generative-ai package
- Deep Research mode with 60-minute comprehensive analysis
- Progress file tracking in planning_outputs/.research-progress/ directory
- Checkpoint creation at 15%, 30%, 50% milestones for resume capability
- Graceful timeout handling with partial result recovery

*Research Mode Logic:*
- Quick mode: All queries to Perplexity (30 seconds each)
- Balanced mode: Deep Research for Phase 1 competitive analysis, Perplexity for others
- Comprehensive mode: Deep Research for all major decisions, Perplexity for quick lookups
- Auto mode: Query complexity analysis determines provider (keyword detection, query length)

**Citation Management:**
- Research results include sources with URLs, titles, dates
- Citations stored in .citations.json sidecar files alongside markdown
- IEEE format citation numbering [1], [2], [3] in text
- Aggregated reference list generation during PDF/DOCX export
- Citation verification to ensure all referenced sources are included

### 4.3 Document Generation Pipeline

**Markdown to PDF (via Pandoc + LaTeX)**

Process flow for PDF generation:
- User clicks "Generate PDF" button with selected sections
- System compiles markdown files in order based on selection
- Citations aggregated from .citations.json files across phases
- Pandoc metadata block generated with title, author, date
- Custom LaTeX template applied for professional styling
- Table of contents generated if option selected
- Cover page inserted with project metadata and theme colors
- Pandoc command executed via child_process with appropriate flags
- Output PDF saved to planning_outputs/reports/ directory
- Success notification with "Open File" button to launch PDF viewer

**Markdown to DOCX**

Process flow using docx npm package:
- Markdown parsed into AST (abstract syntax tree)
- AST nodes mapped to docx document elements
- Headings converted to styled heading paragraphs with hierarchy
- Lists converted to bullet or numbered list items
- Tables converted to docx table elements with borders
- Code blocks inserted as pre-formatted text with mono font
- Images embedded directly in document with captions
- Citations inserted as footnotes or endnotes
- Document styling applied from theme configuration
- File saved to planning_outputs/reports/ directory

**Markdown to PPTX**

Process flow using pptxgenjs:
- Markdown sections parsed and converted to slide outlines
- Each H1 becomes new section divider slide
- Each H2 becomes content slide with title
- Bullet points converted to slide bullet points
- Diagrams exported as PNG and embedded in slides
- Images inserted with theme-matching backgrounds
- Theme colors applied to slide backgrounds and text
- Custom slide layouts for different content types
- Speaker notes generated from markdown content
- File saved to planning_outputs/reports/ directory

**Diagram Rendering Pipeline**

Process for converting diagram markdown to images:
- Mermaid blocks detected via regex or AST parsing
- Mermaid CLI (mmdc) called via child_process with input file
- SVG or PNG output generated based on target format
- Fallback to Kroki.io API if local mmdc unavailable
- Further fallback to NanoBanana AI generation from description
- Rendered diagrams cached in IndexedDB with content hash key
- Cache invalidation when diagram source changes
- Batch rendering for multiple diagrams in parallel

### 4.4 File System Management

**Project Directory Structure**

When user creates new project, the following structure is created:

```
planning_outputs/
  YYYYMMDD_HHMMSS_project-name/
    SUMMARY.md
    progress.md
    .checkpoint.json
    .citations.json
    .project-metadata.json
    01_market_research/
      research_data.md
      competitive_analysis.md
      market_overview.md
      diagrams/
    02_architecture/
      architecture_document.md
      building_blocks.yaml
      diagrams/
    03_feasibility/
      feasibility_analysis.md
      risk_assessment.md
      service_cost_analysis.md
      diagrams/
    04_implementation/
      sprint_plan.md
      diagrams/
    05_go_to_market/
      marketing_campaign.md
      content_calendar.md
      diagrams/
    06_review/
      plan_review.md
    reports/
      project-plan.pdf
      project-plan.docx
      project-plan.pptx
    .state/
      backups/
      revisions/
      phase_contexts/
    .research-progress/
      research-task-id-1.json
      research-task-id-2.json
```

**File Watching and Synchronization**

The application monitors the file system for changes to keep UI synchronized:
- Node.js chokidar library watches planning output directory
- File change events trigger re-rendering in active tabs
- Debouncing prevents excessive re-renders during rapid changes
- Conflict detection if file changed externally while editing in app
- User prompted to choose: Keep app version, Load file version, or Show diff

**Checkpoint System**

Checkpoints enable resuming interrupted planning sessions:
- Checkpoint created after each phase completion
- Checkpoint includes session ID, completed phases, key decisions, context summaries
- Phase outputs cataloged with file paths
- User can resume from checkpoint via "Resume Project" in File menu
- Checkpoint cleanup removes old checkpoints after successful completion

**Backup and Revision Tracking**

When user revises a phase, original outputs are preserved:
- Original phase outputs copied to .state/backups/phaseN_original/
- Revision counter incremented
- New revision saved to .state/revisions/phaseN_revision_NNN.md
- User can view revision history and revert if needed
- Git-style diff view shows changes between revisions

### 4.5 State Management Architecture

**Client State (Zustand)**

Zustand stores manage ephemeral UI state in renderer process:

*PlanningState:*
- Current project metadata
- Active phase number and progress percentage
- Current task description
- Approval gate visibility and options
- User selections from interactive questions

*EditorState:*
- Open tabs with file paths
- Active tab index
- Unsaved changes flags
- Selection context for inline editing
- Diff preview state

*SearchState:*
- Search query and options
- Results list with file paths and positions
- Current result index
- Filter settings

*UIState:*
- Sidebar visibility and width
- Theme preference (light/dark)
- Panel collapse states
- Window dimensions

**Persistent State (SQLite)**

SQLite database stores session data across app restarts:

*Sessions Table:*
- session_id (primary key)
- project_path
- conversation_history (JSON blob with all messages)
- checkpoint_data (JSON blob with phase state)
- created_at, updated_at timestamps

*Projects Table:*
- project_path (primary key)
- project_name
- research_mode
- selected_phases
- theme_config (JSON blob)
- created_at, last_opened timestamps

*Research Cache Table:*
- query_hash (primary key)
- provider (perplexity/gemini)
- query_text
- response_data (JSON blob)
- sources (JSON array)
- created_at, expires_at

Database operations use better-sqlite3 for synchronous API in main process. Renderer process requests data via IPC and caches in memory.

**IPC Communication Patterns**

Renderer and main process communicate via typed IPC channels:

*Planning Operations:*
- renderer → main: 'start-planning' with project config
- main → renderer: 'planning-progress' with phase updates
- main → renderer: 'phase-complete' with summary
- renderer → main: 'approval-decision' with user choice

*File Operations:*
- renderer → main: 'read-file' with path
- main → renderer: 'file-content' with markdown
- renderer → main: 'save-file' with path and content
- main → renderer: 'file-saved' confirmation

*Agent Operations:*
- renderer → main: 'agent-edit-request' with selection context
- main → renderer: 'agent-edit-stream' with partial response
- main → renderer: 'agent-edit-complete' with final text
- renderer → main: 'agent-edit-accept' or 'agent-edit-reject'

All IPC channels use typed interfaces with Zod validation for safety.

---

## 5. Implementation Phases

### Phase 1: Foundation and Infrastructure (Week 1-2)

**Objectives:**
- Set up Electron project with TypeScript and Vite
- Configure build pipeline for all platforms (macOS, Windows, Linux)
- Implement basic two-pane layout with resizable divider
- Create project directory structure and file management

**Deliverables:**
- Electron app launches with empty two-pane interface
- File menu with New Project, Open Project, Settings
- File system watcher monitors planning_outputs directory
- SQLite database initialized with schema
- Basic theme switching (light/dark mode)

**Technical Tasks:**
- Initialize Electron Forge or electron-builder project
- Configure Vite for renderer process with React
- Set up TypeScript with strict mode
- Install and configure Tailwind CSS
- Implement main process with window management
- Create IPC bridge with preload scripts
- Set up better-sqlite3 for persistence
- Implement chokidar file watching

### Phase 2: Agent SDK Integration (Week 3-4)

**Required Resources:**
- **Documentation:** Use claude-docs-skill for Agent SDK reference (triggers: "agent sdk", "claude api")
- Reference Tier 2 cookbooks for session management patterns
- Check Tier 3 changelog for V2 API updates

**Objectives:**
- Integrate Claude Agent SDK V2 for session management
- Implement streaming message display in left pane
- Create interactive question UI for AskUserQuestion tool
- Build progress tracking system with phase indicators

**Deliverables:**
- Agent chat interface with streaming text
- Session creation and resumption working
- Interactive approval gates after each phase
- Progress bars showing phase completion
- Basic error handling and recovery

**Technical Tasks:**
- Install @anthropic-ai/claude-agent-sdk
- Implement V2 session wrapper in main process (reference: claude-docs-skill for session API)
- Create message streaming IPC channel
- Build chat UI component with message bubbles
- Implement AskUserQuestion rendering component (reference: askuserquestion skill)
- Create progress tracker component
- Add hooks for PreToolUse, PostToolUse (reference: claude-docs-skill for hooks patterns)
- Implement session persistence to SQLite

### Phase 3: Markdown Rendering and Viewing (Week 5-6)

**Objectives:**
- Implement markdown viewer with react-markdown
- Add diagram rendering (Mermaid, PlantUML, Graphviz)
- Create tab system for multiple documents
- Build file browser with tree view and search

**Deliverables:**
- Right pane renders markdown beautifully
- All diagram types render correctly
- Tab system allows multiple open files
- File browser shows directory structure
- Fuzzy file search working
- Content search with regex support

**Technical Tasks:**
- Install react-markdown and plugins
- Configure remark-gfm, rehype-katex, rehype-highlight
- Implement Mermaid diagram component with react-mermaid2
- Add PlantUML rendering via child_process
- Install viz.js for Graphviz DOT diagrams
- Create tab bar component with close buttons
- Build file tree component with react-arborist
- Implement fuzzy search with fuse.js
- Create content search with highlighting

### Phase 4: Inline Editing and AI Integration (Week 7-8)

**Objectives:**
- Implement selection-based editing with context menus
- Create inline edit overlay with model selection
- Build diff preview with accept/reject workflow
- Add diagram editing capabilities

**Deliverables:**
- Users can select text and trigger AI edits
- Inline edit overlay appears with input field
- Model selector shows available options
- Diff preview displays before/after
- Diagram editing modal with Monaco editor
- Undo/redo for all edits

**Technical Tasks:**
- Implement text selection detection in markdown viewer
- Create context menu component
- Build inline edit overlay with positioning logic
- Add model selector dropdown with smart defaults
- Implement edit request IPC channel
- Create diff viewer component with Monaco
- Add diagram edit modal with live preview
- Implement undo/redo stack

### Phase 5: Research Provider Integration (Week 9-10)

**Objectives:**
- Integrate OpenRouter for Perplexity research
- Integrate Google Gemini for Deep Research
- Implement intelligent provider routing
- Build progress tracking for long-running research

**Deliverables:**
- Perplexity research working with streaming
- Gemini Deep Research with 60-minute queries
- Progress files created and monitored
- Checkpoint resume for interrupted research
- Citation collection and storage

**Technical Tasks:**
- Install openai npm client for OpenRouter
- Install @google/generative-ai package
- Create research provider abstraction layer
- Implement routing logic based on research mode
- Build progress file tracking system
- Create checkpoint manager for research
- Implement citation extraction and storage
- Add resume capability for interrupted research

### Phase 6: Document Generation Pipeline (Week 11-12)

**Objectives:**
- Implement PDF generation via Pandoc
- Create DOCX generation with docx package
- Build PPTX generation with pptxgenjs
- Add theme configuration for slide backgrounds

**Deliverables:**
- Generate PDF button creates professional reports
- DOCX generation includes all formatting
- PPTX generation with theme-matched backgrounds
- Citation aggregation and IEEE formatting
- Export configuration modal with options

**Technical Tasks:**
- Install docx and pptxgenjs packages
- Check for Pandoc installation, prompt if missing
- Create markdown-to-PDF pipeline via child_process
- Implement markdown-to-DOCX converter
- Build markdown-to-PPTX converter
- Create citation aggregation logic
- Implement theme configuration UI
- Build export modal with section selection

### Phase 7: Polish and Optimization (Week 13-14)

**Objectives:**
- Performance optimization for large documents
- UI polish and animations
- Comprehensive error handling
- Keyboard shortcuts and accessibility

**Deliverables:**
- App feels fast and responsive
- Smooth animations and transitions
- Clear error messages with recovery
- Full keyboard navigation support
- Screen reader compatibility

**Technical Tasks:**
- Profile rendering performance, optimize bottlenecks
- Implement virtualization for long documents
- Add loading skeletons for async operations
- Create error boundary components
- Implement keyboard shortcut system
- Add ARIA labels and roles for accessibility
- Test with screen readers
- Optimize bundle size with code splitting

### Phase 8: Testing and Packaging (Week 15-16)

**Objectives:**
- Write comprehensive tests
- Create installer packages for all platforms
- Set up auto-update system
- Prepare documentation

**Deliverables:**
- Test coverage above 80%
- macOS .dmg installer
- Windows .exe installer
- Linux .AppImage installer
- Auto-update working
- User documentation complete

**Technical Tasks:**
- Write unit tests with Vitest
- Write integration tests with Playwright
- Configure electron-builder for all platforms
- Set up code signing certificates
- Implement auto-update with electron-updater
- Create user manual and getting started guide
- Record demo video
- Prepare marketing materials

---

## 6. Migration Strategy from Python Plugin

### 6.1 Code Porting Approach

**Skill-by-Skill Migration:**

The existing Python plugin has 18 specialized skills that need TypeScript equivalents. We'll port them in priority order based on user needs:

**Phase 1 (Essential - Week 3-6):**
- research-lookup (multi-provider research routing)
- architecture-research (ADRs, technology decisions)
- building-blocks (YAML specification generation)
- sprint-planning (INVEST criteria, user stories)

**Phase 2 (Important - Week 7-10):**
- service-cost-analysis (AWS/GCP/Azure pricing)
- risk-assessment (risk registers, mitigation)
- feasibility-analysis (technical/market viability)
- project-diagrams (Mermaid, PlantUML generation)

**Phase 3 (Nice-to-Have - Week 11-14):**
- competitive-analysis (market research)
- market-research-reports (comprehensive analysis)
- marketing-campaign (social media strategy)
- plan-review (validation and suggestions)

**Phase 4 (Document Generation - Week 11-12):**
- report-generation (compile outputs to PDF/DOCX)
- document-skills/pdf, docx, pptx, xlsx
- generate-image (NanoBanana integration)

**Porting Process for Each Skill:**

1. **Extract core logic** from Python SKILL.md files
2. **Identify dependencies** on Python libraries, find TypeScript equivalents
3. **Convert prompts** to TypeScript template strings
4. **Implement business logic** with TypeScript Agent SDK
   - Use claude-docs-skill for TypeScript SDK patterns and API reference
   - Reference cookbook examples for common integration patterns
5. **Test with sample projects** to verify output quality
6. **Document differences** from Python version if any

### 6.2 Data Structure Compatibility

**YAML Output Format:**

The building blocks and sprint planning outputs use YAML format. We'll maintain exact compatibility:
- Use js-yaml library for parsing and generation
- Preserve schema structure from Python version
- Validate output against existing examples
- Ensure Claude Code CLI can still consume YAML specs

**Markdown Output Format:**

All markdown outputs should remain compatible with existing tooling:
- Use same heading hierarchy
- Maintain citation format for report generation
- Keep diagram markdown syntax identical
- Ensure GitHub/GitLab compatibility

**Checkpoint Format:**

The .checkpoint.json format should remain compatible for users migrating projects:
- Same JSON schema for session state
- Preserve phase numbering and naming
- Keep context summaries structure
- Allow opening Python-generated projects in Electron app

### 6.3 Testing Compatibility

**Side-by-Side Testing:**

During development, we'll run both Python plugin and TypeScript app with same inputs:
- Same project description
- Same research mode settings
- Same phase selections
- Compare outputs for consistency

**Regression Testing:**

Create test suite using real Python plugin outputs as baselines:
- Load Python-generated outputs
- Verify TypeScript app can open and edit them
- Ensure regeneration produces similar quality
- Check diagram rendering matches

**User Acceptance Testing:**

Beta test with existing Python plugin users:
- Migration guide for existing projects
- Comparison checklist for feature parity
- Feedback form for missing capabilities
- Iterative improvements based on feedback

---

## 7. Security and Privacy Considerations

### 7.1 API Key Management

**Secure Storage:**
- API keys stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Never stored in plain text files or localStorage
- Keys encrypted at rest using platform-native encryption
- Keys loaded into memory only when needed, cleared after use

**Key Configuration UI:**
- Settings modal with masked input fields (show/hide toggle)
- Validation before saving (test API call to verify key)
- Option to use environment variables for CI/CD scenarios
- Warning indicators for missing or invalid keys

### 7.2 Data Privacy

**Local-First Architecture:**
- All planning data stored locally on user's machine
- No telemetry or analytics sent to external servers
- API calls go directly to Anthropic/OpenRouter/Google
- No intermediary servers processing user data

**Optional Cloud Sync:**
- Future feature: opt-in cloud sync via user's own storage (S3, Dropbox)
- End-to-end encryption before upload
- User controls sync frequency and what to sync
- Clear deletion of cloud data when sync disabled

### 7.3 Sandboxing and Permissions

**Electron Security Best Practices:**
- Context isolation enabled in renderer process
- Node integration disabled in renderer
- Preload scripts with limited API surface
- Content Security Policy configured
- External links open in default browser, not in-app

**File System Access:**
- Restricted to planning_outputs directory by default
- User explicitly grants access to other directories
- Read-only access for templates and references
- Write access only to user-selected project directories

---

## 8. Performance Optimization Strategies

### 8.1 Rendering Performance

**Large Document Handling:**
- Virtual scrolling for documents over 10,000 lines
- Incremental rendering with React concurrent features
- Debounced re-renders during rapid updates
- Memoization of expensive components

**Diagram Rendering:**
- Diagrams rendered on-demand when scrolled into view
- SVG diagrams cached in IndexedDB after first render
- Web Workers for heavy diagram generation
- Progressive rendering for complex diagrams

### 8.2 Memory Management

**Streaming and Chunking:**
- Agent responses streamed, not buffered entirely
- Large files read in chunks, not loaded fully
- Automatic cleanup of closed tabs
- Periodic garbage collection hints

**Resource Limits:**
- Max open tabs enforced (default 10, configurable)
- Image size limits for embedded diagrams
- Cache size limits with LRU eviction
- Warning when memory usage high

### 8.3 Network Optimization

**API Call Optimization:**
- Request deduplication for identical queries
- Response caching with TTL
- Retry with exponential backoff
- Parallel requests where independent

**Asset Loading:**
- Lazy load markdown plugins until needed
- Code split by route/feature
- Preload critical assets
- CDN fallbacks for external dependencies

---

## 9. Deployment and Distribution

### 9.1 Build Configuration

**Multi-Platform Builds:**
- Electron Builder for packaging
- Separate builds for macOS (Intel + Apple Silicon universal), Windows x64, Linux AppImage
- Code signing certificates for macOS and Windows
- Notarization for macOS Gatekeeper

**Auto-Update System:**
- Electron-updater for automatic updates
- GitHub Releases for hosting update packages
- Staged rollouts (5% → 25% → 100%)
- Release notes displayed in update prompt

### 9.2 Installation Experience

**First-Run Setup:**
- Welcome wizard with API key configuration
- Optional quick tour of features
- Sample project generation for exploration
- Link to documentation and video tutorials

**System Requirements Check:**
- Node.js version check (bundled with Electron)
- Pandoc installation detection with install prompt
- Mermaid CLI installation detection
- Sufficient disk space validation

### 9.3 Distribution Channels

**Primary Channels:**
- Direct download from GitHub Releases (free, open source)
- Optional: macOS App Store listing (for discoverability)
- Optional: Homebrew cask for macOS (brew install blueprint)
- Optional: Chocolatey for Windows (choco install blueprint)

**License and Pricing:**
- MIT license for codebase (same as plugin)
- Free and open source
- User provides their own API keys
- Optional paid support for enterprises

---

## 10. Success Metrics and KPIs

### 10.1 User Experience Metrics

**Performance Targets:**
- App launch time: under 2 seconds
- Markdown rendering: under 100ms for 1000 lines
- Inline edit response: first token within 1 second
- Tab switching: under 50ms
- Search results: under 200ms for 10,000 lines

**Usability Targets:**
- Users complete first project within 30 minutes
- 90% of edits accepted on first attempt
- Average 3 inline edits per document
- 80% user satisfaction rating

### 10.2 Technical Health Metrics

**Quality Metrics:**
- Test coverage above 80%
- Zero critical security vulnerabilities
- Crash rate below 0.1%
- Memory leaks: none detected in 24-hour runs

**Compatibility Metrics:**
- 100% YAML compatibility with Python plugin
- 95% markdown output similarity
- Supports all Python-generated projects

---

## 11. Risks and Mitigation Strategies

### 11.1 Technical Risks

**Risk: Claude Agent SDK V2 API Changes**
- **Likelihood:** Medium (preview status)
- **Impact:** High (breaks core functionality)
- **Mitigation:** Pin specific SDK version, monitor changelog, maintain V1 fallback

**Risk: Large Document Rendering Performance**
- **Likelihood:** Medium
- **Impact:** Medium (poor UX for large projects)
- **Mitigation:** Implement virtual scrolling early, test with 50+ page documents

**Risk: Platform-Specific Bugs**
- **Likelihood:** High (three platforms)
- **Impact:** Medium (user frustration)
- **Mitigation:** Automated testing on all platforms, beta testing program

### 11.2 User Adoption Risks

**Risk: Users Prefer CLI Plugin**
- **Likelihood:** Medium
- **Impact:** Medium (low adoption)
- **Mitigation:** Maintain both CLI plugin and Electron app, highlight unique benefits

**Risk: Complex Installation**
- **Likelihood:** Low (with bundling)
- **Impact:** High (adoption barrier)
- **Mitigation:** Bundle all dependencies, automated installers, clear setup guide

**Risk: API Costs Too High**
- **Likelihood:** Medium
- **Impact:** High (abandonment)
- **Mitigation:** Cost estimation before planning, budget limits, cheaper model options

---

## 12. Future Enhancements

### 12.1 Short-Term (3-6 months)

**Collaborative Features:**
- Export project to Claude.ai for sharing
- Import shared projects from URLs
- Comment threads on plan sections
- Version control integration (Git)

**Enhanced Editing:**
- Multi-cursor editing
- Find and replace across project
- Bulk edit operations
- Custom snippets library

### 12.2 Long-Term (6-12 months)

**Cloud Features:**
- Optional cloud sync for projects
- Shared team workspaces
- Real-time collaboration
- Web-based viewer (view-only)

**Advanced AI:**
- Custom agent definitions for domain-specific planning
- Fine-tuned models for specific industries
- Automated plan validation with multiple models
- Predictive cost estimation with historical data

**Integration Ecosystem:**
- Jira/Linear export for sprint plans
- Figma integration for design references
- Terraform generation from infrastructure specs
- OpenAPI spec generation from API designs

---

## 13. Conclusion

This design document provides a comprehensive specification for Blueprint, a powerful Electron desktop application for AI-powered project planning. The two-pane interface with inline AI editing creates an iterative planning workflow superior to the CLI-only experience.

**Key Advantages:**

1. **Visual Feedback** - Users see rendered markdown and diagrams immediately
2. **Inline Editing** - No context switching between planning and revision
3. **Professional Outputs** - Theme-aware PDFs and slide decks
4. **Offline Capable** - Works without internet after initial setup
5. **Familiar UX** - VSCode-inspired interface developers already know

**Implementation Timeline:**

- **Weeks 1-2:** Foundation and infrastructure
- **Weeks 3-4:** Agent SDK integration
- **Weeks 5-6:** Markdown rendering and viewing
- **Weeks 7-8:** Inline editing and AI integration
- **Weeks 9-10:** Research provider integration
- **Weeks 11-12:** Document generation pipeline
- **Weeks 13-14:** Polish and optimization
- **Weeks 15-16:** Testing and packaging

**Total Estimated Timeline:** 16 weeks (4 months) for full implementation and release.

The TypeScript rewrite provides a cleaner, more maintainable codebase compared to bundling Python, while the Electron desktop app delivers a superior user experience compared to the CLI plugin. This positions Blueprint as the definitive tool for AI-powered software project planning.

---

## Known Issues & Workarounds

### Electron Forge Vite Plugin Issue

**Problem:** `@electron-forge/plugin-vite` v7.11.1 has a bug where the Vite dev server starts but immediately exits. Electron tries to load `http://localhost:5173/` but nothing is listening, resulting in a white screen.

**Required Configuration:**

1. **postcss.config.js** - Must exist in project root for Tailwind CSS v4:
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

2. **vite.renderer.config.ts** - Must include `base: './'` for Electron's file:// protocol:
```typescript
return {
  base: './',
  // ... other config
};
```

3. **vite.main.config.ts** - Do NOT use `browserField: false` (invalid in Vite 5)

4. **src/main.ts** - Include retry logic for dev server connection (10 retries, 500ms delay)

**Development Workaround:**
```bash
# Terminal 1: Start Vite manually
pnpm exec vite --config vite.renderer.config.ts --port 5173

# Terminal 2: Run Electron with built main.js
pnpm exec electron .vite/build/main.js
```

**Note:** Production builds (`pnpm run make`) work correctly - this only affects development mode.

---

**Next Steps:**

1. Review and approve this design document
2. Set up development environment with Electron + TypeScript
3. Familiarize team with claude-docs-skill for Agent SDK reference (essential for Phase 2)
4. Begin Phase 1 implementation (foundation)
5. Create initial prototype for user feedback
6. Iterate based on early testing results

**Questions for Consideration:**

- Should we maintain the CLI plugin alongside the Electron app?
- What's the minimum viable feature set for initial release?
- Should we beta test with existing plugin users?
- Do we need professional design assistance for UI polish?
- What's the update cadence after initial release?
