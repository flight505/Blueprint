/**
 * PhaseDashboard Component
 *
 * Displays the current phase orchestration state with:
 * - Overall progress indicator
 * - Individual phase status and progress
 * - Pause/Resume/Stop controls
 * - Phase output preview
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ProjectPhase,
  PhaseState,
  ProjectExecutionState,
  PhaseOrchestratorConfig,
} from '../../../preload';

// Phase display metadata
const PHASE_ICONS: Record<ProjectPhase, string> = {
  market_research: '📊',
  competitive_analysis: '🔍',
  technical_feasibility: '⚙️',
  architecture_design: '🏗️',
  risk_assessment: '⚠️',
  sprint_planning: '📋',
  general: '📝',
};

const PHASE_DISPLAY_NAMES: Record<ProjectPhase, string> = {
  market_research: 'Market Research',
  competitive_analysis: 'Competitive Analysis',
  technical_feasibility: 'Technical Feasibility',
  architecture_design: 'Architecture Design',
  risk_assessment: 'Risk Assessment',
  sprint_planning: 'Sprint Planning',
  general: 'General',
};

interface PhaseDashboardProps {
  /** Project configuration to start orchestration */
  projectConfig?: PhaseOrchestratorConfig;
  /** Callback when orchestration completes */
  onComplete?: (state: ProjectExecutionState) => void;
  /** Callback when a phase produces output */
  onPhaseOutput?: (phase: ProjectPhase, output: string) => void;
}

export function PhaseDashboard({
  projectConfig,
  onComplete,
  onPhaseOutput,
}: PhaseDashboardProps) {
  const [executionState, setExecutionState] = useState<ProjectExecutionState | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<ProjectPhase | null>(null);

  // Set up event listeners
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    // State update handler
    const onStateUpdate = window.electronAPI.onOrchestratorStateUpdate((state) => {
      setExecutionState(state);
    });
    cleanups.push(onStateUpdate);

    // Phase progress handler
    const onPhaseProgress = window.electronAPI.onOrchestratorPhaseProgress(
      (_phase, _progress, content) => {
        if (content) {
          setCurrentContent((prev) => prev + content);
        }
      }
    );
    cleanups.push(onPhaseProgress);

    // Phase start handler
    const onPhaseStart = window.electronAPI.onOrchestratorPhaseStart((startedPhase) => {
      setCurrentContent('');
      setExpandedPhase(startedPhase);
    });
    cleanups.push(onPhaseStart);

    // Phase complete handler
    const onPhaseComplete = window.electronAPI.onOrchestratorPhaseComplete((phase, output) => {
      onPhaseOutput?.(phase, output);
    });
    cleanups.push(onPhaseComplete);

    // Orchestration complete handler
    const onOrchComplete = window.electronAPI.onOrchestratorComplete((state) => {
      onComplete?.(state);
    });
    cleanups.push(onOrchComplete);

    // Error handler
    const onOrchError = window.electronAPI.onOrchestratorError((err) => {
      setError(err);
    });
    cleanups.push(onOrchError);

    // Fetch initial state
    window.electronAPI.orchestratorGetExecutionState().then((state) => {
      if (state) {
        setExecutionState(state);
      }
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [onComplete, onPhaseOutput]);

  // Start orchestration
  const handleStart = useCallback(async () => {
    if (!projectConfig) return;

    setIsStarting(true);
    setError(null);

    try {
      await window.electronAPI.orchestratorStart(projectConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start orchestration');
    } finally {
      setIsStarting(false);
    }
  }, [projectConfig]);

  // Pause orchestration
  const handlePause = useCallback(async () => {
    await window.electronAPI.orchestratorPause();
  }, []);

  // Resume orchestration
  const handleResume = useCallback(async () => {
    try {
      await window.electronAPI.orchestratorResume();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume orchestration');
    }
  }, []);

  // Stop orchestration
  const handleStop = useCallback(async () => {
    await window.electronAPI.orchestratorStop();
  }, []);

  // Skip current phase
  const handleSkip = useCallback(async () => {
    await window.electronAPI.orchestratorSkipCurrentPhase();
  }, []);

  // Get status color
  const getStatusColor = (status: PhaseState['status']): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'paused':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'skipped':
        return 'text-gray-500 dark:text-gray-400';
      default:
        return 'text-gray-400 dark:text-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: PhaseState['status']): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '●';
      case 'failed':
        return '✗';
      case 'paused':
        return '⏸';
      case 'skipped':
        return '⊘';
      default:
        return '○';
    }
  };

  // Calculate overall progress
  const overallProgress =
    executionState?.phases.length && executionState.phases.length > 0
      ? Math.floor(
          (executionState.phases.filter((p) => p.status === 'completed').length /
            executionState.phases.length) *
            100
        )
      : 0;

  // Check if we have an active execution
  const isRunning = executionState?.status === 'running';
  const isPaused = executionState?.status === 'paused';
  const isComplete = executionState?.status === 'completed';
  const isFailed = executionState?.status === 'failed';

  // If no execution state and no config, show empty state
  if (!executionState && !projectConfig) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p>No active planning session. Create a new project to start.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {executionState?.projectName || projectConfig?.projectName || 'Project Planning'}
            </h2>
            {executionState && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mode: {executionState.researchMode.charAt(0).toUpperCase() + executionState.researchMode.slice(1)}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!executionState && projectConfig && (
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isStarting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Starting...
                  </>
                ) : (
                  <>
                    <span>▶</span> Start Planning
                  </>
                )}
              </button>
            )}

            {isRunning && (
              <>
                <button
                  onClick={handlePause}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title="Pause after current phase"
                >
                  ⏸ Pause
                </button>
                <button
                  onClick={handleSkip}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title="Skip current phase"
                >
                  ⏭ Skip
                </button>
                <button
                  onClick={handleStop}
                  className="px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                  title="Stop planning"
                >
                  ⏹ Stop
                </button>
              </>
            )}

            {isPaused && (
              <>
                <button
                  onClick={handleResume}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  ▶ Resume
                </button>
                <button
                  onClick={handleStop}
                  className="px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                >
                  ⏹ Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/* Overall progress bar */}
        {executionState && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300">Overall Progress</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">{overallProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete
                    ? 'bg-green-500'
                    : isFailed
                    ? 'bg-red-500'
                    : isPaused
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status badges */}
        {executionState && (
          <div className="mt-3 flex gap-2">
            {isComplete && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                ✓ Complete
              </span>
            )}
            {isPaused && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                ⏸ Paused
              </span>
            )}
            {isFailed && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                ✗ Failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-700 dark:text-red-300 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Phase list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {executionState?.phases.map((phaseState) => (
            <div
              key={phaseState.phase}
              className={`rounded-lg border transition-colors ${
                phaseState.status === 'in_progress'
                  ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {/* Phase header */}
              <button
                onClick={() =>
                  setExpandedPhase(expandedPhase === phaseState.phase ? null : phaseState.phase)
                }
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <span className="text-xl">{PHASE_ICONS[phaseState.phase]}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {PHASE_DISPLAY_NAMES[phaseState.phase]}
                    </span>
                    <span className={`text-sm ${getStatusColor(phaseState.status)}`}>
                      {getStatusIcon(phaseState.status)}
                    </span>
                  </div>

                  {/* Phase progress bar */}
                  {phaseState.status === 'in_progress' && (
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${phaseState.progress}%` }}
                      />
                    </div>
                  )}

                  {phaseState.error && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {phaseState.error}
                    </p>
                  )}
                </div>

                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedPhase === phaseState.phase ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Phase output (expanded) */}
              {expandedPhase === phaseState.phase && (
                <div className="px-3 pb-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-64 overflow-y-auto">
                    {phaseState.status === 'in_progress' && currentContent ? (
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                        {currentContent}
                      </pre>
                    ) : phaseState.output ? (
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                        {phaseState.output.substring(0, 500)}
                        {phaseState.output.length > 500 && '...'}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {phaseState.status === 'pending'
                          ? 'Waiting to start...'
                          : phaseState.status === 'in_progress'
                          ? 'Generating content...'
                          : 'No output available'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PhaseDashboard;
