/**
 * Tests for StructuredOutputSchemas - Validates Zod schemas produce correct
 * JSON schemas and parse valid/invalid data correctly.
 */

import { describe, it, expect } from 'vitest';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import {
  ConfidenceAnalysisSchema,
  CitationExtractionSchema,
  PhasePlanSchema,
  TaskClassificationSchema,
  DocumentSummarySchema,
  ResearchSynthesisSchema,
} from './StructuredOutputSchemas';

describe('StructuredOutputSchemas', () => {
  describe('ConfidenceAnalysisSchema', () => {
    it('should parse valid confidence analysis data', () => {
      const validData = {
        overall_score: 0.85,
        reasoning: 'High confidence based on strong factual claims',
        claims: [
          {
            text: 'The market is growing at 15% CAGR',
            confidence: 0.9,
            category: 'factual' as const,
            needs_citation: true,
          },
        ],
        flags: ['Contains one unsupported claim'],
      };

      const result = ConfidenceAnalysisSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overall_score).toBe(0.85);
        expect(result.data.claims).toHaveLength(1);
      }
    });

    it('should reject invalid confidence scores', () => {
      const invalidData = {
        overall_score: 1.5, // Out of range
        reasoning: 'test',
        claims: [],
        flags: [],
      };

      const result = ConfidenceAnalysisSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid claim categories', () => {
      const invalidData = {
        overall_score: 0.5,
        reasoning: 'test',
        claims: [
          {
            text: 'A claim',
            confidence: 0.5,
            category: 'invalid_category',
            needs_citation: false,
          },
        ],
        flags: [],
      };

      const result = ConfidenceAnalysisSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should produce a valid zodOutputFormat', () => {
      const format = zodOutputFormat(ConfidenceAnalysisSchema);
      expect(format.type).toBe('json_schema');
      expect(format.schema).toBeDefined();
      expect(typeof format.parse).toBe('function');
    });
  });

  describe('CitationExtractionSchema', () => {
    it('should parse valid citation extraction data', () => {
      const validData = {
        citations: [
          {
            title: 'A Study on AI',
            authors: ['John Doe', 'Jane Smith'],
            url: 'https://example.com/study',
            date: '2024-01-15',
            publisher: 'Nature',
            claim: 'AI capabilities have improved 10x in the last year',
            doi: '10.1234/test',
          },
        ],
        uncited_claims: ['The market will grow to $100B by 2030'],
      };

      const result = CitationExtractionSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.citations).toHaveLength(1);
        expect(result.data.citations[0].doi).toBe('10.1234/test');
      }
    });

    it('should allow citations without optional fields', () => {
      const minimalData = {
        citations: [
          {
            title: 'Minimal citation',
            claim: 'Some claim',
          },
        ],
        uncited_claims: [],
      };

      const result = CitationExtractionSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should produce a valid zodOutputFormat', () => {
      const format = zodOutputFormat(CitationExtractionSchema);
      expect(format.type).toBe('json_schema');
      expect(typeof format.parse).toBe('function');
    });
  });

  describe('PhasePlanSchema', () => {
    it('should parse valid phase plan data', () => {
      const validData = {
        phase_name: 'Market Research',
        summary: 'Comprehensive market analysis completed',
        key_findings: ['Market growing at 15% CAGR', 'Key competitor is Company X'],
        action_items: [
          {
            title: 'Conduct user interviews',
            description: 'Interview 20 target users',
            priority: 'high' as const,
            estimated_effort: '2 weeks',
          },
        ],
        risks: [
          {
            description: 'Market may contract',
            severity: 'medium' as const,
            mitigation: 'Diversify target segments',
          },
        ],
        dependencies: ['Technical feasibility phase'],
        confidence_level: 0.8,
      };

      const result = PhasePlanSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid priority values', () => {
      const invalidData = {
        phase_name: 'Test',
        summary: 'Test',
        key_findings: [],
        action_items: [
          {
            title: 'Test',
            description: 'Test',
            priority: 'critical', // Invalid
          },
        ],
        risks: [],
        confidence_level: 0.5,
      };

      const result = PhasePlanSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should produce a valid zodOutputFormat', () => {
      const format = zodOutputFormat(PhasePlanSchema);
      expect(format.type).toBe('json_schema');
    });
  });

  describe('TaskClassificationSchema', () => {
    it('should parse valid classification data', () => {
      const validData = {
        complexity: 'complex' as const,
        task_type: 'architecture' as const,
        reasoning: 'Multi-step system design requiring deep analysis',
        suggested_model: 'opus' as const,
        estimated_tokens: 4000,
      };

      const result = TaskClassificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should produce a valid zodOutputFormat', () => {
      const format = zodOutputFormat(TaskClassificationSchema);
      expect(format.type).toBe('json_schema');
    });
  });

  describe('DocumentSummarySchema', () => {
    it('should parse valid document summary data', () => {
      const validData = {
        title: 'Architecture Decision Record',
        summary: 'Key decisions about the system architecture',
        key_points: ['Use microservices', 'Deploy on AWS'],
        topics: ['architecture', 'deployment', 'scaling'],
        decisions: [
          {
            decision: 'Use PostgreSQL',
            context: 'Need ACID compliance and JSON support',
          },
        ],
        action_items: ['Set up CI/CD pipeline'],
        sentiment: 'positive' as const,
      };

      const result = DocumentSummarySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow minimal data without optional fields', () => {
      const minimalData = {
        title: 'Test',
        summary: 'Test summary',
        key_points: ['Point 1'],
        topics: ['topic1'],
      };

      const result = DocumentSummarySchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should produce a valid zodOutputFormat', () => {
      const format = zodOutputFormat(DocumentSummarySchema);
      expect(format.type).toBe('json_schema');
    });
  });

  describe('ResearchSynthesisSchema', () => {
    it('should parse valid research synthesis data', () => {
      const validData = {
        topic: 'AI-powered code review tools',
        synthesis: 'Multiple tools exist with varying approaches...',
        sources_used: 5,
        key_insights: [
          {
            insight: 'Static analysis is being augmented with LLMs',
            confidence: 'high' as const,
            source_count: 3,
          },
        ],
        contradictions: [
          {
            claim_a: 'LLMs reduce bugs by 50%',
            claim_b: 'LLMs introduce new bug categories',
            resolution: 'Both may be true - net effect depends on usage patterns',
          },
        ],
        gaps: ['No studies on long-term maintenance impact'],
      };

      const result = ResearchSynthesisSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should produce a valid zodOutputFormat', () => {
      const format = zodOutputFormat(ResearchSynthesisSchema);
      expect(format.type).toBe('json_schema');
    });
  });

  describe('zodOutputFormat integration', () => {
    it('should parse valid JSON through zodOutputFormat for each schema', () => {
      const schemas = [
        {
          schema: ConfidenceAnalysisSchema,
          json: JSON.stringify({
            overall_score: 0.7,
            reasoning: 'Test',
            claims: [],
            flags: [],
          }),
        },
        {
          schema: CitationExtractionSchema,
          json: JSON.stringify({
            citations: [],
            uncited_claims: [],
          }),
        },
        {
          schema: PhasePlanSchema,
          json: JSON.stringify({
            phase_name: 'Test',
            summary: 'Test',
            key_findings: [],
            action_items: [],
            risks: [],
            confidence_level: 0.5,
          }),
        },
        {
          schema: DocumentSummarySchema,
          json: JSON.stringify({
            title: 'Test',
            summary: 'Test',
            key_points: [],
            topics: [],
          }),
        },
      ];

      for (const { schema, json } of schemas) {
        const format = zodOutputFormat(schema);
        const parsed = format.parse(json);
        expect(parsed).toBeDefined();
      }
    });

    it('should throw on invalid JSON through zodOutputFormat', () => {
      const format = zodOutputFormat(ConfidenceAnalysisSchema);
      expect(() => format.parse('not valid json')).toThrow();
    });

    it('should throw on valid JSON that does not match schema', () => {
      const format = zodOutputFormat(ConfidenceAnalysisSchema);
      expect(() => format.parse(JSON.stringify({ wrong: 'shape' }))).toThrow();
    });
  });
});
