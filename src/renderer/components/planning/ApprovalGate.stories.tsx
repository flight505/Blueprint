import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { fn } from '@storybook/test';
import { ApprovalGate } from './ApprovalGate';
import type { PhaseState, ProjectPhase } from '../../../preload';

// Mock phase states
const createPhaseState = (
  phase: ProjectPhase,
  output?: string,
  durationSeconds = 45
): PhaseState => ({
  phase,
  status: 'completed',
  startedAt: new Date(Date.now() - durationSeconds * 1000),
  completedAt: new Date(),
  progress: 100,
  output: output || `# ${phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Report

## Executive Summary
This phase has been completed successfully with comprehensive analysis.

## Key Findings
- Finding 1: Market opportunity identified in target segment
- Finding 2: Technical approach validated with POC
- Finding 3: Risk factors assessed and mitigation strategies defined

## Recommendations
Based on our analysis, we recommend proceeding to the next phase with the following considerations...

## Next Steps
1. Review findings with stakeholders
2. Finalize resource allocation
3. Begin next phase planning`,
});

const phases: ProjectPhase[] = [
  'market_research',
  'competitive_analysis',
  'technical_feasibility',
  'architecture_design',
  'risk_assessment',
  'sprint_planning',
];

/**
 * ApprovalGate appears after each planning phase completes, allowing users to:
 * - Review the phase output
 * - Approve and continue to the next phase
 * - Request revisions with feedback
 *
 * This implements a human-in-the-loop pattern for AI-assisted project planning.
 *
 * ## Glass Design System
 * The modal uses backdrop blur and glass-inspired styling for a modern,
 * professional appearance that matches the Blueprint theme.
 */
const meta = {
  title: 'Components/Planning/ApprovalGate',
  component: ApprovalGate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Phase approval modal for reviewing AI-generated planning outputs with approve/revise workflow.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onContinue: fn(),
    onRevise: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ApprovalGate>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Phase Examples
// ============================================================================

/**
 * Market Research phase completed.
 */
export const MarketResearch: Story = {
  args: {
    phaseState: createPhaseState('market_research'),
    nextPhaseIndex: 1,
    totalPhases: 6,
    nextPhase: 'competitive_analysis',
    isProcessing: false,
  },
};

/**
 * Competitive Analysis phase.
 */
export const CompetitiveAnalysis: Story = {
  args: {
    phaseState: createPhaseState('competitive_analysis'),
    nextPhaseIndex: 2,
    totalPhases: 6,
    nextPhase: 'technical_feasibility',
    isProcessing: false,
  },
};

/**
 * Architecture Design phase.
 */
export const ArchitectureDesign: Story = {
  args: {
    phaseState: createPhaseState(
      'architecture_design',
      `# Architecture Design Report

## System Overview
The proposed architecture follows a modular, event-driven design pattern optimized for scalability and maintainability.

## Core Components

### 1. Frontend Layer
- React 19 with TypeScript
- TailwindCSS 4 for styling
- Legend State for state management

### 2. Backend Services
- Electron main process for system operations
- SQLite for local data persistence
- IPC bridge for secure communication

### 3. AI Integration
- Claude API for intelligent planning
- Gemini for deep research
- Perplexity for quick lookups

## Data Flow
\`\`\`
User Input → IPC → Main Process → AI Service → Response → Renderer
\`\`\`

## Security Considerations
- API keys stored in secure storage
- Path traversal protection
- Input validation on all IPC handlers`
    ),
    nextPhaseIndex: 4,
    totalPhases: 6,
    nextPhase: 'risk_assessment',
    isProcessing: false,
  },
};

/**
 * Final phase - Sprint Planning (no next phase).
 */
export const FinalPhase: Story = {
  args: {
    phaseState: createPhaseState('sprint_planning'),
    nextPhaseIndex: null,
    totalPhases: 6,
    nextPhase: undefined,
    isProcessing: false,
  },
};

// ============================================================================
// States
// ============================================================================

/**
 * Processing state (after clicking Continue or submitting revision).
 */
export const Processing: Story = {
  args: {
    phaseState: createPhaseState('market_research'),
    nextPhaseIndex: 1,
    totalPhases: 6,
    nextPhase: 'competitive_analysis',
    isProcessing: true,
  },
};

/**
 * Long output that requires scrolling.
 */
export const LongOutput: Story = {
  args: {
    phaseState: createPhaseState(
      'technical_feasibility',
      Array(50)
        .fill(
          `## Section Analysis\n\nDetailed analysis of technical requirements and feasibility considerations. This section covers multiple aspects of the proposed solution.\n\n`
        )
        .join('')
    ),
    nextPhaseIndex: 3,
    totalPhases: 6,
    nextPhase: 'architecture_design',
    isProcessing: false,
  },
};

/**
 * No output available.
 */
export const NoOutput: Story = {
  args: {
    phaseState: {
      ...createPhaseState('risk_assessment'),
      output: undefined,
    },
    nextPhaseIndex: 5,
    totalPhases: 6,
    nextPhase: 'sprint_planning',
    isProcessing: false,
  },
};

// ============================================================================
// Interactive
// ============================================================================

/**
 * Interactive demo with revision form.
 */
export const Interactive: StoryObj = {
  render: function InteractiveDemo() {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleContinue = () => {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        alert('Continuing to next phase!');
      }, 1500);
    };

    const handleRevise = (feedback: string) => {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        alert(`Revision requested: ${feedback}`);
      }, 1500);
    };

    return (
      <ApprovalGate
        phaseState={createPhaseState('competitive_analysis')}
        nextPhaseIndex={2}
        totalPhases={6}
        nextPhase="technical_feasibility"
        onContinue={handleContinue}
        onRevise={handleRevise}
        onClose={() => alert('Closed')}
        isProcessing={isProcessing}
      />
    );
  },
};

/**
 * Full workflow simulation through all phases.
 */
export const WorkflowSimulation: StoryObj = {
  render: function WorkflowDemo() {
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleContinue = () => {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        if (currentPhaseIndex < phases.length - 1) {
          setCurrentPhaseIndex((prev) => prev + 1);
        } else {
          alert('All phases complete!');
          setCurrentPhaseIndex(0);
        }
      }, 1000);
    };

    const handleRevise = (feedback: string) => {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        console.log('Revision feedback:', feedback);
      }, 1000);
    };

    const currentPhase = phases[currentPhaseIndex];
    const nextPhase = phases[currentPhaseIndex + 1];

    return (
      <div>
        <div className="absolute top-4 left-4 z-50 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow text-sm">
          Phase {currentPhaseIndex + 1} of {phases.length}
        </div>
        <ApprovalGate
          phaseState={createPhaseState(currentPhase)}
          nextPhaseIndex={currentPhaseIndex + 1}
          totalPhases={phases.length}
          nextPhase={nextPhase}
          onContinue={handleContinue}
          onRevise={handleRevise}
          isProcessing={isProcessing}
        />
      </div>
    );
  },
};

// ============================================================================
// Glass Design
// ============================================================================

/**
 * Approval gate with enhanced glass styling.
 */
export const GlassStyled: Story = {
  args: {
    phaseState: createPhaseState('architecture_design'),
    nextPhaseIndex: 4,
    totalPhases: 6,
    nextPhase: 'risk_assessment',
    isProcessing: false,
  },
  parameters: {
    backgrounds: { default: 'tokyo-night' },
  },
};
