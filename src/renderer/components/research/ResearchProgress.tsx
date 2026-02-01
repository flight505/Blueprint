/**
 * ResearchProgress - Progress UI for research queries
 *
 * Displays progress bar, percentage, estimated time remaining,
 * and cancel functionality for long-running research queries.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Progress checkpoint from Gemini/Research services
export interface ProgressCheckpoint {
  percentage: number;
  timestamp: Date;
  message: string;
  partialContent?: string;
}

// Research status for tracking state
export type ResearchStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';

// Props for ResearchProgress component
export interface ResearchProgressProps {
  /** Whether research is currently in progress */
  isActive: boolean;
  /** Current progress checkpoint */
  progress?: ProgressCheckpoint | null;
  /** Provider being used (perplexity or gemini) */
  provider?: 'perplexity' | 'gemini';
  /** Research mode */
  mode?: 'quick' | 'balanced' | 'comprehensive';
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Optional status message override */
  statusMessage?: string;
  /** Start time for time estimation */
  startTime?: Date;
  /** Additional CSS classes */
  className?: string;
}

// Estimate completion times by provider/mode (in seconds)
const ESTIMATED_TIMES: Record<string, Record<string, number>> = {
  perplexity: {
    quick: 30,
    balanced: 30,
    comprehensive: 30,
  },
  gemini: {
    quick: 60,
    balanced: 300, // 5 minutes
    comprehensive: 900, // 15 minutes average, can be up to 60
  },
};

// Format seconds to human-readable time
function formatTimeRemaining(seconds: number): string {
  if (seconds < 0) return 'calculating...';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.ceil((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Get progress bar color based on percentage
function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-green-500';
  if (percentage >= 50) return 'bg-blue-500';
  return 'bg-blue-400';
}

// Get provider display name
function getProviderName(provider?: string): string {
  if (provider === 'perplexity') return 'Perplexity';
  if (provider === 'gemini') return 'Gemini Deep Research';
  return 'Research';
}

export default function ResearchProgress({
  isActive,
  progress,
  provider = 'perplexity',
  mode = 'balanced',
  onCancel,
  statusMessage,
  startTime,
  className = '',
}: ResearchProgressProps) {
  // Animated percentage for smooth transitions
  const [displayPercentage, setDisplayPercentage] = useState(0);
  // Elapsed time tracking
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Calculate target percentage from progress
  const targetPercentage = progress?.percentage ?? 0;

  // Animate percentage changes
  useEffect(() => {
    if (!isActive) {
      setDisplayPercentage(0);
      return;
    }

    const diff = targetPercentage - displayPercentage;
    if (Math.abs(diff) < 0.5) {
      setDisplayPercentage(targetPercentage);
      return;
    }

    const step = diff > 0 ? Math.max(0.5, diff / 10) : Math.min(-0.5, diff / 10);
    const timer = setTimeout(() => {
      setDisplayPercentage(prev => {
        const next = prev + step;
        return diff > 0 ? Math.min(next, targetPercentage) : Math.max(next, targetPercentage);
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [isActive, targetPercentage, displayPercentage]);

  // Track elapsed time
  useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const now = new Date();
      const elapsed = (now.getTime() - startTime.getTime()) / 1000;
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  // Reset on deactivation
  useEffect(() => {
    if (!isActive) {
      setDisplayPercentage(0);
      setElapsedSeconds(0);
    }
  }, [isActive]);

  // Calculate estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (!isActive || displayPercentage === 0) {
      // Use default estimates before first checkpoint
      const baseEstimate = ESTIMATED_TIMES[provider]?.[mode] ?? 60;
      return baseEstimate;
    }

    if (displayPercentage >= 100) {
      return 0;
    }

    // Calculate based on elapsed time and current progress
    if (elapsedSeconds > 0 && displayPercentage > 0) {
      const estimatedTotal = (elapsedSeconds / displayPercentage) * 100;
      const remaining = estimatedTotal - elapsedSeconds;
      return Math.max(0, remaining);
    }

    // Fallback to default estimate
    const baseEstimate = ESTIMATED_TIMES[provider]?.[mode] ?? 60;
    const remainingPercentage = (100 - displayPercentage) / 100;
    return baseEstimate * remainingPercentage;
  }, [isActive, displayPercentage, elapsedSeconds, provider, mode]);

  // Handle cancel click
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Don't render if not active
  if (!isActive) {
    return null;
  }

  const displayMessage = statusMessage ?? progress?.message ?? 'Starting research...';

  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-sm ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Research progress"
    >
      {/* Header with provider and cancel button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getProviderName(provider)}
          </span>
          <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-700 rounded">
            {mode}
          </span>
        </div>
        {onCancel && (
          <button
            onClick={handleCancel}
            className="text-sm px-3 py-1 rounded-md text-red-400 hover:bg-red-900/20 transition-colors"
            aria-label="Cancel research"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${getProgressColor(displayPercentage)}`}
            style={{ width: `${Math.min(displayPercentage, 100)}%` }}
            role="progressbar"
            aria-valuenow={Math.round(displayPercentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress: ${Math.round(displayPercentage)}%`}
          />
        </div>
      </div>

      {/* Status text and time estimate */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[60%]" title={displayMessage}>
          {displayMessage}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {Math.round(displayPercentage)}%
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            ~{formatTimeRemaining(estimatedTimeRemaining)} remaining
          </span>
        </div>
      </div>

      {/* Elapsed time */}
      {elapsedSeconds > 0 && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
          Elapsed: {formatTimeRemaining(elapsedSeconds)}
        </div>
      )}
    </div>
  );
}

// Export a hook for managing research progress state
export interface UseResearchProgressOptions {
  onCancel?: () => void;
}

export interface ResearchProgressState {
  isActive: boolean;
  status: ResearchStatus;
  progress: ProgressCheckpoint | null;
  provider: 'perplexity' | 'gemini' | null;
  mode: 'quick' | 'balanced' | 'comprehensive';
  startTime: Date | null;
  error: string | null;
}

export function useResearchProgress(options: UseResearchProgressOptions = {}) {
  const [state, setState] = useState<ResearchProgressState>({
    isActive: false,
    status: 'idle',
    progress: null,
    provider: null,
    mode: 'balanced',
    startTime: null,
    error: null,
  });

  // Start research tracking
  const startResearch = useCallback((
    provider: 'perplexity' | 'gemini',
    mode: 'quick' | 'balanced' | 'comprehensive' = 'balanced'
  ) => {
    setState({
      isActive: true,
      status: 'running',
      progress: { percentage: 0, timestamp: new Date(), message: 'Starting research...' },
      provider,
      mode,
      startTime: new Date(),
      error: null,
    });
  }, []);

  // Update progress
  const updateProgress = useCallback((checkpoint: ProgressCheckpoint) => {
    setState(prev => ({
      ...prev,
      progress: checkpoint,
    }));
  }, []);

  // Complete research
  const completeResearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      status: 'completed',
      progress: { percentage: 100, timestamp: new Date(), message: 'Research complete.' },
    }));
  }, []);

  // Cancel research
  const cancelResearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      status: 'cancelled',
    }));
    options.onCancel?.();
  }, [options]);

  // Set error
  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      isActive: false,
      status: 'error',
      error,
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isActive: false,
      status: 'idle',
      progress: null,
      provider: null,
      mode: 'balanced',
      startTime: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    startResearch,
    updateProgress,
    completeResearch,
    cancelResearch,
    setError,
    reset,
  };
}
