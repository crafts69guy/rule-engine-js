const { createRuleEngine } = require('../../../src/index.js');

describe('Special Operators', () => {
  let engine;

  beforeEach(() => {
    engine = createRuleEngine();
  });

  describe('BETWEEN Operator', () => {
    it('should check if value is between static range', () => {
      expectRuleToPass(engine, { between: ['user.age', [18, 65]] });
      expectRuleToPass(engine, { between: ['user.age', [28, 28]] }); // Edge case: equal
      expectRuleToFail(engine, { between: ['user.age', [30, 65]] });
    });

    it('should check if value is between dynamic range', () => {
      const context = {
        product: { price: 99.99, priceRange: [50, 150] },
      };
      expectRuleToPass(engine, { between: ['product.price', 'product.priceRange'] }, context);
    });

    it('should handle dynamic range with dynamic values', () => {
      const context = {
        exam: { score: 85, minPass: 70, maxScore: 100 },
        range: [70, 100], // Alternative range
      };
      expectRuleToPass(engine, { between: ['exam.score', 'range'] }, context);
    });

    it('should handle decimal values', () => {
      const context = {
        product: { rating: 4.5 },
      };
      expectRuleToPass(engine, { between: ['product.rating', [4.0, 5.0]] }, context);
    });

    it('should handle edge cases (inclusive bounds)', () => {
      const context = { value: 10 };
      expectRuleToPass(engine, { between: ['value', [10, 20]] }, context); // Lower bound

      const context2 = { value: 20 };
      expectRuleToPass(engine, { between: ['value', [10, 20]] }, context2); // Upper bound
    });
  });

  describe('IS_NULL Operator', () => {
    it('should detect null values', () => {
      const context = { data: { value: null } };
      expectRuleToPass(engine, { isNull: ['data.value'] }, context);
    });

    it('should detect undefined values', () => {
      const context = { data: { value: undefined } };
      expectRuleToPass(engine, { isNull: ['data.value'] }, context);
    });

    it('should detect non-existent paths', () => {
      expectRuleToPass(engine, { isNull: ['user.nonexistent'] });
    });

    it('should reject non-null values', () => {
      expectRuleToFail(engine, { isNull: ['user.name'] });

      const context = { data: { value: 0 } };
      expectRuleToFail(engine, { isNull: ['data.value'] }, context);

      const context2 = { data: { value: false } };
      expectRuleToFail(engine, { isNull: ['data.value'] }, context2);

      const context3 = { data: { value: '' } };
      expectRuleToFail(engine, { isNull: ['data.value'] }, context3);
    });
  });

  describe('IS_NOT_NULL Operator', () => {
    it('should accept non-null values', () => {
      expectRuleToPass(engine, { isNotNull: ['user.name'] });

      const context = { data: { value: 0 } };
      expectRuleToPass(engine, { isNotNull: ['data.value'] }, context);

      const context2 = { data: { value: false } };
      expectRuleToPass(engine, { isNotNull: ['data.value'] }, context2);

      const context3 = { data: { value: '' } };
      expectRuleToPass(engine, { isNotNull: ['data.value'] }, context3);
    });

    it('should reject null values', () => {
      const context = { data: { value: null } };
      expectRuleToFail(engine, { isNotNull: ['data.value'] }, context);
    });

    it('should reject undefined values', () => {
      const context = { data: { value: undefined } };
      expectRuleToFail(engine, { isNotNull: ['data.value'] }, context);
    });

    it('should reject non-existent paths', () => {
      expectRuleToFail(engine, { isNotNull: ['user.nonexistent'] });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid range format in BETWEEN', () => {
      const result = engine.evaluateExpr(
        {
          between: ['user.age', [18]],
        },
        global.testContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires array of 2 values');
    });

    it('should handle non-numeric values in BETWEEN', () => {
      const result = engine.evaluateExpr(
        {
          between: ['user.name', ['a', 'z']],
        },
        global.testContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires numeric operands');
    });

    it('should handle non-array range in BETWEEN', () => {
      const result = engine.evaluateExpr(
        {
          between: ['user.age', 'not_an_array'],
        },
        global.testContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires array of 2 values');
    });
  });

  describe('Type Coercion in BETWEEN', () => {
    it('should handle strict mode', () => {
      const strictEngine = createRuleEngine({ strict: true });
      const context = { value: '25' }; // String

      const result = strictEngine.evaluateExpr(
        {
          between: ['value', [20, 30]],
        },
        context
      );
      expect(result.success).toBe(false);
    });

    it('should handle loose mode', () => {
      const looseEngine = createRuleEngine({ strict: false });
      const context = { value: '25' }; // String that can be coerced

      expectRuleToPass(looseEngine, { between: ['value', [20, 30]] }, context);
    });
  });
});
