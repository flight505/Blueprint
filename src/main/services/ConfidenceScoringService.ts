/**
 * ConfidenceScoringService - Computes confidence scores for generated content
 *
 * Provides paragraph-level confidence scoring based on linguistic indicators
 * and hedging language analysis. Designed to be extensible for token probability
 * extraction when/if the Anthropic API supports logprobs.
 */

// Confidence score thresholds
const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.6;

// Linguistic indicators of uncertainty (hedging words)
const HEDGING_WORDS = [
  'might', 'maybe', 'perhaps', 'possibly', 'probably',
  'could', 'may', 'seems', 'appears', 'suggests',
  'likely', 'unlikely', 'uncertain', 'unclear',
  'approximately', 'roughly', 'around', 'about',
  'estimated', 'supposed', 'believed', 'thought',
  'allegedly', 'reportedly', 'potentially', 'presumably',
  'somewhat', 'fairly', 'rather', 'quite',
  'i think', 'i believe', 'in my opinion', 'it seems',
  'it appears', 'it is possible', 'it could be',
];

// Strong assertion words (increase confidence)
const ASSERTION_WORDS = [
  'definitely', 'certainly', 'absolutely', 'clearly',
  'undoubtedly', 'obviously', 'indeed', 'surely',
  'always', 'never', 'must', 'proven',
  'confirmed', 'established', 'verified', 'demonstrated',
  'factually', 'scientifically', 'empirically',
  'according to', 'based on', 'as stated in',
];

// Factual indicators (increase confidence)
const FACTUAL_INDICATORS = [
  'according to', 'research shows', 'studies indicate',
  'data suggests', 'evidence shows', 'statistics show',
  'as documented in', 'as reported by', 'as noted in',
  'per the', 'based on data', 'measured at',
  'officially', 'on record', 'documented',
];

// Question markers (decrease confidence)
const QUESTION_MARKERS = [
  '?', 'whether', 'if', 'not sure',
  'unknown', 'needs verification', 'unconfirmed',
  'to be determined', 'pending', 'awaiting',
];

// Citation patterns (increase confidence)
const CITATION_PATTERNS = [
  /\[\d+\]/,           // [1], [2], etc.
  /\(\d{4}\)/,         // (2024), etc.
  /et al\./i,          // et al.
  /ibid\./i,           // ibid.
  /doi:/i,             // DOI references
  /https?:\/\//,       // URL references
];

/**
 * Score breakdown for a paragraph
 */
export interface ConfidenceBreakdown {
  hedgingScore: number;      // Penalty from hedging words (0-1)
  assertionScore: number;    // Boost from assertion words (0-1)
  factualScore: number;      // Boost from factual indicators (0-1)
  citationScore: number;     // Boost from citations (0-1)
  lengthScore: number;       // Score based on paragraph length (0-1)
  questionPenalty: number;   // Penalty from questions (0-1)
}

/**
 * Confidence score for a paragraph
 */
export interface ParagraphConfidence {
  paragraphIndex: number;
  text: string;
  confidence: number;        // Final score (0-1)
  breakdown: ConfidenceBreakdown;
  isLowConfidence: boolean;
  indicators: string[];      // Human-readable reasons
}

/**
 * Document-level confidence analysis
 */
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

/**
 * Configuration for confidence scoring
 */
export interface ConfidenceScoringConfig {
  lowConfidenceThreshold: number;
  enableTokenProbabilities: boolean;  // For future use when logprobs available
  weights: {
    hedging: number;
    assertion: number;
    factual: number;
    citation: number;
    length: number;
    question: number;
  };
}

const DEFAULT_CONFIG: ConfidenceScoringConfig = {
  lowConfidenceThreshold: DEFAULT_LOW_CONFIDENCE_THRESHOLD,
  enableTokenProbabilities: false,
  weights: {
    hedging: 0.25,
    assertion: 0.15,
    factual: 0.20,
    citation: 0.20,
    length: 0.10,
    question: 0.10,
  },
};

/**
 * Token probability data (for future use)
 * When Anthropic API supports logprobs, this structure will hold the data
 */
export interface TokenProbability {
  token: string;
  logprob: number;
  probability: number;
  topLogprobs?: Array<{
    token: string;
    logprob: number;
  }>;
}

/**
 * Streaming confidence update
 */
export interface ConfidenceStreamUpdate {
  type: 'paragraph' | 'document';
  paragraphIndex?: number;
  confidence: number;
  isLowConfidence: boolean;
}

/**
 * Service for computing confidence scores on generated content
 */
class ConfidenceScoringService {
  private config: ConfidenceScoringConfig;
  private documentConfidences: Map<string, DocumentConfidence> = new Map();

  constructor(config?: Partial<ConfidenceScoringConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (config?.weights) {
      this.config.weights = { ...DEFAULT_CONFIG.weights, ...config.weights };
    }
  }

  /**
   * Get the current low confidence threshold
   */
  getLowConfidenceThreshold(): number {
    return this.config.lowConfidenceThreshold;
  }

  /**
   * Set the low confidence threshold
   */
  setLowConfidenceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.config.lowConfidenceThreshold = threshold;
  }

  /**
   * Get the full configuration
   */
  getConfig(): ConfidenceScoringConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConfidenceScoringConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.weights) {
      this.config.weights = { ...this.config.weights, ...config.weights };
    }
  }

  /**
   * Compute confidence score for a single paragraph
   */
  computeParagraphConfidence(
    text: string,
    paragraphIndex: number = 0
  ): ParagraphConfidence {
    const breakdown = this.computeBreakdown(text);
    const confidence = this.computeFinalScore(breakdown);
    const indicators = this.getHumanReadableIndicators(text, breakdown);

    return {
      paragraphIndex,
      text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      confidence,
      breakdown,
      isLowConfidence: confidence < this.config.lowConfidenceThreshold,
      indicators,
    };
  }

  /**
   * Compute confidence scores for all paragraphs in a document
   */
  computeDocumentConfidence(
    content: string,
    documentPath?: string
  ): DocumentConfidence {
    const paragraphs = this.splitIntoParagraphs(content);
    const paragraphConfidences = paragraphs.map((text, index) =>
      this.computeParagraphConfidence(text, index)
    );

    const lowConfidenceParagraphs = paragraphConfidences.filter(
      (p) => p.isLowConfidence
    );

    const confidences = paragraphConfidences.map((p) => p.confidence);
    const averageConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    const result: DocumentConfidence = {
      documentPath,
      overallConfidence: averageConfidence,
      paragraphs: paragraphConfidences,
      lowConfidenceParagraphs,
      summary: {
        totalParagraphs: paragraphs.length,
        lowConfidenceCount: lowConfidenceParagraphs.length,
        averageConfidence,
        lowestConfidence: Math.min(...confidences, 1),
        highestConfidence: Math.max(...confidences, 0),
      },
    };

    // Cache the result if document path provided
    if (documentPath) {
      this.documentConfidences.set(documentPath, result);
    }

    return result;
  }

  /**
   * Get cached document confidence
   */
  getCachedDocumentConfidence(documentPath: string): DocumentConfidence | undefined {
    return this.documentConfidences.get(documentPath);
  }

  /**
   * Clear cached document confidence
   */
  clearCache(documentPath?: string): void {
    if (documentPath) {
      this.documentConfidences.delete(documentPath);
    } else {
      this.documentConfidences.clear();
    }
  }

  /**
   * Process streaming text and compute incremental confidence
   * Called as new content arrives during generation
   * @param _sessionId - Session identifier for tracking (reserved for future use)
   * @param _newText - The new text chunk received (reserved for incremental analysis)
   * @param fullText - The complete accumulated text
   * @param onUpdate - Callback for confidence updates
   */
  processStreamingText(
    _sessionId: string,
    _newText: string,
    fullText: string,
    onUpdate?: (update: ConfidenceStreamUpdate) => void
  ): void {
    // Split full text into paragraphs
    const paragraphs = this.splitIntoParagraphs(fullText);

    // Find the paragraph containing the new text
    const currentParagraphIndex = paragraphs.length - 1;
    if (currentParagraphIndex < 0) return;

    const currentParagraph = paragraphs[currentParagraphIndex];

    // Compute confidence for the current paragraph
    const confidence = this.computeParagraphConfidence(
      currentParagraph,
      currentParagraphIndex
    );

    if (onUpdate) {
      onUpdate({
        type: 'paragraph',
        paragraphIndex: currentParagraphIndex,
        confidence: confidence.confidence,
        isLowConfidence: confidence.isLowConfidence,
      });
    }
  }

  /**
   * Analyze text with token probabilities (for future use)
   * This method will be fully implemented when Anthropic API supports logprobs
   */
  analyzeWithTokenProbabilities(
    text: string,
    tokenProbabilities: TokenProbability[]
  ): ParagraphConfidence {
    if (!this.config.enableTokenProbabilities || tokenProbabilities.length === 0) {
      return this.computeParagraphConfidence(text);
    }

    // Calculate average probability
    const avgProb =
      tokenProbabilities.reduce((sum, tp) => sum + tp.probability, 0) /
      tokenProbabilities.length;

    // Find low probability tokens
    const lowProbTokens = tokenProbabilities.filter(
      (tp) => tp.probability < 0.3
    );

    // Adjust heuristic score based on token probabilities
    const baseConfidence = this.computeParagraphConfidence(text);

    // Weight: 60% token probability, 40% heuristic
    const combinedConfidence = avgProb * 0.6 + baseConfidence.confidence * 0.4;

    return {
      ...baseConfidence,
      confidence: combinedConfidence,
      isLowConfidence: combinedConfidence < this.config.lowConfidenceThreshold,
      indicators: [
        ...baseConfidence.indicators,
        `Token probability: ${Math.round(avgProb * 100)}%`,
        lowProbTokens.length > 0
          ? `${lowProbTokens.length} low-probability tokens`
          : '',
      ].filter(Boolean),
    };
  }

  /**
   * Split content into paragraphs
   */
  private splitIntoParagraphs(content: string): string[] {
    // Split by double newlines or single newlines with substantial content
    const paragraphs = content
      .split(/\n\s*\n|\n(?=(?:[-*•]\s|[0-9]+\.))/g)
      .map((p) => p.trim())
      .filter((p) => p.length >= 20); // Minimum paragraph length

    return paragraphs;
  }

  /**
   * Compute breakdown scores for a paragraph
   */
  private computeBreakdown(text: string): ConfidenceBreakdown {
    const lowerText = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    // Hedging score (0 = no hedging = good, 1 = lots of hedging = bad)
    const hedgingMatches = HEDGING_WORDS.filter((word) =>
      lowerText.includes(word.toLowerCase())
    );
    const hedgingScore = Math.min(hedgingMatches.length * 0.15, 1);

    // Assertion score (0 = no assertions, 1 = strong assertions)
    const assertionMatches = ASSERTION_WORDS.filter((word) =>
      lowerText.includes(word.toLowerCase())
    );
    const assertionScore = Math.min(assertionMatches.length * 0.2, 1);

    // Factual score (0 = no factual indicators, 1 = strong factual basis)
    const factualMatches = FACTUAL_INDICATORS.filter((indicator) =>
      lowerText.includes(indicator.toLowerCase())
    );
    const factualScore = Math.min(factualMatches.length * 0.25, 1);

    // Citation score (0 = no citations, 1 = well cited)
    const citationMatches = CITATION_PATTERNS.filter((pattern) =>
      pattern.test(text)
    );
    const citationScore = Math.min(citationMatches.length * 0.3, 1);

    // Length score (short paragraphs are less confident)
    // Optimal length: 50-200 words
    let lengthScore: number;
    if (wordCount < 20) {
      lengthScore = 0.5;
    } else if (wordCount < 50) {
      lengthScore = 0.7;
    } else if (wordCount <= 200) {
      lengthScore = 1.0;
    } else {
      lengthScore = 0.9; // Very long paragraphs slightly penalized
    }

    // Question penalty
    const questionMatches = QUESTION_MARKERS.filter((marker) =>
      lowerText.includes(marker.toLowerCase())
    );
    const questionPenalty = Math.min(questionMatches.length * 0.2, 0.5);

    return {
      hedgingScore,
      assertionScore,
      factualScore,
      citationScore,
      lengthScore,
      questionPenalty,
    };
  }

  /**
   * Compute final confidence score from breakdown
   */
  private computeFinalScore(breakdown: ConfidenceBreakdown): number {
    const { weights } = this.config;

    // Start with base score of 0.7 (neutral)
    let score = 0.7;

    // Apply weighted adjustments
    score -= breakdown.hedgingScore * weights.hedging;
    score += breakdown.assertionScore * weights.assertion;
    score += breakdown.factualScore * weights.factual;
    score += breakdown.citationScore * weights.citation;
    score += (breakdown.lengthScore - 0.7) * weights.length;
    score -= breakdown.questionPenalty * weights.question;

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get human-readable indicators for why confidence is low/high
   */
  private getHumanReadableIndicators(
    text: string,
    breakdown: ConfidenceBreakdown
  ): string[] {
    const indicators: string[] = [];
    const lowerText = text.toLowerCase();

    // Hedging indicators
    if (breakdown.hedgingScore > 0.3) {
      const hedgingWords = HEDGING_WORDS.filter((word) =>
        lowerText.includes(word.toLowerCase())
      );
      indicators.push(`Uncertain language: "${hedgingWords.slice(0, 3).join('", "')}"`);
    }

    // Assertion indicators
    if (breakdown.assertionScore > 0.2) {
      indicators.push('Contains strong assertions');
    }

    // Factual indicators
    if (breakdown.factualScore > 0.2) {
      indicators.push('References factual sources');
    }

    // Citation indicators
    if (breakdown.citationScore > 0) {
      indicators.push('Contains citations');
    } else if (breakdown.factualScore === 0 && breakdown.citationScore === 0) {
      indicators.push('No citations or source references');
    }

    // Question indicators
    if (breakdown.questionPenalty > 0.1) {
      indicators.push('Contains questions or uncertainties');
    }

    // Length indicators
    if (breakdown.lengthScore < 0.6) {
      indicators.push('Paragraph is very short');
    }

    return indicators;
  }
}

// Singleton instance for the main process
export const confidenceScoringService = new ConfidenceScoringService();

// Export class for testing and direct usage
export { ConfidenceScoringService };
