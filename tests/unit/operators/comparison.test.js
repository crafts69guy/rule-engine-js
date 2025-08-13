const { createRuleEngine } = require('../../../src/index.js');

describe('Comparison Operators', () => {
  let engine;

  beforeEach(() => {
    engine = createRuleEngine();
  });

  describe('EQ Operator', () => {
    it('should handle exact equality', () => {
      expectRuleToPass(engine, { eq: ['user.name', 'John Doe'] });
      expectRuleToFail(engine, { eq: ['user.name', 'Jane Doe'] });
    });

    it('should handle dynamic field comparison', () => {
      const context = { form: { a: 10, b: 10, c: 5 } };
      expectRuleToPass(engine, { eq: ['form.a', 'form.b'] }, context);
      expectRuleToFail(engine, { eq: ['form.a', 'form.c'] }, context);
    });

    it('should handle number equality', () => {
      expectRuleToPass(engine, { eq: ['user.age', 28] });
      expectRuleToFail(engine, { eq: ['user.age', 30] });
    });

    it('should handle boolean equality', () => {
      const context = { flags: { active: true, archived: false } };
      expectRuleToPass(engine, { eq: ['flags.active', true] }, context);
      expectRuleToPass(engine, { eq: ['flags.archived', false] }, context);
    });
  });

  describe('NEQ Operator', () => {
    it('should handle inequality', () => {
      expectRuleToPass(engine, { neq: ['user.name', 'Jane Doe'] });
      expectRuleToFail(engine, { neq: ['user.name', 'John Doe'] });
    });

    it('should handle dynamic field inequality', () => {
      const context = { form: { a: 10, b: 5 } };
      expectRuleToPass(engine, { neq: ['form.a', 'form.b'] }, context);
    });
  });

  describe('Numeric Comparisons', () => {
    it('should handle GT operator', () => {
      expectRuleToPass(engine, { gt: ['user.age', 25] });
      expectRuleToFail(engine, { gt: ['user.age', 30] });
      expectRuleToFail(engine, { gt: ['user.age', 28] }); // Equal case
    });

    it('should handle GTE operator', () => {
      expectRuleToPass(engine, { gte: ['user.age', 28] }); // Equal case
      expectRuleToPass(engine, { gte: ['user.age', 25] });
      expectRuleToFail(engine, { gte: ['user.age', 30] });
    });

    it('should handle LT operator', () => {
      expectRuleToPass(engine, { lt: ['user.age', 30] });
      expectRuleToFail(engine, { lt: ['user.age', 25] });
      expectRuleToFail(engine, { lt: ['user.age', 28] }); // Equal case
    });

    it('should handle LTE operator', () => {
      expectRuleToPass(engine, { lte: ['user.age', 28] }); // Equal case
      expectRuleToPass(engine, { lte: ['user.age', 30] });
      expectRuleToFail(engine, { lte: ['user.age', 25] });
    });

    it('should handle dynamic numeric comparison', () => {
      const context = { form: { score: 85, maxScore: 100, minScore: 0 } };
      expectRuleToPass(engine, { lt: ['form.score', 'form.maxScore'] }, context);
      expectRuleToPass(engine, { gt: ['form.score', 'form.minScore'] }, context);
      expectRuleToPass(engine, { gte: ['form.maxScore', 'form.score'] }, context);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid arguments', () => {
      const result = engine.evaluateExpr({ eq: ['user.name'] }, global.testContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('EQ operator requires 2-3 arguments');
    });

    it('should handle non-numeric values in numeric operators', () => {
      const result = engine.evaluateExpr({ gt: ['user.name', 'user.email'] }, global.testContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires numeric operands');
    });
  });
});
