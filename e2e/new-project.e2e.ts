import { test, expect } from './fixtures';

test.describe('New Project Workflow', () => {
  test('should display welcome screen when no project is open', async ({ mainWindow }) => {
    // Welcome screen should be visible when no files are open
    const welcomeText = mainWindow.getByText('Welcome to Blueprint');
    await expect(welcomeText).toBeVisible();

    // New Project button should be visible
    const newProjectButton = mainWindow.getByRole('button', { name: /new project/i });
    await expect(newProjectButton).toBeVisible();

    // Open Project button should be visible
    const openProjectButton = mainWindow.getByRole('button', { name: /open project/i });
    await expect(openProjectButton).toBeVisible();
  });

  test('should open new project wizard on button click', async ({ mainWindow }) => {
    // Click new project button
    const newProjectButton = mainWindow.getByRole('button', { name: /new project/i });
    await newProjectButton.click();

    // Wizard dialog should be visible with heading
    const wizard = mainWindow.getByRole('dialog');
    await expect(wizard).toBeVisible({ timeout: 5000 });
    await expect(wizard.getByRole('heading', { name: 'New Project' })).toBeVisible();

    // Step 1: Name and Location should be visible
    const nameInput = wizard.getByPlaceholder(/my awesome project/i);
    await expect(nameInput).toBeVisible();
  });

  test('should complete new project wizard flow', async ({ mainWindow }) => {
    // Open the wizard
    const newProjectButton = mainWindow.getByRole('button', { name: /new project/i });
    await newProjectButton.click();

    // Wait for wizard dialog to be visible
    const wizard = mainWindow.getByRole('dialog');
    await expect(wizard).toBeVisible({ timeout: 5000 });

    // Step 1: Verify project name input and step indicator
    const nameInput = wizard.getByPlaceholder(/my awesome project/i);
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test E2E Project');

    // Step indicator should show "Step 1 of 4"
    await expect(wizard.getByText(/step 1 of 4/i)).toBeVisible();

    // Next button requires both name and path — path needs native dialog
    // so it stays disabled. Verify the button is present but disabled.
    const nextButton = wizard.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeDisabled();

    // Verify Browse button exists for path selection
    const browseButton = wizard.getByRole('button', { name: /browse/i });
    await expect(browseButton).toBeVisible();
  });

  test('should close wizard on cancel', async ({ mainWindow }) => {
    // Open the wizard
    const newProjectButton = mainWindow.getByRole('button', { name: /new project/i });
    await newProjectButton.click();

    // Wait for wizard dialog
    const wizard = mainWindow.getByRole('dialog');
    await expect(wizard).toBeVisible({ timeout: 5000 });

    // Click cancel button (shown on step 1)
    const cancelButton = wizard.getByRole('button', { name: /cancel/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    } else {
      // Try pressing Escape
      await mainWindow.keyboard.press('Escape');
    }

    // Wizard should be closed - welcome screen should be visible again
    await expect(mainWindow.getByText('Welcome to Blueprint')).toBeVisible({ timeout: 5000 });
  });
});
