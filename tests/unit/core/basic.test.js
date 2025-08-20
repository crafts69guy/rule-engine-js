const { createRuleEngine } = require('../../../src/index.js');

describe('Basic Engine Functionality', () => {
  let engine;

  beforeEach(() => {
    engine = createRuleEngine();
  });

  describe('Engine Creation', () => {
    it('should create engine with all required methods', () => {
      expect(engine).toBeDefined();
      expect(typeof engine.evaluateExpr).toBe('function');
      expect(typeof engine.registerOperator).toBe('function');
      expect(typeof engine.getOperators).toBe('function');
      expect(typeof engine.getMetrics).toBe('function');
      expect(typeof engine.clearCache).toBe('function');
    });

    it('should have all built-in operators', () => {
      const operators = engine.getOperators();

      // Check for core operators
      expect(operators).toContain('eq');
      expect(operators).toContain('neq');
      expect(operators).toContain('gt');
      expect(operators).toContain('gte');
      expect(operators).toContain('lt');
      expect(operators).toContain('lte');

      // Check for logical operators
      expect(operators).toContain('and');
      expect(operators).toContain('or');
      expect(operators).toContain('not');

      // Check for string operators
      expect(operators).toContain('contains');
      expect(operators).toContain('startsWith');
      expect(operators).toContain('endsWith');
      expect(operators).toContain('regex');

      // Check for array operators
      expect(operators).toContain('in');
      expect(operators).toContain('notIn');

      // Check for special operators
      expect(operators).toContain('between');
      expect(operators).toContain('isNull');
      expect(operators).toContain('isNotNull');

      expect(operators.length).toBeGreaterThanOrEqual(18);
    });
  });

  describe('Simple Rule Evaluation', () => {
    it('should evaluate simple equality rule', () => {
      const rule = { eq: ['user.name', 'John Doe'] };
      expectRuleToPass(engine, rule);
    });

    it('should evaluate simple inequality rule', () => {
      const rule = { neq: ['user.name', 'Jane Doe'] };
      expectRuleToPass(engine, rule);
    });

    it('should handle invalid operator gracefully', () => {
      const rule = { invalidOperator: ['test'] };
      const result = expectRuleToFail(engine, rule);
      expect(result.error).toContain('Unknown operator');
    });
  });

  describe('Dynamic Field Comparison', () => {
    it('should handle dynamic field comparison (your original use case)', () => {
      const rule = {
        and: [
          { lt: ['form.score', 'form.maxScore'] }, // 85 < 100
          { gte: ['form.score', 80] }, // 85 >= 80
        ],
      };

      expectRuleToPass(engine, rule);
    });

    it('should handle nested field comparisons', () => {
      const rule = {
        eq: ['user.profile.skills.0', 'javascript'],
      };
      expectRuleToPass(engine, rule);
    });

    it('should handle array index access', () => {
      const rule = {
        in: ['user.tags.0', ['admin', 'user', 'guest']],
      };
      expectRuleToPass(engine, rule);
    });
  });

  describe('Engine Configuration', () => {
    it('should create engine with custom configuration', () => {
      const customEngine = createRuleEngine({
        maxCacheSize: 50,
        enableCaching: false,
      });

      expect(customEngine).toBeDefined();
      expect(typeof customEngine.evaluateExpr).toBe('function');
    });

    it('should maintain separate engine instances', () => {
      const engine1 = createRuleEngine();
      const engine2 = createRuleEngine();

      expect(engine1).not.toBe(engine2);
      expect(engine1.getOperators()).toEqual(engine2.getOperators());
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined context gracefully', () => {
      const rule = { eq: ['user.name', 'John Doe'] };

      const result1 = engine.evaluateExpr(rule, null);
      expect(result1.success).toBe(false);

      const result2 = engine.evaluateExpr(rule, undefined);
      expect(result2.success).toBe(false);
    });

    it('should handle empty rule objects', () => {
      const result = engine.evaluateExpr({}, global.testContext);
      expect(result.success).toBe(false);
    });

    it('should handle malformed rule structures', () => {
      const malformedRules = [
        null,
        undefined,
        'string',
        123,
        [],
        { invalidStructure: { nested: 'incorrectly' } },
      ];

      malformedRules.forEach((rule) => {
        const result = engine.evaluateExpr(rule, global.testContext);
        expect(result.success).toBe(false);
      });
    });

    it('should provide detailed error information', () => {
      const rule = { eq: ['nonexistent.deeply.nested.field', 'value'] };
      const result = expectRuleToFail(engine, rule);

      expect(result.details).toBeDefined();
      expect(result.operator).toContain('eq');
    });
  });

  describe('Rule Validation', () => {
    it('should validate rule structure before evaluation', () => {
      const invalidRules = [
        { eq: 'not-an-array' },
        { and: 'not-an-array' },
        { or: {} },
        { between: ['value'] }, // missing range
      ];

      invalidRules.forEach((rule) => {
        const result = engine.evaluateExpr(rule, global.testContext);
        expect(result.success).toBe(false);
      });
    });

    it('should handle deeply nested rule structures', () => {
      const deepRule = {
        and: [
          {
            or: [
              {
                and: [{ eq: ['user.name', 'John Doe'] }, { gte: ['user.age', 18] }],
              },
              {
                not: [{ eq: ['user.role', 'guest'] }],
              },
            ],
          },
          { contains: ['user.email', '@'] },
        ],
      };

      expectRuleToPass(engine, deepRule);
    });
  });

  describe('Performance and Metrics', () => {
    it('should track basic performance metrics', () => {
      const rule = { eq: ['user.name', 'John Doe'] };

      // Clear metrics before test
      engine.clearCache();

      expectRuleToPass(engine, rule);

      const metrics = engine.getMetrics();
      console.log('metrics', metrics);
      expect(metrics.evaluations).toBeGreaterThan(0);
      expect(metrics.totalTime).toBeGreaterThan(0);
      expect(metrics.avgTime).toBeGreaterThan(0);
    });

    it('should handle concurrent evaluations', async () => {
      const rule = { eq: ['user.name', 'John Doe'] };
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(engine.evaluateExpr(rule, global.testContext)));
      }

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });
});
