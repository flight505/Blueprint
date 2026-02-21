/**
 * HallucinationDashboardService - Aggregates hallucination and verification metrics
 *
 * Provides:
 * - Per-document confidence scores (average of paragraphs)
 * - Citation verification rates (verified/total)
 * - Trend data for multi-document projects
 * - Verification report export (JSON/CSV)
 */

import { app } from 'electron';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { confidenceScoringService } from './ConfidenceScoringService';
import { citationVerificationService, CitationQuery } from './CitationVerificationService';
import { citationManager, Citation } from './CitationManager';
import type {
  DocumentMetrics,
  ProjectMetrics,
  TrendDataPoint,
  TrendData,
  DashboardExportOptions,
} from '../../shared/types';

// Re-export for consumers
export type {
  DocumentMetrics,
  ProjectMetrics,
  TrendDataPoint,
  TrendData,
  DashboardExportOptions,
} from '../../shared/types';

// ==================== Service-specific Types ====================

// Local alias for backward compatibility
export type ExportOptions = DashboardExportOptions;

export interface VerificationReport {
  generatedAt: string;
  projectPath: string;
  projectMetrics: ProjectMetrics;
  documents: DocumentMetrics[];
  trendData: TrendDataPoint[];
}

// ==================== Service Implementation ====================

class HallucinationDashboardService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'hallucination-metrics.db');
  }

  /**
   * Initialize the database
   */
  initialize(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_metrics (
        id TEXT PRIMARY KEY,
        document_path TEXT NOT NULL,
        project_path TEXT NOT NULL,
        document_name TEXT NOT NULL,
        average_confidence REAL NOT NULL,
        total_paragraphs INTEGER NOT NULL,
        low_confidence_paragraphs INTEGER NOT NULL,
        total_citations INTEGER NOT NULL,
        verified_citations INTEGER NOT NULL,
        partial_citations INTEGER NOT NULL,
        unverified_citations INTEGER NOT NULL,
        verification_rate REAL NOT NULL,
        quality_score REAL NOT NULL,
        analyzed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trend_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_path TEXT NOT NULL,
        project_path TEXT NOT NULL,
        average_confidence REAL NOT NULL,
        verification_rate REAL NOT NULL,
        quality_score REAL NOT NULL,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_doc_metrics_project ON document_metrics(project_path);
      CREATE INDEX IF NOT EXISTS idx_doc_metrics_path ON document_metrics(document_path);
      CREATE INDEX IF NOT EXISTS idx_trend_project ON trend_history(project_path);
      CREATE INDEX IF NOT EXISTS idx_trend_recorded ON trend_history(recorded_at);
    `);

    console.log(`HallucinationDashboardService initialized at ${this.dbPath}`);
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Analyze a single document and compute metrics
   */
  async analyzeDocument(
    documentPath: string,
    projectPath: string,
    content: string
  ): Promise<DocumentMetrics> {
    // Get confidence analysis
    const confidenceResult = confidenceScoringService.computeDocumentConfidence(
      content,
      documentPath
    );

    // Get citations for this document
    const citations = await this.getCitationsForDocument(documentPath);

    // Verify citations and compute rates
    const citationStats = await this.computeCitationStats(citations);

    // Compute quality score (weighted: 60% confidence, 40% verification rate)
    const qualityScore = this.computeQualityScore(
      confidenceResult.summary.averageConfidence,
      citationStats.verificationRate
    );

    const documentName = path.basename(documentPath);
    const now = new Date().toISOString();

    const metrics: DocumentMetrics = {
      documentPath,
      documentName,
      averageConfidence: confidenceResult.summary.averageConfidence,
      totalParagraphs: confidenceResult.summary.totalParagraphs,
      lowConfidenceParagraphs: confidenceResult.summary.lowConfidenceCount,
      totalCitations: citationStats.total,
      verifiedCitations: citationStats.verified,
      partialCitations: citationStats.partial,
      unverifiedCitations: citationStats.unverified,
      verificationRate: citationStats.verificationRate,
      qualityScore,
      lastAnalyzedAt: now,
    };

    // Store in database
    this.storeDocumentMetrics(metrics, projectPath);

    // Record trend point
    this.recordTrendPoint(metrics, projectPath);

    return metrics;
  }

  /**
   * Get metrics for a single document
   */
  getDocumentMetrics(documentPath: string): DocumentMetrics | null {
    if (!this.db) return null;

    const stmt = this.db.prepare(`
      SELECT * FROM document_metrics
      WHERE document_path = ?
      ORDER BY analyzed_at DESC
      LIMIT 1
    `);

    const row = stmt.get(documentPath) as Record<string, unknown> | undefined;
    if (!row) return null;

    return this.rowToDocumentMetrics(row);
  }

  /**
   * Get metrics for all documents in a project
   */
  getProjectMetrics(projectPath: string): ProjectMetrics {
    if (!this.db) {
      return this.emptyProjectMetrics(projectPath);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM document_metrics
      WHERE project_path = ?
      ORDER BY analyzed_at DESC
    `);

    const rows = stmt.all(projectPath) as Record<string, unknown>[];

    // Deduplicate by document_path (keep most recent)
    const documentMap = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const docPath = row.document_path as string;
      if (!documentMap.has(docPath)) {
        documentMap.set(docPath, row);
      }
    }

    const documents = Array.from(documentMap.values()).map(row =>
      this.rowToDocumentMetrics(row)
    );

    return this.computeProjectMetrics(projectPath, documents);
  }

  /**
   * Get trend data for a project
   */
  getTrendData(projectPath: string, startDate?: string, endDate?: string): TrendData {
    if (!this.db) {
      return { projectPath, dataPoints: [], movingAverages: { confidence: 0, verificationRate: 0, qualityScore: 0 } };
    }

    let query = `
      SELECT document_path, average_confidence, verification_rate, quality_score, recorded_at
      FROM trend_history
      WHERE project_path = ?
    `;
    const params: (string | undefined)[] = [projectPath];

    if (startDate) {
      query += ' AND recorded_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND recorded_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY recorded_at ASC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params.filter(Boolean)) as Record<string, unknown>[];

    const dataPoints: TrendDataPoint[] = rows.map(row => ({
      timestamp: row.recorded_at as string,
      documentPath: row.document_path as string,
      averageConfidence: row.average_confidence as number,
      verificationRate: row.verification_rate as number,
      qualityScore: row.quality_score as number,
    }));

    // Compute 7-day moving averages
    const movingAverages = this.computeMovingAverages(dataPoints);

    return { projectPath, dataPoints, movingAverages };
  }

  /**
   * Export verification report
   */
  exportReport(projectPath: string, options: ExportOptions): string {
    const projectMetrics = this.getProjectMetrics(projectPath);
    const trendData = options.includeTrends
      ? this.getTrendData(projectPath, options.startDate, options.endDate)
      : { projectPath, dataPoints: [], movingAverages: { confidence: 0, verificationRate: 0, qualityScore: 0 } };

    const report: VerificationReport = {
      generatedAt: new Date().toISOString(),
      projectPath,
      projectMetrics,
      documents: projectMetrics.documents,
      trendData: trendData.dataPoints,
    };

    if (options.format === 'json') {
      return JSON.stringify(report, null, 2);
    }

    // CSV format
    return this.reportToCSV(report);
  }

  /**
   * Clear metrics for a project
   */
  clearProjectMetrics(projectPath: string): number {
    if (!this.db) return 0;

    const stmtMetrics = this.db.prepare('DELETE FROM document_metrics WHERE project_path = ?');
    const stmtTrend = this.db.prepare('DELETE FROM trend_history WHERE project_path = ?');

    const result1 = stmtMetrics.run(projectPath);
    const result2 = stmtTrend.run(projectPath);

    return result1.changes + result2.changes;
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): number {
    if (!this.db) return 0;

    const stmtMetrics = this.db.prepare('DELETE FROM document_metrics');
    const stmtTrend = this.db.prepare('DELETE FROM trend_history');

    const result1 = stmtMetrics.run();
    const result2 = stmtTrend.run();

    return result1.changes + result2.changes;
  }

  // ==================== Private Helper Methods ====================

  private async getCitationsForDocument(documentPath: string): Promise<Citation[]> {
    try {
      const citationFile = await citationManager.loadCitations(documentPath);
      return citationFile.citations;
    } catch {
      return [];
    }
  }

  private async computeCitationStats(citations: Citation[]): Promise<{
    total: number;
    verified: number;
    partial: number;
    unverified: number;
    verificationRate: number;
  }> {
    if (citations.length === 0) {
      return { total: 0, verified: 0, partial: 0, unverified: 0, verificationRate: 1.0 };
    }

    let verified = 0;
    let partial = 0;
    let unverified = 0;

    for (const citation of citations) {
      const query: CitationQuery = {
        title: citation.title,
        authors: citation.authors,
        url: citation.url,
      };

      try {
        const result = await citationVerificationService.verifyCitation(query);
        switch (result.status) {
          case 'verified':
            verified++;
            break;
          case 'partial':
            partial++;
            break;
          case 'unverified':
          case 'error':
            unverified++;
            break;
        }
      } catch {
        unverified++;
      }
    }

    const total = citations.length;
    // Verification rate: verified = 1.0, partial = 0.5, unverified = 0
    const verificationRate = total > 0
      ? (verified + partial * 0.5) / total
      : 1.0;

    return { total, verified, partial, unverified, verificationRate };
  }

  private computeQualityScore(confidence: number, verificationRate: number): number {
    // Quality score: 60% confidence, 40% verification rate, scaled to 0-100
    return Math.round((confidence * 0.6 + verificationRate * 0.4) * 100);
  }

  private storeDocumentMetrics(metrics: DocumentMetrics, projectPath: string): void {
    if (!this.db) return;

    const id = `${metrics.documentPath}_${Date.now()}`;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO document_metrics (
        id, document_path, project_path, document_name,
        average_confidence, total_paragraphs, low_confidence_paragraphs,
        total_citations, verified_citations, partial_citations, unverified_citations,
        verification_rate, quality_score, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      metrics.documentPath,
      projectPath,
      metrics.documentName,
      metrics.averageConfidence,
      metrics.totalParagraphs,
      metrics.lowConfidenceParagraphs,
      metrics.totalCitations,
      metrics.verifiedCitations,
      metrics.partialCitations,
      metrics.unverifiedCitations,
      metrics.verificationRate,
      metrics.qualityScore,
      metrics.lastAnalyzedAt
    );
  }

  private recordTrendPoint(metrics: DocumentMetrics, projectPath: string): void {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO trend_history (
        document_path, project_path, average_confidence,
        verification_rate, quality_score
      ) VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      metrics.documentPath,
      projectPath,
      metrics.averageConfidence,
      metrics.verificationRate,
      metrics.qualityScore
    );
  }

  private rowToDocumentMetrics(row: Record<string, unknown>): DocumentMetrics {
    return {
      documentPath: row.document_path as string,
      documentName: row.document_name as string,
      averageConfidence: row.average_confidence as number,
      totalParagraphs: row.total_paragraphs as number,
      lowConfidenceParagraphs: row.low_confidence_paragraphs as number,
      totalCitations: row.total_citations as number,
      verifiedCitations: row.verified_citations as number,
      partialCitations: row.partial_citations as number,
      unverifiedCitations: row.unverified_citations as number,
      verificationRate: row.verification_rate as number,
      qualityScore: row.quality_score as number,
      lastAnalyzedAt: row.analyzed_at as string,
    };
  }

  private computeProjectMetrics(projectPath: string, documents: DocumentMetrics[]): ProjectMetrics {
    if (documents.length === 0) {
      return this.emptyProjectMetrics(projectPath);
    }

    let totalParagraphs = 0;
    let totalLowConfidenceParagraphs = 0;
    let totalCitations = 0;
    let totalVerifiedCitations = 0;
    let weightedConfidence = 0;
    let weightedVerification = 0;

    for (const doc of documents) {
      totalParagraphs += doc.totalParagraphs;
      totalLowConfidenceParagraphs += doc.lowConfidenceParagraphs;
      totalCitations += doc.totalCitations;
      totalVerifiedCitations += doc.verifiedCitations;

      // Weight by number of paragraphs
      weightedConfidence += doc.averageConfidence * doc.totalParagraphs;
      weightedVerification += doc.verificationRate * doc.totalCitations;
    }

    const overallConfidence = totalParagraphs > 0
      ? weightedConfidence / totalParagraphs
      : 0;

    const overallVerificationRate = totalCitations > 0
      ? weightedVerification / totalCitations
      : 1.0;

    const overallQualityScore = this.computeQualityScore(
      overallConfidence,
      overallVerificationRate
    );

    const lastAnalyzedAt = documents.reduce((latest, doc) => {
      return doc.lastAnalyzedAt > latest ? doc.lastAnalyzedAt : latest;
    }, documents[0].lastAnalyzedAt);

    return {
      projectPath,
      documents,
      overallConfidence,
      overallVerificationRate,
      overallQualityScore,
      totalDocuments: documents.length,
      totalParagraphs,
      totalLowConfidenceParagraphs,
      totalCitations,
      totalVerifiedCitations,
      lastAnalyzedAt,
    };
  }

  private emptyProjectMetrics(projectPath: string): ProjectMetrics {
    return {
      projectPath,
      documents: [],
      overallConfidence: 0,
      overallVerificationRate: 0,
      overallQualityScore: 0,
      totalDocuments: 0,
      totalParagraphs: 0,
      totalLowConfidenceParagraphs: 0,
      totalCitations: 0,
      totalVerifiedCitations: 0,
      lastAnalyzedAt: new Date().toISOString(),
    };
  }

  private computeMovingAverages(dataPoints: TrendDataPoint[]): {
    confidence: number;
    verificationRate: number;
    qualityScore: number;
  } {
    if (dataPoints.length === 0) {
      return { confidence: 0, verificationRate: 0, qualityScore: 0 };
    }

    // Get last 7 days of data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentData = dataPoints.filter(
      dp => new Date(dp.timestamp) >= sevenDaysAgo
    );

    if (recentData.length === 0) {
      // Fall back to all data if no recent data
      const all = dataPoints;
      return {
        confidence: all.reduce((sum, dp) => sum + dp.averageConfidence, 0) / all.length,
        verificationRate: all.reduce((sum, dp) => sum + dp.verificationRate, 0) / all.length,
        qualityScore: all.reduce((sum, dp) => sum + dp.qualityScore, 0) / all.length,
      };
    }

    return {
      confidence: recentData.reduce((sum, dp) => sum + dp.averageConfidence, 0) / recentData.length,
      verificationRate: recentData.reduce((sum, dp) => sum + dp.verificationRate, 0) / recentData.length,
      qualityScore: recentData.reduce((sum, dp) => sum + dp.qualityScore, 0) / recentData.length,
    };
  }

  private reportToCSV(report: VerificationReport): string {
    const lines: string[] = [];

    // Header with project summary
    lines.push('# Hallucination Verification Report');
    lines.push(`# Generated: ${report.generatedAt}`);
    lines.push(`# Project: ${report.projectPath}`);
    lines.push('');

    // Project summary section
    lines.push('## Project Summary');
    lines.push('Metric,Value');
    lines.push(`Overall Confidence,${(report.projectMetrics.overallConfidence * 100).toFixed(1)}%`);
    lines.push(`Overall Verification Rate,${(report.projectMetrics.overallVerificationRate * 100).toFixed(1)}%`);
    lines.push(`Quality Score,${report.projectMetrics.overallQualityScore}`);
    lines.push(`Total Documents,${report.projectMetrics.totalDocuments}`);
    lines.push(`Total Paragraphs,${report.projectMetrics.totalParagraphs}`);
    lines.push(`Low Confidence Paragraphs,${report.projectMetrics.totalLowConfidenceParagraphs}`);
    lines.push(`Total Citations,${report.projectMetrics.totalCitations}`);
    lines.push(`Verified Citations,${report.projectMetrics.totalVerifiedCitations}`);
    lines.push('');

    // Document details
    lines.push('## Document Details');
    lines.push('Document,Confidence,Paragraphs,Low Confidence,Citations,Verified,Partial,Unverified,Verification Rate,Quality Score,Last Analyzed');
    for (const doc of report.documents) {
      lines.push([
        doc.documentName,
        `${(doc.averageConfidence * 100).toFixed(1)}%`,
        doc.totalParagraphs,
        doc.lowConfidenceParagraphs,
        doc.totalCitations,
        doc.verifiedCitations,
        doc.partialCitations,
        doc.unverifiedCitations,
        `${(doc.verificationRate * 100).toFixed(1)}%`,
        doc.qualityScore,
        doc.lastAnalyzedAt,
      ].join(','));
    }
    lines.push('');

    // Trend data if included
    if (report.trendData.length > 0) {
      lines.push('## Trend Data');
      lines.push('Timestamp,Document,Confidence,Verification Rate,Quality Score');
      for (const point of report.trendData) {
        lines.push([
          point.timestamp,
          point.documentPath,
          `${(point.averageConfidence * 100).toFixed(1)}%`,
          `${(point.verificationRate * 100).toFixed(1)}%`,
          point.qualityScore,
        ].join(','));
      }
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const hallucinationDashboardService = new HallucinationDashboardService();

// Export types and class
export { HallucinationDashboardService };
