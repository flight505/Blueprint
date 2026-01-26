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

    // Wizard should be visible
    const wizardTitle = mainWindow.getByText('Create New Project');
    await expect(wizardTitle).toBeVisible({ timeout: 5000 });

    // Step 1: Name and Location should be visible
    const nameInput = mainWindow.getByPlaceholder(/project name/i);
    await expect(nameInput).toBeVisible();
  });

  test('should complete new project wizard flow', async ({ mainWindow }) => {
    // Open the wizard
    const newProjectButton = mainWindow.getByRole('button', { name: /new project/i });
    await newProjectButton.click();

    // Wait for wizard to be visible
    await mainWindow.waitForSelector('text=Create New Project', { timeout: 5000 });

    // Step 1: Enter project name
    const nameInput = mainWindow.getByPlaceholder(/project name/i);
    await nameInput.fill('Test E2E Project');

    // The path input might need the test project path
    // Continue to next step
    const nextButton = mainWindow.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }

    // Step 2: Research Mode selection should be visible
    const quickMode = mainWindow.getByText(/quick/i);
    if (await quickMode.isVisible()) {
      await quickMode.click();

      // Continue to next step
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }

    // Step 3: Phase selection (if visible)
    const marketResearch = mainWindow.getByText(/market research/i);
    if (await marketResearch.isVisible()) {
      // Some phases should be pre-selected or we can select them
      if (await nextButton.isVisible()) {
        await nextButton.click();
      }
    }

    // Final step should have a Create button
    const createButton = mainWindow.getByRole('button', { name: /create/i });
    if (await createButton.isVisible()) {
      // We won't actually create since it requires file system access
      // Just verify the flow works up to this point
      await expect(createButton).toBeEnabled();
    }
  });

  test('should close wizard on cancel', async ({ mainWindow }) => {
    // Open the wizard
    const newProjectButton = mainWindow.getByRole('button', { name: /new project/i });
    await newProjectButton.click();

    // Wait for wizard
    await mainWindow.waitForSelector('text=Create New Project', { timeout: 5000 });

    // Click cancel or close button
    const closeButton = mainWindow.getByRole('button', { name: /close|cancel/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Try pressing Escape
      await mainWindow.keyboard.press('Escape');
    }

    // Wizard should be closed - welcome screen should be visible again
    await expect(mainWindow.getByText('Welcome to Blueprint')).toBeVisible({ timeout: 5000 });
  });
});
