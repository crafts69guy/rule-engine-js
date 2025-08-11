const { createRuleEngine } = require('../../../dist/index.cjs.js');

describe('Array Operators', () => {
  let engine;

  beforeEach(() => {
    engine = createRuleEngine();
  });

  describe('IN Operator', () => {
    it('should check if value is in static array', () => {
      expectRuleToPass(engine, { in: ['user.role', ['admin', 'user', 'guest']] });
      expectRuleToFail(engine, { in: ['user.role', ['guest', 'moderator']] });
    });

    it('should check if value is in dynamic array', () => {
      expectRuleToPass(engine, { in: ['admin', 'user.tags'] });
      expectRuleToPass(engine, { in: ['premium', 'user.tags'] });
      expectRuleToFail(engine, { in: ['banned', 'user.tags'] });
    });

    it('should handle mixed dynamic arrays', () => {
      const context = {
        user: { role: 'admin' },
        config: { allowedRoles: ['admin', 'moderator', 'user'] },
      };
      expectRuleToPass(engine, { in: ['user.role', 'config.allowedRoles'] }, context);
    });

    it('should handle number arrays', () => {
      const context = {
        scores: [85, 90, 78, 92],
        targetScore: 90,
      };
      expectRuleToPass(engine, { in: ['targetScore', 'scores'] }, context);
    });

    it('should handle string arrays with exact matching', () => {
      expectRuleToPass(engine, { in: ['javascript', 'user.profile.skills'] });
      expectRuleToFail(engine, { in: ['JavaScript', 'user.profile.skills'] }); // Case sensitive
    });
  });

  describe('NOT_IN Operator', () => {
    it('should check if value is not in static array', () => {
      expectRuleToPass(engine, { notIn: ['user.role', ['guest', 'banned']] });
      expectRuleToFail(engine, { notIn: ['user.role', ['admin', 'user']] });
    });

    it('should check if value is not in dynamic array', () => {
      expectRuleToPass(engine, { notIn: ['banned', 'user.tags'] });
      expectRuleToFail(engine, { notIn: ['admin', 'user.tags'] });
    });

    it('should handle mixed dynamic arrays', () => {
      const context = {
        user: { role: 'admin' },
        config: { bannedRoles: ['guest', 'suspended'] },
      };
      expectRuleToPass(engine, { notIn: ['user.role', 'config.bannedRoles'] }, context);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-array right operand', () => {
      const result = engine.evaluateExpr(
        {
          in: ['user.role', 'user.name'],
        },
        global.testContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires array as right operand');
    });

    it('should handle literal non-array', () => {
      const result = engine.evaluateExpr(
        {
          in: ['user.role', 'not_an_array'],
        },
        global.testContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires array as right operand');
    });
  });

  describe('Type Coercion', () => {
    it('should handle strict mode for arrays', () => {
      const strictEngine = createRuleEngine({ strict: true });
      const context = { nums: [1, 2, 3], str: '1' };

      expectRuleToFail(strictEngine, { in: ['str', 'nums'] }, context);
    });

    it('should handle loose mode for arrays', () => {
      const looseEngine = createRuleEngine({ strict: false });
      const context = { nums: [1, 2, 3], str: '1' };

      expectRuleToPass(looseEngine, { in: ['str', 'nums'] }, context);
    });
  });
});
