# Blueprint

An Electron desktop application for AI-powered project planning with Claude Agent SDK.

## Features

- **Dual-Pane Layout** - VSCode-inspired interface with chat and document panes
- **Activity Bar** - Quick navigation between Chat, Explorer, Search, Planning, Export, History
- **Inline AI Editing** - Select text, describe changes, preview diffs, accept/reject
- **Markdown Rendering** - Full GFM support with Mermaid diagrams, code highlighting, KaTeX math
- **Command Palette** - Cmd+Shift+P for quick actions
- **Research Providers** - Perplexity (fast) and Gemini Deep Research (comprehensive)
- **Document Generation** - Export to PDF, DOCX, PPTX with citations
- **Session Persistence** - SQLite-backed conversation history with checkpoints

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Electron | 40.x | Desktop framework |
| React | 19.x | UI components |
| TypeScript | 5.9.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Vite | 5.x | Build tool |
| Claude Agent SDK | v2 | AI integration |
| better-sqlite3 | latest | Session persistence |

## Development

```bash
# Install dependencies
pnpm install

# Development (workaround for Vite plugin issue)
# Terminal 1:
pnpm exec vite --config vite.renderer.config.ts --port 5173

# Terminal 2:
pnpm exec electron .vite/build/main.js

# Build for production
pnpm run make
```

## Project Structure

```
Blueprint/
├── plans/              # Design documents and roadmap
├── tasks/              # PRD and user stories for SDK Bridge
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React UI components
│   └── preload/        # IPC bridge
└── planning_outputs/   # User project data (gitignored)
```

## Documentation

- [Design Document](plans/electron-app-design.md)
- [Implementation Roadmap](plans/electron-app-roadmap.md)
- [PRD for SDK Bridge](tasks/prd-blueprint.md)

## License

MIT
