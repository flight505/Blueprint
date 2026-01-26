# Blueprint - Project Configuration

## Overview
Blueprint is an Electron desktop application for AI-powered project planning using Claude Agent SDK. It provides research integration, citation management, confidence scoring, and document generation.

## Tech Stack
- **Runtime**: Electron 35+
- **Frontend**: React 19, TypeScript, TailwindCSS 4
- **State**: Legend State (@legendapp/state)
- **Editor**: TipTap with Markdown, Mermaid, LaTeX (KaTeX)
- **Database**: better-sqlite3
- **AI**: Anthropic SDK, Google Generative AI, OpenRouter
- **Build**: Vite, electron-builder
- **Testing**: Vitest (unit), Playwright (e2e)

## Commands
```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm dev:electron     # Start Electron only (after build)

# Building
pnpm build            # Build all (main + preload + renderer)
pnpm build:main       # Build main process only
pnpm build:preload    # Build preload script only
pnpm build:renderer   # Build renderer only

# Testing
pnpm test             # Run unit tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm test:e2e         # Run Playwright e2e tests

# Quality
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint

# Distribution
pnpm dist:mac         # Build macOS app
pnpm dist:win         # Build Windows app
pnpm dist:linux       # Build Linux app
```

## Project Structure
```
src/
├── main.ts                    # Electron main process entry
├── preload.ts                 # Preload script (IPC bridge)
├── main/
│   ├── permissions.ts         # macOS permissions
│   └── services/              # Backend services
│       ├── AgentService.ts           # Claude API integration
│       ├── DatabaseService.ts        # SQLite operations
│       ├── FileSystemService.ts      # Secure file operations
│       ├── SecureStorageService.ts   # API key encryption
│       ├── ModelRouter.ts            # Multi-model routing
│       ├── ContextManager.ts         # Context window management
│       ├── CitationManager.ts        # Citation tracking
│       ├── CitationVerificationService.ts  # OpenAlex/Crossref
│       ├── ConfidenceScoringService.ts     # Hallucination detection
│       ├── ResearchRouter.ts         # Perplexity/Gemini routing
│       ├── PhaseOrchestrator.ts      # Project phase execution
│       └── *Generator.ts             # PDF/DOCX/PPTX export
└── renderer/
    ├── App.tsx                # Main React app
    ├── index.tsx              # React entry
    ├── index.css              # Global styles + Tailwind
    ├── state/store.ts         # Legend State store
    ├── hooks/                 # React hooks
    └── components/
        ├── chat/              # Chat UI components
        ├── editor/            # TipTap editor + extensions
        ├── explorer/          # File browser
        ├── planning/          # Phase dashboard
        ├── confidence/        # Confidence indicators
        ├── citation/          # Citation verification panel
        ├── dashboard/         # Hallucination metrics
        └── export/            # Export modal
```

## Architecture Patterns

### IPC Communication
All main↔renderer communication uses typed IPC handlers:
```typescript
// Main process (src/main.ts)
ipcMain.handle('service:method', async (_, arg) => { ... });

// Preload (src/preload.ts)
contextBridge.exposeInMainWorld('electronAPI', {
  serviceMethod: (arg) => ipcRenderer.invoke('service:method', arg)
});

// Renderer
const result = await window.electronAPI.serviceMethod(arg);
```

### Security
- Path traversal protection in FileSystemService (validate all paths)
- IPC input validation (validatePath, validateString, validateObject)
- API keys stored encrypted via SecureStorageService
- Content Security Policy headers in production

### Testing
- Unit tests: `src/**/*.test.ts` files alongside source
- E2E tests: `e2e/*.e2e.ts` using Playwright
- Test setup: `src/test/setup.ts`

## Key Services

### AgentService
Claude API integration with streaming support. Models: haiku, sonnet, opus.

### FileSystemService
Secure file operations with allowed base paths. Always validate paths before operations.

### CitationManager
Tracks citations per document in `.citations.json` sidecar files.

### ConfidenceScoringService
Calculates paragraph confidence based on hedging language, citation density, specificity.

### ResearchRouter
Routes queries to Perplexity (quick) or Gemini Deep Research (comprehensive).

## Development Notes

### macOS Title Bar
Uses `titleBarStyle: 'hiddenInset'` with custom draggable region:
- Traffic lights at (16, 12)
- Title bar height: 36px (h-9)
- CSS class: `title-bar-drag-region`

### Hot Reload
- Renderer: Vite HMR works automatically
- Main process: Requires rebuild (`pnpm build:main`) and restart

### Database Location
`~/Library/Application Support/Blueprint/`:
- `blueprint.db` - Main database
- `citation-cache.db` - Citation verification cache
- `hallucination-metrics.db` - Dashboard metrics
