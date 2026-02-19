/**
 * StructuredOutputSchemas - Zod schemas for Claude structured outputs
 *
 * Defines reusable Zod schemas for data extraction tasks. Used with the
 * Anthropic SDK's `messages.parse()` and `zodOutputFormat()` helpers to
 * get validated, typed responses from Claude.
 */

import { z } from 'zod';

// ==================== Confidence Analysis ====================

/**
 * Schema for AI-powered confidence analysis of a text paragraph.
 * Complements the heuristic-based ConfidenceScoringService with
 * Claude's deeper understanding of claim reliability.
 */
export const ConfidenceAnalysisSchema = z.object({
  overall_score: z
    .number()
    .min(0)
    .max(1)
    .describe('Overall confidence score from 0.0 (no confidence) to 1.0 (fully confident)'),
  reasoning: z
    .string()
    .describe('Brief explanation of why this confidence score was assigned'),
  claims: z.array(
    z.object({
      text: z.string().describe('The specific claim or assertion'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Confidence score for this specific claim'),
      category: z
        .enum(['factual', 'opinion', 'speculative', 'well_sourced', 'unverifiable'])
        .describe('Category of the claim'),
      needs_citation: z
        .boolean()
        .describe('Whether this claim would benefit from a citation'),
    })
  ).describe('Individual claims identified in the text'),
  flags: z
    .array(z.string())
    .describe('Warning flags such as hedging language, unsupported claims, etc.'),
});

export type ConfidenceAnalysis = z.infer<typeof ConfidenceAnalysisSchema>;

// ==================== Citation Extraction ====================

/**
 * Schema for extracting citation metadata from unstructured text.
 * Used when parsing research responses that contain inline citations.
 */
export const CitationExtractionSchema = z.object({
  citations: z.array(
    z.object({
      title: z.string().describe('Title of the cited source'),
      authors: z
        .array(z.string())
        .optional()
        .describe('Author names if identifiable'),
      url: z
        .string()
        .optional()
        .describe('URL of the source if available'),
      date: z
        .string()
        .optional()
        .describe('Publication date if identifiable (ISO 8601 or natural language)'),
      publisher: z
        .string()
        .optional()
        .describe('Publisher or website name'),
      claim: z
        .string()
        .describe('The specific claim or statement this citation supports'),
      doi: z
        .string()
        .optional()
        .describe('DOI if identifiable'),
    })
  ).describe('Citations extracted from the text'),
  uncited_claims: z
    .array(z.string())
    .describe('Significant factual claims in the text that lack citations'),
});

export type CitationExtraction = z.infer<typeof CitationExtractionSchema>;

// ==================== Phase Plan ====================

/**
 * Schema for a structured project phase plan.
 * Used by PhaseOrchestrator to get structured planning output from Claude.
 */
export const PhasePlanSchema = z.object({
  phase_name: z.string().describe('Name of the project phase'),
  summary: z.string().describe('Brief summary of the phase plan'),
  key_findings: z
    .array(z.string())
    .describe('Key findings or recommendations'),
  action_items: z.array(
    z.object({
      title: z.string().describe('Action item title'),
      description: z.string().describe('Detailed description'),
      priority: z
        .enum(['high', 'medium', 'low'])
        .describe('Priority level'),
      estimated_effort: z
        .string()
        .optional()
        .describe('Estimated effort (e.g., "2 days", "1 sprint")'),
    })
  ).describe('Concrete action items from this phase'),
  risks: z.array(
    z.object({
      description: z.string().describe('Risk description'),
      severity: z.enum(['high', 'medium', 'low']).describe('Risk severity'),
      mitigation: z.string().describe('Suggested mitigation strategy'),
    })
  ).describe('Identified risks and mitigations'),
  dependencies: z
    .array(z.string())
    .optional()
    .describe('Dependencies on other phases or external factors'),
  confidence_level: z
    .number()
    .min(0)
    .max(1)
    .describe('Self-assessed confidence in the analysis (0.0-1.0)'),
});

export type PhasePlan = z.infer<typeof PhasePlanSchema>;

// ==================== Task Classification ====================

/**
 * Schema for AI-based task classification.
 * Can be used by ModelRouter for more nuanced task complexity assessment.
 */
export const TaskClassificationSchema = z.object({
  complexity: z
    .enum(['simple', 'medium', 'complex'])
    .describe('Task complexity level'),
  task_type: z
    .enum([
      'autocomplete',
      'quick_suggestion',
      'formatting',
      'inline_edit',
      'code_generation',
      'refactoring',
      'planning',
      'architecture',
      'research',
      'analysis',
    ])
    .describe('Detected task type category'),
  reasoning: z
    .string()
    .describe('Brief explanation of the classification'),
  suggested_model: z
    .enum(['haiku', 'sonnet', 'opus'])
    .describe('Suggested Claude model for this task'),
  estimated_tokens: z
    .number()
    .optional()
    .describe('Estimated output tokens needed'),
});

export type TaskClassification = z.infer<typeof TaskClassificationSchema>;

// ==================== Document Summary ====================

/**
 * Schema for structured document summaries.
 * Used for context compaction and document overview generation.
 */
export const DocumentSummarySchema = z.object({
  title: z.string().describe('Inferred or provided document title'),
  summary: z.string().describe('Concise summary of the document content'),
  key_points: z
    .array(z.string())
    .describe('Key points or takeaways from the document'),
  topics: z
    .array(z.string())
    .describe('Main topics covered in the document'),
  decisions: z
    .array(
      z.object({
        decision: z.string().describe('The decision that was made'),
        context: z.string().describe('Context or reasoning for the decision'),
      })
    )
    .optional()
    .describe('Key decisions mentioned in the document'),
  action_items: z
    .array(z.string())
    .optional()
    .describe('Pending action items or tasks mentioned'),
  sentiment: z
    .enum(['positive', 'neutral', 'negative', 'mixed'])
    .optional()
    .describe('Overall sentiment of the content'),
});

export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;

// ==================== Research Synthesis ====================

/**
 * Schema for synthesizing research results from multiple sources.
 */
export const ResearchSynthesisSchema = z.object({
  topic: z.string().describe('The research topic or question'),
  synthesis: z.string().describe('Synthesized answer combining insights from all sources'),
  sources_used: z
    .number()
    .describe('Number of sources referenced in the synthesis'),
  key_insights: z.array(
    z.object({
      insight: z.string().describe('A specific insight or finding'),
      confidence: z
        .enum(['high', 'medium', 'low'])
        .describe('Confidence in this insight'),
      source_count: z
        .number()
        .describe('Number of sources supporting this insight'),
    })
  ).describe('Key insights from the research'),
  contradictions: z
    .array(
      z.object({
        claim_a: z.string().describe('First conflicting claim'),
        claim_b: z.string().describe('Second conflicting claim'),
        resolution: z
          .string()
          .optional()
          .describe('Suggested resolution or note on the contradiction'),
      })
    )
    .optional()
    .describe('Contradictions found across sources'),
  gaps: z
    .array(z.string())
    .optional()
    .describe('Knowledge gaps or areas needing further research'),
});

export type ResearchSynthesis = z.infer<typeof ResearchSynthesisSchema>;
