/**
 * PhaseOrchestrator - Orchestrates sequential phase execution for project planning
 *
 * Manages the execution of selected project phases in order, with support for:
 * - Sequential phase execution
 * - Phase progress tracking
 * - Pause/resume functionality
 * - Checkpoint-based state persistence (for US-045)
 */

import { EventEmitter } from 'events';
import { researchRouter, type ResearchMode, type ProjectPhase, type UnifiedStreamChunk } from './ResearchRouter';
import { agentService, type AgentSession } from './AgentService';
import { checkpointService, type CheckpointData } from './CheckpointService';
import type {
  PhaseStatus,
  OrchestrationStatus,
  PhaseState,
  ProjectExecutionState,
  PhaseOrchestratorConfig,
} from '../../shared/types';

// Re-export for consumers
export type {
  PhaseStatus,
  OrchestrationStatus,
  PhaseState,
  ProjectExecutionState,
  PhaseOrchestratorConfig,
} from '../../shared/types';

// Phase prompts for AI planning
const PHASE_PROMPTS: Record<ProjectPhase, string> = {
  market_research: `Conduct comprehensive market research for this project. Analyze:
- Target market size and growth trends
- Key market segments and their characteristics
- Current market dynamics and driving factors
- Market entry barriers and opportunities
- Potential for market disruption

Provide data-driven insights with specific numbers where available.`,

  competitive_analysis: `Perform detailed competitive analysis. Research and analyze:
- Direct and indirect competitors
- Competitor strengths and weaknesses
- Market positioning and differentiation strategies
- Pricing models and business models
- Technology stacks used by competitors
- Competitive gaps and opportunities

Create a competitive matrix and provide actionable insights.`,

  technical_feasibility: `Evaluate technical feasibility for this project. Assess:
- Required technology stack and components
- Technical complexity and challenges
- Skills and expertise needed
- Third-party dependencies and integrations
- Scalability considerations
- Security requirements
- Performance requirements

Provide recommendations on technology choices and implementation approach.`,

  architecture_design: `Design the system architecture for this project. Include:
- High-level system architecture diagram (in Mermaid format)
- Component breakdown and responsibilities
- Data flow and communication patterns
- Database design considerations
- API design principles
- Security architecture
- Infrastructure requirements
- Deployment strategy

Provide detailed architectural decisions with rationale.`,

  risk_assessment: `Conduct risk assessment for this project. Identify and analyze:
- Technical risks and mitigation strategies
- Market risks and contingency plans
- Operational risks
- Financial risks
- Timeline risks
- Resource risks
- Regulatory and compliance risks

Create a risk matrix with probability, impact, and mitigation strategies.`,

  sprint_planning: `Create sprint planning for this project. Include:
- Epic breakdown into user stories
- Story point estimates
- Sprint goals and deliverables
- Dependencies between stories
- Team velocity considerations
- Acceptance criteria for key features
- Definition of done

Provide a realistic timeline with milestones.`,

  general: `Provide general analysis and insights for this project.`,
};

// Phase display names
const PHASE_DISPLAY_NAMES: Record<ProjectPhase, string> = {
  market_research: 'Market Research',
  competitive_analysis: 'Competitive Analysis',
  technical_feasibility: 'Technical Feasibility',
  architecture_design: 'Architecture Design',
  risk_assessment: 'Risk Assessment',
  sprint_planning: 'Sprint Planning',
  general: 'General',
};

// Events emitted by the orchestrator
export interface PhaseOrchestratorEvents {
  'phase:start': (phase: ProjectPhase, phaseIndex: number) => void;
  'phase:progress': (phase: ProjectPhase, progress: number, content: string) => void;
  'phase:complete': (phase: ProjectPhase, output: string) => void;
  'phase:error': (phase: ProjectPhase, error: string) => void;
  'phase:awaiting_approval': (phase: ProjectPhase, phaseIndex: number) => void;
  'orchestration:start': (state: ProjectExecutionState) => void;
  'orchestration:pause': (state: ProjectExecutionState) => void;
  'orchestration:resume': (state: ProjectExecutionState) => void;
  'orchestration:complete': (state: ProjectExecutionState) => void;
  'orchestration:error': (error: string) => void;
  'state:update': (state: ProjectExecutionState) => void;
  'checkpoint:saved': (checkpoint: CheckpointData) => void;
  'checkpoint:resumed': (checkpoint: CheckpointData) => void;
}

/**
 * Service for orchestrating project phase execution
 */
class PhaseOrchestrator extends EventEmitter {
  private currentExecution: ProjectExecutionState | null = null;
  private pauseRequested: boolean = false;
  private abortController: AbortController | null = null;
  private agentSession: AgentSession | null = null;
  /** Resolver for approval gate promise */
  private approvalResolver: ((action: { type: 'continue' } | { type: 'revise'; feedback: string }) => void) | null = null;
  /** Current checkpoint ID for save/resume */
  private currentCheckpointId: string | null = null;

  constructor() {
    super();
  }

  /**
   * Get current execution state
   */
  getExecutionState(): ProjectExecutionState | null {
    return this.currentExecution ? { ...this.currentExecution } : null;
  }

  /**
   * Check if an execution is currently running
   */
  isRunning(): boolean {
    return this.currentExecution?.status === 'running';
  }

  /**
   * Check if an execution is paused
   */
  isPaused(): boolean {
    return this.currentExecution?.status === 'paused';
  }

  /**
   * Check if execution is waiting for user approval
   */
  isWaitingForApproval(): boolean {
    return this.currentExecution?.status === 'waiting_for_approval';
  }

  /**
   * Approve the current phase and continue to the next one
   */
  approveAndContinue(): boolean {
    if (!this.isWaitingForApproval() || !this.approvalResolver) {
      return false;
    }

    this.approvalResolver({ type: 'continue' });
    this.approvalResolver = null;
    return true;
  }

  /**
   * Revise the current phase with feedback
   */
  revisePhase(feedback: string): boolean {
    if (!this.isWaitingForApproval() || !this.approvalResolver) {
      return false;
    }

    this.approvalResolver({ type: 'revise', feedback });
    this.approvalResolver = null;
    return true;
  }

  /**
   * Get the current phase being executed
   */
  getCurrentPhase(): PhaseState | null {
    if (!this.currentExecution || this.currentExecution.currentPhaseIndex < 0) {
      return null;
    }
    return this.currentExecution.phases[this.currentExecution.currentPhaseIndex] || null;
  }

  /**
   * Get display name for a phase
   */
  getPhaseDisplayName(phase: ProjectPhase): string {
    return PHASE_DISPLAY_NAMES[phase] || phase;
  }

  /**
   * Start executing phases for a project
   */
  async start(config: PhaseOrchestratorConfig): Promise<void> {
    if (this.isRunning()) {
      throw new Error('An execution is already running. Stop or complete it first.');
    }

    // Initialize execution state
    this.currentExecution = {
      projectId: config.projectId,
      projectName: config.projectName,
      projectPath: config.projectPath,
      researchMode: config.researchMode,
      phases: config.phases.map((phase) => ({
        phase,
        status: 'pending',
        progress: 0,
      })),
      currentPhaseIndex: -1,
      status: 'running',
      startedAt: new Date(),
    };

    this.pauseRequested = false;
    this.abortController = new AbortController();

    // Create agent session for the project
    this.agentSession = agentService.createSession({
      systemPrompt: `You are a project planning assistant helping to plan "${config.projectName}".
Your role is to provide comprehensive, data-driven analysis for each planning phase.
Format your responses in markdown with clear headings and structured content.
Include Mermaid diagrams where appropriate for visualizations.
Be thorough but concise.`,
      autoSelectModel: true,
    });

    this.emit('orchestration:start', { ...this.currentExecution });
    this.emitStateUpdate();

    try {
      await this.executePhases();
    } catch (error) {
      if (error instanceof Error && error.message === 'Execution paused') {
        // Pause is expected, not an error
        return;
      }
      this.handleExecutionError(error);
    }
  }

  /**
   * Pause the current execution after completing the current phase
   */
  pause(): boolean {
    if (!this.isRunning()) {
      return false;
    }

    this.pauseRequested = true;
    return true;
  }

  /**
   * Resume a paused execution
   */
  async resume(): Promise<void> {
    if (!this.isPaused() || !this.currentExecution) {
      throw new Error('No paused execution to resume.');
    }

    this.currentExecution.status = 'running';
    this.currentExecution.pausedAt = undefined;
    this.pauseRequested = false;
    this.abortController = new AbortController();

    this.emit('orchestration:resume', { ...this.currentExecution });
    this.emitStateUpdate();

    try {
      await this.executePhases();
    } catch (error) {
      if (error instanceof Error && error.message === 'Execution paused') {
        return;
      }
      this.handleExecutionError(error);
    }
  }

  /**
   * Stop the current execution
   */
  stop(): boolean {
    if (!this.currentExecution) {
      return false;
    }

    this.abortController?.abort();
    this.currentExecution.status = 'failed';

    // Mark current phase as failed if in progress
    const currentPhase = this.getCurrentPhase();
    if (currentPhase && currentPhase.status === 'in_progress') {
      currentPhase.status = 'failed';
      currentPhase.error = 'Execution stopped by user';
    }

    this.emit('orchestration:error', 'Execution stopped by user');
    this.emitStateUpdate();

    return true;
  }

  /**
   * Skip the current phase and move to the next
   */
  skipCurrentPhase(): boolean {
    if (!this.isRunning() || !this.currentExecution) {
      return false;
    }

    const currentPhase = this.getCurrentPhase();
    if (currentPhase && currentPhase.status === 'in_progress') {
      currentPhase.status = 'skipped';
      currentPhase.completedAt = new Date();
      this.emitStateUpdate();
      return true;
    }

    return false;
  }

  /**
   * Execute phases sequentially
   */
  private async executePhases(): Promise<void> {
    if (!this.currentExecution) {
      return;
    }

    // Find the next pending phase
    const startIndex = this.currentExecution.currentPhaseIndex + 1;

    for (let i = startIndex; i < this.currentExecution.phases.length; i++) {
      // Check for pause request
      if (this.pauseRequested) {
        this.currentExecution.status = 'paused';
        this.currentExecution.pausedAt = new Date();
        this.emit('orchestration:pause', { ...this.currentExecution });
        this.emitStateUpdate();
        throw new Error('Execution paused');
      }

      // Check for abort
      if (this.abortController?.signal.aborted) {
        return;
      }

      const phaseState = this.currentExecution.phases[i];
      if (phaseState.status !== 'pending' && phaseState.status !== 'completed') {
        continue; // Skip phases that aren't pending or completed (e.g., failed, skipped)
      }

      // If phase is pending, execute it
      if (phaseState.status === 'pending') {
        this.currentExecution.currentPhaseIndex = i;
        await this.executePhase(phaseState);
      }

      // After phase completion, wait for approval before continuing (unless it's the last phase)
      const isLastPhase = i === this.currentExecution.phases.length - 1;
      if (phaseState.status === 'completed' && !isLastPhase) {
        // Approval gate loop - allows multiple revisions
        let approved = false;
        while (!approved) {
          const action = await this.waitForApproval(phaseState.phase, i);

          if (action.type === 'continue') {
            approved = true;
            // Update status back to running after approval
            this.currentExecution.status = 'running';
            this.currentExecution.awaitingApprovalPhaseIndex = undefined;
            this.emitStateUpdate();
          } else if (action.type === 'revise') {
            // Update status back to running for revision
            this.currentExecution.status = 'running';
            this.currentExecution.awaitingApprovalPhaseIndex = undefined;
            this.emitStateUpdate();

            // Re-execute with feedback
            await this.executePhaseWithFeedback(phaseState, action.feedback);

            // If revision failed, exit the approval loop
            if (phaseState.status !== 'completed') {
              break;
            }
            // Otherwise, loop back to ask for approval again
          }
        }
      }
    }

    // All phases completed
    this.currentExecution.status = 'completed';
    this.currentExecution.completedAt = new Date();
    this.emit('orchestration:complete', { ...this.currentExecution });
    this.emitStateUpdate();
  }

  /**
   * Wait for user approval before proceeding to the next phase
   */
  private waitForApproval(phase: ProjectPhase, phaseIndex: number): Promise<{ type: 'continue' } | { type: 'revise'; feedback: string }> {
    if (!this.currentExecution) {
      return Promise.resolve({ type: 'continue' });
    }

    // Set status to waiting for approval
    this.currentExecution.status = 'waiting_for_approval';
    this.currentExecution.awaitingApprovalPhaseIndex = phaseIndex;

    this.emit('phase:awaiting_approval', phase, phaseIndex);
    this.emitStateUpdate();

    // Return a promise that resolves when the user approves or revises
    return new Promise((resolve) => {
      this.approvalResolver = resolve;
    });
  }

  /**
   * Execute a phase with revision feedback
   */
  private async executePhaseWithFeedback(phaseState: PhaseState, feedback: string): Promise<void> {
    if (!this.currentExecution || !this.agentSession) {
      return;
    }

    phaseState.status = 'in_progress';
    phaseState.startedAt = new Date();
    phaseState.progress = 0;

    this.emit('phase:start', phaseState.phase, this.currentExecution.currentPhaseIndex);
    this.emitStateUpdate();

    try {
      // Build prompt with feedback
      const basePrompt = this.buildPhasePrompt(phaseState.phase);
      const revisionPrompt = `${basePrompt}

REVISION REQUESTED:
The previous output needs to be revised based on the following feedback:
${feedback}

Please regenerate the content, addressing the feedback above.`;

      let accumulatedOutput = '';

      // Use streaming research for the phase
      await researchRouter.researchStream(
        revisionPrompt,
        (chunk: UnifiedStreamChunk) => {
          if (this.abortController?.signal.aborted) {
            throw new Error('Execution aborted');
          }

          if (chunk.type === 'text') {
            accumulatedOutput += chunk.content;

            // Estimate progress based on output length (rough heuristic)
            const estimatedProgress = Math.min(95, Math.floor(accumulatedOutput.length / 100));
            phaseState.progress = estimatedProgress;

            this.emit('phase:progress', phaseState.phase, estimatedProgress, chunk.content);
            this.emitStateUpdate();
          } else if (chunk.type === 'progress' && chunk.progress) {
            phaseState.progress = chunk.progress.percentage;
            this.emit('phase:progress', phaseState.phase, chunk.progress.percentage, '');
            this.emitStateUpdate();
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content);
          } else if (chunk.type === 'cancelled') {
            throw new Error('Phase cancelled');
          }
        },
        {
          mode: this.currentExecution.researchMode,
          phase: phaseState.phase,
        }
      );

      // Phase completed successfully
      phaseState.status = 'completed';
      phaseState.completedAt = new Date();
      phaseState.output = accumulatedOutput;
      phaseState.progress = 100;

      this.emit('phase:complete', phaseState.phase, accumulatedOutput);
      this.emitStateUpdate();

      // Save checkpoint after phase revision completion
      this.saveCheckpoint();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Execution paused' || errorMessage === 'Execution aborted') {
        // Save checkpoint before pausing/aborting
        this.saveCheckpoint();
        throw error;
      }

      phaseState.status = 'failed';
      phaseState.error = errorMessage;
      this.emit('phase:error', phaseState.phase, errorMessage);
      this.emitStateUpdate();

      // Save checkpoint on error as well
      this.saveCheckpoint();

      // Continue with next phase on error (don't block entire execution)
      console.error(`Phase ${phaseState.phase} revision failed:`, errorMessage);
    }
  }

  /**
   * Execute a single phase
   */
  private async executePhase(phaseState: PhaseState): Promise<void> {
    if (!this.currentExecution || !this.agentSession) {
      return;
    }

    phaseState.status = 'in_progress';
    phaseState.startedAt = new Date();
    phaseState.progress = 0;

    this.emit('phase:start', phaseState.phase, this.currentExecution.currentPhaseIndex);
    this.emitStateUpdate();

    try {
      const prompt = this.buildPhasePrompt(phaseState.phase);
      let accumulatedOutput = '';

      // Use streaming research for the phase
      await researchRouter.researchStream(
        prompt,
        (chunk: UnifiedStreamChunk) => {
          if (this.abortController?.signal.aborted) {
            throw new Error('Execution aborted');
          }

          if (chunk.type === 'text') {
            accumulatedOutput += chunk.content;

            // Estimate progress based on output length (rough heuristic)
            const estimatedProgress = Math.min(95, Math.floor(accumulatedOutput.length / 100));
            phaseState.progress = estimatedProgress;

            this.emit('phase:progress', phaseState.phase, estimatedProgress, chunk.content);
            this.emitStateUpdate();
          } else if (chunk.type === 'progress' && chunk.progress) {
            phaseState.progress = chunk.progress.percentage;
            this.emit('phase:progress', phaseState.phase, chunk.progress.percentage, '');
            this.emitStateUpdate();
          } else if (chunk.type === 'error') {
            throw new Error(chunk.content);
          } else if (chunk.type === 'cancelled') {
            throw new Error('Phase cancelled');
          }
        },
        {
          mode: this.currentExecution.researchMode,
          phase: phaseState.phase,
        }
      );

      // Phase completed successfully
      phaseState.status = 'completed';
      phaseState.completedAt = new Date();
      phaseState.output = accumulatedOutput;
      phaseState.progress = 100;

      this.emit('phase:complete', phaseState.phase, accumulatedOutput);
      this.emitStateUpdate();

      // Save checkpoint after each phase completion
      this.saveCheckpoint();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Execution paused' || errorMessage === 'Execution aborted') {
        // Save checkpoint before pausing/aborting
        this.saveCheckpoint();
        throw error;
      }

      phaseState.status = 'failed';
      phaseState.error = errorMessage;
      this.emit('phase:error', phaseState.phase, errorMessage);
      this.emitStateUpdate();

      // Save checkpoint on error as well
      this.saveCheckpoint();

      // Continue with next phase on error (don't block entire execution)
      console.error(`Phase ${phaseState.phase} failed:`, errorMessage);
    }
  }

  /**
   * Build the prompt for a phase
   */
  private buildPhasePrompt(phase: ProjectPhase): string {
    if (!this.currentExecution) {
      return PHASE_PROMPTS[phase];
    }

    const projectContext = `Project: ${this.currentExecution.projectName}
Location: ${this.currentExecution.projectPath}

`;

    return projectContext + PHASE_PROMPTS[phase];
  }

  /**
   * Handle execution error
   */
  private handleExecutionError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (this.currentExecution) {
      this.currentExecution.status = 'failed';
    }

    this.emit('orchestration:error', errorMessage);
    this.emitStateUpdate();
  }

  /**
   * Emit state update event
   */
  private emitStateUpdate(): void {
    if (this.currentExecution) {
      this.emit('state:update', { ...this.currentExecution });
    }
  }

  /**
   * Get overall progress (0-100)
   */
  getOverallProgress(): number {
    if (!this.currentExecution) {
      return 0;
    }

    const phases = this.currentExecution.phases;
    if (phases.length === 0) {
      return 0;
    }

    const completedWeight = phases.filter((p) => p.status === 'completed').length;
    const currentPhase = this.getCurrentPhase();
    const currentWeight = currentPhase ? (currentPhase.progress / 100) : 0;

    return Math.floor(((completedWeight + currentWeight) / phases.length) * 100);
  }

  /**
   * Get phase states
   */
  getPhaseStates(): PhaseState[] {
    return this.currentExecution?.phases.map((p) => ({ ...p })) || [];
  }

  /**
   * Get current checkpoint ID
   */
  getCurrentCheckpointId(): string | null {
    return this.currentCheckpointId;
  }

  /**
   * Save a checkpoint for the current execution state
   */
  saveCheckpoint(): CheckpointData | null {
    if (!this.currentExecution) {
      return null;
    }

    const checkpoint = checkpointService.saveCheckpoint(this.currentExecution);
    this.currentCheckpointId = checkpoint.id;

    this.emit('checkpoint:saved', checkpoint);
    return checkpoint;
  }

  /**
   * Check if a project has a resumable checkpoint
   */
  hasResumableCheckpoint(projectPath: string): boolean {
    return checkpointService.hasResumableCheckpoint(projectPath);
  }

  /**
   * Get checkpoint for a project path
   */
  getCheckpointForProject(projectPath: string): CheckpointData | null {
    return checkpointService.getCheckpointByProjectPath(projectPath);
  }

  /**
   * Resume execution from a checkpoint
   */
  async resumeFromCheckpoint(checkpointId: string): Promise<void> {
    if (this.isRunning()) {
      throw new Error('An execution is already running. Stop or complete it first.');
    }

    const checkpoint = checkpointService.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // Restore execution state from checkpoint
    this.currentExecution = checkpoint.executionState;
    this.currentCheckpointId = checkpointId;
    this.pauseRequested = false;
    this.abortController = new AbortController();

    // Create agent session for the project
    this.agentSession = agentService.createSession({
      systemPrompt: `You are a project planning assistant helping to plan "${this.currentExecution.projectName}".
Your role is to provide comprehensive, data-driven analysis for each planning phase.
Format your responses in markdown with clear headings and structured content.
Include Mermaid diagrams where appropriate for visualizations.
Be thorough but concise.

NOTE: This session is resuming from a previous checkpoint. Continue from where it left off.`,
      autoSelectModel: true,
    });

    // Update status to running
    this.currentExecution.status = 'running';
    this.currentExecution.pausedAt = undefined;

    this.emit('orchestration:resume', { ...this.currentExecution });
    this.emit('checkpoint:resumed', checkpoint);
    this.emitStateUpdate();

    try {
      await this.executePhases();
    } catch (error) {
      if (error instanceof Error && error.message === 'Execution paused') {
        // Save checkpoint on pause
        this.saveCheckpoint();
        return;
      }
      this.handleExecutionError(error);
    }
  }

  /**
   * Delete checkpoint for a project
   */
  deleteCheckpoint(checkpointId: string): boolean {
    if (this.currentCheckpointId === checkpointId) {
      this.currentCheckpointId = null;
    }
    return checkpointService.deleteCheckpoint(checkpointId);
  }

  /**
   * Delete all checkpoints for a project path
   */
  deleteCheckpointsForProject(projectPath: string): number {
    return checkpointService.deleteCheckpointsByProjectPath(projectPath);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.abortController?.abort();
    this.currentExecution = null;
    this.agentSession = null;
    this.pauseRequested = false;
    this.approvalResolver = null;
    this.currentCheckpointId = null;
    this.removeAllListeners();
  }
}

// Singleton instance for the main process
export const phaseOrchestrator = new PhaseOrchestrator();

// Re-export types for consumers
export type { PhaseOrchestrator };
