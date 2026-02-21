import type { ResearchMode, ProjectPhase } from './research.types';

export interface DocumentMetrics {
  documentPath: string;
  documentName: string;
  averageConfidence: number;
  totalParagraphs: number;
  lowConfidenceParagraphs: number;
  totalCitations: number;
  verifiedCitations: number;
  partialCitations: number;
  unverifiedCitations: number;
  verificationRate: number;
  qualityScore: number;
  lastAnalyzedAt: string;
}

export interface ProjectMetrics {
  projectPath: string;
  documents: DocumentMetrics[];
  overallConfidence: number;
  overallVerificationRate: number;
  overallQualityScore: number;
  totalDocuments: number;
  totalParagraphs: number;
  totalLowConfidenceParagraphs: number;
  totalCitations: number;
  totalVerifiedCitations: number;
  lastAnalyzedAt: string;
}

export interface TrendDataPoint {
  timestamp: string;
  documentPath: string;
  averageConfidence: number;
  verificationRate: number;
  qualityScore: number;
}

export interface TrendData {
  projectPath: string;
  dataPoints: TrendDataPoint[];
  movingAverages: {
    confidence: number;
    verificationRate: number;
    qualityScore: number;
  };
}

export interface DashboardExportOptions {
  format: 'json' | 'csv';
  includeTrends: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PDFGenerationOptions {
  includeToc?: boolean;
  includeCoverPage?: boolean;
  coverPage?: CoverPageMetadata;
  includeCitations?: boolean;
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  outputDir?: string;
  outputFilename?: string;
  pageSize?: 'a4' | 'letter' | 'legal';
  margin?: string;
  fontSize?: number;
  customCss?: string;
  pageNumbers?: boolean;
  pdfMetadata?: PDFMetadata;
}

export interface CoverPageMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
  logo?: string;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
}

export interface PDFGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  pageCount?: number;
}

export interface PDFSection {
  title: string;
  content: string;
  order: number;
  includeInToc?: boolean;
}

export interface DOCXGenerationOptions {
  includeToc?: boolean;
  includeCoverPage?: boolean;
  coverPage?: DOCXCoverPageMetadata;
  includeCitations?: boolean;
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  outputDir?: string;
  outputFilename?: string;
  documentMetadata?: DOCXMetadata;
  fontFamily?: string;
  fontSize?: number;
  pageSize?: 'a4' | 'letter' | 'legal';
}

export interface DOCXCoverPageMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
}

export interface DOCXMetadata {
  title?: string;
  author?: string;
  subject?: string;
  description?: string;
  keywords?: string[];
  creator?: string;
}

export interface DOCXGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface DOCXSection {
  title: string;
  content: string;
  order: number;
}

export interface PPTXTheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export interface PPTXGenerationOptions {
  theme?: string | PPTXTheme;
  includeTitleSlide?: boolean;
  titleSlide?: PPTXTitleSlideMetadata;
  includeCitations?: boolean;
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  outputDir?: string;
  outputFilename?: string;
  metadata?: PPTXMetadata;
  slideSize?: '16:9' | '4:3';
  maxBulletsPerSlide?: number;
}

export interface PPTXTitleSlideMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
}

export interface PPTXMetadata {
  title?: string;
  author?: string;
  subject?: string;
  company?: string;
  keywords?: string[];
}

export interface PPTXGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  slideCount?: number;
}

export interface PPTXSection {
  title: string;
  content: string;
  order: number;
}

export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused' | 'skipped';
export type OrchestrationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'waiting_for_approval';

export interface PhaseState {
  phase: ProjectPhase;
  status: PhaseStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  output?: string;
  progress: number;
}

export interface ProjectExecutionState {
  projectId: string;
  projectName: string;
  projectPath: string;
  researchMode: ResearchMode;
  phases: PhaseState[];
  currentPhaseIndex: number;
  status: OrchestrationStatus;
  startedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
  /** Phase awaiting approval (if status is 'waiting_for_approval') */
  awaitingApprovalPhaseIndex?: number;
}

export interface PhaseOrchestratorConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  researchMode: ResearchMode;
  phases: ProjectPhase[];
}

export interface CheckpointData {
  id: string;
  projectId: string;
  projectPath: string;
  projectName: string;
  executionState: ProjectExecutionState;
  createdAt: string;
  updatedAt: string;
}

export type ImageEditorMimeType = 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/gif' | 'image/webp';

export interface ImageEditRequest {
  /** Base64-encoded image data (without data URL prefix) */
  imageBase64: string;
  /** MIME type of the image */
  mimeType: ImageEditorMimeType;
  /** Natural language editing instructions */
  instructions: string;
}

export interface ImageEditResponse {
  /** Whether the operation succeeded */
  success: boolean;
  /** Generated image as base64 data URL (data:image/png;base64,...) */
  generatedImage: string | null;
  /** AI response text (explanation or commentary) */
  responseText: string | null;
  /** Error message if failed */
  error?: string;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

export interface ImageEditHistoryItem {
  id: string;
  projectId: string;
  /** Base64 data URL of the image */
  imageDataUrl: string;
  /** The prompt used for this edit */
  prompt: string;
  /** AI response text */
  responseText: string | null;
  /** Timestamp of the edit */
  createdAt: number;
}

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  downloading: boolean;
  error: string | null;
  progress: number;
  updateInfo: UpdateInfo | null;
}

export interface UpdateInfo {
  version: string;
  files: Array<{
    url: string;
    sha512: string;
    size: number;
  }>;
  path?: string;
  sha512?: string;
  releaseDate: string;
  releaseName?: string;
  releaseNotes?: string | Array<{ version: string; note: string }>;
}

export interface UpdateProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export type UpdateEventType =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error';

export interface UpdateEvent {
  type: UpdateEventType;
  data?: UpdateInfo | UpdateProgressInfo | Error;
}
