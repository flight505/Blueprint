import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter, CLAUDE_MODELS } from './ModelRouter';

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();
  });

  describe('getModelForComplexity', () => {
    it('returns Haiku for simple complexity', () => {
      expect(router.getModelForComplexity('simple')).toBe(CLAUDE_MODELS.HAIKU);
    });

    it('returns Sonnet for medium complexity', () => {
      expect(router.getModelForComplexity('medium')).toBe(CLAUDE_MODELS.SONNET);
    });

    it('returns Opus for complex complexity', () => {
      expect(router.getModelForComplexity('complex')).toBe(CLAUDE_MODELS.OPUS);
    });
  });

  describe('getModelByName', () => {
    it('returns Haiku model by name', () => {
      expect(router.getModelByName('haiku')).toBe(CLAUDE_MODELS.HAIKU);
    });

    it('returns Sonnet model by name', () => {
      expect(router.getModelByName('sonnet')).toBe(CLAUDE_MODELS.SONNET);
    });

    it('returns Opus model by name', () => {
      expect(router.getModelByName('opus')).toBe(CLAUDE_MODELS.OPUS);
    });
  });

  describe('classifyTask', () => {
    describe('with explicit task type', () => {
      it('classifies autocomplete as simple', () => {
        const result = router.classifyTask('Complete this code', {
          taskType: 'autocomplete',
        });
        expect(result.complexity).toBe('simple');
        expect(result.model).toBe(CLAUDE_MODELS.HAIKU);
        expect(result.confidence).toBe(0.9);
      });

      it('classifies code_generation as medium', () => {
        const result = router.classifyTask('Generate a function', {
          taskType: 'code_generation',
        });
        expect(result.complexity).toBe('medium');
        expect(result.model).toBe(CLAUDE_MODELS.SONNET);
      });

      it('classifies architecture as complex', () => {
        const result = router.classifyTask('Design the system', {
          taskType: 'architecture',
        });
        expect(result.complexity).toBe('complex');
        expect(result.model).toBe(CLAUDE_MODELS.OPUS);
      });

      it('classifies planning as complex', () => {
        const result = router.classifyTask('Plan the project', {
          taskType: 'planning',
        });
        expect(result.complexity).toBe('complex');
        expect(result.model).toBe(CLAUDE_MODELS.OPUS);
      });

      it('classifies research as complex', () => {
        const result = router.classifyTask('Research best practices', {
          taskType: 'research',
        });
        expect(result.complexity).toBe('complex');
        expect(result.model).toBe(CLAUDE_MODELS.OPUS);
      });

      it('ignores unknown task type and uses keyword analysis', () => {
        const result = router.classifyTask('quick fix', {
          taskType: 'unknown',
        });
        // Should fall through to keyword analysis, not use task type directly
        expect(result.complexity).toBe('simple');
      });
    });

    describe('keyword-based classification', () => {
      it('classifies prompts with simple keywords as simple', () => {
        const result = router.classifyTask('autocomplete this line');
        expect(result.complexity).toBe('simple');
        expect(result.model).toBe(CLAUDE_MODELS.HAIKU);
      });

      it('classifies prompts with medium keywords as medium when prompt is long enough', () => {
        // Short prompts get +2 for simple due to length, so we need longer prompts
        // or multiple medium keywords to overcome that
        const result = router.classifyTask(
          'edit this function to add logging and then modify the tests and update the documentation'.repeat(
            3
          )
        );
        expect(result.complexity).toBe('medium');
        expect(result.model).toBe(CLAUDE_MODELS.SONNET);
      });

      it('classifies prompts with complex keywords as complex', () => {
        const result = router.classifyTask(
          'design a comprehensive system architecture'
        );
        expect(result.complexity).toBe('complex');
        expect(result.model).toBe(CLAUDE_MODELS.OPUS);
      });

      it('identifies "quick" as simple', () => {
        const result = router.classifyTask('quick suggestion for variable name');
        expect(result.complexity).toBe('simple');
      });

      it('identifies "plan" with multiple complex keywords as complex', () => {
        // Single keyword + short prompt = simple wins (short prompt gives +2 to simple)
        // Need multiple complex keywords to overcome the short prompt boost
        const result = router.classifyTask(
          'plan and design the comprehensive architecture with detailed analysis'
        );
        expect(result.complexity).toBe('complex');
      });

      it('identifies complex keywords in longer prompts', () => {
        // Longer prompt (>100 chars) removes the short prompt boost
        // Need multiple complex keywords to overcome medium score
        const longPrompt =
          'architect a comprehensive solution for the system, design the detailed architecture, and plan the full implementation strategy';
        expect(longPrompt.length).toBeGreaterThan(100);
        const result = router.classifyTask(longPrompt);
        // architect + comprehensive + detailed + design + plan = 5 complex keyword matches
        expect(result.complexity).toBe('complex');
      });
    });

    describe('length-based classification', () => {
      it('boosts simple score for short prompts (<= 100 chars)', () => {
        const shortPrompt = 'fix typo'; // 8 chars, has "fix typo" simple keyword
        const result = router.classifyTask(shortPrompt);
        expect(result.complexity).toBe('simple');
      });

      it('boosts complex score for lengthy content (> 500 chars)', () => {
        const longPrompt = 'a'.repeat(600);
        const result = router.classifyTask(longPrompt);
        // Long content adds +1 to complex score
        expect(result.reasoning).toContain('lengthy content');
      });

      it('considers selected text length in total length calculation', () => {
        const result = router.classifyTask('fix', {
          selectedText: 'a'.repeat(600),
        });
        expect(result.reasoning).toContain('lengthy content');
      });
    });

    describe('multi-step indicators', () => {
      it('detects step patterns and adds to complex score', () => {
        // Multi-step patterns add +1 per pattern. Need enough patterns + long prompt
        // to overcome simple boost (short prompts get +2 to simple)
        const result = router.classifyTask(
          'step 1: analyze the comprehensive architecture in detail, step 2: design the detailed solution, step 3: plan the full implementation strategy'
        );
        // Multiple step patterns + complex keywords (comprehensive, detailed, plan)
        expect(result.complexity).toBe('complex');
      });

      it('detects "first...then" pattern in longer prompts', () => {
        // Long prompt removes simple boost, then first...then pattern adds +1 to complex
        const result = router.classifyTask(
          'first analyze the entire codebase thoroughly and understand the architecture, then refactor all the components systematically'
        );
        expect(result.complexity).toBe('complex');
      });

      it('detects "multiple" keyword with complex keywords', () => {
        // "multiple" is a complex keyword from multi-step indicators (+1)
        // Combined with other complex keywords should tip the balance
        const result = router.classifyTask(
          'analyze multiple files and design a comprehensive solution for the architecture'
        );
        expect(result.complexity).toBe('complex');
      });

      it('detects numbered list pattern with complex keywords', () => {
        // Numbered list pattern adds +1, but need complex keywords to tip balance
        const result = router.classifyTask(
          '1. Analyze the comprehensive architecture\n2. Design detailed solutions\n3. Plan the full implementation\n4. Review the entire codebase'
        );
        // Multiple numbered patterns + complex keywords (comprehensive, detailed, plan, entire codebase)
        expect(result.complexity).toBe('complex');
      });
    });

    describe('confidence scoring', () => {
      it('returns higher confidence when one complexity clearly wins', () => {
        const result = router.classifyTask(
          'comprehensive detailed full system architecture design evaluation'
        );
        // Multiple complex keywords should result in higher confidence
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('caps confidence at 0.95', () => {
        const result = router.classifyTask(
          'autocomplete quick simple brief short one line suggest format'
        );
        // Even with many keyword matches, confidence should be capped
        expect(result.confidence).toBeLessThanOrEqual(0.95);
      });
    });

    describe('reasoning generation', () => {
      it('includes length description in reasoning', () => {
        const result = router.classifyTask('fix typo');
        expect(result.reasoning).toContain('short prompt');
      });

      it('mentions matched keywords when present', () => {
        const result = router.classifyTask('autocomplete this');
        expect(result.reasoning).toContain('matched simple keywords');
      });
    });
  });

  describe('getAvailableModels', () => {
    it('returns all three models', () => {
      const models = router.getAvailableModels();
      expect(models).toHaveLength(3);
    });

    it('includes Haiku as simple', () => {
      const models = router.getAvailableModels();
      const haiku = models.find((m) => m.name === 'Haiku');
      expect(haiku).toBeDefined();
      expect(haiku?.complexity).toBe('simple');
      expect(haiku?.id).toBe(CLAUDE_MODELS.HAIKU);
    });

    it('includes Sonnet as medium', () => {
      const models = router.getAvailableModels();
      const sonnet = models.find((m) => m.name === 'Sonnet');
      expect(sonnet).toBeDefined();
      expect(sonnet?.complexity).toBe('medium');
      expect(sonnet?.id).toBe(CLAUDE_MODELS.SONNET);
    });

    it('includes Opus as complex', () => {
      const models = router.getAvailableModels();
      const opus = models.find((m) => m.name === 'Opus');
      expect(opus).toBeDefined();
      expect(opus?.complexity).toBe('complex');
      expect(opus?.id).toBe(CLAUDE_MODELS.OPUS);
    });
  });

  describe('default model', () => {
    it('defaults to Sonnet', () => {
      expect(router.getDefaultModel()).toBe(CLAUDE_MODELS.SONNET);
    });

    it('can change default model', () => {
      router.setDefaultModel(CLAUDE_MODELS.OPUS);
      expect(router.getDefaultModel()).toBe(CLAUDE_MODELS.OPUS);
    });
  });
});
