import { ipcMain } from 'electron';
import { phaseOrchestrator } from '../services/PhaseOrchestrator';
import type {
  ProjectPhase,
  PhaseState,
  ProjectExecutionState,
  PhaseOrchestratorConfig,
} from '../../shared/types';

export function register() {
  // Phase orchestrator handlers
  ipcMain.handle('orchestrator:start', async (event, config: PhaseOrchestratorConfig): Promise<void> => {
    const webContents = event.sender;

    // Set up event listeners to forward to renderer
    phaseOrchestrator.on('phase:start', (phase: ProjectPhase, phaseIndex: number) => {
      webContents.send('orchestrator:phase:start', phase, phaseIndex);
    });

    phaseOrchestrator.on('phase:progress', (phase: ProjectPhase, progress: number, content: string) => {
      webContents.send('orchestrator:phase:progress', phase, progress, content);
    });

    phaseOrchestrator.on('phase:complete', (phase: ProjectPhase, output: string) => {
      webContents.send('orchestrator:phase:complete', phase, output);
    });

    phaseOrchestrator.on('phase:error', (phase: ProjectPhase, error: string) => {
      webContents.send('orchestrator:phase:error', phase, error);
    });

    phaseOrchestrator.on('phase:awaiting_approval', (phase: ProjectPhase, phaseIndex: number) => {
      webContents.send('orchestrator:phase:awaiting_approval', phase, phaseIndex);
    });

    phaseOrchestrator.on('orchestration:start', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:orchestration:start', state);
    });

    phaseOrchestrator.on('orchestration:pause', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:orchestration:pause', state);
    });

    phaseOrchestrator.on('orchestration:resume', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:orchestration:resume', state);
    });

    phaseOrchestrator.on('orchestration:complete', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:orchestration:complete', state);
    });

    phaseOrchestrator.on('orchestration:error', (error: string) => {
      webContents.send('orchestrator:orchestration:error', error);
    });

    phaseOrchestrator.on('state:update', (state: ProjectExecutionState) => {
      webContents.send('orchestrator:state:update', state);
    });

    phaseOrchestrator.on('checkpoint:saved', (checkpoint) => {
      webContents.send('checkpoint:saved', checkpoint);
    });

    phaseOrchestrator.on('checkpoint:resumed', (checkpoint) => {
      webContents.send('checkpoint:resumed', checkpoint);
    });

    await phaseOrchestrator.start(config);
  });

  ipcMain.handle('orchestrator:pause', (): boolean => {
    return phaseOrchestrator.pause();
  });

  ipcMain.handle('orchestrator:resume', async (): Promise<void> => {
    await phaseOrchestrator.resume();
  });

  ipcMain.handle('orchestrator:stop', (): boolean => {
    return phaseOrchestrator.stop();
  });

  ipcMain.handle('orchestrator:skipCurrentPhase', (): boolean => {
    return phaseOrchestrator.skipCurrentPhase();
  });

  ipcMain.handle('orchestrator:getExecutionState', (): ProjectExecutionState | null => {
    return phaseOrchestrator.getExecutionState();
  });

  ipcMain.handle('orchestrator:isRunning', (): boolean => {
    return phaseOrchestrator.isRunning();
  });

  ipcMain.handle('orchestrator:isPaused', (): boolean => {
    return phaseOrchestrator.isPaused();
  });

  ipcMain.handle('orchestrator:isWaitingForApproval', (): boolean => {
    return phaseOrchestrator.isWaitingForApproval();
  });

  ipcMain.handle('orchestrator:approveAndContinue', (): boolean => {
    return phaseOrchestrator.approveAndContinue();
  });

  ipcMain.handle('orchestrator:revisePhase', (_, feedback: string): boolean => {
    return phaseOrchestrator.revisePhase(feedback);
  });

  ipcMain.handle('orchestrator:getCurrentPhase', (): PhaseState | null => {
    return phaseOrchestrator.getCurrentPhase();
  });

  ipcMain.handle('orchestrator:getPhaseDisplayName', (_, phase: ProjectPhase): string => {
    return phaseOrchestrator.getPhaseDisplayName(phase);
  });

  ipcMain.handle('orchestrator:getOverallProgress', (): number => {
    return phaseOrchestrator.getOverallProgress();
  });

  ipcMain.handle('orchestrator:getPhaseStates', (): PhaseState[] => {
    return phaseOrchestrator.getPhaseStates();
  });

  ipcMain.handle('orchestrator:cleanup', (): void => {
    phaseOrchestrator.cleanup();
  });

  // Checkpoint handlers
  ipcMain.handle('checkpoint:save', () => {
    return phaseOrchestrator.saveCheckpoint();
  });

  ipcMain.handle('checkpoint:hasResumable', (_event, projectPath: string): boolean => {
    return phaseOrchestrator.hasResumableCheckpoint(projectPath);
  });

  ipcMain.handle('checkpoint:getForProject', (_event, projectPath: string) => {
    return phaseOrchestrator.getCheckpointForProject(projectPath);
  });

  ipcMain.handle('checkpoint:resumeFromCheckpoint', async (event, checkpointId: string): Promise<void> => {
    const webContents = event.sender;

    // Forward checkpoint events to renderer
    phaseOrchestrator.on('checkpoint:saved', (checkpoint) => {
      webContents.send('checkpoint:saved', checkpoint);
    });

    phaseOrchestrator.on('checkpoint:resumed', (checkpoint) => {
      webContents.send('checkpoint:resumed', checkpoint);
    });

    await phaseOrchestrator.resumeFromCheckpoint(checkpointId);
  });

  ipcMain.handle('checkpoint:delete', (_event, checkpointId: string): boolean => {
    return phaseOrchestrator.deleteCheckpoint(checkpointId);
  });

  ipcMain.handle('checkpoint:deleteForProject', (_event, projectPath: string): number => {
    return phaseOrchestrator.deleteCheckpointsForProject(projectPath);
  });

  ipcMain.handle('checkpoint:getCurrentId', (): string | null => {
    return phaseOrchestrator.getCurrentCheckpointId();
  });
}
