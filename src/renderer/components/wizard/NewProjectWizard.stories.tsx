import type { Meta, StoryObj } from '@storybook/react';
import { fn, expect, userEvent, within } from 'storybook/test';
import { NewProjectWizard } from './NewProjectWizard';

/**
 * NewProjectWizard is a 4-step modal wizard for creating new projects.
 *
 * Steps:
 * 1. **Project Details** — Name and directory selection
 * 2. **Research Mode** — Quick, Balanced, or Comprehensive
 * 3. **Planning Phases** — Select which phases to include
 * 4. **Review & Create** — Confirm configuration and create
 *
 * Uses AnimatedModal for smooth open/close transitions.
 */
const meta = {
  title: 'Components/Wizard/NewProjectWizard',
  component: NewProjectWizard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Multi-step wizard modal for creating new projects with research mode and phase selection.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onCreateProject: fn(),
  },
  decorators: [
    (Story) => {
      // Mock selectDirectory to return a path
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.selectDirectory = async () => '/Users/jesper/Projects';
      }
      return (
        <div style={{ height: '700px', position: 'relative' }}>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof NewProjectWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Wizard Steps
// ============================================================================

/**
 * Step 1: Project name and directory selection.
 * The wizard opens on this step by default.
 */
export const Step1ProjectDetails: Story = {
  args: {
    isOpen: true,
  },
};

/**
 * Wizard in closed state — nothing is rendered.
 */
export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

// ============================================================================
// Interaction Tests
// ============================================================================

/**
 * Interactive walkthrough: fill in project name and browse for directory.
 */
export const FillProjectDetails: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Type project name
    const nameInput = canvas.getByPlaceholderText('My Awesome Project');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Blueprint Test Project');

    // Click Browse to select directory (mocked to return a path)
    const browseButton = canvas.getByText('Browse...');
    await userEvent.click(browseButton);

    // Wait for the path to appear
    await expect(
      canvas.getByDisplayValue('/Users/jesper/Projects')
    ).toBeInTheDocument();

    // Next button should now be enabled
    const nextButton = canvas.getByText('Next');
    await expect(nextButton).toBeEnabled();
  },
};

/**
 * Interactive walkthrough: navigate through all 4 steps to create a project.
 */
export const FullWalkthrough: Story = {
  args: {
    isOpen: true,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Step 1: Project Details
    const nameInput = canvas.getByPlaceholderText('My Awesome Project');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'AI Planning Tool');

    const browseButton = canvas.getByText('Browse...');
    await userEvent.click(browseButton);

    // Wait for path then proceed
    await expect(
      canvas.getByDisplayValue('/Users/jesper/Projects')
    ).toBeInTheDocument();

    await userEvent.click(canvas.getByText('Next'));

    // Step 2: Research Mode — should see mode selection
    await expect(canvas.getByText('Step 2 of 4: Research Mode')).toBeInTheDocument();

    // Select Comprehensive mode
    await userEvent.click(canvas.getByText('Comprehensive'));
    await userEvent.click(canvas.getByText('Next'));

    // Step 3: Phases — should see phase checkboxes
    await expect(canvas.getByText('Step 3 of 4: Planning Phases')).toBeInTheDocument();
    await userEvent.click(canvas.getByText('Next'));

    // Step 4: Confirm — should see summary
    await expect(canvas.getByText('Step 4 of 4: Review & Create')).toBeInTheDocument();
    await expect(canvas.getByText('AI Planning Tool')).toBeInTheDocument();
    await expect(canvas.getByText('Comprehensive')).toBeInTheDocument();

    // Create the project
    await userEvent.click(canvas.getByText('Create Project'));

    // Verify callback
    await expect(args.onCreateProject).toHaveBeenCalled();
  },
};

// ============================================================================
// Glass Design Integration
// ============================================================================

/**
 * Wizard on glass surface background.
 */
export const OnGlassSurface: Story = {
  args: {
    isOpen: true,
  },
  parameters: {
    backgrounds: { default: 'tokyo-night-storm' },
  },
};
