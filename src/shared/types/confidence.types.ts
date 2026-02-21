export interface ConfidenceBreakdown {
  hedgingScore: number;
  assertionScore: number;
  factualScore: number;
  citationScore: number;
  lengthScore: number;
  questionPenalty: number;
}

export interface ParagraphConfidence {
  paragraphIndex: number;
  text: string;
  confidence: number;
  breakdown: ConfidenceBreakdown;
  isLowConfidence: boolean;
  indicators: string[];
}

export interface DocumentConfidence {
  documentPath?: string;
  overallConfidence: number;
  paragraphs: ParagraphConfidence[];
  lowConfidenceParagraphs: ParagraphConfidence[];
  summary: {
    totalParagraphs: number;
    lowConfidenceCount: number;
    averageConfidence: number;
    lowestConfidence: number;
    highestConfidence: number;
  };
}

export interface ConfidenceScoringConfig {
  lowConfidenceThreshold: number;
  enableTokenProbabilities: boolean;
  weights: {
    hedging: number;
    assertion: number;
    factual: number;
    citation: number;
    length: number;
    question: number;
  };
}

export interface ConfidenceStreamUpdate {
  type: 'paragraph' | 'document';
  paragraphIndex?: number;
  confidence: number;
  isLowConfidence: boolean;
}

export type ReviewItemType = 'low_confidence' | 'unverified_citation' | 'partial_citation';
export type ReviewItemStatus = 'pending' | 'accepted' | 'edited' | 'removed' | 'dismissed';

export interface ReviewItemAction {
  type: 'accept' | 'edit' | 'remove' | 'dismiss';
  timestamp: Date;
  editedText?: string;
  reason?: string;
}

export interface ReviewSource {
  id: string;
  type: 'citation' | 'context' | 'generated';
  title?: string;
  url?: string;
  content: string;
  relevanceScore?: number;
}

export interface LowConfidenceReviewItem {
  id: string;
  type: 'low_confidence';
  documentPath: string;
  paragraphIndex: number;
  originalText: string;
  confidence: number;
  indicators: string[];
  sources: ReviewSource[];
  status: ReviewItemStatus;
  action?: ReviewItemAction;
  createdAt: Date;
  updatedAt: Date;
}

export interface CitationReviewItem {
  id: string;
  type: 'unverified_citation' | 'partial_citation';
  documentPath: string;
  citationId: string;
  citationNumber: number;
  citationTitle: string;
  citationUrl: string;
  verificationStatus: 'unverified' | 'partial' | 'error';
  verificationConfidence: number;
  sources: ReviewSource[];
  usages: Array<{
    claim: string;
    line?: number;
    offset?: number;
  }>;
  status: ReviewItemStatus;
  action?: ReviewItemAction;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewItem = LowConfidenceReviewItem | CitationReviewItem;

export interface DocumentReviewQueue {
  documentPath: string;
  items: ReviewItem[];
  stats: {
    total: number;
    pending: number;
    accepted: number;
    edited: number;
    removed: number;
    dismissed: number;
    lowConfidenceCount: number;
    unverifiedCitationCount: number;
  };
  lastUpdated: Date;
}

export interface ReviewScanOptions {
  confidenceThreshold?: number;
  includePartialCitations?: boolean;
  maxItems?: number;
}
