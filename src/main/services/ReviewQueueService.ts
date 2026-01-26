/**
 * ReviewQueueService - Aggregates flagged content for human review
 *
 * Features:
 * - Auto-flags low-confidence sections (<0.6 threshold)
 * - Flags unverified citations for review
 * - Provides review interface data with original + sources side-by-side
 * - Accept/Edit/Remove actions for each flagged item
 */

import { confidenceScoringService, ParagraphConfidence, DocumentConfidence } from './ConfidenceScoringService';
import { citationVerificationService } from './CitationVerificationService';
import { citationManager } from './CitationManager';

// Review item types
export type ReviewItemType = 'low_confidence' | 'unverified_citation' | 'partial_citation';

export type ReviewItemStatus = 'pending' | 'accepted' | 'edited' | 'removed' | 'dismissed';

export interface ReviewItemAction {
  type: 'accept' | 'edit' | 'remove' | 'dismiss';
  timestamp: Date;
  editedText?: string;
  reason?: string;
}

/**
 * Review item for low-confidence content
 */
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

/**
 * Review item for unverified/partial citations
 */
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

/**
 * Source information for side-by-side comparison
 */
export interface ReviewSource {
  id: string;
  type: 'citation' | 'context' | 'generated';
  title?: string;
  url?: string;
  content: string;
  relevanceScore?: number;
}

/**
 * Review queue for a document
 */
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

/**
 * Options for scanning a document
 */
export interface ReviewScanOptions {
  confidenceThreshold?: number;
  includePartialCitations?: boolean;
  maxItems?: number;
}

/**
 * Service for managing the human review queue
 */
class ReviewQueueService {
  private queues: Map<string, DocumentReviewQueue> = new Map();
  private confidenceThreshold: number = 0.6;

  constructor() {
    // Initialize with default threshold from ConfidenceScoringService
    this.confidenceThreshold = confidenceScoringService.getLowConfidenceThreshold();
  }

  /**
   * Set the confidence threshold for flagging content
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.confidenceThreshold = threshold;
  }

  /**
   * Get the current confidence threshold
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  /**
   * Scan a document and create/update its review queue
   */
  async scanDocument(
    documentPath: string,
    content: string,
    options: ReviewScanOptions = {}
  ): Promise<DocumentReviewQueue> {
    const threshold = options.confidenceThreshold ?? this.confidenceThreshold;
    const includePartial = options.includePartialCitations ?? true;
    const maxItems = options.maxItems ?? 100;

    const items: ReviewItem[] = [];
    const now = new Date();

    // 1. Scan for low-confidence paragraphs
    const docConfidence = confidenceScoringService.computeDocumentConfidence(content, documentPath);
    const lowConfidenceItems = this.createLowConfidenceItems(
      documentPath,
      docConfidence,
      threshold,
      now
    );
    items.push(...lowConfidenceItems);

    // 2. Scan for unverified/partial citations
    try {
      const citationItems = await this.createCitationItems(
        documentPath,
        includePartial,
        now
      );
      items.push(...citationItems);
    } catch (error) {
      console.error('Failed to scan citations:', error);
      // Continue without citation items
    }

    // Sort by priority: unverified citations first, then low confidence by score (ascending)
    items.sort((a, b) => {
      // Priority: unverified_citation > partial_citation > low_confidence
      const typePriority: Record<ReviewItemType, number> = {
        unverified_citation: 0,
        partial_citation: 1,
        low_confidence: 2,
      };
      if (typePriority[a.type] !== typePriority[b.type]) {
        return typePriority[a.type] - typePriority[b.type];
      }
      // Within same type, sort by confidence (ascending)
      if (a.type === 'low_confidence' && b.type === 'low_confidence') {
        return (a as LowConfidenceReviewItem).confidence - (b as LowConfidenceReviewItem).confidence;
      }
      return 0;
    });

    // Limit items
    const limitedItems = items.slice(0, maxItems);

    // Calculate stats
    const stats = this.calculateStats(limitedItems);

    const queue: DocumentReviewQueue = {
      documentPath,
      items: limitedItems,
      stats,
      lastUpdated: now,
    };

    // Cache the queue
    this.queues.set(documentPath, queue);

    return queue;
  }

  /**
   * Create review items for low-confidence paragraphs
   */
  private createLowConfidenceItems(
    documentPath: string,
    docConfidence: DocumentConfidence,
    threshold: number,
    timestamp: Date
  ): LowConfidenceReviewItem[] {
    return docConfidence.paragraphs
      .filter(p => p.confidence < threshold)
      .map((paragraph, index) => ({
        id: `lc-${documentPath}-${paragraph.paragraphIndex}-${Date.now()}-${index}`,
        type: 'low_confidence' as const,
        documentPath,
        paragraphIndex: paragraph.paragraphIndex,
        originalText: paragraph.text,
        confidence: paragraph.confidence,
        indicators: paragraph.indicators,
        sources: this.extractSourcesForParagraph(paragraph),
        status: 'pending' as ReviewItemStatus,
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
  }

  /**
   * Extract potential sources for a paragraph (based on citations in text)
   */
  private extractSourcesForParagraph(paragraph: ParagraphConfidence): ReviewSource[] {
    const sources: ReviewSource[] = [];

    // Check for citation markers in the text
    const citationPattern = /\[(\d+)\]/g;
    const matches = paragraph.text.match(citationPattern);

    if (matches) {
      // Add placeholder sources for each citation
      matches.forEach((match) => {
        const num = match.replace(/[\[\]]/g, '');
        sources.push({
          id: `source-citation-${num}`,
          type: 'citation',
          title: `Citation [${num}]`,
          content: 'Reference content not available',
        });
      });
    }

    // If no citations, indicate the content is generated
    if (sources.length === 0) {
      sources.push({
        id: 'source-generated',
        type: 'generated',
        title: 'AI Generated',
        content: 'This content was generated without explicit source citations.',
      });
    }

    return sources;
  }

  /**
   * Create review items for unverified/partial citations
   */
  private async createCitationItems(
    documentPath: string,
    includePartial: boolean,
    timestamp: Date
  ): Promise<CitationReviewItem[]> {
    const items: CitationReviewItem[] = [];

    try {
      // Load citations for the document
      const citationFile = await citationManager.loadCitations(documentPath);

      for (const citation of citationFile.citations) {
        // Verify the citation
        const query = {
          title: citation.title,
          authors: citation.authors,
          url: citation.url,
          year: citation.date ? parseInt(citation.date.match(/\d{4}/)?.[0] || '', 10) || undefined : undefined,
        };

        const result = await citationVerificationService.verifyCitation(query);

        // Check if citation should be flagged
        const shouldFlag =
          result.status === 'unverified' ||
          result.status === 'error' ||
          (includePartial && result.status === 'partial');

        if (shouldFlag) {
          items.push({
            id: `cit-${documentPath}-${citation.id}-${Date.now()}`,
            type: result.status === 'partial' ? 'partial_citation' : 'unverified_citation',
            documentPath,
            citationId: citation.id,
            citationNumber: citation.number,
            citationTitle: citation.title,
            citationUrl: citation.url,
            verificationStatus: result.status === 'error' ? 'unverified' : result.status as 'unverified' | 'partial',
            verificationConfidence: result.confidence,
            sources: this.extractSourcesForCitation(citation, result),
            usages: citation.usages,
            status: 'pending' as ReviewItemStatus,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      }
    } catch (error) {
      // If loading citations fails, return empty array
      console.error('Failed to load citations for review:', error);
    }

    return items;
  }

  /**
   * Extract sources for citation comparison
   */
  private extractSourcesForCitation(
    citation: { title: string; url: string; authors?: string[] },
    verificationResult: { matchedData?: { title?: string; authors?: string[]; doi?: string; venue?: string } }
  ): ReviewSource[] {
    const sources: ReviewSource[] = [];

    // Add the original citation as a source
    sources.push({
      id: 'source-original',
      type: 'citation',
      title: 'Original Citation',
      url: citation.url,
      content: `Title: ${citation.title}\nAuthors: ${citation.authors?.join(', ') || 'Unknown'}`,
    });

    // Add matched data if available
    if (verificationResult.matchedData) {
      const matched = verificationResult.matchedData;
      sources.push({
        id: 'source-verified',
        type: 'context',
        title: 'Verified Data',
        url: matched.doi ? `https://doi.org/${matched.doi}` : undefined,
        content: `Title: ${matched.title || 'Unknown'}\nAuthors: ${matched.authors?.join(', ') || 'Unknown'}\nVenue: ${matched.venue || 'Unknown'}`,
      });
    }

    return sources;
  }

  /**
   * Get the review queue for a document
   */
  getQueue(documentPath: string): DocumentReviewQueue | undefined {
    return this.queues.get(documentPath);
  }

  /**
   * Get a specific review item
   */
  getItem(documentPath: string, itemId: string): ReviewItem | undefined {
    const queue = this.queues.get(documentPath);
    return queue?.items.find(item => item.id === itemId);
  }

  /**
   * Get pending items for a document
   */
  getPendingItems(documentPath: string): ReviewItem[] {
    const queue = this.queues.get(documentPath);
    return queue?.items.filter(item => item.status === 'pending') ?? [];
  }

  /**
   * Apply an action to a review item
   */
  applyAction(
    documentPath: string,
    itemId: string,
    action: ReviewItemAction
  ): ReviewItem | undefined {
    const queue = this.queues.get(documentPath);
    if (!queue) return undefined;

    const item = queue.items.find(i => i.id === itemId);
    if (!item) return undefined;

    // Update item status based on action
    switch (action.type) {
      case 'accept':
        item.status = 'accepted';
        break;
      case 'edit':
        item.status = 'edited';
        break;
      case 'remove':
        item.status = 'removed';
        break;
      case 'dismiss':
        item.status = 'dismissed';
        break;
    }

    item.action = action;
    item.updatedAt = action.timestamp;

    // Recalculate stats
    queue.stats = this.calculateStats(queue.items);
    queue.lastUpdated = action.timestamp;

    return item;
  }

  /**
   * Accept a review item (keep as-is)
   */
  acceptItem(documentPath: string, itemId: string): ReviewItem | undefined {
    return this.applyAction(documentPath, itemId, {
      type: 'accept',
      timestamp: new Date(),
    });
  }

  /**
   * Edit a review item (provide corrected text)
   */
  editItem(documentPath: string, itemId: string, editedText: string): ReviewItem | undefined {
    return this.applyAction(documentPath, itemId, {
      type: 'edit',
      timestamp: new Date(),
      editedText,
    });
  }

  /**
   * Remove a review item (delete from document)
   */
  removeItem(documentPath: string, itemId: string, reason?: string): ReviewItem | undefined {
    return this.applyAction(documentPath, itemId, {
      type: 'remove',
      timestamp: new Date(),
      reason,
    });
  }

  /**
   * Dismiss a review item (acknowledge but keep)
   */
  dismissItem(documentPath: string, itemId: string): ReviewItem | undefined {
    return this.applyAction(documentPath, itemId, {
      type: 'dismiss',
      timestamp: new Date(),
    });
  }

  /**
   * Calculate queue statistics
   */
  private calculateStats(items: ReviewItem[]): DocumentReviewQueue['stats'] {
    const stats = {
      total: items.length,
      pending: 0,
      accepted: 0,
      edited: 0,
      removed: 0,
      dismissed: 0,
      lowConfidenceCount: 0,
      unverifiedCitationCount: 0,
    };

    for (const item of items) {
      // Status counts
      switch (item.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'accepted':
          stats.accepted++;
          break;
        case 'edited':
          stats.edited++;
          break;
        case 'removed':
          stats.removed++;
          break;
        case 'dismissed':
          stats.dismissed++;
          break;
      }

      // Type counts
      if (item.type === 'low_confidence') {
        stats.lowConfidenceCount++;
      } else {
        stats.unverifiedCitationCount++;
      }
    }

    return stats;
  }

  /**
   * Clear the queue for a document
   */
  clearQueue(documentPath: string): void {
    this.queues.delete(documentPath);
  }

  /**
   * Clear all queues
   */
  clearAllQueues(): void {
    this.queues.clear();
  }

  /**
   * Get all documents with pending review items
   */
  getDocumentsWithPendingReviews(): string[] {
    const docs: string[] = [];
    for (const [path, queue] of this.queues) {
      if (queue.stats.pending > 0) {
        docs.push(path);
      }
    }
    return docs;
  }

  /**
   * Export review queue summary for reporting
   */
  exportQueueSummary(documentPath: string): {
    documentPath: string;
    stats: DocumentReviewQueue['stats'];
    items: Array<{
      id: string;
      type: ReviewItemType;
      status: ReviewItemStatus;
      preview: string;
    }>;
  } | undefined {
    const queue = this.queues.get(documentPath);
    if (!queue) return undefined;

    return {
      documentPath,
      stats: queue.stats,
      items: queue.items.map(item => ({
        id: item.id,
        type: item.type,
        status: item.status,
        preview: item.type === 'low_confidence'
          ? (item as LowConfidenceReviewItem).originalText.substring(0, 100) + '...'
          : (item as CitationReviewItem).citationTitle,
      })),
    };
  }
}

// Singleton instance
export const reviewQueueService = new ReviewQueueService();

// Export class for testing
export { ReviewQueueService };
