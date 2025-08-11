const { createRuleEngine, createRuleHelpers } = require('../../../dist/index.cjs.js');

describe('Rule Helpers', () => {
  let engine;
  let h;

  beforeEach(() => {
    engine = createRuleEngine();
    h = createRuleHelpers();
  });

  describe('Basic Operators', () => {
    it('should create equality rules', () => {
      const rule = h.eq('user.name', 'John Doe');
      expectRuleToPass(engine, rule);

      const rule2 = h.neq('user.name', 'Jane Doe');
      expectRuleToPass(engine, rule2);
    });

    it('should create numeric comparison rules', () => {
      expectRuleToPass(engine, h.gt('user.age', 25));
      expectRuleToPass(engine, h.gte('user.age', 28));
      expectRuleToPass(engine, h.lt('user.age', 30));
      expectRuleToPass(engine, h.lte('user.age', 28));
    });

    it('should handle options parameter', () => {
      const rule = h.eq('user.age', '28', { strict: false });
      expectRuleToPass(engine, rule);
    });
  });

  describe('Logical Operators', () => {
    it('should create AND rules', () => {
      const rule = h.and(
        h.eq('user.name', 'John Doe'),
        h.gte('user.age', 18),
        h.eq('user.role', 'admin')
      );
      expectRuleToPass(engine, rule);
    });

    it('should create OR rules', () => {
      const rule = h.or(h.eq('user.role', 'admin'), h.eq('user.role', 'moderator'));
      expectRuleToPass(engine, rule);
    });

    it('should create NOT rules', () => {
      const rule = h.not(h.eq('user.name', 'Jane Doe'));
      expectRuleToPass(engine, rule);
    });

    it('should handle nested logical operations', () => {
      const rule = h.and(
        h.or(h.eq('user.role', 'admin'), h.eq('user.role', 'moderator')),
        h.gte('user.age', 18)
      );
      expectRuleToPass(engine, rule);
    });
  });

  describe('String Operators', () => {
    it('should create string operation rules', () => {
      expectRuleToPass(engine, h.contains('user.email', '@company.com'));
      expectRuleToPass(engine, h.startsWith('user.name', 'John'));
      expectRuleToPass(engine, h.endsWith('user.email', '.com'));
    });

    it('should create regex rules', () => {
      expectRuleToPass(engine, h.regex('user.email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$'));
    });

    it('should handle regex with flags', () => {
      expectRuleToPass(engine, h.regex('user.profile.bio', 'software', { flags: 'i' }));
    });
  });

  describe('Array Operators', () => {
    it('should create array membership rules', () => {
      expectRuleToPass(engine, h.in('user.role', ['admin', 'user', 'guest']));
      expectRuleToPass(engine, h.notIn('user.role', ['banned', 'suspended']));
    });

    it('should handle dynamic arrays', () => {
      expectRuleToPass(engine, h.in('admin', 'user.tags'));
      expectRuleToPass(engine, h.notIn('banned', 'user.tags'));
    });
  });

  describe('Special Operators', () => {
    it('should create BETWEEN rules', () => {
      expectRuleToPass(engine, h.between('user.age', [18, 65]));
    });

    it('should create null check rules', () => {
      expectRuleToPass(engine, h.isNotNull('user.name'));
      expectRuleToPass(engine, h.isNull('user.nonexistent'));
    });
  });

  describe('Convenience Methods', () => {
    it('should create boolean check rules', () => {
      const context = { flags: { active: true, disabled: false } };
      expectRuleToPass(engine, h.isTrue('flags.active'), context);
      expectRuleToPass(engine, h.isFalse('flags.disabled'), context);
    });

    it('should create empty/non-empty check rules', () => {
      const context = { data: { empty: '', filled: 'content' } };
      expectRuleToPass(engine, h.isEmpty('data.empty'), context);
      expectRuleToPass(engine, h.isNotEmpty('data.filled'), context);
    });

    it('should create exists check rules', () => {
      expectRuleToPass(engine, h.exists('user.name'));
      expectRuleToFail(engine, h.exists('user.nonexistent'));

      const context = { data: { empty: '', nullValue: null, zero: 0 } };
      expectRuleToFail(engine, h.exists('data.empty'), context);
      expectRuleToFail(engine, h.exists('data.nullValue'), context);
      expectRuleToPass(engine, h.exists('data.zero'), context); // 0 should exist
    });
  });

  describe('Field Comparison Helpers', () => {
    it('should create dynamic field comparison rules', () => {
      const context = { form: { score: 85, maxScore: 100, minScore: 0 } };

      expectRuleToPass(engine, h.field.lessThan('form.score', 'form.maxScore'), context);
      expectRuleToPass(engine, h.field.greaterThan('form.score', 'form.minScore'), context);
      expectRuleToPass(engine, h.field.lessThanOrEqual('form.maxScore', 'form.maxScore'), context);
    });

    it('should handle your original use case', () => {
      const context = { form: { a: 15, b: 8 } };

      const rule = h.and(
        h.field.greaterThanOrEqual('form.a', 'form.b'), // 15 >= 8
        h.lt('form.b', 10) // 8 < 10
      );

      expectRuleToPass(engine, rule, context);
    });
  });

  describe('Validation Helpers', () => {
    it('should create email validation rules', () => {
      expectRuleToPass(engine, h.validation.email('user.email'));
    });

    it('should create required field validation', () => {
      expectRuleToPass(engine, h.validation.required('user.name'));
      expectRuleToFail(engine, h.validation.required('user.nonexistent'));
    });

    it('should create age validation rules', () => {
      expectRuleToPass(engine, h.validation.minAge('user.age', 18));
      expectRuleToPass(engine, h.validation.maxAge('user.age', 65));
      expectRuleToPass(engine, h.validation.ageRange('user.age', 18, 65));
    });

    it('should create choice validation rules', () => {
      expectRuleToPass(engine, h.validation.oneOf('user.role', ['admin', 'user', 'guest']));
    });
  });

  describe('API Consistency', () => {
    it('should produce same results as raw syntax', () => {
      // Helper syntax
      const helperRule = h.and(h.eq('user.name', 'John Doe'), h.gte('user.age', 18));

      // Raw syntax
      const rawRule = {
        and: [{ eq: ['user.name', 'John Doe'] }, { gte: ['user.age', 18] }],
      };

      const helperResult = engine.evaluateExpr(helperRule, global.testContext);
      const rawResult = engine.evaluateExpr(rawRule, global.testContext);

      expect(helperResult.success).toBe(rawResult.success);
      expect(helperResult.success).toBe(true);
    });
  });

  describe('Complex Real-World Examples', () => {
    it('should handle user access control', () => {
      const rule = h.and(
        h.validation.required('user.name'),
        h.validation.email('user.email'),
        h.or(
          h.eq('user.role', 'admin'),
          h.and(h.eq('user.role', 'user'), h.validation.minAge('user.age', 18))
        ),
        h.in('admin', 'user.tags')
      );

      expectRuleToPass(engine, rule);
    });

    it('should handle form validation with dynamic comparison', () => {
      const context = {
        form: {
          password: 'secret123',
          confirmPassword: 'secret123',
          age: 25,
          agreedToTerms: true,
        },
      };

      const rule = h.and(
        h.validation.required('form.password'),
        h.field.equals('form.password', 'form.confirmPassword'),
        h.validation.minAge('form.age', 18),
        h.isTrue('form.agreedToTerms')
      );

      expectRuleToPass(engine, rule, context);
    });
  });
});
