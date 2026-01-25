# Blueprint SOTA Technology Research (2026)

## Executive Summary

Based on comprehensive research on state-of-the-art technologies for AI-powered desktop applications, this document outlines strategic technology recommendations for Blueprint. The findings suggest several significant architectural pivots from the original PRD.

### Key Recommendations

| Area | Current PRD | SOTA Recommendation | Impact |
|------|-------------|---------------------|--------|
| **Framework** | Electron 40 | Consider Tauri 2.0 | 97% smaller bundle, better security |
| **Editor** | Monaco | Tiptap/BlockNote | Better markdown, AI integration |
| **State** | Not specified | Legend State (signals) | Fine-grained reactivity for streaming |
| **Database** | better-sqlite3 | SQLite + vector extensions | Semantic search over documents |
| **Sync** | Not specified | PowerSync + Yjs | Local-first with cloud sync |
| **Context** | Not specified | Semantic search + compaction | Token optimization |

---

## 1. Framework Decision: Electron vs Tauri 2.0

### Performance Comparison

| Metric | Electron 40 | Tauri 2.0 |
|--------|-------------|-----------|
| Bundle size | 85-244 MB | 2-3 MB |
| Memory (idle) | 93-121 MB | 80-85 MB |
| Startup time | 2-4 seconds | <1 second |
| Build time | 5-13 seconds | 80-270 seconds (initial) |

### Security Model

**Electron:**
- Node.js integration = large attack surface
- Requires explicit context isolation
- App can be unpacked with simple NPM commands

**Tauri:**
- Secure by default (Rust backend)
- Fine-grained permission controls
- Compiled binary resists reverse engineering

### Recommendation

**For Blueprint Phase 1: Stay with Electron**
- Faster development velocity
- Team JavaScript expertise
- Mature ecosystem for AI integrations
- Can migrate to Tauri in v2.0

**Future Migration Path:**
- Isolate Electron-specific code in `src/main/`
- Use IPC abstraction layer (Comlink pattern)
- Plan Tauri migration for v2.0 when stable

---

## 2. Rich Text Editor: From Monaco to Tiptap

### Editor Comparison

| Feature | Monaco | Tiptap | BlockNote | Lexical |
|---------|--------|--------|-----------|---------|
| Markdown WYSIWYG | ❌ | ✅ | ✅ | ✅ |
| Collaborative editing | ❌ | ✅ (Yjs) | ✅ (Yjs) | ❌ |
| AI integration | Manual | Extension API | Built-in | Plugin API |
| Performance (large docs) | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Learning curve | High | Medium | Low | High |

### Recommendation: Tiptap with BlockNote UI

```typescript
// Tiptap with AI inline editing
import { useEditor, EditorContent } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import AIInlineEdit from './extensions/AIInlineEdit';

const editor = useEditor({
  extensions: [
    StarterKit,
    Collaboration.configure({ document: ydoc }),
    AIInlineEdit.configure({
      onTrigger: (selection) => showEditOverlay(selection),
      models: ['haiku', 'sonnet', 'opus'],
    }),
  ],
});
```

**Why Tiptap:**
- Built on ProseMirror (battle-tested)
- Native Yjs collaboration support
- Extension system for AI features
- Excellent React integration

---

## 3. State Management: Signals over Redux

### The Case for Signals

Traditional React state causes entire component tree re-renders. For AI streaming UIs where state updates hundreds of times per second, this creates performance problems.

**Signals provide:**
- Fine-grained reactivity (only affected DOM nodes update)
- 10x fewer re-renders for streaming content
- Built-in sync capabilities (Legend State)

### Recommended: Legend State

```typescript
import { observable, syncedKeel } from '@legendapp/state';
import { observer } from '@legendapp/state/react';

// Global state with automatic persistence
const state$ = observable({
  documents: syncedKeel({
    list: queries.listDocuments,
    persist: { name: 'documents', retrySync: true },
  }),

  // AI streaming state - updates without re-renders
  streamingResponse: '',
  isStreaming: false,
});

// Component only re-renders when its specific data changes
const StreamingText = observer(function StreamingText() {
  const text = state$.streamingResponse.get();
  return <div>{text}</div>;
});
```

### State Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Legend State                         │
├─────────────┬─────────────┬─────────────┬──────────────┤
│   UI State  │  Documents  │  AI State   │   Session    │
│  (signals)  │  (synced)   │ (streaming) │  (persisted) │
└─────────────┴─────────────┴─────────────┴──────────────┘
        │             │             │              │
        ▼             ▼             ▼              ▼
   React Components  PowerSync   Claude SDK    SQLite
```

---

## 4. Database: SQLite with Vector Extensions

### Vector Search for Semantic Features

Blueprint needs semantic search over planning documents, research results, and conversation history. SQLite vector extensions enable this without external infrastructure.

```sql
-- Store document embeddings
CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  title TEXT,
  content TEXT,
  embedding BLOB,  -- 1536-dim float array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Semantic similarity search
SELECT id, title,
  vector_distance(embedding, ?) AS distance
FROM documents
ORDER BY distance
LIMIT 10;
```

### Database Architecture

```
┌─────────────────────────────────────────────┐
│              SQLite Database                │
├─────────────┬─────────────┬────────────────┤
│  Sessions   │  Documents  │   Embeddings   │
│  (history)  │  (content)  │   (vectors)    │
└─────────────┴─────────────┴────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│              PowerSync Layer                │
│     (optional cloud sync for backup)        │
└─────────────────────────────────────────────┘
```

### Recommended Packages

```json
{
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "sqlite-vss": "^0.1.0"
  }
}
```

---

## 5. AI Interaction Patterns

### Multi-Modal Interaction Design

Based on HCI research, effective AI coding assistants use three interaction modes:

| Mode | Trigger | Use Case | Model |
|------|---------|----------|-------|
| **Passive** | Always-on | Autocomplete, suggestions | Haiku |
| **Active** | Cmd+K | Inline editing, generation | Sonnet |
| **Delegated** | Agent panel | Complex planning, research | Opus |

### Implementation Pattern

```typescript
// Multi-model routing based on task complexity
async function routeToModel(task: AITask): Promise<ModelResponse> {
  const complexity = classifyComplexity(task);

  switch (complexity) {
    case 'simple':
      // Fast autocomplete, simple edits
      return await claude.haiku(task);

    case 'medium':
      // Inline editing, code generation
      return await claude.sonnet(task);

    case 'complex':
      // Planning, architecture, research
      return await claude.opus(task);
  }
}

// Task complexity classification
function classifyComplexity(task: AITask): 'simple' | 'medium' | 'complex' {
  if (task.type === 'autocomplete') return 'simple';
  if (task.type === 'inline-edit' && task.scope === 'selection') return 'medium';
  if (task.type === 'planning' || task.type === 'research') return 'complex';
  return 'medium';
}
```

### Plan-and-Act Pattern

For complex planning tasks, separate planning from execution:

```typescript
// Phase 1: Planning (Opus)
const plan = await claude.opus({
  system: "You are a project planner. Create a detailed plan.",
  prompt: userRequest,
});

// Phase 2: Execution (Sonnet per subtask)
for (const step of plan.steps) {
  const result = await claude.sonnet({
    system: "Execute this step of the plan.",
    prompt: step.description,
    context: step.context,
  });

  // Checkpoint after each step
  await saveCheckpoint(step.id, result);
}
```

---

## 6. Context Management Architecture

### The Problem

LLM context windows are limited and expensive. A naive approach that concatenates all project files will:
- Hit context limits quickly
- Suffer from "lost in the middle" problem
- Cost significantly more per request

### Solution: Semantic Context Retrieval

```
┌─────────────────────────────────────────────────────────┐
│                   User Request                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Semantic Search Index                      │
│         (embeddings of all project content)             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Context Assembly                           │
│  ┌─────────────┬─────────────┬─────────────────────┐   │
│  │ System      │ Retrieved   │ User Request         │   │
│  │ Prompt      │ Context     │                      │   │
│  │ (cached)    │ (dynamic)   │                      │   │
│  └─────────────┴─────────────┴─────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    LLM API                              │
│         (with prompt caching enabled)                   │
└─────────────────────────────────────────────────────────┘
```

### Context Compaction for Long Sessions

```typescript
class ContextManager {
  private session: SessionEvent[] = [];
  private compactionThreshold = 20; // events before compacting

  async addEvent(event: SessionEvent) {
    this.session.push(event);

    if (this.session.length > this.compactionThreshold) {
      await this.compact();
    }
  }

  private async compact() {
    // Summarize older events
    const oldEvents = this.session.slice(0, -10);
    const summary = await claude.haiku({
      prompt: `Summarize these session events: ${JSON.stringify(oldEvents)}`,
    });

    // Replace with summary
    this.session = [
      { type: 'summary', content: summary },
      ...this.session.slice(-10),
    ];
  }
}
```

### Cost Optimization: Prompt Caching

```typescript
// System prompt + documentation = ~3000 tokens
// With caching: $0.30/M tokens (vs $3.00/M without)
const cachedPrefix = `
You are Blueprint, an AI project planning assistant.

## Documentation
${projectDocs}

## User Preferences
${userPreferences}
`;

// Each request reuses cached prefix
const response = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: [{ type: 'text', text: cachedPrefix, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: userRequest }],
});
```

---

## 7. Streaming UI Patterns

### Rendering Streamed Markdown

**Wrong:**
```typescript
// Re-parses entire content on each chunk - O(n²)
element.innerHTML = markdownToHtml(accumulatedText);
```

**Right:**
```typescript
import { StreamingMarkdown } from 'streaming-markdown';
import DOMPurify from 'dompurify';

const parser = new StreamingMarkdown({
  onChunk: (html) => {
    const sanitized = DOMPurify.sanitize(html);
    element.insertAdjacentHTML('beforeend', sanitized);
  },
});

// Stream chunks as they arrive
for await (const chunk of stream) {
  parser.write(chunk);
}
```

### Skeleton Screens for AI Operations

```tsx
function AIResponseSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  );
}

function AIResponse({ promise }: { promise: Promise<string> }) {
  return (
    <Suspense fallback={<AIResponseSkeleton />}>
      <StreamedContent promise={promise} />
    </Suspense>
  );
}
```

### Optimistic Updates for Diff Preview

```typescript
function useDiffPreview() {
  const [optimisticDiff, setOptimisticDiff] = useState<Diff | null>(null);

  async function generateEdit(selection: Selection, instruction: string) {
    // Show optimistic skeleton immediately
    setOptimisticDiff({ status: 'generating', original: selection.text });

    try {
      const result = await claude.sonnet({
        prompt: `Edit this text: "${selection.text}"\nInstruction: ${instruction}`,
      });

      setOptimisticDiff({
        status: 'ready',
        original: selection.text,
        proposed: result,
      });
    } catch (error) {
      setOptimisticDiff({ status: 'error', error });
    }
  }

  return { optimisticDiff, generateEdit };
}
```

---

## 8. Accessibility Requirements (WCAG 2.2)

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```tsx
function ActivityBarButton({ icon, label, shortcut, onActivate }) {
  return (
    <button
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      className="focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
```

### Streaming Content Announcements

```tsx
function StreamingResponse({ text, isStreaming }) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-busy={isStreaming}
      aria-label="AI response"
    >
      {text}
      {isStreaming && (
        <span className="sr-only">AI is generating response...</span>
      )}
    </div>
  );
}
```

### Diff Visualization for Screen Readers

```tsx
function AccessibleDiff({ original, proposed }) {
  return (
    <div role="region" aria-label="Code changes">
      {/* Visual diff for sighted users */}
      <div aria-hidden="true">
        <DiffViewer original={original} proposed={proposed} />
      </div>

      {/* Structured description for screen readers */}
      <div className="sr-only">
        <h3>Changes summary</h3>
        <ul>
          {computeChanges(original, proposed).map((change, i) => (
            <li key={i}>
              {change.type === 'add' && `Line ${change.line}: Added "${change.text}"`}
              {change.type === 'remove' && `Line ${change.line}: Removed "${change.text}"`}
              {change.type === 'modify' && `Line ${change.line}: Changed from "${change.from}" to "${change.to}"`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### Color Contrast

All text must meet WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI components: 3:1 contrast ratio

```css
/* Ensure syntax highlighting meets contrast requirements */
:root {
  --code-keyword: #0550ae;     /* 7.2:1 on white */
  --code-string: #0a3069;      /* 9.1:1 on white */
  --code-comment: #57606a;     /* 4.6:1 on white */
}

.dark {
  --code-keyword: #79c0ff;     /* 8.1:1 on #1e1e1e */
  --code-string: #a5d6ff;      /* 10.2:1 on #1e1e1e */
  --code-comment: #8b949e;     /* 5.1:1 on #1e1e1e */
}
```

---

## 9. Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Blueprint Desktop App                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Renderer Process (React 19)               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐   │   │
│  │  │ Activity    │  │   Tiptap    │  │   AI Streaming    │   │   │
│  │  │ Bar + Nav   │  │   Editor    │  │   Components      │   │   │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │              Legend State (Signals)                  │   │   │
│  │  │   documents$  │  session$  │  streaming$  │  ui$    │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │ IPC (Comlink)                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Main Process (Electron)                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐   │   │
│  │  │  Context    │  │   Model     │  │   Permissions     │   │   │
│  │  │  Manager    │  │   Router    │  │   Manager         │   │   │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │              SQLite + Vector Extensions              │   │   │
│  │  │   sessions   │  documents  │  embeddings  │  cache  │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
├──────────────────────────────┼──────────────────────────────────────┤
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    External Services                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐   │   │
│  │  │ Claude API  │  │  Perplexity │  │  Gemini Deep      │   │   │
│  │  │ (Haiku/     │  │  (Fast      │  │  Research         │   │   │
│  │  │  Sonnet/    │  │   Research) │  │  (Comprehensive)  │   │   │
│  │  │  Opus)      │  │             │  │                   │   │   │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation Priorities

### Phase 1: Foundation (Current)
- [x] Electron + React + Tailwind
- [x] Permissions check onboarding
- [ ] **NEW:** Add Legend State for signals
- [ ] **NEW:** Add SQLite vector extension

### Phase 2: Editor & AI
- [ ] **CHANGED:** Replace Monaco with Tiptap
- [ ] Implement multi-model routing
- [ ] Add semantic search over documents
- [ ] Implement context compaction

### Phase 3: Streaming & UX
- [ ] Streaming markdown renderer
- [ ] Skeleton screens
- [ ] Optimistic diff preview
- [ ] WCAG 2.2 audit

### Phase 4: Advanced Features
- [ ] Yjs collaborative editing
- [ ] PowerSync cloud backup
- [ ] Plan-and-Act framework
- [ ] Memory system for cross-session context

---

## References

1. Perplexity Research: Desktop Application Frameworks 2026
2. Perplexity Research: AI Coding Assistants Best Practices 2026
3. Anthropic: Building Effective Agents
4. Google: Architecting Context-Aware Multi-Agent Frameworks
5. Chrome DevRel: Rendering LLM Responses
6. WCAG 2.2 Guidelines
7. Cursor, Windsurf, GitHub Copilot documentation
