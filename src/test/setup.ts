import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock Electron's IPC for renderer tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    // File system mocks
    selectDirectory: vi.fn(),
    readDirectory: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    listAllFiles: vi.fn(),
    searchContent: vi.fn(),
    // Agent mocks
    agent: {
      createSession: vi.fn(),
      getSession: vi.fn(),
      listSessions: vi.fn(),
      deleteSession: vi.fn(),
      resumeSession: vi.fn(),
      sendMessage: vi.fn(),
      sendMessageStream: vi.fn(),
      onAgentStreamChunk: vi.fn(),
      validateApiKey: vi.fn(),
    },
    // Database mocks
    database: {
      saveSession: vi.fn(),
      getSession: vi.fn(),
      listSessions: vi.fn(),
      deleteSession: vi.fn(),
      addDocument: vi.fn(),
      searchDocuments: vi.fn(),
    },
    // Secure storage mocks
    secureStorage: {
      getApiKey: vi.fn(),
      setApiKey: vi.fn(),
      deleteApiKey: vi.fn(),
    },
  },
  writable: true,
});

// Mock matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
