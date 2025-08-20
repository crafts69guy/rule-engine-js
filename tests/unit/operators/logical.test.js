const { createRuleEngine } = require('../../../src/index.js');

describe('Logical Operators', () => {
  let engine;

  beforeEach(() => {
    engine = createRuleEngine();
  });

  describe('AND Operator', () => {
    it('should require all conditions to be true', () => {
      const rule = {
        and: [
          { eq: ['user.name', 'John Doe'] }, // true
          { gte: ['user.age', 18] }, // true
          { eq: ['user.role', 'admin'] }, // true
        ],
      };
      expectRuleToPass(engine, rule);
    });

    it('should fail if any condition is false', () => {
      const rule = {
        and: [
          { eq: ['user.name', 'John Doe'] }, // true
          { gte: ['user.age', 18] }, // true
          { eq: ['user.role', 'guest'] }, // false
        ],
      };
      expectRuleToFail(engine, rule);
    });

    it('should handle nested AND conditions', () => {
      const rule = {
        and: [
          { eq: ['user.name', 'John Doe'] },
          {
            and: [{ gte: ['user.age', 18] }, { eq: ['user.role', 'admin'] }],
          },
        ],
      };
      expectRuleToPass(engine, rule);
    });

    it('should handle empty AND (should fail)', () => {
      const result = engine.evaluateExpr({ and: [] }, global.testContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least one argument');
    });
  });

  describe('OR Operator', () => {
    it('should pass if any condition is true', () => {
      const rule = {
        or: [
          { eq: ['user.name', 'Jane Doe'] }, // false
          { gte: ['user.age', 18] }, // true
          { eq: ['user.role', 'guest'] }, // false
        ],
      };
      expectRuleToPass(engine, rule);
    });

    it('should fail if all conditions are false', () => {
      const rule = {
        or: [
          { eq: ['user.name', 'Jane Doe'] }, // false
          { lt: ['user.age', 18] }, // false
          { eq: ['user.role', 'guest'] }, // false
        ],
      };
      expectRuleToFail(engine, rule);
    });

    it('should handle nested OR conditions', () => {
      const rule = {
        or: [
          { eq: ['user.name', 'Jane Doe'] }, // false
          {
            or: [
              { gte: ['user.age', 18] }, // true
              { eq: ['user.role', 'guest'] }, // false
            ],
          },
        ],
      };
      expectRuleToPass(engine, rule);
    });
  });

  describe('NOT Operator', () => {
    it('should negate true condition', () => {
      const rule = {
        not: [
          { eq: ['user.name', 'Jane Doe'] }, // false, so NOT false = true
        ],
      };
      expectRuleToPass(engine, rule);
    });

    it('should negate false condition', () => {
      const rule = {
        not: [
          { eq: ['user.name', 'John Doe'] }, // true, so NOT true = false
        ],
      };
      expectRuleToFail(engine, rule);
    });

    it('should require exactly one argument', () => {
      const result = engine.evaluateExpr({ not: [] }, global.testContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires 1 arguments');
    });

    it('should handle nested NOT conditions', () => {
      const rule = {
        not: [
          {
            and: [
              { eq: ['user.name', 'Jane Doe'] }, // false
              { eq: ['user.role', 'admin'] }, // true
            ],
          },
        ],
      };
      // NOT (false AND true) = NOT false = true
      expectRuleToPass(engine, rule);
    });
  });

  describe('Complex Logical Combinations', () => {
    it('should handle complex AND/OR/NOT combinations', () => {
      const rule = {
        and: [
          {
            or: [
              { eq: ['user.role', 'admin'] }, // true
              { eq: ['user.role', 'moderator'] }, // false
            ],
          },
          {
            not: [
              { lt: ['user.age', 18] }, // false, so NOT false = true
            ],
          },
        ],
      };
      // (true OR false) AND (NOT false) = true AND true = true
      expectRuleToPass(engine, rule);
    });

    it('should handle deeply nested logical structures', () => {
      const rule = {
        or: [
          {
            and: [
              { eq: ['user.role', 'guest'] }, // false
              { gte: ['user.age', 21] }, // true
            ],
          },
          {
            and: [
              { eq: ['user.role', 'admin'] }, // true
              {
                not: [
                  { contains: ['user.email', 'temp'] }, // false (no temp in john@company.com)
                ],
              },
            ],
          },
        ],
      };
      // (false AND true) OR (true AND NOT false) = false OR true = true
      expectRuleToPass(engine, rule);
    });

    it('should short-circuit AND operations correctly', () => {
      const rule = {
        and: [
          { eq: ['user.name', 'Jane Doe'] }, // false - should short-circuit
          { eq: ['nonexistent.field', 'value'] }, // would fail if evaluated
        ],
      };
      const result = expectRuleToFail(engine, rule);
      expect(result.success).toBe(false);
    });

    it('should short-circuit OR operations correctly', () => {
      const rule = {
        or: [
          { eq: ['user.name', 'John Doe'] }, // true - should short-circuit
          { eq: ['nonexistent.field', 'value'] }, // would fail if evaluated
        ],
      };
      expectRuleToPass(engine, rule);
    });

    it('should handle mixed logical operators with different data types', () => {
      const rule = {
        and: [
          {
            or: [
              { gte: ['user.age', 25] }, // true (28 >= 25)
              { contains: ['user.role', 'mod'] }, // false
            ],
          },
          {
            not: [
              { in: ['user.name', ['Jane', 'Bob', 'Alice']] }, // false (John not in list)
            ],
          },
        ],
      };
      expectRuleToPass(engine, rule);
    });
  });

  describe('Performance with Logical Operations', () => {
    it('should handle large logical expressions efficiently', () => {
      const conditions = [];
      for (let i = 0; i < 20; i++) {
        conditions.push({ gte: ['user.age', i] }); // user.age is 28, so many will be true
      }

      const rule = { or: conditions };
      const startTime = Date.now();
      expectRuleToPass(engine, rule);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
