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
  });
});
