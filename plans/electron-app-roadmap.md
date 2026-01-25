# Blueprint - Electron App Implementation Roadmap

**Date:** 2026-01-22
**Version:** 1.0
**Project Duration:** 16 weeks (4 months)
**Target Launch:** June 2026
**Author:** Jesper Vang

---

## Executive Summary

This roadmap translates the Electron app design into an actionable 16-week implementation plan with 12 major milestones, 4 demo checkpoints, and 3 release candidates. The critical path runs through Agent SDK integration, markdown rendering, and inline editing - the core value proposition.

**Critical Success Factors:**
- Week 4 Demo 1: Basic agent interaction proves viability
- Week 8 Demo 2: Inline editing validates core UX
- Week 12 Demo 3: Full planning workflow end-to-end
- Week 16: Production-ready release with installers

**Resource Requirements:**
- 1 full-time developer (or equivalent)
- Access to Claude API, OpenRouter, Gemini API
- Design consultation for UI polish (Weeks 13-14)
- Beta testers from Python plugin user base (Week 15)

---

## Timeline Overview

```
Month 1: Foundation (Weeks 1-4)
├─ M1: Project setup and scaffolding
├─ M2: Two-pane layout with file browser
├─ M3: Agent SDK integration
└─ DEMO 1: Basic agent chat working

Month 2: Core Features (Weeks 5-8)
├─ M4: Markdown rendering with diagrams
├─ M5: Tab system and file navigation
├─ M6: Inline editing with context menus
└─ DEMO 2: Inline editing workflow

Month 3: AI Integration (Weeks 9-12)
├─ M7: Research providers (Perplexity/Gemini)
├─ M8: Document generation (PDF/DOCX/PPTX)
├─ M9: Complete planning workflow
└─ DEMO 3: End-to-end project planning

Month 4: Polish & Launch (Weeks 13-16)
├─ M10: Performance optimization and UI polish
├─ M11: Testing and bug fixes
├─ M12: Packaging and distribution
└─ RELEASE: v1.0.0 production launch
```

---

## Milestone Breakdown

### Milestone 1: Project Setup and Scaffolding
**Timeline:** Week 1 (Days 1-5)
**Phase:** Foundation
**Status:** Not Started

**Objectives:**
- Initialize Electron project with TypeScript and Vite
- Configure build pipeline for development
- Set up project structure and tooling
- Create basic window management

**Deliverables:**
- [ ] Electron Forge/Builder project initialized
- [ ] TypeScript strict mode configured
- [ ] Vite dev server running for renderer
- [ ] ESLint and Prettier configured
- [ ] Git repository with initial commit
- [ ] Basic Electron window launches successfully
- [ ] Hot reload working for both main and renderer

**Success Criteria:**
- Application launches on macOS, Windows, Linux
- Hot reload updates UI without full restart
- TypeScript compilation passes with no errors
- All dependencies installed and locked

**Dependencies:**
- None (initial milestone)

**Risks:**
- Electron version compatibility issues
- Build tool configuration complexity

**Mitigation:**
- Use latest stable Electron version
- Follow official Electron Forge templates
- Document any configuration gotchas

**Tasks:**
1. Install Node.js and verify version
2. Run `npm create @electron-forge/app@latest`
3. Configure TypeScript in main and renderer
4. Set up Vite for renderer process
5. Configure Tailwind CSS
6. Create basic main process window manager
7. Test on all three platforms
8. Document setup process in README

---

### Milestone 2: Two-Pane Layout with File Browser
**Timeline:** Week 2 (Days 6-10)
**Phase:** Foundation
**Status:** Not Started

**Objectives:**
- Implement resizable two-pane split interface
- Create collapsible file browser sidebar
- Add basic theme switching
- Set up file system watching

**Deliverables:**
- [ ] Resizable divider between left and right panes
- [ ] File browser tree view component
- [ ] Light/dark theme toggle working
- [ ] File system watcher monitoring project directory
- [ ] Basic routing/navigation structure
- [ ] Custom titlebar for all platforms

**Success Criteria:**
- Divider can be dragged smoothly
- File browser displays directory structure correctly
- Theme persists across app restarts
- File changes detected within 1 second
- UI responsive on 1024x768 minimum resolution

**Dependencies:**
- M1: Project Setup complete

**Risks:**
- Platform-specific titlebar issues
- File watcher performance on large directories

**Mitigation:**
- Use proven libraries (react-split-pane, react-arborist)
- Debounce file watcher events
- Test with 1000+ file directory

**Tasks:**
1. Create LeftPane and RightPane components
2. Implement ResizableSplit component
3. Build FileTree component with react-arborist
4. Add file type icons (markdown, YAML, images)
5. Implement theme context with Zustand
6. Set up chokidar file watching in main process
7. Create IPC channel for file system events
8. Add custom titlebar with electron-window-state

---

### Milestone 3: Agent SDK Integration
**Timeline:** Weeks 3-4 (Days 11-20)
**Phase:** Agent SDK Integration
**Status:** Not Started

**Objectives:**
- Integrate Claude Agent SDK V2 for session management
- Implement chat UI with streaming messages
- Create interactive question components
- Build basic progress tracking

**Deliverables:**
- [ ] Claude Agent SDK V2 installed and configured
- [ ] Session creation and management working
- [ ] Chat UI with message bubbles (user/assistant)
- [ ] Streaming text with typewriter effect
- [ ] AskUserQuestion tool rendering
- [ ] Progress indicators for active tasks
- [ ] Session persistence to SQLite

**Success Criteria:**
- User can start conversation with agent
- Messages stream in real-time (< 100ms latency)
- Questions render with options and accept user input
- Sessions resume across app restarts
- No memory leaks during 10-minute conversations

**Dependencies:**
- M2: Two-pane layout complete (need UI to display chat)

**Risks:**
- Agent SDK V2 preview API changes
- Streaming performance issues

**Mitigation:**
- Pin specific SDK version
- Maintain fallback to V1 if needed
- Test streaming with large responses (10k tokens)

**Tasks:**
1. Install @anthropic-ai/claude-agent-sdk
2. Create AgentService in main process
3. Implement session wrapper with V2 API
4. Build ChatMessage component for renderer
5. Create MessageStream IPC channel
6. Implement AskUserQuestion component with multi-select
7. Add ProgressBar component
8. Set up SQLite with better-sqlite3
9. Create sessions table schema
10. Implement session save/resume logic
11. Add API key configuration UI in Settings
12. Test with sample conversation

**CHECKPOINT: Demo 1 - Basic Agent Interaction**
- Demonstrate agent responding to user messages
- Show streaming text in chat UI
- Demonstrate interactive question workflow
- Prove core viability before continuing

---

### Milestone 4: Markdown Rendering with Diagrams
**Timeline:** Week 5 (Days 21-25)
**Phase:** Markdown Rendering
**Status:** Not Started

**Objectives:**
- Implement rich markdown rendering
- Add support for Mermaid diagrams
- Enable syntax highlighting for code blocks
- Create interactive diagram viewer

**Deliverables:**
- [ ] react-markdown configured with plugins
- [ ] GitHub-flavored markdown support
- [ ] Mermaid diagrams render as SVG
- [ ] Code syntax highlighting working
- [ ] Math equations render with KaTeX
- [ ] Images display with zoom capability
- [ ] Tables render with proper formatting

**Success Criteria:**
- All markdown features from design doc render correctly
- Mermaid diagrams interactive (zoom, pan)
- Rendering performance < 100ms for 1000 lines
- Diagrams cached in IndexedDB
- No visual artifacts or rendering bugs

**Dependencies:**
- M2: Right pane ready to display content

**Risks:**
- Mermaid rendering performance
- Large diagram memory usage

**Mitigation:**
- Lazy load diagrams on scroll
- Virtual scrolling for very long documents
- Web Workers for heavy diagram processing

**Tasks:**
1. Install react-markdown and plugins
2. Configure remark-gfm for GitHub features
3. Add rehype-katex for math equations
4. Install rehype-highlight for code blocks
5. Integrate Mermaid with react-mermaid2
6. Create custom code block renderer
7. Build ZoomableImage component
8. Implement diagram caching with IndexedDB
9. Add PlantUML support via child_process
10. Test with sample markdown from plugin outputs

---

### Milestone 5: Tab System and File Navigation
**Timeline:** Week 6 (Days 26-30)
**Phase:** Markdown Rendering
**Status:** Not Started

**Objectives:**
- Build tab system for multiple open files
- Implement file search (fuzzy and content)
- Add keyboard shortcuts for navigation
- Create search results panel

**Deliverables:**
- [ ] Tab bar with open files
- [ ] Tab close buttons and overflow menu
- [ ] Fuzzy file search with fuse.js
- [ ] Content search with regex support
- [ ] Search results panel with highlights
- [ ] Keyboard shortcuts (Cmd+P, Cmd+F, Cmd+T)
- [ ] Unsaved changes indicators

**Success Criteria:**
- Users can open 10+ tabs without performance issues
- Fuzzy search returns results < 200ms
- Content search handles 10,000 lines < 500ms
- Keyboard navigation works smoothly
- Search highlights visible in rendered markdown

**Dependencies:**
- M4: Markdown rendering working (tabs display rendered content)

**Risks:**
- Search performance on very large projects
- Tab memory consumption

**Mitigation:**
- Index documents for faster search
- Lazy load tab content
- Implement tab limit (default 10)

**Tasks:**
1. Create TabBar component with state
2. Build Tab component with close button
3. Implement tab overflow with dropdown
4. Add fuzzy search with fuse.js
5. Create SearchBar component
6. Build content search with regex
7. Implement SearchResults panel
8. Add result highlighting in markdown viewer
9. Create keyboard shortcut handler
10. Add unsaved changes tracking
11. Implement tab persistence to localStorage

---

### Milestone 6: Inline Editing with Context Menus
**Timeline:** Weeks 7-8 (Days 31-40)
**Phase:** Inline Editing
**Status:** Not Started

**Objectives:**
- Implement text selection detection
- Create context menu with edit options
- Build inline edit overlay with model selector
- Add diff preview with accept/reject workflow

**Deliverables:**
- [ ] Text selection tracking in markdown viewer
- [ ] Context menu on right-click/hotkey
- [ ] Inline edit overlay with input field
- [ ] Model selector dropdown with smart defaults
- [ ] Edit request IPC channel to agent
- [ ] Diff viewer showing before/after
- [ ] Accept/reject buttons with undo/redo
- [ ] Diagram edit modal with Monaco editor

**Success Criteria:**
- Selection detection works for any text
- Context menu appears within 100ms
- Edit overlay positioned correctly relative to selection
- First token from agent within 1 second
- Diff view clearly shows changes
- 90% of edits accepted on first attempt (target metric)

**Dependencies:**
- M3: Agent SDK working (need to send edit requests)
- M4: Markdown rendering working (need content to edit)

**Risks:**
- Overlay positioning complexity
- Diff algorithm performance

**Mitigation:**
- Use proven positioning libraries
- Leverage Monaco's built-in diff viewer
- Test with varied selection positions

**Tasks:**
1. Add selection detection to markdown viewer
2. Create ContextMenu component
3. Build InlineEditOverlay component
4. Implement model selector with options
5. Create edit request builder (selection + context)
6. Add IPC channel for agent edit requests
7. Build DiffViewer component with Monaco
8. Implement accept/reject workflow
9. Add undo/redo stack
10. Create DiagramEditModal with Monaco editor
11. Add live preview for diagram edits
12. Test with various selection types (text, code, diagrams)

**CHECKPOINT: Demo 2 - Inline Editing Workflow**
- Demonstrate selecting text and triggering edit
- Show AI generating replacement text
- Display diff preview
- Accept changes and see updated markdown
- This validates the core UX proposition

---

### Milestone 7: Research Providers Integration
**Timeline:** Weeks 9-10 (Days 41-50)
**Phase:** Research Provider Integration
**Status:** Not Started

**Objectives:**
- Integrate OpenRouter for Perplexity research
- Add Google Gemini for Deep Research
- Implement intelligent provider routing
- Build progress tracking for long research

**Deliverables:**
- [ ] OpenRouter client configured for Perplexity
- [ ] Google Gemini client configured
- [ ] Provider routing logic based on research mode
- [ ] Progress file tracking for Deep Research
- [ ] Checkpoint system for interrupted research
- [ ] Citation extraction and storage
- [ ] Resume capability for long-running queries

**Success Criteria:**
- Perplexity queries return within 30 seconds
- Gemini Deep Research completes within 60 minutes
- Progress files update every 30 seconds
- Checkpoints allow resuming from 15%, 30%, 50%
- Citations collected and formatted properly
- Graceful fallback when provider unavailable

**Dependencies:**
- M3: Agent SDK working (research called during planning)

**Risks:**
- Deep Research 60-minute timeout issues
- API rate limits

**Mitigation:**
- Implement exponential backoff with retry
- Progress checkpoints for resume
- Clear user communication about long waits

**Tasks:**
1. Install openai npm client for OpenRouter
2. Install @google/generative-ai package
3. Create ResearchProvider abstraction layer
4. Implement PerplexityProvider class
5. Implement GeminiDeepResearchProvider class
6. Build provider router with mode detection
7. Create progress file tracker
8. Implement checkpoint manager for research
9. Add citation extractor
10. Build resume logic for interrupted research
11. Create progress UI in left pane
12. Test with actual research queries (balanced mode)

---

### Milestone 8: Document Generation Pipeline
**Timeline:** Weeks 11-12 (Days 51-60)
**Phase:** Document Generation
**Status:** Not Started

**Objectives:**
- Implement PDF generation via Pandoc
- Create DOCX generation with docx package
- Build PPTX generation with pptxgenjs
- Add theme configuration for slides

**Deliverables:**
- [ ] PDF generation working with LaTeX
- [ ] DOCX generation with formatting
- [ ] PPTX generation with theme backgrounds
- [ ] Citation aggregation for reports
- [ ] Export configuration modal
- [ ] Theme color picker UI
- [ ] Background color injection for images

**Success Criteria:**
- PDF includes TOC, citations, cover page
- DOCX maintains all markdown formatting
- PPTX slides have consistent theme colors
- Images in slides match background color
- Export completes within 30 seconds
- Generated files open correctly in native apps

**Dependencies:**
- M4: Markdown rendering (need content to export)
- M7: Research providers (citations come from research)

**Risks:**
- Pandoc not installed on user systems
- Platform-specific LaTeX issues
- Image background color matching

**Mitigation:**
- Check for Pandoc, prompt install if missing
- Bundle minimal LaTeX templates
- Clear theme preview before generation

**Tasks:**
1. Install docx and pptxgenjs packages
2. Create markdown-to-PDF pipeline
3. Build markdown-to-DOCX converter
4. Implement markdown-to-PPTX converter
5. Create citation aggregator
6. Build ExportConfigModal component
7. Add theme configuration UI
8. Implement background color injection for NanoBanana
9. Create progress indicator for export
10. Add Pandoc installation checker
11. Test exports on all platforms
12. Verify output quality

**CHECKPOINT: Demo 3 - End-to-End Planning Workflow**
- Create new project from scratch
- Run through all planning phases
- Edit outputs with inline editing
- Generate PDF, DOCX, PPTX
- Demonstrate complete value proposition

---

### Milestone 9: Complete Planning Workflow
**Timeline:** Week 12 (Days 56-60, overlaps with M8)
**Phase:** Integration
**Status:** Not Started

**Objectives:**
- Implement new project wizard
- Build phase-by-phase planning orchestration
- Add approval gates between phases
- Create project resume capability

**Deliverables:**
- [ ] New project wizard with configuration
- [ ] Phase orchestrator managing 6 phases
- [ ] Approval gate UI after each phase
- [ ] Revision workflow with feedback
- [ ] Checkpoint save/load
- [ ] Project browser for opening existing projects
- [ ] Phase progress tracking dashboard

**Success Criteria:**
- Users can create project in < 2 minutes
- All 6 phases execute correctly in sequence
- Approval gates allow continue/revise/pause
- Checkpoints allow resuming interrupted sessions
- Project browser shows all saved projects
- No data loss during interruptions

**Dependencies:**
- M3: Agent SDK (orchestrates planning)
- M7: Research providers (used in Phase 1)

**Risks:**
- Phase orchestration complexity
- State management across phases

**Mitigation:**
- Clear phase state machine
- Extensive integration testing
- Checkpoint after every phase

**Tasks:**
1. Create NewProjectWizard component
2. Build phase orchestrator service
3. Implement approval gate UI
4. Add revision workflow
5. Create checkpoint manager
6. Build project browser component
7. Implement project metadata persistence
8. Add phase progress dashboard
9. Test full planning workflow end-to-end
10. Handle error recovery gracefully

---

### Milestone 10: Performance Optimization and UI Polish
**Timeline:** Week 13 (Days 61-65)
**Phase:** Polish
**Status:** Not Started

**Objectives:**
- Optimize rendering performance
- Add smooth animations and transitions
- Implement loading states and skeletons
- Polish visual design

**Deliverables:**
- [ ] Virtual scrolling for long documents
- [ ] Optimized diagram rendering
- [ ] Loading skeletons for async operations
- [ ] Smooth transitions and animations
- [ ] Improved color scheme and spacing
- [ ] Icon set for file types and actions
- [ ] Tooltips and helpful hints

**Success Criteria:**
- 60fps scrolling on 10,000 line documents
- No janky animations
- Loading states prevent confusion
- App feels polished and professional
- Accessibility improvements (ARIA labels)

**Dependencies:**
- M4, M5, M6: All UI components ready to polish

**Risks:**
- Performance regressions
- Over-animation reducing usability

**Mitigation:**
- Profile before and after optimizations
- A/B test animations with users
- Keep animations subtle

**Tasks:**
1. Profile rendering performance
2. Implement virtual scrolling with react-window
3. Optimize diagram caching strategy
4. Add loading skeletons for all async ops
5. Create smooth transition animations
6. Refine color palette and spacing
7. Add icon set (Lucide or Heroicons)
8. Implement tooltips for all actions
9. Add ARIA labels for accessibility
10. Test with screen reader
11. Get design feedback from users

---

### Milestone 11: Testing and Bug Fixes
**Timeline:** Week 14-15 (Days 66-75)
**Phase:** Testing
**Status:** Not Started

**Objectives:**
- Write comprehensive test suite
- Fix critical and high-priority bugs
- Conduct user acceptance testing
- Verify cross-platform compatibility

**Deliverables:**
- [ ] Unit tests for core utilities (80%+ coverage)
- [ ] Integration tests for workflows
- [ ] E2E tests with Playwright
- [ ] Bug fix backlog cleared
- [ ] UAT feedback incorporated
- [ ] Platform-specific issues resolved

**Success Criteria:**
- Test coverage above 80%
- Zero critical bugs
- All high-priority bugs fixed
- UAT participants rate 4+/5
- Works on macOS, Windows, Linux

**Dependencies:**
- M1-M9: All features complete to test

**Risks:**
- Late discovery of critical bugs
- Platform-specific issues

**Mitigation:**
- Test early and often throughout
- Automated CI/CD testing
- Beta testing program

**Tasks:**
1. Set up Vitest for unit tests
2. Write tests for utilities and services
3. Set up Playwright for E2E tests
4. Write E2E tests for critical workflows
5. Create test fixtures and mocks
6. Run tests on all platforms
7. Triage and fix bugs by priority
8. Conduct UAT with beta testers
9. Collect and incorporate feedback
10. Regression test after fixes
11. Document known issues for v1.1

---

### Milestone 12: Packaging and Distribution
**Timeline:** Week 16 (Days 76-80)
**Phase:** Packaging
**Status:** Not Started

**Objectives:**
- Create installers for all platforms
- Set up auto-update system
- Prepare release documentation
- Launch v1.0.0

**Deliverables:**
- [ ] macOS .dmg installer (universal binary)
- [ ] Windows .exe installer
- [ ] Linux .AppImage
- [ ] Code signing certificates applied
- [ ] Auto-update configured
- [ ] Release notes written
- [ ] User documentation complete
- [ ] GitHub Release published

**Success Criteria:**
- Installers work on clean systems
- Auto-update detects and installs updates
- Documentation covers all features
- Release notes clear and accurate
- GitHub Release has 100+ stars (stretch)

**Dependencies:**
- M11: All bugs fixed, tests passing

**Risks:**
- Code signing issues
- Platform-specific installer bugs

**Mitigation:**
- Test installers on clean VMs
- Document signing process
- Have rollback plan

**Tasks:**
1. Configure electron-builder for all platforms
2. Obtain code signing certificates
3. Build macOS installer and sign
4. Build Windows installer and sign
5. Build Linux AppImage
6. Set up electron-updater
7. Configure GitHub Releases for updates
8. Write release notes
9. Create user documentation site
10. Record demo video
11. Publish GitHub Release
12. Announce on social media and forums

**CHECKPOINT: Release v1.0.0**
- Production-ready application
- Installers available for download
- Documentation published
- Auto-update working
- Ready for public use

---

## Critical Path Analysis

### Critical Dependencies

The following dependencies form the critical path - delays here impact final delivery:

```
M1 (Week 1) → M2 (Week 2) → M3 (Weeks 3-4) → M6 (Weeks 7-8) → M9 (Week 12) → M11 (Weeks 14-15) → M12 (Week 16)

Critical Path Timeline: 16 weeks
Float Available: 0 weeks (tight timeline)
```

**Why these are critical:**
- M1: Everything depends on project setup
- M2: UI foundation needed for all features
- M3: Agent SDK is core functionality
- M6: Inline editing is unique value proposition
- M9: Integration proves complete workflow
- M11: Testing gates release quality
- M12: Distribution enables user access

**Parallel Tracks:**

These can happen in parallel to critical path:
- M4 & M5 (Markdown rendering, tabs) - Weeks 5-6
- M7 (Research providers) - Weeks 9-10
- M8 (Document generation) - Weeks 11-12
- M10 (Polish) - Week 13

**Risk of Delays:**

If any critical path milestone slips:
- 1 week delay → v1.0 delayed to Week 17
- 2 week delay → Consider reducing scope for v1.0
- 3+ week delay → Reassess project feasibility

---

## Demo Checkpoints

### Demo 1: Basic Agent Interaction (End of Week 4)

**Audience:** Internal stakeholders, early testers

**Demonstration Flow:**
1. Launch application
2. Show two-pane layout with file browser
3. Type message to agent in left pane
4. Agent responds with streaming text
5. Agent asks clarifying question with AskUserQuestion
6. User selects answer
7. Agent continues conversation
8. Show session persisting across app restart

**Success Criteria:**
- Agent responds within 2 seconds
- Streaming text smooth with no stuttering
- Questions render correctly with all options
- Session resume works reliably

**Go/No-Go Decision:**
- GO if all criteria met → Continue to M4
- NO-GO if major issues → Reassess architecture

---

### Demo 2: Inline Editing Workflow (End of Week 8)

**Audience:** Potential users, UX feedback group

**Demonstration Flow:**
1. Open sample planning document
2. Scroll to architecture section
3. Select paragraph about database choice
4. Right-click → "Edit with AI"
5. Type instruction: "Change to PostgreSQL with specific schema notes"
6. Show model selector (Claude Sonnet selected)
7. Agent streams replacement text
8. Diff view shows before/after
9. Accept changes
10. Markdown updates immediately

**Success Criteria:**
- Selection and edit trigger feels natural
- AI response time < 3 seconds to first token
- Diff view clearly shows changes
- Users rate workflow 4+/5

**Go/No-Go Decision:**
- GO if users excited about UX → Continue to M9
- NO-GO if UX confusing → Iterate on design

---

### Demo 3: End-to-End Planning (End of Week 12)

**Audience:** Beta users, potential customers

**Demonstration Flow:**
1. Click "New Project"
2. Fill in project wizard (SaaS app example)
3. Select Balanced research mode
4. Choose phases: Market, Architecture, Feasibility, Sprints
5. Click "Start Planning"
6. Show Phase 1 progressing with live updates
7. Approval gate after Phase 1 completion
8. Review market research outputs
9. Make inline edit to competitive analysis
10. Continue to Phase 2
11. Fast-forward through remaining phases
12. Generate PDF with all outputs
13. Open PDF to show professional report

**Success Criteria:**
- Complete workflow feels cohesive
- Users understand value immediately
- Generated outputs meet quality expectations
- Users excited to use for real projects

**Go/No-Go Decision:**
- GO if users want access → Proceed to testing and release
- NO-GO if major workflow issues → Fix before launch

---

## Resource Allocation

### Developer Time Allocation

**Weeks 1-4 (Foundation & Agent SDK):**
- 80% implementation
- 20% learning/research

**Weeks 5-8 (UI & Editing):**
- 70% implementation
- 20% testing
- 10% iteration on UX

**Weeks 9-12 (Integration):**
- 60% implementation
- 30% testing
- 10% documentation

**Weeks 13-16 (Polish & Launch):**
- 30% implementation
- 40% testing/bug fixing
- 30% documentation/packaging

### External Resources

**Design Consultation (Week 13):**
- 8-16 hours for UI/UX review
- Color palette refinement
- Icon design
- Animation guidance

**Beta Testing (Weeks 14-15):**
- 10-20 beta users
- Each tests 3-5 hours
- Feedback collected via form
- Priority issues addressed

**Technical Writing (Week 16):**
- User documentation (20 hours)
- Developer setup guide (8 hours)
- Release notes (4 hours)
- Demo video script (4 hours)

---

## Risk Management Plan

### High-Impact Risks

**Risk 1: Agent SDK V2 Breaking Changes**
- **Probability:** 30% (preview status)
- **Impact:** High (core functionality breaks)
- **Detection:** Monitor SDK changelog weekly
- **Response:** Maintain V1 fallback, pin version
- **Contingency:** 1 week to migrate if API changes

**Risk 2: Performance Issues with Large Documents**
- **Probability:** 40%
- **Impact:** Medium (poor UX)
- **Detection:** Performance testing at M10
- **Response:** Virtual scrolling, lazy loading
- **Contingency:** 3 days to implement optimization

**Risk 3: Cross-Platform Bugs**
- **Probability:** 60% (inevitable with 3 platforms)
- **Impact:** Medium (platform-specific issues)
- **Detection:** Automated testing on all platforms
- **Response:** Platform-specific fixes
- **Contingency:** 1 week buffer in testing phase

### Medium-Impact Risks

**Risk 4: Deep Research Timeout Issues**
- **Probability:** 50%
- **Impact:** Medium (frustrating UX)
- **Detection:** Testing with real queries at M7
- **Response:** Clear progress communication, checkpoints
- **Contingency:** Fallback to Perplexity if timeout

**Risk 5: Document Generation Quality**
- **Probability:** 40%
- **Impact:** Medium (outputs look unprofessional)
- **Detection:** Manual review at M8
- **Response:** Refine templates, test with users
- **Contingency:** 2 days for template improvements

---

## Quality Gates

### Gate 1: End of Week 4 (Demo 1)
**Criteria:**
- [ ] Application launches on all platforms
- [ ] Agent SDK integrated and responding
- [ ] Basic chat UI functional
- [ ] Session persistence working
- [ ] No critical bugs

**Action if Gate Fails:**
- 1-week delay acceptable
- Reassess timeline if > 1 week needed

---

### Gate 2: End of Week 8 (Demo 2)
**Criteria:**
- [ ] Inline editing workflow complete
- [ ] Markdown rendering excellent quality
- [ ] User feedback positive (4+/5)
- [ ] Performance acceptable (< 100ms renders)
- [ ] No critical or high-priority bugs

**Action if Gate Fails:**
- Iterate on UX with user feedback
- 1-week slip acceptable
- Consider reducing scope if > 1 week

---

### Gate 3: End of Week 12 (Demo 3)
**Criteria:**
- [ ] Full planning workflow working end-to-end
- [ ] All export formats generating correctly
- [ ] Research providers integrated
- [ ] No critical bugs, < 5 high-priority bugs
- [ ] Users express intent to use for real projects

**Action if Gate Fails:**
- Delay release for bug fixing
- Maximum 2-week slip before reassessing

---

### Gate 4: End of Week 15 (Pre-Release)
**Criteria:**
- [ ] Test coverage > 80%
- [ ] All critical and high bugs fixed
- [ ] UAT completed with 4+/5 rating
- [ ] Platform testing complete
- [ ] Documentation ready

**Action if Gate Fails:**
- Delay release until criteria met
- Communicate revised timeline to stakeholders

---

## Success Metrics and KPIs

### Development Velocity Metrics

**Weekly Targets:**
- Weeks 1-4: 1 milestone per week
- Weeks 5-8: 0.75 milestones per week (more complex)
- Weeks 9-12: 0.5 milestones per week (integration intensive)
- Weeks 13-16: Testing/polish cadence varies

**Tracking:**
- Daily standup: What shipped yesterday, blockers
- Weekly review: Milestone progress, risk assessment
- Biweekly demo: Show progress to stakeholders

### Quality Metrics

**Code Quality:**
- Test coverage: 80%+ by Week 15
- TypeScript strict mode: 100% compliance
- ESLint warnings: 0 by Week 14
- Critical bugs: 0 by Week 15
- High bugs: < 5 by Week 15

**Performance Benchmarks:**
- App launch: < 2 seconds
- Markdown render (1000 lines): < 100ms
- Tab switch: < 50ms
- Agent response (first token): < 1 second
- Search (10k lines): < 500ms

### User Satisfaction Metrics

**Demo 1 (Week 4):**
- Stakeholder approval: Yes/No
- Confidence in approach: 4+/5

**Demo 2 (Week 8):**
- UX rating: 4+/5
- Would use feature: 80%+

**Demo 3 (Week 12):**
- Overall satisfaction: 4+/5
- Intent to use: 80%+

**Beta Testing (Week 14-15):**
- NPS score: 40+ (promoters - detractors)
- Critical issues found: < 5
- User retention: 70%+ continue testing

---

## Release Strategy

### Release Candidates

**RC1 (End of Week 14):**
- Feature complete
- Known bugs documented
- Release to internal team for testing
- Fix critical bugs found

**RC2 (End of Week 15):**
- All critical bugs fixed
- Beta user feedback incorporated
- Release to beta testers
- Collect final feedback

**RC3 (Week 16, Day 78):**
- All high bugs fixed
- Final polish applied
- Installers tested on clean systems
- Release notes finalized

**v1.0.0 Production (Week 16, Day 80):**
- GitHub Release published
- Installers available for download
- Documentation live
- Social media announcement

### Post-Launch Support

**Week 17-18 (Stabilization):**
- Monitor for critical bugs
- Hot-fix releases if needed
- User support via GitHub Issues
- Collect feature requests for v1.1

**Week 19-20 (Planning):**
- Analyze usage data and feedback
- Prioritize v1.1 features
- Create v1.1 roadmap
- Begin implementation planning

---

## Communication Plan

### Internal Updates

**Daily:**
- Slack/Discord: Progress updates, blockers
- GitHub: Commit messages, PR descriptions

**Weekly:**
- Status report: Milestone progress, risks, decisions needed
- Demo video: Show what shipped this week
- Planning: Next week priorities

**Biweekly:**
- Stakeholder demo: Live demonstration
- Risk review: Assess timeline and quality
- Go/no-go decisions at gates

### External Communications

**Week 4 (Demo 1):**
- Blog post: "Building Blueprint Desktop App"
- Show agent integration progress
- Invite beta signups

**Week 8 (Demo 2):**
- Twitter/X: Demo video of inline editing
- Reddit r/ClaudeAI: Show progress
- Update beta testers

**Week 12 (Demo 3):**
- YouTube: Full workflow demo video
- Blog post: "End-to-End Planning Workflow"
- Invite expanded beta testing

**Week 16 (Launch):**
- Product Hunt launch
- HackerNews Show HN
- Reddit r/ClaudeAI announcement
- Twitter/X launch thread
- Email beta testers

---

## Rollback and Contingency Plans

### Scope Reduction Options (if timeline slips)

**Tier 1: Must-Have for v1.0**
- Agent SDK integration
- Markdown rendering
- Inline editing
- Basic planning workflow
- PDF export

**Tier 2: Should-Have (can defer to v1.1)**
- DOCX/PPTX export
- Gemini Deep Research
- Advanced search
- Theme customization

**Tier 3: Nice-to-Have (v1.2+)**
- Multiple projects open
- Git integration
- Collaboration features
- Cloud sync

**Decision Points:**
- If 2+ weeks behind at Week 8: Defer Tier 3
- If 3+ weeks behind at Week 12: Defer Tier 2
- If 4+ weeks behind: Reassess entire project

### Technical Rollback Plans

**Agent SDK V2 → V1 Rollback:**
- Maintain separate branch with V1 implementation
- Can switch if V2 proves unstable
- 2 days to merge and test

**TypeScript → JavaScript Downgrade:**
- Not recommended, TypeScript is core benefit
- Emergency only if compilation issues unsolvable
- 1 week to convert

**Electron → Web App Pivot:**
- Last resort if Electron proves problematic
- 3+ weeks to rebuild as web app
- Only if fundamental issues discovered

---

## Definition of Done

### Milestone Level

A milestone is "done" when:
- [ ] All deliverables completed and checked off
- [ ] Success criteria met
- [ ] Tests written and passing
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Demo prepared (if demo milestone)

### Release Level

v1.0.0 is "done" when:
- [ ] All 12 milestones complete
- [ ] All quality gates passed
- [ ] Test coverage > 80%
- [ ] Zero critical bugs
- [ ] < 5 high-priority bugs (documented)
- [ ] All platforms tested
- [ ] Installers built and signed
- [ ] Documentation complete
- [ ] Release notes published
- [ ] Auto-update configured
- [ ] GitHub Release published

---

## Next Steps

### Immediate Actions (This Week)

1. **Review and approve this roadmap**
   - Stakeholder sign-off
   - Budget approval
   - Timeline commitment

2. **Set up development environment**
   - Install Node.js, Electron, TypeScript
   - Configure editor (VSCode recommended)
   - Clone repository template

3. **Create project tracking**
   - GitHub Project board with milestones
   - Weekly update template
   - Risk register spreadsheet

4. **Begin Milestone 1**
   - Initialize Electron project
   - Configure TypeScript and Vite
   - Set up build pipeline

### Weekly Rituals

**Monday:**
- Review previous week progress
- Set current week goals
- Update risk register

**Wednesday:**
- Mid-week check-in
- Unblock any issues
- Adjust plan if needed

**Friday:**
- Demo what shipped
- Write status update
- Plan next week

### Communication Channels

**For Questions:**
- GitHub Discussions for design decisions
- Slack/Discord for quick questions
- Email for formal updates

**For Feedback:**
- GitHub Issues for bugs
- Discussions for feature requests
- Email for sensitive topics

---

## Appendix: Milestone Dependencies Diagram

```
Milestone Dependency Graph:

M1 (Week 1)
 └─► M2 (Week 2)
      ├─► M3 (Weeks 3-4)
      │    ├─► M4 (Week 5)
      │    │    └─► M5 (Week 6)
      │    │         └─► M10 (Week 13)
      │    └─► M6 (Weeks 7-8)
      │         └─► M9 (Week 12)
      │              └─► M11 (Weeks 14-15)
      │                   └─► M12 (Week 16)
      └─► M7 (Weeks 9-10)
           └─► M8 (Weeks 11-12)
                └─► M9 (Week 12)

Critical Path: M1 → M2 → M3 → M6 → M9 → M11 → M12
Parallel: M4/M5 (after M2), M7/M8 (after M3)
```

---

## Appendix: Weekly Checklist Template

```markdown
## Week [N] Checklist - Milestone [X]

### Goals This Week
- [ ] Goal 1
- [ ] Goal 2
- [ ] Goal 3

### Monday
- [ ] Review last week
- [ ] Set priorities
- [ ] Unblock issues

### Wednesday
- [ ] Mid-week check
- [ ] Adjust plan
- [ ] Request help if needed

### Friday
- [ ] Demo progress
- [ ] Write update
- [ ] Plan next week

### Risks Identified
- Risk 1: [description]
- Risk 2: [description]

### Decisions Needed
- Decision 1: [description]
- Decision 2: [description]

### Wins This Week
- Win 1: [description]
- Win 2: [description]
```

---

## Appendix: Known Issues & Dev Workarounds

### Electron Forge Vite Plugin Bug (Critical for Development)

**Issue:** `@electron-forge/plugin-vite` v7.11.1 starts the Vite dev server but it immediately exits. Electron loads `http://localhost:5173/` → connection refused → white screen.

**Required Files:**

1. **postcss.config.js** (project root):
```javascript
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

2. **vite.renderer.config.ts** must include:
```typescript
base: './',  // Critical for Electron file:// protocol
```

3. **vite.main.config.ts** - Remove `browserField: false` (invalid in Vite 5)

4. **src/main.ts** - Add retry logic for loadURL (10 retries, 500ms delay)

**Dev Workaround (until Electron Forge fixes this):**
```bash
# Terminal 1
pnpm exec vite --config vite.renderer.config.ts --port 5173

# Terminal 2
pnpm exec electron .vite/build/main.js
```

**Note:** Production builds work fine. This only affects `pnpm run start`.

---

**END OF ROADMAP**

This roadmap provides a detailed, actionable plan to build Blueprint as a production-ready Electron application. Success depends on disciplined execution, proactive risk management, and maintaining quality at each gate.

**Remember:** Dates are targets, not commitments. Adjust as you learn. Ship quality over speed. The goal is a tool users love, not just hitting a date.
