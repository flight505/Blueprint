# Storybook Patterns for Blueprint (Electron)

This guide explains how to write effective Storybook stories for Blueprint's Electron-based architecture.

## Overview

Blueprint is an Electron app where:
- **Main process**: Handles file system, database, AI APIs, and system operations
- **Renderer process**: React UI components that communicate via `window.electronAPI`
- **Preload script**: Bridges main and renderer with typed IPC handlers

Storybook runs in a browser context (no Electron), so we mock `window.electronAPI`.

## Mock System

### Automatic Mocking

All `window.electronAPI` methods are automatically mocked in `.storybook/electron-mocks.ts`. The mocks:

1. **Log all calls** to the console for debugging
2. **Return sensible defaults** (empty arrays, success responses, mock data)
3. **Provide unsubscribe functions** for event listeners

### Overriding Mocks in Stories

To customize mock behavior for a specific story:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  decorators: [
    (Story) => {
      // Override specific mocks before rendering
      window.electronAPI.readFile = async (path) => ({
        path,
        content: '# Custom Content\n\nThis is mock content for this story.',
        encoding: 'utf-8',
      });

      return <Story />;
    },
  ],
};

export default meta;
```

### Simulating Async Operations

For components that use streaming or events:

```tsx
export const WithStreamingResponse: Story = {
  decorators: [
    (Story) => {
      // Set up mock to trigger streaming events
      window.electronAPI.agentSendMessageStream = async () => {
        // Simulate streaming chunks
        setTimeout(() => {
          const event = new CustomEvent('agent:streamChunk', {
            detail: { type: 'text', content: 'Hello, ' },
          });
          document.dispatchEvent(event);
        }, 100);

        setTimeout(() => {
          const event = new CustomEvent('agent:streamChunk', {
            detail: { type: 'text', content: 'world!' },
          });
          document.dispatchEvent(event);
        }, 200);
      };

      return <Story />;
    },
  ],
};
```

## Component Patterns

### Container/Presentational Pattern

For complex components, separate the IPC-dependent logic from the UI:

```
components/
├── FileExplorer/
│   ├── FileExplorer.tsx           # Container: uses window.electronAPI
│   ├── FileExplorerUI.tsx         # Presentational: pure React, takes props
│   ├── FileExplorerUI.stories.tsx # Stories for the presentational component
│   └── useFileExplorer.ts         # Hook that wraps IPC calls
```

The presentational component is easier to test in Storybook:

```tsx
// FileExplorerUI.tsx - Pure React, no IPC
interface FileExplorerUIProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  loading: boolean;
  error?: string;
}

export function FileExplorerUI({ files, onFileSelect, loading, error }: FileExplorerUIProps) {
  // Pure rendering logic, no window.electronAPI
}
```

```tsx
// FileExplorerUI.stories.tsx
const meta: Meta<typeof FileExplorerUI> = {
  title: 'Components/Explorer/FileExplorerUI',
  component: FileExplorerUI,
  args: {
    files: mockFileTree,
    loading: false,
    onFileSelect: fn(),
  },
};
```

### Conditional Electron Detection

For components that need to know if they're in Electron:

```tsx
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
const isStorybook = typeof window !== 'undefined' && (window as any).__STORYBOOK_ENV__;

// Use in component
if (!isElectron && isStorybook) {
  // Use mock data
} else {
  // Use real Electron API
}
```

### Testing Event Listeners

For components that subscribe to Electron events:

```tsx
export const WithEventUpdates: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        // Simulate periodic updates
        const interval = setInterval(() => {
          const event = new CustomEvent('orchestrator:state:update', {
            detail: {
              status: 'running',
              progress: Math.random() * 100,
            },
          });
          document.dispatchEvent(event);
        }, 1000);

        return () => clearInterval(interval);
      }, []);

      return <Story />;
    },
  ],
};
```

## Interaction Testing

### Basic Interactions

```tsx
export const ClickTest: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
```

### Testing with Mocked API Responses

```tsx
export const FetchDataTest: Story = {
  decorators: [
    (Story) => {
      window.electronAPI.readFile = async () => ({
        path: '/test.md',
        content: '# Test',
        encoding: 'utf-8',
      });
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for async data to load
    await waitFor(() => {
      expect(canvas.getByText('# Test')).toBeInTheDocument();
    });
  },
};
```

## Accessibility Testing

All stories automatically run accessibility checks via `@storybook/addon-a11y`.

### Configure A11y Rules

```tsx
export const AccessibleButton: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'button-name', enabled: true },
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
};
```

### Skip A11y for Specific Stories

```tsx
export const WIPComponent: Story = {
  parameters: {
    a11y: {
      disable: true,
    },
  },
};
```

## Visual Regression Testing

For visual regression testing with Chromatic:

```bash
# Run Chromatic
pnpm chromatic

# With project token
CHROMATIC_PROJECT_TOKEN=xxx pnpm chromatic
```

### Ignore Specific Stories

```tsx
export const AnimatedComponent: Story = {
  parameters: {
    chromatic: { disableSnapshot: true }, // Skip visual snapshot
  },
};
```

### Set Viewport Sizes

```tsx
export const ResponsiveComponent: Story = {
  parameters: {
    chromatic: {
      viewports: [320, 768, 1280],
    },
  },
};
```

## Best Practices

1. **Keep stories independent**: Each story should work in isolation
2. **Mock at the boundary**: Mock `window.electronAPI`, not internal functions
3. **Use the container/presentational pattern**: Easier testing and better separation
4. **Write interaction tests**: Use `play` functions for critical user flows
5. **Document accessibility requirements**: Use `parameters.a11y.config`
6. **Test loading/error states**: Always include stories for async states

## Running Storybook

```bash
# Development
pnpm storybook

# Build static Storybook
pnpm build-storybook

# Run tests with Vitest
pnpm test-storybook

# Run visual regression with Chromatic
pnpm chromatic
```
