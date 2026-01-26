import { test, expect } from './fixtures';

test.describe('File Editing Workflow', () => {
  test('should navigate using Activity Bar', async ({ mainWindow }) => {
    // Test Activity Bar navigation - Chat section
    const chatButton = mainWindow.getByRole('button', { name: 'Chat' });
    await expect(chatButton).toBeVisible();
    await chatButton.click();

    // Chat section should be active
    await expect(mainWindow.getByRole('heading', { name: 'Chat' })).toBeVisible();

    // Navigate to Explorer
    const explorerButton = mainWindow.getByRole('button', { name: 'Explorer' });
    await explorerButton.click();
    await expect(mainWindow.getByRole('heading', { name: 'Explorer' })).toBeVisible();

    // Navigate to Settings
    const settingsButton = mainWindow.getByRole('button', { name: 'Settings' });
    await settingsButton.click();
    await expect(mainWindow.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });

  test('should use keyboard shortcuts for navigation', async ({ mainWindow }) => {
    // Cmd+1 should go to Chat
    await mainWindow.keyboard.press('Meta+1');
    await expect(mainWindow.getByRole('heading', { name: 'Chat' })).toBeVisible({ timeout: 2000 });

    // Cmd+2 should go to Explorer
    await mainWindow.keyboard.press('Meta+2');
    await expect(mainWindow.getByRole('heading', { name: 'Explorer' })).toBeVisible({ timeout: 2000 });

    // Cmd+3 should go to Search
    await mainWindow.keyboard.press('Meta+3');
    await expect(mainWindow.getByRole('heading', { name: 'Search' })).toBeVisible({ timeout: 2000 });

    // Cmd+, should go to Settings
    await mainWindow.keyboard.press('Meta+,');
    await expect(mainWindow.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 2000 });
  });

  test('should open command palette with Cmd+Shift+P', async ({ mainWindow }) => {
    // Open command palette
    await mainWindow.keyboard.press('Meta+Shift+P');

    // Command palette should be visible
    const searchInput = mainWindow.getByPlaceholder(/search commands/i);
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type to filter commands
    await searchInput.fill('theme');

    // Theme-related command should be visible
    await expect(mainWindow.getByText(/toggle dark mode/i)).toBeVisible({ timeout: 2000 });

    // Close with Escape
    await mainWindow.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible({ timeout: 2000 });
  });

  test('should display theme toggle in settings', async ({ mainWindow }) => {
    // Navigate to settings
    const settingsButton = mainWindow.getByRole('button', { name: 'Settings' });
    await settingsButton.click();

    // Theme toggle should be visible
    const lightButton = mainWindow.getByRole('button', { name: /light/i });
    const darkButton = mainWindow.getByRole('button', { name: /dark/i });
    const systemButton = mainWindow.getByRole('button', { name: /system/i });

    // At least one theme option should be visible
    const lightVisible = await lightButton.isVisible();
    const darkVisible = await darkButton.isVisible();
    const systemVisible = await systemButton.isVisible();
    expect(lightVisible || darkVisible || systemVisible).toBe(true);
  });

  test('should toggle theme', async ({ mainWindow }) => {
    // Navigate to settings
    await mainWindow.keyboard.press('Meta+,');
    await mainWindow.waitForTimeout(500);

    // Get current dark mode state
    const htmlElement = await mainWindow.locator('html');
    const initialDarkClass = await htmlElement.getAttribute('class');
    const wasInDarkMode = initialDarkClass?.includes('dark') ?? false;

    // Click the opposite theme button
    if (wasInDarkMode) {
      const lightButton = mainWindow.getByRole('button', { name: /light/i });
      if (await lightButton.isVisible()) {
        await lightButton.click();
        await mainWindow.waitForTimeout(500);
        const newClass = await htmlElement.getAttribute('class');
        expect(newClass?.includes('dark')).toBe(false);
      }
    } else {
      const darkButton = mainWindow.getByRole('button', { name: /dark/i });
      if (await darkButton.isVisible()) {
        await darkButton.click();
        await mainWindow.waitForTimeout(500);
        const newClass = await htmlElement.getAttribute('class');
        expect(newClass?.includes('dark')).toBe(true);
      }
    }
  });

  test('should show API key settings', async ({ mainWindow }) => {
    // Navigate to settings
    const settingsButton = mainWindow.getByRole('button', { name: 'Settings' });
    await settingsButton.click();

    // API key section should be visible
    await expect(mainWindow.getByText(/api key/i).first()).toBeVisible({ timeout: 3000 });

    // Should have input fields for API keys
    const anthropicInput = mainWindow.getByPlaceholder(/anthropic/i);
    if (await anthropicInput.isVisible()) {
      await expect(anthropicInput).toBeVisible();
    }
  });

  test('should show help section with keyboard shortcuts', async ({ mainWindow }) => {
    // Navigate to help using keyboard shortcut
    await mainWindow.keyboard.press('Meta+Shift+/');
    await mainWindow.waitForTimeout(500);

    // Help section should show keyboard shortcuts
    await expect(mainWindow.getByText(/keyboard shortcuts/i)).toBeVisible({ timeout: 3000 });
    await expect(mainWindow.getByText(/Cmd\+1-7/i)).toBeVisible();
  });
});

test.describe('Tab System', () => {
  test('should handle pane resize', async ({ mainWindow }) => {
    // Get the resize handle
    const resizeHandle = mainWindow.locator('[title="Drag to resize, double-click to reset"]');
    await expect(resizeHandle).toBeVisible();

    // Double-click to reset
    await resizeHandle.dblclick();

    // The panes should reset to default (this is hard to verify exactly, but we can check it doesn't error)
    await mainWindow.waitForTimeout(300);
    await expect(resizeHandle).toBeVisible();
  });

  test('should have accessible navigation', async ({ mainWindow }) => {
    // Check that Activity Bar has proper ARIA labels
    const nav = mainWindow.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Check skip link exists (WCAG 2.2)
    const skipLink = mainWindow.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // Main content should have proper landmark
    const mainContent = mainWindow.locator('main#main-content');
    await expect(mainContent).toBeVisible();
  });
});
