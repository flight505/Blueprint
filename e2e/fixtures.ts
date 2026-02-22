import { test as base, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Extend base test with Electron fixtures
export const test = base.extend<{
  electronApp: ElectronApplication;
  mainWindow: Page;
  testProjectPath: string;
}>({
  // Launch Electron app before each test
  electronApp: async ({}, use) => {
    // Path to the built Electron app
    const mainPath = path.join(__dirname, '..', '.vite', 'build', 'main.js');

    // Ensure the app is built
    if (!fs.existsSync(mainPath)) {
      throw new Error(
        `Electron app not built. Run 'pnpm start' first to build the app, then run tests.`
      );
    }

    // Create isolated user data directory for each test run
    const testUserData = path.join(os.tmpdir(), `blueprint-e2e-${Date.now()}`);
    fs.mkdirSync(testUserData, { recursive: true });

    // Launch Electron with the built main.js
    const app = await electron.launch({
      args: ['--no-sandbox', mainPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        BLUEPRINT_USER_DATA: testUserData,
        // Disable hardware acceleration for CI
        ELECTRON_DISABLE_GPU: '1',
      },
    });

    await use(app);

    // Close the app after tests
    await app.close();

    // Clean up isolated test data
    fs.rmSync(testUserData, { recursive: true, force: true });
  },

  // Get the main window
  mainWindow: async ({ electronApp }, use) => {
    // Wait for the first window to appear
    const window = await electronApp.firstWindow();

    // Wait for the window to be fully loaded
    await window.waitForLoadState('domcontentloaded');

    // Give the app a moment to initialize React
    await window.waitForTimeout(1000);

    await use(window);
  },

  // Create a temporary test project directory
  testProjectPath: async ({}, use) => {
    // Create a temp directory for test projects
    const tmpDir = path.join(os.tmpdir(), `blueprint-e2e-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    // Create some test files
    fs.writeFileSync(
      path.join(tmpDir, 'README.md'),
      '# Test Project\n\nThis is a test project for E2E testing.'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'notes.md'),
      '## Notes\n\n- Item 1\n- Item 2\n- Item 3'
    );
    fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'docs', 'guide.md'),
      '# User Guide\n\nWelcome to the guide.'
    );

    await use(tmpDir);

    // Cleanup: remove the temp directory after tests
    fs.rmSync(tmpDir, { recursive: true, force: true });
  },
});

export { expect } from '@playwright/test';
