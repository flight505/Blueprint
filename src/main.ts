import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import { databaseService } from './main/services/DatabaseService';
import { secureStorageService } from './main/services/SecureStorageService';
import { contextManager } from './main/services/ContextManager';
import { openRouterService } from './main/services/OpenRouterService';
import { geminiService } from './main/services/GeminiService';
import { citationVerificationService } from './main/services/CitationVerificationService';
import { hallucinationDashboardService } from './main/services/HallucinationDashboardService';
import { updateService } from './main/services/UpdateService';
import { registerAllHandlers } from './main/ipc';

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Dev mode: retry connecting to Vite dev server
    const maxRetries = 10;
    const retryDelay = 500;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        break;
      } catch (error) {
        if (i === maxRetries - 1) {
          console.error('Failed to connect to Vite dev server after retries:', error);
          throw error;
        }
        console.log(`Waiting for Vite dev server... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    mainWindow.loadFile(
      path.join(__dirname, '../renderer/index.html'),
    );
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  // Set Content Security Policy for production
  // In dev mode, Vite HMR requires 'unsafe-eval', so we use a more permissive policy
  const isDev = !!MAIN_WINDOW_VITE_DEV_SERVER_URL;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? // Dev: Allow Vite HMR and local dev server
        "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' ws://localhost:* http://localhost:* https://api.anthropic.com https://openrouter.ai https://generativelanguage.googleapis.com; " +
        "font-src 'self' data:;"
      : // Production: Strict CSP
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " + // Inline styles needed for some UI libraries
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.anthropic.com https://openrouter.ai https://generativelanguage.googleapis.com; " +
        "font-src 'self' data:;";

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // Initialize services
  databaseService.initialize();
  secureStorageService.initialize();
  citationVerificationService.initialize();
  hallucinationDashboardService.initialize();

  // Initialize context manager with API key if available
  const anthropicKey = await secureStorageService.getApiKey('anthropic');
  if (anthropicKey) {
    contextManager.initialize(anthropicKey);
  }

  // Initialize OpenRouter service with API key if available
  const openRouterKey = await secureStorageService.getApiKey('openrouter');
  if (openRouterKey) {
    openRouterService.initialize(openRouterKey);
  }

  // Initialize Gemini service with API key if available
  const geminiKey = await secureStorageService.getApiKey('gemini');
  if (geminiKey) {
    geminiService.initialize(geminiKey);
  }

  registerAllHandlers();
  createWindow();

  // Initialize update service and check for updates (only in production)
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    updateService.initialize();
    // Delay check to not interfere with app startup
    setTimeout(() => {
      updateService.checkForUpdates().catch((error) => {
        console.error('Failed to check for updates:', error);
      });
    }, 3000);
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up database on quit
app.on('will-quit', () => {
  databaseService.close();
  citationVerificationService.close();
  hallucinationDashboardService.close();
});

app.on('activate', () => {
  // On macOS re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
