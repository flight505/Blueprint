import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Blueprint Electron E2E tests.
 *
 * Note: Electron testing with Playwright requires special handling.
 * We use the Electron class from Playwright to launch the packaged app.
 */
export default defineConfig({
  testDir: './e2e',
  // Run tests sequentially in Electron as we're launching a single app instance
  fullyParallel: false,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Single worker for Electron tests
  workers: 1,
  // Reporter to use
  reporter: process.env.CI ? 'github' : 'html',
  // Shared settings for all projects
  use: {
    // Capture trace on failure for debugging
    trace: 'on-first-retry',
    // Screenshot on failure
    screenshot: 'only-on-failure',
    // Video on failure for CI debugging
    video: process.env.CI ? 'on-first-retry' : 'off',
  },

  // Configure projects for major OS platforms
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.e2e.ts',
      use: {
        // Custom Electron launch handled in test fixtures
      },
    },
  ],

  // Global test timeout (Electron apps can take time to launch)
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Output folder for test artifacts
  outputDir: 'e2e-results',
});
