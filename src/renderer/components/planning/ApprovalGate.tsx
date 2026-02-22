/**
 * ApprovalGate Component
 *
 * Displays after each phase completion, allowing the user to:
 * - Review the phase output
 * - Continue to the next phase
 * - Revise the current phase with feedback
 */

import { useState, useCallback, type ReactNode } from 'react';
import type { ProjectPhase, PhaseState } from '../../../preload';
import { PHASE_ICONS as PHASE_ICON_COMPONENTS, Check, Sparkles } from '../icons';

// Phase display metadata
const PHASE_DISPLAY_NAMES: Record<ProjectPhase, string> = {
  market_research: 'Market Research',
  competitive_analysis: 'Competitive Analysis',
  technical_feasibility: 'Technical Feasibility',
  architecture_design: 'Architecture Design',
  risk_assessment: 'Risk Assessment',
  sprint_planning: 'Sprint Planning',
  general: 'General',
};

// Get phase icon as React element
function getPhaseIcon(phase: ProjectPhase): ReactNode {
  const IconComponent = PHASE_ICON_COMPONENTS[phase];
  return IconComponent ? <IconComponent size={24} /> : null;
}

export interface ApprovalGateProps {
  /** The completed phase state */
  phaseState: PhaseState;
  /** The index of the next phase (for display) */
  nextPhaseIndex: number | null;
  /** Total number of phases */
  totalPhases: number;
  /** The next phase info (if any) */
  nextPhase?: ProjectPhase;
  /** Callback when user approves and wants to continue */
  onContinue: () => void;
  /** Callback when user wants to revise with feedback */
  onRevise: (feedback: string) => void;
  /** Callback when user wants to close without action */
  onClose?: () => void;
  /** Whether the gate is currently processing an action */
  isProcessing?: boolean;
}

export function ApprovalGate({
  phaseState,
  nextPhaseIndex,
  totalPhases,
  nextPhase,
  onContinue,
  onRevise,
  onClose,
  isProcessing = false,
}: ApprovalGateProps) {
  const [showReviseForm, setShowReviseForm] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleContinue = useCallback(() => {
    if (!isProcessing) {
      onContinue();
    }
  }, [isProcessing, onContinue]);

  const handleReviseClick = useCallback(() => {
    setShowReviseForm(true);
  }, []);

  const handleReviseSubmit = useCallback(() => {
    if (feedback.trim() && !isProcessing) {
      onRevise(feedback.trim());
      setFeedback('');
      setShowReviseForm(false);
    }
  }, [feedback, isProcessing, onRevise]);

  const handleCancelRevise = useCallback(() => {
    setShowReviseForm(false);
    setFeedback('');
  }, []);

  const isLastPhase = nextPhaseIndex === null || nextPhaseIndex >= totalPhases;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-gate-title"
    >
      <div className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <span className="text-fg-muted" aria-hidden="true">
              {getPhaseIcon(phaseState.phase)}
            </span>
            <div>
              <h2
                id="approval-gate-title"
                className="text-lg font-semibold text-fg"
              >
                Phase Complete: {PHASE_DISPLAY_NAMES[phaseState.phase]}
              </h2>
              <p className="text-sm text-fg-muted">
                Review the output and decide how to proceed
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-fg-muted hover:text-fg rounded-lg hover:bg-surface-hover transition-colors"
              aria-label="Close approval gate"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content - Phase Output Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Check size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-fg-secondary">
                Phase completed successfully
              </span>
            </div>
            {phaseState.startedAt && phaseState.completedAt && (
              <p className="text-xs text-fg-muted">
                Duration:{' '}
                {Math.round(
                  (new Date(phaseState.completedAt).getTime() -
                    new Date(phaseState.startedAt).getTime()) /
                    1000
                )}{' '}
                seconds
              </p>
            )}
          </div>

          {/* Output Preview */}
          <div className="rounded-lg border border-border-default bg-surface-deep">
            <div className="p-3 border-b border-border-default">
              <h3 className="text-sm font-medium text-fg-secondary">
                Output Preview
              </h3>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {phaseState.output ? (
                <pre className="text-sm text-fg-secondary whitespace-pre-wrap font-mono leading-relaxed">
                  {phaseState.output.length > 1000
                    ? phaseState.output.substring(0, 1000) + '\n\n... (truncated for preview)'
                    : phaseState.output}
                </pre>
              ) : (
                <p className="text-sm text-fg-muted italic">
                  No output available for preview
                </p>
              )}
            </div>
          </div>

          {/* Revise Form */}
          {showReviseForm && (
            <div className="mt-4 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
              <label
                htmlFor="revision-feedback"
                className="block text-sm font-medium text-fg-secondary mb-2"
              >
                What would you like to change?
              </label>
              <textarea
                id="revision-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe the changes or additions you'd like to see..."
                className="w-full px-3 py-2 text-sm border border-border-default rounded-lg bg-surface text-fg placeholder-fg-muted focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={handleCancelRevise}
                  className="px-3 py-1.5 text-sm font-medium text-fg-secondary hover:bg-surface-hover rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviseSubmit}
                  disabled={!feedback.trim() || isProcessing}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Submitting...' : 'Submit Revision'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="flex-shrink-0 p-4 border-t border-border-default bg-surface/50">
          <div className="flex items-center justify-between">
            {/* Next phase info */}
            <div className="text-sm text-fg-muted">
              {!isLastPhase && nextPhase ? (
                <span className="flex items-center gap-1">
                  Next: <span className="text-fg-muted">{getPhaseIcon(nextPhase)}</span> {PHASE_DISPLAY_NAMES[nextPhase]}
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Sparkles size={14} /> All phases complete after this
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {!showReviseForm && (
                <>
                  <button
                    onClick={handleReviseClick}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label="Revise this phase with feedback"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Revise
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label={isLastPhase ? 'Finish planning' : 'Continue to next phase'}
                  >
                    {isProcessing ? (
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
                        Processing...
                      </>
                    ) : (
                      <>
                        {isLastPhase ? 'Finish' : 'Continue'}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApprovalGate;
