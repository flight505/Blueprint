/**
 * CitationAttachmentService - Attaches citations during text generation
 *
 * Extracts citations from RAG context, attaches them to generated text,
 * and maintains source-claim linking that persists across document edits.
 */

import { citationManager, type Citation, type CitationFile, type AddCitationInput } from './CitationManager';
import type {
  RAGSource,
  ExtractedClaim,
  AttachmentResult,
  AttachmentOptions,
  SourceClaimLink,
} from '../../shared/types';

// Re-export for consumers
export type {
  RAGSource,
  ExtractedClaim,
  AttachmentResult,
  AttachmentOptions,
  SourceClaimLink,
} from '../../shared/types';

/**
 * Extended citation file structure with source-claim links (service-specific)
 */
export interface CitationFileWithLinks extends CitationFile {
  /** Source-claim links for traceability */
  sourceClaimLinks?: SourceClaimLink[];
}

/**
 * Service for attaching citations during text generation
 */
class CitationAttachmentService {
  /**
   * Extract citations from RAG context and attach to generated text
   */
  async attachCitations(
    documentPath: string,
    generatedText: string,
    sources: RAGSource[],
    options: AttachmentOptions = {}
  ): Promise<AttachmentResult> {
    const {
      insertMarkers = true,
      minRelevance = 0.5,
      maxCitationsPerClaim = 3,
    } = options;

    // Filter sources by relevance
    const relevantSources = sources.filter(
      s => (s.relevanceScore ?? 1) >= minRelevance
    );

    // Extract claims from the generated text
    const claims = this.extractClaims(generatedText, relevantSources);

    // Add citations to the document's citation file
    const addedCitations: Citation[] = [];
    for (const source of relevantSources) {
      // Find claims that reference this source
      const sourceClaims = claims.filter(c => c.sourceIds.includes(source.id));

      // Add citation with usages
      const citationInput: AddCitationInput = {
        url: source.url,
        title: source.title,
        authors: source.authors,
        date: source.date,
        publisher: source.publisher,
        source: source.provider,
        claim: sourceClaims[0]?.text, // First claim as primary
        offset: sourceClaims[0]?.startOffset,
        line: sourceClaims[0]?.line,
      };

      const citation = await citationManager.addCitation(documentPath, citationInput);

      // Add additional usages for other claims
      for (let i = 1; i < sourceClaims.length && i < maxCitationsPerClaim; i++) {
        await citationManager.addUsage(documentPath, citation.id, {
          claim: sourceClaims[i].text,
          offset: sourceClaims[i].startOffset,
          line: sourceClaims[i].line,
        });
      }

      addedCitations.push(citation);
    }

    // Update claims with citation numbers
    const citationFile = await citationManager.loadCitations(documentPath);
    const urlToNumber = new Map<string, number>();
    for (const cit of citationFile.citations) {
      urlToNumber.set(cit.url, cit.number);
    }

    // Update source IDs in claims with citation numbers
    for (const claim of claims) {
      for (const sourceId of claim.sourceIds) {
        const source = relevantSources.find(s => s.id === sourceId);
        if (source) {
          const citNumber = urlToNumber.get(source.url);
          if (citNumber !== undefined) {
            // Replace source ID with citation number for lookup
            claim.sourceIds = claim.sourceIds.map(id =>
              id === sourceId ? `cit:${citNumber}` : id
            );
          }
        }
      }
    }

    // Store source-claim links for persistence across edits
    await this.storeSourceClaimLinks(documentPath, claims, addedCitations);

    // Insert IEEE markers into text if requested
    let annotatedText = generatedText;
    if (insertMarkers && addedCitations.length > 0) {
      annotatedText = this.insertCitationMarkers(generatedText, claims, urlToNumber, relevantSources);
    }

    return {
      annotatedText,
      claims,
      addedCitations,
      totalCitations: citationFile.citations.length,
    };
  }

  /**
   * Extract claims from generated text that may need citations
   * Claims are sentences that make factual assertions
   */
  private extractClaims(text: string, sources: RAGSource[]): ExtractedClaim[] {
    const claims: ExtractedClaim[] = [];

    // Split text into sentences
    const sentences = this.splitIntoSentences(text);
    let offset = 0;
    let lineNumber = 1;

    for (const sentence of sentences) {
      // Find sentence position in original text
      const sentenceStart = text.indexOf(sentence, offset);
      if (sentenceStart === -1) continue;

      // Count newlines before this sentence
      const textBefore = text.substring(0, sentenceStart);
      lineNumber = (textBefore.match(/\n/g) || []).length + 1;

      // Check if this sentence contains factual claims (heuristic)
      if (this.containsFactualClaim(sentence)) {
        // Find sources that support this claim
        const supportingSources = this.findSupportingSources(sentence, sources);

        if (supportingSources.length > 0) {
          claims.push({
            text: sentence,
            startOffset: sentenceStart,
            endOffset: sentenceStart + sentence.length,
            line: lineNumber,
            sourceIds: supportingSources.map(s => s.id),
            confidence: this.calculateClaimConfidence(sentence, supportingSources),
          });
        }
      }

      offset = sentenceStart + sentence.length;
    }

    return claims;
  }

  /**
   * Split text into sentences, handling common edge cases
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - handles most common cases
    // Preserves abbreviations like "Dr.", "Mr.", "e.g.", "i.e."
    const sentenceRegex = /[^.!?]*(?:\.\s*(?=[A-Z])|[.!?]+\s*|$)/g;
    const matches = text.match(sentenceRegex) || [];

    return matches
      .map(s => s.trim())
      .filter(s => s.length > 10); // Filter out very short fragments
  }

  /**
   * Check if a sentence contains a factual claim (heuristic-based)
   */
  private containsFactualClaim(sentence: string): boolean {
    const lower = sentence.toLowerCase();

    // Skip questions
    if (sentence.endsWith('?')) return false;

    // Skip imperatives (commands)
    if (/^(please|do|don't|let's|try|make|ensure)/i.test(sentence)) return false;

    // Look for factual claim indicators
    const factualIndicators = [
      // Statistics and numbers
      /\d+(\.\d+)?%/,
      /\$[\d,]+/,
      /\d+ (million|billion|thousand)/i,
      /\d+ (percent|years?|months?|weeks?|days?)/i,

      // Definitive statements
      /\b(is|are|was|were|has|have|had)\s+(a|the|one|an)\b/i,
      /\b(according to|research shows|studies indicate|data suggests)/i,
      /\b(found that|discovered|revealed|demonstrated)/i,

      // Comparative claims
      /\b(more|less|greater|fewer|higher|lower|better|worse) than\b/i,
      /\b(increased|decreased|grew|declined|rose|fell)\b/i,

      // Causal claims
      /\b(because|due to|as a result|therefore|consequently)\b/i,
      /\b(leads to|causes|results in|contributes to)\b/i,
    ];

    return factualIndicators.some(pattern => pattern.test(lower));
  }

  /**
   * Find sources that support a claim based on content similarity
   */
  private findSupportingSources(claim: string, sources: RAGSource[]): RAGSource[] {
    const claimWords = new Set(
      claim.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    // Score each source by word overlap
    const scoredSources = sources.map(source => {
      const sourceWords = new Set(
        source.content.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3)
      );

      // Calculate Jaccard similarity
      const intersection = [...claimWords].filter(w => sourceWords.has(w)).length;
      const union = new Set([...claimWords, ...sourceWords]).size;
      const similarity = union > 0 ? intersection / union : 0;

      // Also check for key term matches
      const keyTermBonus = this.calculateKeyTermBonus(claim, source.content);

      return {
        source,
        score: similarity + keyTermBonus,
      };
    });

    // Filter and sort by score
    return scoredSources
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.source);
  }

  /**
   * Calculate bonus for matching key terms (names, numbers, etc.)
   */
  private calculateKeyTermBonus(claim: string, sourceContent: string): number {
    let bonus = 0;

    // Check for matching numbers
    const claimNumbers = claim.match(/\d+(\.\d+)?/g) || [];
    const sourceNumbers = sourceContent.match(/\d+(\.\d+)?/g) || [];
    const sourceNumbersSet = new Set(sourceNumbers);
    const matchingNumbers = claimNumbers.filter(n => sourceNumbersSet.has(n));
    bonus += matchingNumbers.length * 0.1;

    // Check for matching proper nouns (simple heuristic: capitalized words)
    const claimProperNouns = claim.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
    const sourceProperNounsSet = new Set(
      (sourceContent.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [])
        .map(n => n.toLowerCase())
    );
    const matchingNouns = claimProperNouns.filter(n =>
      sourceProperNounsSet.has(n.toLowerCase())
    );
    bonus += matchingNouns.length * 0.15;

    return Math.min(bonus, 0.5); // Cap bonus
  }

  /**
   * Calculate confidence score for a claim based on source support
   */
  private calculateClaimConfidence(_claim: string, sources: RAGSource[]): number {
    if (sources.length === 0) return 0;

    // Base confidence from number of supporting sources
    let confidence = Math.min(sources.length * 0.25, 0.75);

    // Boost for high-relevance sources
    const avgRelevance = sources.reduce(
      (sum, s) => sum + (s.relevanceScore ?? 0.5), 0
    ) / sources.length;
    confidence += avgRelevance * 0.25;

    return Math.min(confidence, 1);
  }

  /**
   * Insert IEEE citation markers [n] into text at appropriate positions
   */
  private insertCitationMarkers(
    text: string,
    claims: ExtractedClaim[],
    urlToNumber: Map<string, number>,
    sources: RAGSource[]
  ): string {
    // Sort claims by end offset in reverse order (to insert from end to start)
    const sortedClaims = [...claims].sort((a, b) => b.endOffset - a.endOffset);

    let result = text;

    for (const claim of sortedClaims) {
      // Get citation numbers for this claim's sources
      const citationNumbers: number[] = [];
      for (const sourceId of claim.sourceIds) {
        // Handle both raw source IDs and already-converted citation references
        if (sourceId.startsWith('cit:')) {
          const num = parseInt(sourceId.substring(4), 10);
          if (!isNaN(num)) citationNumbers.push(num);
        } else {
          const source = sources.find(s => s.id === sourceId);
          if (source) {
            const num = urlToNumber.get(source.url);
            if (num !== undefined) citationNumbers.push(num);
          }
        }
      }

      if (citationNumbers.length === 0) continue;

      // Sort and deduplicate citation numbers
      const uniqueNumbers = [...new Set(citationNumbers)].sort((a, b) => a - b);

      // Create citation marker
      const marker = uniqueNumbers.length === 1
        ? ` [${uniqueNumbers[0]}]`
        : ` [${uniqueNumbers.join(', ')}]`;

      // Find insertion point (end of sentence, before period)
      let insertPos = claim.endOffset;
      // If ends with punctuation, insert before it
      const lastChar = text.charAt(claim.endOffset - 1);
      if (/[.!?]/.test(lastChar)) {
        insertPos = claim.endOffset - 1;
      }

      // Check if citation marker already exists at this position
      const surroundingText = result.substring(
        Math.max(0, insertPos - 20),
        Math.min(result.length, insertPos + 10)
      );
      if (/\[\d+(?:,\s*\d+)*\]/.test(surroundingText)) {
        continue; // Skip if citation already present
      }

      // Insert marker
      result = result.substring(0, insertPos) + marker + result.substring(insertPos);
    }

    return result;
  }

  /**
   * Store source-claim links for persistence across edits
   */
  private async storeSourceClaimLinks(
    documentPath: string,
    claims: ExtractedClaim[],
    citations: Citation[]
  ): Promise<void> {
    const citationFile = await citationManager.loadCitations(documentPath) as CitationFileWithLinks;

    const links: SourceClaimLink[] = [];

    for (const claim of claims) {
      for (const sourceIdOrCitRef of claim.sourceIds) {
        let citation: Citation | undefined;

        if (sourceIdOrCitRef.startsWith('cit:')) {
          const citNum = parseInt(sourceIdOrCitRef.substring(4), 10);
          citation = citationFile.citations.find(c => c.number === citNum);
        } else {
          // Find by matching added citations
          citation = citations.find(c =>
            citationFile.citations.some(fc => fc.id === c.id)
          );
        }

        if (citation) {
          links.push({
            citationId: citation.id,
            citationNumber: citation.number,
            claimText: claim.text,
            originalOffset: claim.startOffset,
            originalLine: claim.line,
            contextHash: this.hashContext(claim.text),
            confidence: claim.confidence,
          });
        }
      }
    }

    // Store links in the citation file
    citationFile.sourceClaimLinks = [
      ...(citationFile.sourceClaimLinks || []),
      ...links,
    ];

    await citationManager.saveCitations(documentPath, citationFile);
  }

  /**
   * Create a hash of claim text for re-identification after edits
   */
  private hashContext(text: string): string {
    // Simple hash using first/last words and length
    const words = text.split(/\s+/);
    const first = words[0] || '';
    const last = words[words.length - 1] || '';
    return `${first.toLowerCase()}:${last.toLowerCase()}:${text.length}`;
  }

  /**
   * Relocate citations after document edit
   * Attempts to find claims in new text using context hashes
   */
  async relocateCitationsAfterEdit(
    documentPath: string,
    newText: string
  ): Promise<{ relocated: number; lost: number }> {
    const citationFile = await citationManager.loadCitations(documentPath) as CitationFileWithLinks;
    const links = citationFile.sourceClaimLinks || [];

    let relocated = 0;
    let lost = 0;

    for (const link of links) {
      // Try to find the claim in the new text
      const newPosition = this.findClaimInNewText(link.claimText, link.contextHash, newText);

      if (newPosition) {
        // Update the citation usage
        const citation = citationFile.citations.find(c => c.id === link.citationId);
        if (citation) {
          // Find and update the matching usage
          const usage = citation.usages.find(u => u.claim === link.claimText);
          if (usage) {
            usage.offset = newPosition.offset;
            usage.line = newPosition.line;
            relocated++;
          }
        }

        // Update the link
        link.originalOffset = newPosition.offset;
        link.originalLine = newPosition.line;
      } else {
        // Claim not found in new text - mark as potentially lost
        lost++;
      }
    }

    // Save updated citation file
    await citationManager.saveCitations(documentPath, citationFile);

    return { relocated, lost };
  }

  /**
   * Find a claim in new text after edits
   */
  private findClaimInNewText(
    originalClaim: string,
    contextHash: string,
    newText: string
  ): { offset: number; line: number } | null {
    // First, try exact match
    const exactIndex = newText.indexOf(originalClaim);
    if (exactIndex !== -1) {
      const line = (newText.substring(0, exactIndex).match(/\n/g) || []).length + 1;
      return { offset: exactIndex, line };
    }

    // Try fuzzy match using context hash components
    const [first, last, lenStr] = contextHash.split(':');
    const originalLen = parseInt(lenStr, 10);

    // Look for sentences starting with same word
    const sentences = this.splitIntoSentences(newText);
    let offset = 0;

    for (const sentence of sentences) {
      const sentenceStart = newText.indexOf(sentence, offset);
      if (sentenceStart === -1) continue;

      const words = sentence.split(/\s+/);
      const sentenceFirst = (words[0] || '').toLowerCase();
      const sentenceLast = (words[words.length - 1] || '').toLowerCase();

      // Check if this matches the context hash pattern
      if (sentenceFirst === first && sentenceLast === last) {
        // Length should be within 20% of original
        if (Math.abs(sentence.length - originalLen) / originalLen < 0.2) {
          const line = (newText.substring(0, sentenceStart).match(/\n/g) || []).length + 1;
          return { offset: sentenceStart, line };
        }
      }

      offset = sentenceStart + sentence.length;
    }

    return null;
  }

  /**
   * Get source-claim links for a document
   */
  async getSourceClaimLinks(documentPath: string): Promise<SourceClaimLink[]> {
    const citationFile = await citationManager.loadCitations(documentPath) as CitationFileWithLinks;
    return citationFile.sourceClaimLinks || [];
  }

  /**
   * Remove orphaned source-claim links (citations that no longer exist)
   */
  async cleanupOrphanedLinks(documentPath: string): Promise<number> {
    const citationFile = await citationManager.loadCitations(documentPath) as CitationFileWithLinks;
    const links = citationFile.sourceClaimLinks || [];
    const citationIds = new Set(citationFile.citations.map(c => c.id));

    const originalCount = links.length;
    citationFile.sourceClaimLinks = links.filter(link => citationIds.has(link.citationId));
    const removedCount = originalCount - citationFile.sourceClaimLinks.length;

    if (removedCount > 0) {
      await citationManager.saveCitations(documentPath, citationFile);
    }

    return removedCount;
  }

  /**
   * Convert RAG citations from research response to RAGSource format
   */
  convertResearchCitations(
    citations: Array<{ url: string; title?: string; snippet?: string; domain?: string }>,
    provider: 'perplexity' | 'gemini'
  ): RAGSource[] {
    return citations.map((cit, index) => ({
      id: `${provider}-${index}-${Date.now()}`,
      url: cit.url,
      title: cit.title || cit.domain || 'Unknown Source',
      publisher: cit.domain,
      content: cit.snippet || '',
      relevanceScore: 1 - (index * 0.1), // Assume order indicates relevance
      provider,
    }));
  }
}

// Singleton instance
export const citationAttachmentService = new CitationAttachmentService();

// Re-export types
export type { CitationAttachmentService };
