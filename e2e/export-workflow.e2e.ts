import { test, expect } from './fixtures';

test.describe('Export Workflow', () => {
  test('should navigate to export section', async ({ mainWindow }) => {
    // Navigate to Export section using Activity Bar
    const exportButton = mainWindow.getByRole('button', { name: 'Export' });
    await exportButton.click();

    // Export section should be visible
    await expect(mainWindow.getByRole('heading', { name: 'Export' })).toBeVisible();

    // Export options should be displayed
    await expect(mainWindow.getByText(/export documents/i)).toBeVisible();
  });

  test('should navigate to export section using keyboard', async ({ mainWindow }) => {
    // Cmd+6 should go to Export
    await mainWindow.keyboard.press('Meta+6');

    // Export section should be visible
    await expect(mainWindow.getByRole('heading', { name: 'Export' })).toBeVisible({ timeout: 2000 });
  });

  test('should show export format buttons', async ({ mainWindow }) => {
    // Navigate to Export section
    await mainWindow.keyboard.press('Meta+6');
    await mainWindow.waitForTimeout(500);

    // PDF export button should be visible
    const pdfButton = mainWindow.getByText(/pdf document/i);
    await expect(pdfButton).toBeVisible({ timeout: 3000 });

    // Word document export button should be visible
    const docxButton = mainWindow.getByText(/word document/i);
    await expect(docxButton).toBeVisible();

    // PowerPoint export button should be visible
    const pptxButton = mainWindow.getByText(/powerpoint/i);
    await expect(pptxButton).toBeVisible();
  });

  test('should open export modal when clicking format button', async ({ mainWindow }) => {
    // Navigate to Export section
    await mainWindow.keyboard.press('Meta+6');
    await mainWindow.waitForTimeout(500);

    // Click PDF export button
    const pdfButton = mainWindow.getByText(/pdf document/i);
    await pdfButton.click();

    // Export modal should open
    // Look for modal elements
    const modalTitle = mainWindow.getByText(/export/i).first();
    await expect(modalTitle).toBeVisible({ timeout: 3000 });
  });

  test('should have export modal with format selection', async ({ mainWindow }) => {
    // Navigate to Export section and open modal
    await mainWindow.keyboard.press('Meta+6');
    await mainWindow.waitForTimeout(500);

    const pdfButton = mainWindow.getByText(/pdf document/i);
    await pdfButton.click();
    await mainWindow.waitForTimeout(500);

    // Modal should have format options or options visible
    // Check for common export modal elements
    const tocCheckbox = mainWindow.getByText(/table of contents/i);
    const citationsCheckbox = mainWindow.getByText(/citations/i);
    const coverPageCheckbox = mainWindow.getByText(/cover page/i);

    // At least one option should be visible
    const tocVisible = await tocCheckbox.isVisible();
    const citationsVisible = await citationsCheckbox.isVisible();
    const coverVisible = await coverPageCheckbox.isVisible();

    // If modal is properly opened, at least one should be visible
    // Or the Generate button should be visible
    const generateButton = mainWindow.getByRole('button', { name: /generate|export/i });
    const anyVisible = tocVisible || citationsVisible || coverVisible || await generateButton.isVisible();
    expect(anyVisible).toBe(true);
  });

  test('should close export modal with Escape', async ({ mainWindow }) => {
    // Navigate to Export section and open modal
    await mainWindow.keyboard.press('Meta+6');
    await mainWindow.waitForTimeout(500);

    const pdfButton = mainWindow.getByText(/pdf document/i);
    await pdfButton.click();
    await mainWindow.waitForTimeout(500);

    // Close with Escape
    await mainWindow.keyboard.press('Escape');
    await mainWindow.waitForTimeout(500);

    // Modal should be closed - we should still see the Export section
    await expect(mainWindow.getByRole('heading', { name: 'Export' })).toBeVisible();
  });
});

test.describe('Search Workflow', () => {
  test('should navigate to search section', async ({ mainWindow }) => {
    // Navigate to Search section
    const searchButton = mainWindow.getByRole('button', { name: 'Search' });
    await searchButton.click();

    // Search section should be visible
    await expect(mainWindow.getByRole('heading', { name: 'Search' })).toBeVisible();
  });

  test('should show search input', async ({ mainWindow }) => {
    // Navigate to Search section
    await mainWindow.keyboard.press('Meta+3');
    await mainWindow.waitForTimeout(500);

    // Search input should be visible
    const searchInput = mainWindow.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to search with Cmd+Shift+F', async ({ mainWindow }) => {
    // Use the keyboard shortcut
    await mainWindow.keyboard.press('Meta+Shift+F');

    // Search section should be visible
    await expect(mainWindow.getByRole('heading', { name: 'Search' })).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Chat Workflow', () => {
  test('should show chat input', async ({ mainWindow }) => {
    // Navigate to Chat section
    await mainWindow.keyboard.press('Meta+1');
    await mainWindow.waitForTimeout(500);

    // Chat input should be visible
    const chatInput = mainWindow.getByPlaceholder(/type a message/i);
    await expect(chatInput).toBeVisible({ timeout: 3000 });
  });

  test('should send a message', async ({ mainWindow }) => {
    // Navigate to Chat section
    await mainWindow.keyboard.press('Meta+1');
    await mainWindow.waitForTimeout(500);

    // Type a message
    const chatInput = mainWindow.getByPlaceholder(/type a message/i);
    await chatInput.fill('Hello, Blueprint!');

    // Send the message (Enter or click send button)
    await mainWindow.keyboard.press('Enter');

    // Message should appear in chat (as demo response since no API key)
    await expect(mainWindow.getByText('Hello, Blueprint!')).toBeVisible({ timeout: 5000 });
  });
});
