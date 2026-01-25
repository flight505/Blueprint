/**
 * CheckpointService - Manages saving and resuming phase execution checkpoints
 *
 * Provides functionality for:
 * - Saving checkpoints after each phase completion
 * - Resuming interrupted planning sessions
 * - Managing checkpoint lifecycle (create, read, delete)
 */

import { databaseService, type StoredCheckpoint } from './DatabaseService';
import type { ProjectExecutionState, OrchestrationStatus } from './PhaseOrchestrator';

// Checkpoint data structure for save/resume
export interface CheckpointData {
  id: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  executionState: ProjectExecutionState;
  createdAt: string;
  updatedAt: string;
}

// Checkpoint summary for listing
export interface CheckpointSummary {
  id: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  currentPhaseIndex: number;
  status: OrchestrationStatus;
  completedPhases: number;
  totalPhases: number;
  lastPhase: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service for managing phase execution checkpoints
 */
class CheckpointService {
  /**
   * Save a checkpoint for the current execution state
   */
  saveCheckpoint(executionState: ProjectExecutionState): CheckpointData {
    const checkpointId = `checkpoint-${executionState.projectId}-${Date.now()}`;
    const now = new Date().toISOString();

    databaseService.saveCheckpoint({
      id: checkpointId,
      projectId: executionState.projectId,
      projectPath: executionState.projectPath,
      projectName: executionState.projectName,
      executionState: JSON.stringify(executionState),
      currentPhaseIndex: executionState.currentPhaseIndex,
      status: executionState.status,
    });

    return {
      id: checkpointId,
      projectId: executionState.projectId,
      projectPath: executionState.projectPath,
      projectName: executionState.projectName,
      executionState,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Update an existing checkpoint with new state
   */
  updateCheckpoint(checkpointId: string, executionState: ProjectExecutionState): void {
    databaseService.saveCheckpoint({
      id: checkpointId,
      projectId: executionState.projectId,
      projectPath: executionState.projectPath,
      projectName: executionState.projectName,
      executionState: JSON.stringify(executionState),
      currentPhaseIndex: executionState.currentPhaseIndex,
      status: executionState.status,
    });
  }

  /**
   * Get a checkpoint by ID
   */
  getCheckpoint(checkpointId: string): CheckpointData | null {
    const stored = databaseService.getCheckpoint(checkpointId);
    if (!stored) return null;

    return this.storedToCheckpointData(stored);
  }

  /**
   * Get the most recent checkpoint for a project by project ID
   */
  getCheckpointByProjectId(projectId: string): CheckpointData | null {
    const stored = databaseService.getCheckpointByProjectId(projectId);
    if (!stored) return null;

    return this.storedToCheckpointData(stored);
  }

  /**
   * Get the most recent checkpoint for a project by project path
   */
  getCheckpointByProjectPath(projectPath: string): CheckpointData | null {
    const stored = databaseService.getCheckpointByProjectPath(projectPath);
    if (!stored) return null;

    return this.storedToCheckpointData(stored);
  }

  /**
   * Check if a project has an incomplete checkpoint that can be resumed
   */
  hasResumableCheckpoint(projectPath: string): boolean {
    const checkpoint = this.getCheckpointByProjectPath(projectPath);
    if (!checkpoint) return false;

    // A checkpoint is resumable if it's not completed or failed
    const status = checkpoint.executionState.status;
    return status !== 'completed' && status !== 'failed';
  }

  /**
   * List all checkpoints with summary info
   */
  listCheckpoints(status?: OrchestrationStatus): CheckpointSummary[] {
    const stored = databaseService.listCheckpoints(status);
    return stored.map((s) => this.storedToCheckpointSummary(s));
  }

  /**
   * List resumable checkpoints (not completed or failed)
   */
  listResumableCheckpoints(): CheckpointSummary[] {
    const all = databaseService.listCheckpoints();
    return all
      .filter((s) => s.status !== 'completed' && s.status !== 'failed')
      .map((s) => this.storedToCheckpointSummary(s));
  }

  /**
   * Delete a checkpoint
   */
  deleteCheckpoint(checkpointId: string): boolean {
    return databaseService.deleteCheckpoint(checkpointId);
  }

  /**
   * Delete all checkpoints for a project
   */
  deleteCheckpointsByProjectId(projectId: string): number {
    return databaseService.deleteCheckpointsByProjectId(projectId);
  }

  /**
   * Delete all checkpoints for a project by path
   */
  deleteCheckpointsByProjectPath(projectPath: string): number {
    return databaseService.deleteCheckpointsByProjectPath(projectPath);
  }

  /**
   * Mark a checkpoint as completed (for cleanup)
   */
  markCheckpointCompleted(checkpointId: string): boolean {
    const checkpoint = this.getCheckpoint(checkpointId);
    if (!checkpoint) return false;

    checkpoint.executionState.status = 'completed';
    checkpoint.executionState.completedAt = new Date();

    this.updateCheckpoint(checkpointId, checkpoint.executionState);
    return true;
  }

  /**
   * Convert stored checkpoint to CheckpointData
   */
  private storedToCheckpointData(stored: StoredCheckpoint): CheckpointData {
    const executionState = JSON.parse(stored.executionState) as ProjectExecutionState;

    // Convert date strings back to Date objects
    if (executionState.startedAt) {
      executionState.startedAt = new Date(executionState.startedAt);
    }
    if (executionState.pausedAt) {
      executionState.pausedAt = new Date(executionState.pausedAt);
    }
    if (executionState.completedAt) {
      executionState.completedAt = new Date(executionState.completedAt);
    }

    // Convert phase dates
    executionState.phases.forEach((phase) => {
      if (phase.startedAt) {
        phase.startedAt = new Date(phase.startedAt);
      }
      if (phase.completedAt) {
        phase.completedAt = new Date(phase.completedAt);
      }
    });

    return {
      id: stored.id,
      projectId: stored.projectId,
      projectPath: stored.projectPath,
      projectName: stored.projectName,
      executionState,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  /**
   * Convert stored checkpoint to CheckpointSummary
   */
  private storedToCheckpointSummary(stored: StoredCheckpoint): CheckpointSummary {
    const executionState = JSON.parse(stored.executionState) as ProjectExecutionState;

    const completedPhases = executionState.phases.filter(
      (p) => p.status === 'completed'
    ).length;

    const currentPhase = executionState.phases[executionState.currentPhaseIndex];
    const lastPhase = currentPhase ? currentPhase.phase : null;

    return {
      id: stored.id,
      projectId: stored.projectId,
      projectPath: stored.projectPath,
      projectName: stored.projectName,
      currentPhaseIndex: stored.currentPhaseIndex,
      status: stored.status as OrchestrationStatus,
      completedPhases,
      totalPhases: executionState.phases.length,
      lastPhase,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }
}

// Singleton instance for the main process
export const checkpointService = new CheckpointService();

// Re-export types for consumers
export type { CheckpointService };
