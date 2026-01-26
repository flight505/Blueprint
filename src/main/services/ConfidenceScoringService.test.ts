import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceScoringService } from './ConfidenceScoringService';

describe('ConfidenceScoringService', () => {
  let service: ConfidenceScoringService;

  beforeEach(() => {
    // Create a new instance for each test
    service = new ConfidenceScoringService();
  });

  describe('threshold management', () => {
    it('returns default threshold of 0.6', () => {
      expect(service.getLowConfidenceThreshold()).toBe(0.6);
    });

    it('allows setting threshold between 0 and 1', () => {
      service.setLowConfidenceThreshold(0.8);
      expect(service.getLowConfidenceThreshold()).toBe(0.8);
    });

    it('throws error for threshold below 0', () => {
      expect(() => service.setLowConfidenceThreshold(-0.1)).toThrow(
        'Threshold must be between 0 and 1'
      );
    });

    it('throws error for threshold above 1', () => {
      expect(() => service.setLowConfidenceThreshold(1.1)).toThrow(
        'Threshold must be between 0 and 1'
      );
    });
  });

  describe('configuration', () => {
    it('returns default configuration', () => {
      const config = service.getConfig();
      expect(config.lowConfidenceThreshold).toBe(0.6);
      expect(config.enableTokenProbabilities).toBe(false);
      expect(config.weights).toHaveProperty('hedging');
      expect(config.weights).toHaveProperty('assertion');
      expect(config.weights).toHaveProperty('factual');
      expect(config.weights).toHaveProperty('citation');
    });

    it('allows updating configuration', () => {
      service.updateConfig({ lowConfidenceThreshold: 0.7 });
      expect(service.getLowConfidenceThreshold()).toBe(0.7);
    });

    it('allows updating weights', () => {
      const originalConfig = service.getConfig();
      service.updateConfig({
        weights: { hedging: 0.5, assertion: 0.1 } as Partial<
          typeof originalConfig.weights
        > as typeof originalConfig.weights,
      });
      const newConfig = service.getConfig();
      expect(newConfig.weights.hedging).toBe(0.5);
      expect(newConfig.weights.assertion).toBe(0.1);
    });
  });

  describe('paragraph confidence computation', () => {
    it('computes confidence for neutral text', () => {
      const text =
        'This is a straightforward statement about software development. It describes how code is written and tested.';
      const result = service.computeParagraphConfidence(text);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.breakdown).toHaveProperty('hedgingScore');
      expect(result.breakdown).toHaveProperty('assertionScore');
    });

    it('returns lower confidence for hedging language', () => {
      const hedgingText =
        'It might be possible that this could work, perhaps. Maybe the solution seems to be approximately correct.';
      const neutralText =
        'The solution works correctly. The code has been tested and verified.';

      const hedgingResult = service.computeParagraphConfidence(hedgingText);
      const neutralResult = service.computeParagraphConfidence(neutralText);

      expect(hedgingResult.confidence).toBeLessThan(neutralResult.confidence);
      expect(hedgingResult.breakdown.hedgingScore).toBeGreaterThan(
        neutralResult.breakdown.hedgingScore
      );
    });

    it('returns higher confidence for assertive language', () => {
      const assertiveText =
        'The data clearly demonstrates that this approach is definitely correct. The results are certainly proven.';
      const neutralText =
        'The data shows that this approach works. The results are good.';

      const assertiveResult = service.computeParagraphConfidence(assertiveText);
      const neutralResult = service.computeParagraphConfidence(neutralText);

      expect(assertiveResult.breakdown.assertionScore).toBeGreaterThan(
        neutralResult.breakdown.assertionScore
      );
    });

    it('returns higher confidence for cited text', () => {
      const citedText =
        'According to research, the algorithm performs well [1]. The study at https://example.com confirms this.';
      const uncitedText =
        'The algorithm performs well. This has been observed in practice.';

      const citedResult = service.computeParagraphConfidence(citedText);
      const uncitedResult = service.computeParagraphConfidence(uncitedText);

      expect(citedResult.breakdown.citationScore).toBeGreaterThan(
        uncitedResult.breakdown.citationScore
      );
    });

    it('returns higher confidence for factual indicators', () => {
      const factualText =
        'According to the documentation, research shows that data suggests significant improvements.';
      const opinionText = 'This seems like a good approach to try.';

      const factualResult = service.computeParagraphConfidence(factualText);
      const opinionResult = service.computeParagraphConfidence(opinionText);

      expect(factualResult.breakdown.factualScore).toBeGreaterThan(
        opinionResult.breakdown.factualScore
      );
    });

    it('flags low confidence paragraphs correctly', () => {
      const lowConfidenceText =
        'Maybe this might work? Perhaps it could be possible, but I am not sure. The results are unclear and uncertain.';
      const result = service.computeParagraphConfidence(lowConfidenceText);

      expect(result.isLowConfidence).toBe(true);
    });

    it('provides human-readable indicators', () => {
      const hedgingText =
        'It might be possible that this could work. Maybe the results are uncertain.';
      const result = service.computeParagraphConfidence(hedgingText);

      expect(result.indicators.length).toBeGreaterThan(0);
      expect(result.indicators.some((i) => i.includes('Uncertain'))).toBe(true);
    });

    it('truncates long text in result', () => {
      const longText = 'A'.repeat(300);
      const result = service.computeParagraphConfidence(longText);

      expect(result.text.length).toBeLessThan(300);
      expect(result.text.endsWith('...')).toBe(true);
    });

    it('tracks paragraph index', () => {
      const text = 'Some text content.';
      const result = service.computeParagraphConfidence(text, 5);

      expect(result.paragraphIndex).toBe(5);
    });
  });

  describe('document confidence computation', () => {
    it('computes confidence for multi-paragraph document', () => {
      const document = `First paragraph with clear factual statements. According to research, this is proven.

Second paragraph that might be a bit uncertain. Perhaps this could work.

Third paragraph with citations [1] and references. The data clearly demonstrates the findings.`;

      const result = service.computeDocumentConfidence(document);

      expect(result.paragraphs.length).toBe(3);
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.summary.totalParagraphs).toBe(3);
    });

    it('identifies low confidence paragraphs in document', () => {
      const document = `This is a clear and factual statement with citations [1].

Maybe this might possibly be true? It seems unclear and uncertain.

This is definitely proven according to research.`;

      const result = service.computeDocumentConfidence(document);

      expect(result.lowConfidenceParagraphs.length).toBeGreaterThan(0);
      expect(result.summary.lowConfidenceCount).toBe(
        result.lowConfidenceParagraphs.length
      );
    });

    it('calculates correct summary statistics', () => {
      const document = `Paragraph one with moderate confidence.

Paragraph two with more confidence according to research.

Paragraph three might be uncertain perhaps.`;

      const result = service.computeDocumentConfidence(document);

      const confidences = result.paragraphs.map((p) => p.confidence);
      const average = confidences.reduce((a, b) => a + b, 0) / confidences.length;

      expect(result.summary.averageConfidence).toBeCloseTo(average, 2);
      expect(result.summary.lowestConfidence).toBe(Math.min(...confidences));
      expect(result.summary.highestConfidence).toBe(Math.max(...confidences));
    });

    it('handles empty document', () => {
      const result = service.computeDocumentConfidence('');

      expect(result.paragraphs.length).toBe(0);
      expect(result.overallConfidence).toBe(0);
      expect(result.summary.totalParagraphs).toBe(0);
    });

    it('stores document path when provided', () => {
      const result = service.computeDocumentConfidence(
        'Some content here.',
        '/path/to/document.md'
      );

      expect(result.documentPath).toBe('/path/to/document.md');
    });
  });

  describe('caching', () => {
    it('caches document confidence when path provided', () => {
      const path = '/test/document.md';
      const content = 'Test content for caching.';

      service.computeDocumentConfidence(content, path);
      const cached = service.getCachedDocumentConfidence(path);

      expect(cached).toBeDefined();
      expect(cached?.documentPath).toBe(path);
    });

    it('returns undefined for non-cached documents', () => {
      const cached = service.getCachedDocumentConfidence('/nonexistent/path.md');
      expect(cached).toBeUndefined();
    });

    it('clears specific document cache', () => {
      const path = '/test/document.md';
      service.computeDocumentConfidence('Content', path);

      service.clearCache(path);
      const cached = service.getCachedDocumentConfidence(path);

      expect(cached).toBeUndefined();
    });

    it('clears all cache when no path specified', () => {
      service.computeDocumentConfidence('Content 1', '/path/1.md');
      service.computeDocumentConfidence('Content 2', '/path/2.md');

      service.clearCache();

      expect(service.getCachedDocumentConfidence('/path/1.md')).toBeUndefined();
      expect(service.getCachedDocumentConfidence('/path/2.md')).toBeUndefined();
    });
  });

  describe('streaming support', () => {
    it('processes streaming text and calls update callback', () => {
      const updates: Array<{ paragraphIndex: number; confidence: number }> = [];

      service.processStreamingText(
        'session-1',
        'new text',
        'This is a complete paragraph with enough content to be analyzed.',
        (update) => {
          if (update.paragraphIndex !== undefined) {
            updates.push({
              paragraphIndex: update.paragraphIndex,
              confidence: update.confidence,
            });
          }
        }
      );

      expect(updates.length).toBeGreaterThan(0);
      expect(updates[0].paragraphIndex).toBe(0);
      expect(updates[0].confidence).toBeGreaterThan(0);
    });

    it('handles empty text gracefully', () => {
      const updates: unknown[] = [];

      service.processStreamingText('session-1', '', '', (update) => {
        updates.push(update);
      });

      expect(updates.length).toBe(0);
    });
  });

  describe('token probability analysis (future feature)', () => {
    it('falls back to heuristic when token probabilities disabled', () => {
      const text = 'Some text to analyze.';
      const tokenProbs = [
        { token: 'Some', logprob: -0.1, probability: 0.9 },
        { token: 'text', logprob: -0.2, probability: 0.8 },
      ];

      const result = service.analyzeWithTokenProbabilities(text, tokenProbs);

      // Should return normal heuristic result since enableTokenProbabilities is false
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.paragraphIndex).toBe(0);
    });

    it('returns heuristic result when token probabilities empty', () => {
      const enabledService = new ConfidenceScoringService({
        enableTokenProbabilities: true,
      });

      const result = enabledService.analyzeWithTokenProbabilities(
        'Some text.',
        []
      );

      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles very short paragraphs', () => {
      const shortText = 'Short.';
      const result = service.computeParagraphConfidence(shortText);

      // Short paragraphs should have lower length score
      expect(result.breakdown.lengthScore).toBeLessThan(1);
    });

    it('handles paragraphs with only questions', () => {
      const questionText = 'What is this? How does it work? Is it correct?';
      const result = service.computeParagraphConfidence(questionText);

      expect(result.breakdown.questionPenalty).toBeGreaterThan(0);
    });

    it('handles special characters', () => {
      const specialText =
        'This contains <special> characters & symbols! @#$% but is still valid.';
      const result = service.computeParagraphConfidence(specialText);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('handles unicode text', () => {
      const unicodeText =
        'This contains émoji 🎉 and other unicode characters like é, ñ, 中文.';
      const result = service.computeParagraphConfidence(unicodeText);

      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});
