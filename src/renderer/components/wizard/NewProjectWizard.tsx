/**
 * NewProjectWizard Component
 *
 * Multi-step wizard for creating a new project.
 * Steps: Project Name → Research Mode → Phases → Create
 */

import { useState, useCallback, type ReactNode } from 'react';
import { AnimatedModal } from '../animations';
import { RESEARCH_ICONS } from '../icons';

// Research mode type (matches ResearchRouter)
export type ResearchMode = 'quick' | 'balanced' | 'comprehensive';

// Project phase type (matches ResearchRouter, excluding 'general')
export type ProjectPhase =
  | 'market_research'
  | 'competitive_analysis'
  | 'technical_feasibility'
  | 'architecture_design'
  | 'risk_assessment'
  | 'sprint_planning';

// Wizard step type
type WizardStep = 'name' | 'research_mode' | 'phases' | 'confirm';

// Project configuration output
export interface ProjectConfig {
  name: string;
  path: string;
  researchMode: ResearchMode;
  phases: ProjectPhase[];
}

// Research mode metadata
const RESEARCH_MODES: Record<ResearchMode, { label: string; description: string; icon: ReactNode }> = {
  quick: {
    label: 'Quick',
    description: 'Fast research using Perplexity. Best for quick facts and simple queries. Returns in ~30 seconds.',
    icon: <RESEARCH_ICONS.quick size={20} />,
  },
  balanced: {
    label: 'Balanced',
    description: 'Uses Deep Research for Phase 1 (Market Research), Perplexity for other phases. Good balance of speed and depth.',
    icon: <RESEARCH_ICONS.balanced size={20} />,
  },
  comprehensive: {
    label: 'Comprehensive',
    description: 'Uses Deep Research for all major phases. Most thorough analysis but takes longer (up to 60 minutes per query).',
    icon: <RESEARCH_ICONS.comprehensive size={20} />,
  },
};

// Phase metadata
const PHASES: Record<ProjectPhase, { label: string; description: string; order: number }> = {
  market_research: {
    label: 'Market Research',
    description: 'Market analysis, trends, and opportunity assessment',
    order: 1,
  },
  competitive_analysis: {
    label: 'Competitive Analysis',
    description: 'Competitor research and positioning analysis',
    order: 2,
  },
  technical_feasibility: {
    label: 'Technical Feasibility',
    description: 'Technology stack evaluation and implementation viability',
    order: 3,
  },
  architecture_design: {
    label: 'Architecture Design',
    description: 'System design and architectural decisions',
    order: 4,
  },
  risk_assessment: {
    label: 'Risk Assessment',
    description: 'Risk identification and mitigation planning',
    order: 5,
  },
  sprint_planning: {
    label: 'Sprint Planning',
    description: 'Sprint scope and task breakdown',
    order: 6,
  },
};

// Default selected phases
const DEFAULT_PHASES: ProjectPhase[] = [
  'market_research',
  'technical_feasibility',
  'architecture_design',
  'risk_assessment',
];

interface NewProjectWizardProps {
  /** Whether the wizard is open */
  isOpen: boolean;
  /** Callback when wizard is closed (cancelled or completed) */
  onClose: () => void;
  /** Callback when project is created */
  onCreateProject: (config: ProjectConfig) => void;
}

export function NewProjectWizard({ isOpen, onClose, onCreateProject }: NewProjectWizardProps) {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('name');
  const [projectName, setProjectName] = useState('');
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState<ResearchMode>('balanced');
  const [selectedPhases, setSelectedPhases] = useState<Set<ProjectPhase>>(new Set(DEFAULT_PHASES));
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setStep('name');
    setProjectName('');
    setProjectPath(null);
    setResearchMode('balanced');
    setSelectedPhases(new Set(DEFAULT_PHASES));
    setIsCreating(false);
    setError(null);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetWizard();
    onClose();
  }, [resetWizard, onClose]);

  // Select project directory
  const handleSelectDirectory = useCallback(async () => {
    try {
      const result = await window.electronAPI.selectDirectory();
      if (result) {
        setProjectPath(result);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
      setError('Failed to select directory');
    }
  }, []);

  // Toggle phase selection
  const togglePhase = useCallback((phase: ProjectPhase) => {
    setSelectedPhases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(phase)) {
        newSet.delete(phase);
      } else {
        newSet.add(phase);
      }
      return newSet;
    });
  }, []);

  // Select/deselect all phases
  const selectAllPhases = useCallback(() => {
    setSelectedPhases(new Set(Object.keys(PHASES) as ProjectPhase[]));
  }, []);

  const deselectAllPhases = useCallback(() => {
    setSelectedPhases(new Set());
  }, []);

  // Navigation
  const canProceedFromName = projectName.trim().length > 0 && projectPath !== null;
  const canProceedFromMode = true; // Always valid - default is balanced
  const canProceedFromPhases = selectedPhases.size > 0;

  const goNext = useCallback(() => {
    switch (step) {
      case 'name':
        if (canProceedFromName) setStep('research_mode');
        break;
      case 'research_mode':
        if (canProceedFromMode) setStep('phases');
        break;
      case 'phases':
        if (canProceedFromPhases) setStep('confirm');
        break;
    }
  }, [step, canProceedFromName, canProceedFromMode, canProceedFromPhases]);

  const goBack = useCallback(() => {
    switch (step) {
      case 'research_mode':
        setStep('name');
        break;
      case 'phases':
        setStep('research_mode');
        break;
      case 'confirm':
        setStep('phases');
        break;
    }
  }, [step]);

  // Create project
  const handleCreate = useCallback(async () => {
    if (!projectPath || !projectName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      // Sort phases by order
      const sortedPhases = Array.from(selectedPhases).sort(
        (a, b) => PHASES[a].order - PHASES[b].order
      );

      const config: ProjectConfig = {
        name: projectName.trim(),
        path: projectPath,
        researchMode,
        phases: sortedPhases,
      };

      onCreateProject(config);
      handleClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setIsCreating(false);
    }
  }, [projectPath, projectName, researchMode, selectedPhases, onCreateProject, handleClose]);

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-full max-w-2xl mx-4 bg-surface-overlay rounded-xl shadow-2xl overflow-hidden"
    >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-default">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-fg">
                New Project
              </h2>
              <p className="text-sm text-fg-muted">
                {step === 'name' && 'Step 1 of 4: Project Details'}
                {step === 'research_mode' && 'Step 2 of 4: Research Mode'}
                {step === 'phases' && 'Step 3 of 4: Planning Phases'}
                {step === 'confirm' && 'Step 4 of 4: Review & Create'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-fg-muted hover:text-fg rounded-lg hover:bg-surface-hover"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex gap-2">
            {(['name', 'research_mode', 'phases', 'confirm'] as WizardStep[]).map((s, idx) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  (['name', 'research_mode', 'phases', 'confirm'] as WizardStep[]).indexOf(step) >= idx
                    ? 'bg-accent'
                    : 'bg-surface-raised'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Project Name & Location */}
          {step === 'name' && (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium text-fg-secondary mb-2"
                >
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  className="w-full px-4 py-2 rounded-lg border border-border-default bg-input text-fg placeholder-fg-muted focus:ring-2 focus:ring-accent focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-secondary mb-2">
                  Project Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectPath || ''}
                    readOnly
                    placeholder="Select a folder..."
                    className="flex-1 px-4 py-2 rounded-lg border border-border-default bg-input text-fg placeholder-fg-muted"
                  />
                  <button
                    onClick={handleSelectDirectory}
                    className="px-4 py-2 bg-surface-raised text-fg-secondary rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    Browse...
                  </button>
                </div>
                <p className="mt-2 text-xs text-fg-muted">
                  A new folder with the project name will be created at this location
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Research Mode */}
          {step === 'research_mode' && (
            <div className="space-y-4">
              <p className="text-sm text-fg-secondary mb-4">
                Choose how thoroughly you want the AI to research each phase. This affects both speed and depth of analysis.
              </p>

              {(Object.entries(RESEARCH_MODES) as [ResearchMode, typeof RESEARCH_MODES[ResearchMode]][]).map(
                ([mode, { label, description, icon }]) => (
                  <button
                    key={mode}
                    onClick={() => setResearchMode(mode)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      researchMode === mode
                        ? 'border-accent bg-accent-soft'
                        : 'border-border-default hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-fg">
                            {label}
                          </span>
                          {researchMode === mode && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-fg-muted">
                          {description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          )}

          {/* Step 3: Phases */}
          {step === 'phases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-fg-secondary">
                  Select the planning phases to include in your project.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllPhases}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button
                    onClick={deselectAllPhases}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {(Object.entries(PHASES) as [ProjectPhase, typeof PHASES[ProjectPhase]][])
                  .sort((a, b) => a[1].order - b[1].order)
                  .map(([phase, { label, description, order }]) => (
                    <label
                      key={phase}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPhases.has(phase)
                          ? 'border-accent bg-accent-soft'
                          : 'border-border-default hover:border-border-strong'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPhases.has(phase)}
                        onChange={() => togglePhase(phase)}
                        className="mt-1 h-4 w-4 text-accent rounded border-border-default focus:ring-accent"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-fg-muted font-mono">
                            {order}.
                          </span>
                          <span className="font-medium text-fg">
                            {label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-fg-muted">
                          {description}
                        </p>
                      </div>
                    </label>
                  ))}
              </div>

              {selectedPhases.size === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Please select at least one phase to continue.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <p className="text-sm text-fg-secondary">
                Review your project configuration before creating.
              </p>

              <div className="bg-surface-raised rounded-lg p-4 space-y-4">
                {/* Project Name */}
                <div>
                  <dt className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Project Name
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-fg">
                    {projectName}
                  </dd>
                </div>

                {/* Location */}
                <div>
                  <dt className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Location
                  </dt>
                  <dd className="mt-1 text-sm text-fg font-mono text-xs break-all">
                    {projectPath}/{projectName.replace(/\s+/g, '-').toLowerCase()}
                  </dd>
                </div>

                {/* Research Mode */}
                <div>
                  <dt className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Research Mode
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <span className="text-lg">{RESEARCH_MODES[researchMode].icon}</span>
                    <span className="text-sm font-medium text-fg">
                      {RESEARCH_MODES[researchMode].label}
                    </span>
                  </dd>
                </div>

                {/* Phases */}
                <div>
                  <dt className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                    Planning Phases ({selectedPhases.size})
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {Array.from(selectedPhases)
                      .sort((a, b) => PHASES[a].order - PHASES[b].order)
                      .map((phase) => (
                        <span
                          key={phase}
                          className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full"
                        >
                          {PHASES[phase].label}
                        </span>
                      ))}
                  </dd>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-default flex justify-between">
          <button
            onClick={step === 'name' ? handleClose : goBack}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {step === 'name' ? 'Cancel' : 'Back'}
          </button>

          {step !== 'confirm' ? (
            <button
              onClick={goNext}
              disabled={
                (step === 'name' && !canProceedFromName) ||
                (step === 'phases' && !canProceedFromPhases)
              }
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating ? (
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
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          )}
        </div>
    </AnimatedModal>
  );
}

export default NewProjectWizard;
