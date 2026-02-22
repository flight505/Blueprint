import type { Meta, StoryObj } from '@storybook/react';
import { HallucinationDashboard } from './HallucinationDashboard';

// ============================================================================
// Mock Data
// ============================================================================

const mockDocuments = [
  {
    documentPath: '/project/docs/market-research.md',
    documentName: 'market-research.md',
    averageConfidence: 0.88,
    totalParagraphs: 32,
    lowConfidenceParagraphs: 2,
    totalCitations: 18,
    verifiedCitations: 15,
    partialCitations: 2,
    unverifiedCitations: 1,
    verificationRate: 0.83,
    qualityScore: 85,
    lastAnalyzedAt: new Date().toISOString(),
  },
  {
    documentPath: '/project/docs/competitive-analysis.md',
    documentName: 'competitive-analysis.md',
    averageConfidence: 0.72,
    totalParagraphs: 24,
    lowConfidenceParagraphs: 5,
    totalCitations: 12,
    verifiedCitations: 8,
    partialCitations: 3,
    unverifiedCitations: 1,
    verificationRate: 0.67,
    qualityScore: 68,
    lastAnalyzedAt: new Date().toISOString(),
  },
  {
    documentPath: '/project/docs/technical-feasibility.md',
    documentName: 'technical-feasibility.md',
    averageConfidence: 0.95,
    totalParagraphs: 18,
    lowConfidenceParagraphs: 0,
    totalCitations: 8,
    verifiedCitations: 8,
    partialCitations: 0,
    unverifiedCitations: 0,
    verificationRate: 1.0,
    qualityScore: 96,
    lastAnalyzedAt: new Date().toISOString(),
  },
  {
    documentPath: '/project/docs/risk-assessment.md',
    documentName: 'risk-assessment.md',
    averageConfidence: 0.55,
    totalParagraphs: 15,
    lowConfidenceParagraphs: 7,
    totalCitations: 3,
    verifiedCitations: 1,
    partialCitations: 1,
    unverifiedCitations: 1,
    verificationRate: 0.33,
    qualityScore: 42,
    lastAnalyzedAt: new Date().toISOString(),
  },
];

const mockTrendDataPoints = [
  { timestamp: '2026-02-15T00:00:00Z', documentPath: '/project/docs/market-research.md', averageConfidence: 0.72, verificationRate: 0.6, qualityScore: 65 },
  { timestamp: '2026-02-16T00:00:00Z', documentPath: '/project/docs/market-research.md', averageConfidence: 0.75, verificationRate: 0.65, qualityScore: 70 },
  { timestamp: '2026-02-17T00:00:00Z', documentPath: '/project/docs/market-research.md', averageConfidence: 0.78, verificationRate: 0.7, qualityScore: 74 },
  { timestamp: '2026-02-18T00:00:00Z', documentPath: '/project/docs/market-research.md', averageConfidence: 0.8, verificationRate: 0.75, qualityScore: 77 },
  { timestamp: '2026-02-19T00:00:00Z', documentPath: '/project/docs/market-research.md', averageConfidence: 0.82, verificationRate: 0.78, qualityScore: 80 },
  { timestamp: '2026-02-20T00:00:00Z', documentPath: '/project/docs/market-research.md', averageConfidence: 0.85, verificationRate: 0.8, qualityScore: 82 },
  { timestamp: '2026-02-21T00:00:00Z', documentPath: '/project/docs/market-research.md', averageConfidence: 0.88, verificationRate: 0.83, qualityScore: 85 },
];

// Helper to set up Electron API mocks in decorators
function withDashboardMocks(
  metricsOverride?: Record<string, unknown> | null,
  trendOverride?: Record<string, unknown> | null,
) {
  return (Story: React.ComponentType) => {
    // Mock the dashboard API calls
    if (typeof window !== 'undefined' && window.electronAPI) {
      const projectMetrics = metricsOverride === null
        ? { projectPath: '/project', documents: [], overallConfidence: 0, overallVerificationRate: 0, overallQualityScore: 0, totalDocuments: 0, totalParagraphs: 0, totalLowConfidenceParagraphs: 0, totalCitations: 0, totalVerifiedCitations: 0, lastAnalyzedAt: new Date().toISOString() }
        : {
            projectPath: '/project',
            documents: mockDocuments,
            overallConfidence: 0.78,
            overallVerificationRate: 0.71,
            overallQualityScore: 73,
            totalDocuments: 4,
            totalParagraphs: 89,
            totalLowConfidenceParagraphs: 14,
            totalCitations: 41,
            totalVerifiedCitations: 32,
            lastAnalyzedAt: new Date().toISOString(),
            ...metricsOverride,
          };

      const trendData = trendOverride === null
        ? { projectPath: '/project', dataPoints: [], movingAverages: { confidence: 0, verificationRate: 0, qualityScore: 0 } }
        : {
            projectPath: '/project',
            dataPoints: mockTrendDataPoints,
            movingAverages: { confidence: 0.8, verificationRate: 0.73, qualityScore: 76 },
            ...trendOverride,
          };

      window.electronAPI.dashboardGetProjectMetrics = async () => projectMetrics as ReturnType<typeof window.electronAPI.dashboardGetProjectMetrics> extends Promise<infer T> ? T : never;
      window.electronAPI.dashboardGetTrendData = async () => trendData as ReturnType<typeof window.electronAPI.dashboardGetTrendData> extends Promise<infer T> ? T : never;
      window.electronAPI.dashboardExportReport = async () => JSON.stringify(projectMetrics);
      window.electronAPI.readFile = async (path: string) => ({
        path,
        content: '# Mock document content for re-analysis',
        encoding: 'utf-8',
      });
      window.electronAPI.dashboardAnalyzeDocument = async () => mockDocuments[0] as ReturnType<typeof window.electronAPI.dashboardAnalyzeDocument> extends Promise<infer T> ? T : never;
    }

    return (
      <div style={{ height: '600px', display: 'flex' }}>
        <Story />
      </div>
    );
  };
}

/**
 * HallucinationDashboard shows confidence metrics, citation verification rates,
 * quality scores, and trends across project documents.
 *
 * Features:
 * - Summary metric cards with trend indicators
 * - SVG trend chart for quality score history
 * - Document table with confidence and verification progress bars
 * - Export to JSON/CSV
 */
const meta = {
  title: 'Components/Dashboard/HallucinationDashboard',
  component: HallucinationDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Dashboard displaying hallucination metrics, confidence scores, citation verification rates, and quality trends.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof HallucinationDashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Data States
// ============================================================================

/**
 * Dashboard with realistic project metrics and trend data.
 */
export const WithData: Story = {
  args: {
    projectPath: '/project',
  },
  decorators: [withDashboardMocks()],
};

/**
 * Dashboard with high quality scores across all documents.
 */
export const HighQuality: Story = {
  args: {
    projectPath: '/project',
  },
  decorators: [
    withDashboardMocks({
      overallConfidence: 0.92,
      overallVerificationRate: 0.95,
      overallQualityScore: 94,
      totalLowConfidenceParagraphs: 1,
      documents: [mockDocuments[2]], // technical-feasibility (96 score)
    }),
  ],
};

/**
 * Dashboard with low quality scores indicating issues.
 */
export const LowQuality: Story = {
  args: {
    projectPath: '/project',
  },
  decorators: [
    withDashboardMocks({
      overallConfidence: 0.52,
      overallVerificationRate: 0.35,
      overallQualityScore: 41,
      totalLowConfidenceParagraphs: 12,
      documents: [mockDocuments[3]], // risk-assessment (42 score)
    }),
  ],
};

// ============================================================================
// Empty & Error States
// ============================================================================

/**
 * No project selected — shows prompt to open a project.
 */
export const NoProject: Story = {
  args: {
    projectPath: null,
  },
};

/**
 * Project selected but no documents analyzed yet.
 */
export const NoData: Story = {
  args: {
    projectPath: '/project',
  },
  decorators: [withDashboardMocks(null, null)],
};

/**
 * Error state with retry option.
 */
export const ErrorState: Story = {
  args: {
    projectPath: '/project',
  },
  decorators: [
    (Story) => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.dashboardGetProjectMetrics = async () => {
          throw new Error('Failed to connect to metrics database');
        };
        window.electronAPI.dashboardGetTrendData = async () => {
          throw new Error('Failed to connect to metrics database');
        };
      }
      return (
        <div style={{ height: '400px', display: 'flex' }}>
          <Story />
        </div>
      );
    },
  ],
};
