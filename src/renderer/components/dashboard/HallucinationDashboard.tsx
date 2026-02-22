import { useState, useEffect, useCallback } from 'react';
import type {
  ProjectMetrics,
  TrendData,
  TrendDataPoint,
  DocumentMetrics,
  DashboardExportOptions,
} from '../../../preload';

interface HallucinationDashboardProps {
  projectPath?: string | null;
}

/**
 * Quality score badge with color coding
 */
function QualityBadge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (s >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(score)}`}
    >
      {score}
    </span>
  );
}

/**
 * Progress bar component for metrics
 */
function ProgressBar({
  value,
  max = 100,
  color = 'blue',
  showLabel = true,
}: {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  showLabel?: boolean;
}) {
  const percentage = Math.round((value / max) * 100);
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-fg-muted w-10 text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}

/**
 * Metric card component
 */
function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
}) {
  const trendIcons = {
    up: { symbol: '\u2191', color: 'text-green-500' },
    down: { symbol: '\u2193', color: 'text-red-500' },
    stable: { symbol: '\u2192', color: 'text-fg-muted' },
  };

  return (
    <div className="bg-surface-raised rounded-lg border border-border-default p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg-muted">{title}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-fg">{value}</span>
        {trend && (
          <span className={trendIcons[trend].color}>
            {trendIcons[trend].symbol}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-fg-muted">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * Simple trend chart using SVG
 */
function TrendChart({ data, height = 100 }: { data: TrendDataPoint[]; height?: number }) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-fg-muted text-sm"
        style={{ height }}
      >
        Not enough data for trend chart
      </div>
    );
  }

  const width = 300;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Get quality scores
  const scores = data.map((d) => d.qualityScore);
  const maxScore = 100;
  const minScore = 0;

  // Generate path
  const points = scores.map((score, i) => {
    const x = padding + (i / (scores.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;

  // Create area path (for fill under line)
  const areaPath = `${linePath} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: height }}
      role="img"
      aria-label="Quality score trend chart"
    >
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padding + chartHeight - (v / 100) * chartHeight;
        return (
          <g key={v}>
            <line
              x1={padding}
              y1={y}
              x2={padding + chartWidth}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="4"
            />
            <text
              x={padding - 5}
              y={y + 4}
              textAnchor="end"
              className="text-[8px] fill-fg-muted"
            >
              {v}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path
        d={areaPath}
        fill="url(#areaGradient)"
        opacity={0.3}
      />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(59, 130, 246)" />
          <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="rgb(59, 130, 246)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {scores.map((score, i) => {
        const x = padding + (i / (scores.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            fill="rgb(59, 130, 246)"
            stroke="white"
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}

/**
 * Document row in the documents table
 */
function DocumentRow({ doc, onAnalyze }: { doc: DocumentMetrics; onAnalyze?: (path: string) => void }) {
  const confidenceColor =
    doc.averageConfidence >= 0.8 ? 'green' : doc.averageConfidence >= 0.6 ? 'yellow' : 'red';
  const verificationColor =
    doc.verificationRate >= 0.8 ? 'green' : doc.verificationRate >= 0.6 ? 'yellow' : 'red';

  return (
    <tr className="hover:bg-surface-hover">
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fg truncate max-w-[150px]">
            {doc.documentName}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <ProgressBar
          value={doc.averageConfidence * 100}
          color={confidenceColor}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <ProgressBar
          value={doc.verificationRate * 100}
          color={verificationColor}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-center">
        <QualityBadge score={doc.qualityScore} />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        <button
          onClick={() => onAnalyze?.(doc.documentPath)}
          className="text-xs text-accent hover:underline"
          aria-label={`Re-analyze ${doc.documentName}`}
        >
          Re-analyze
        </button>
      </td>
    </tr>
  );
}

/**
 * HallucinationDashboard component
 * Shows hallucination metrics, citation verification rates, and trends
 */
export function HallucinationDashboard({ projectPath }: HallucinationDashboardProps) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project metrics
  const loadMetrics = useCallback(async () => {
    if (!projectPath) {
      setMetrics(null);
      setTrendData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [projectMetrics, trends] = await Promise.all([
        window.electronAPI.dashboardGetProjectMetrics(projectPath),
        window.electronAPI.dashboardGetTrendData(projectPath),
      ]);

      setMetrics(projectMetrics);
      setTrendData(trends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  // Load metrics on mount and when project changes
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Handle document re-analysis
  const handleAnalyzeDocument = useCallback(
    async (documentPath: string) => {
      if (!projectPath) return;

      try {
        // Read the document content
        const content = await window.electronAPI.readFile(documentPath);
        if (!content.content) return;

        // Analyze the document
        await window.electronAPI.dashboardAnalyzeDocument(
          documentPath,
          projectPath,
          content.content
        );

        // Reload metrics
        await loadMetrics();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze document');
      }
    },
    [projectPath, loadMetrics]
  );

  // Export report
  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      if (!projectPath) return;

      setIsExporting(true);

      try {
        const options: DashboardExportOptions = {
          format,
          includeTrends: true,
        };

        const report = await window.electronAPI.dashboardExportReport(projectPath, options);

        // Create a blob and download
        const blob = new Blob([report], {
          type: format === 'json' ? 'application/json' : 'text/csv',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hallucination-report.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export report');
      } finally {
        setIsExporting(false);
      }
    },
    [projectPath]
  );

  // No project selected
  if (!projectPath) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-fg-muted">
          <p className="text-sm font-medium mb-1">No project selected</p>
          <p className="text-xs">Open a project to view hallucination metrics</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && !metrics) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-fg-muted">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading metrics...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={loadMetrics}
          className="text-sm text-accent hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // No data yet
  if (!metrics || metrics.totalDocuments === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-fg-muted">
          <p className="text-sm font-medium mb-1">No documents analyzed yet</p>
          <p className="text-xs">Open documents and analyze them to see metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* Header with export buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">
          Hallucination Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-medium bg-surface-raised text-fg-secondary rounded hover:bg-surface-hover disabled:opacity-50 transition-colors"
            aria-label="Export as JSON"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-medium bg-surface-raised text-fg-secondary rounded hover:bg-surface-hover disabled:opacity-50 transition-colors"
            aria-label="Export as CSV"
          >
            Export CSV
          </button>
          <button
            onClick={loadMetrics}
            disabled={isLoading}
            className="p-1.5 text-fg-muted hover:text-fg disabled:opacity-50"
            aria-label="Refresh metrics"
          >
            {/* Refresh icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Quality Score"
          value={metrics.overallQualityScore}
          subtitle="Composite of confidence and verification"
          icon={metrics.overallQualityScore >= 80 ? '\u2705' : metrics.overallQualityScore >= 60 ? '\u26A0\uFE0F' : '\u274C'}
        />
        <MetricCard
          title="Avg Confidence"
          value={`${Math.round(metrics.overallConfidence * 100)}%`}
          subtitle={`${metrics.totalLowConfidenceParagraphs} low-confidence paragraphs`}
          trend={
            trendData?.movingAverages.confidence
              ? trendData.movingAverages.confidence > metrics.overallConfidence
                ? 'down'
                : trendData.movingAverages.confidence < metrics.overallConfidence
                ? 'up'
                : 'stable'
              : undefined
          }
        />
        <MetricCard
          title="Citation Rate"
          value={`${Math.round(metrics.overallVerificationRate * 100)}%`}
          subtitle={`${metrics.totalVerifiedCitations}/${metrics.totalCitations} verified`}
        />
        <MetricCard
          title="Documents"
          value={metrics.totalDocuments}
          subtitle={`${metrics.totalParagraphs} total paragraphs`}
        />
      </div>

      {/* Trend chart */}
      {trendData && trendData.dataPoints.length > 0 && (
        <div className="bg-surface-raised rounded-lg border border-border-default p-4">
          <h3 className="text-sm font-medium text-fg-secondary mb-3">
            Quality Score Trend
          </h3>
          <TrendChart data={trendData.dataPoints} height={120} />
          <div className="mt-2 flex items-center justify-center gap-6 text-xs text-fg-muted">
            <span>7-day average: {Math.round(trendData.movingAverages.qualityScore)}</span>
          </div>
        </div>
      )}

      {/* Documents table */}
      <div className="bg-surface-raised rounded-lg border border-border-default overflow-hidden">
        <div className="px-4 py-3 border-b border-border-default">
          <h3 className="text-sm font-medium text-fg-secondary">
            Document Details
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Document
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Verification
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Score
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {metrics.documents.map((doc) => (
                <DocumentRow
                  key={doc.documentPath}
                  doc={doc}
                  onAnalyze={handleAnalyzeDocument}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last updated timestamp */}
      <div className="text-center text-xs text-fg-muted">
        Last analyzed: {new Date(metrics.lastAnalyzedAt).toLocaleString()}
      </div>
    </div>
  );
}

export default HallucinationDashboard;
