const { createRuleEngine, createRuleHelpers } = require('../../../src/index.js');

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

describe('RuleHelpers - Comprehensive Branch Coverage', () => {
  let engine;
  let h;

  beforeEach(() => {
    engine = createRuleEngine();
    h = createRuleHelpers();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize all helper objects in constructor', () => {
      expect(h.ops).toBeDefined();
      expect(h.field).toBeDefined();
      expect(h.validation).toBeDefined();

      // Verify ops contains expected operator names
      expect(h.ops.EQ).toBe('eq');
      expect(h.ops.GT).toBe('gt');
      expect(h.ops.AND).toBe('and');
      expect(h.ops.CONTAINS).toBe('contains');
    });

    it('should create separate instances with independent state', () => {
      const h1 = createRuleHelpers();
      const h2 = createRuleHelpers();

      expect(h1).not.toBe(h2);
      expect(h1.field).not.toBe(h2.field);
      expect(h1.validation).not.toBe(h2.validation);
    });
  });

  describe('Comparison Operators - Options Parameter Branches', () => {
    describe('eq method', () => {
      it('should handle 2 arguments (no options)', () => {
        const rule = h.eq('user.name', 'John Doe'); // Fixed: use correct value from global context
        expect(rule).toEqual({ eq: ['user.name', 'John Doe'] });
        expectRuleToPass(engine, rule);
      });

      it('should handle 3 arguments with undefined options', () => {
        const rule = h.eq('user.name', 'John Doe', undefined);
        expect(rule).toEqual({ eq: ['user.name', 'John Doe', {}] });
        expectRuleToPass(engine, rule);
      });

      it('should handle 3 arguments with null options', () => {
        const rule = h.eq('user.name', 'John Doe', null);
        expect(rule).toEqual({ eq: ['user.name', 'John Doe', {}] });
        expectRuleToPass(engine, rule);
      });

      it('should handle 3 arguments with empty options', () => {
        const rule = h.eq('user.name', 'John Doe', {});
        expect(rule).toEqual({ eq: ['user.name', 'John Doe', {}] });
        expectRuleToPass(engine, rule);
      });

      it('should handle 3 arguments with valid options', () => {
        const rule = h.eq('user.age', '28', { strict: false });
        expect(rule).toEqual({ eq: ['user.age', '28', { strict: false }] });
        expectRuleToPass(engine, rule);
      });

      it('should handle arguments.length check branches', () => {
        // 2 arguments - should not include options
        const rule2 = h.eq('value', 25);
        expect(rule2.eq).toHaveLength(2);

        // 3 arguments - should include options even if undefined
        const rule3 = h.eq('value', 25, undefined);
        expect(rule3.eq).toHaveLength(3);
        expect(rule3.eq[2]).toEqual({});
      });
    });

    describe('neq method', () => {
      it('should handle all arguments.length branches', () => {
        // 2 arguments
        const rule2 = h.neq('user.name', 'Jane');
        expect(rule2).toEqual({ neq: ['user.name', 'Jane'] });

        // 3 arguments with options
        const rule3 = h.neq('user.age', '30', { strict: true });
        expect(rule3).toEqual({ neq: ['user.age', '30', { strict: true }] });

        // 3 arguments with null/undefined options
        const ruleNull = h.neq('user.name', 'Jane', null);
        expect(ruleNull).toEqual({ neq: ['user.name', 'Jane', {}] });
      });
    });

    describe('gt method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.gt('user.age', 18);
        expect(rule2.gt).toHaveLength(2);

        const rule3 = h.gt('user.age', 18, { strict: false });
        expect(rule3.gt).toHaveLength(3);
        expect(rule3.gt[2]).toEqual({ strict: false });
      });
    });

    describe('gte method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.gte('user.age', 21);
        expect(rule2.gte).toHaveLength(2);

        const rule3 = h.gte('user.age', 21, { strict: true });
        expect(rule3.gte).toHaveLength(3);
      });
    });

    describe('lt method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.lt('user.age', 65);
        expect(rule2.lt).toHaveLength(2);

        const rule3 = h.lt('user.age', 65, {});
        expect(rule3.lt).toHaveLength(3);
        expect(rule3.lt[2]).toEqual({});
      });
    });

    describe('lte method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.lte('user.age', 100);
        expect(rule2.lte).toHaveLength(2);

        const rule3 = h.lte('user.age', 100, { strict: false });
        expect(rule3.lte).toHaveLength(3);
      });
    });
  });

  describe('Logical Operators', () => {
    describe('and method', () => {
      it('should handle single expression', () => {
        const rule = h.and(h.eq('user.name', 'John Doe')); // Use correct value from global context
        expect(rule).toEqual({
          and: [{ eq: ['user.name', 'John Doe'] }],
        });
        expectRuleToPass(engine, rule); // This should pass with global context
      });

      it('should handle multiple expressions', () => {
        const rule = h.and(
          h.eq('user.name', 'John Doe'), // Use correct values from global context
          h.gte('user.age', 18), // 28 >= 18 = true
          h.eq('user.role', 'admin') // admin = admin = true
        );
        expect(rule.and).toHaveLength(3);
        expectRuleToPass(engine, rule); // This should pass with global context
      });

      it('should handle nested expressions', () => {
        const rule = h.and(
          h.or(h.eq('user.role', 'admin'), h.eq('user.role', 'mod')),
          h.gte('user.age', 18)
        );
        expectRuleToPass(engine, rule);
      });

      it('should handle empty arguments (edge case)', () => {
        const rule = h.and();
        expect(rule).toEqual({ and: [] });
      });
    });

    describe('or method', () => {
      it('should handle single expression', () => {
        const rule = h.or(h.eq('user.role', 'admin'));
        expect(rule).toEqual({
          or: [{ eq: ['user.role', 'admin'] }],
        });
        expectRuleToPass(engine, rule);
      });

      it('should handle multiple expressions', () => {
        const rule = h.or(
          h.eq('user.role', 'admin'),
          h.eq('user.role', 'moderator'),
          h.eq('user.role', 'user')
        );
        expect(rule.or).toHaveLength(3);
        expectRuleToPass(engine, rule);
      });

      it('should handle empty arguments', () => {
        const rule = h.or();
        expect(rule).toEqual({ or: [] });
      });
    });

    describe('not method', () => {
      it('should handle single expression', () => {
        const rule = h.not(h.eq('user.name', 'Jane'));
        expect(rule).toEqual({
          not: [{ eq: ['user.name', 'Jane'] }],
        });
        expectRuleToPass(engine, rule);
      });

      it('should handle complex nested expression', () => {
        const rule = h.not(h.and(h.eq('user.role', 'guest'), h.lt('user.age', 18)));
        expectRuleToPass(engine, rule);
      });
    });
  });

  describe('String Operators - Options Parameter Branches', () => {
    describe('contains method', () => {
      it('should handle all arguments.length branches', () => {
        const rule2 = h.contains('user.email', '@company.com');
        expect(rule2.contains).toHaveLength(2);

        const rule3 = h.contains('user.email', '@company.com', { strict: false });
        expect(rule3.contains).toHaveLength(3);

        const ruleUndef = h.contains('user.email', '@company.com', undefined);
        expect(ruleUndef.contains[2]).toEqual({});
      });
    });

    describe('startsWith method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.startsWith('user.name', 'John');
        expect(rule2.startsWith).toHaveLength(2);

        const rule3 = h.startsWith('user.name', 'John', { caseSensitive: true });
        expect(rule3.startsWith).toHaveLength(3);
      });
    });

    describe('endsWith method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.endsWith('user.email', '.com');
        expect(rule2.endsWith).toHaveLength(2);

        const rule3 = h.endsWith('user.email', '.com', {});
        expect(rule3.endsWith).toHaveLength(3);
      });
    });

    describe('regex method', () => {
      it('should handle all arguments.length branches', () => {
        const pattern = '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$';

        const rule2 = h.regex('user.email', pattern);
        expect(rule2.regex).toHaveLength(2);

        const rule3 = h.regex('user.email', pattern, { flags: 'i' });
        expect(rule3.regex).toHaveLength(3);
        expect(rule3.regex[2]).toEqual({ flags: 'i' });
      });
    });
  });

  describe('Array Operators - Options Parameter Branches', () => {
    describe('in method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.in('user.role', ['admin', 'user']);
        expect(rule2.in).toHaveLength(2);

        const rule3 = h.in('user.role', ['admin', 'user'], { strict: true });
        expect(rule3.in).toHaveLength(3);

        const ruleNull = h.in('user.role', ['admin', 'user'], null);
        expect(ruleNull.in[2]).toEqual({});
      });
    });

    describe('notIn method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.notIn('user.role', ['banned', 'suspended']);
        expect(rule2.notIn).toHaveLength(2);

        const rule3 = h.notIn('user.role', ['banned', 'suspended'], { strict: false });
        expect(rule3.notIn).toHaveLength(3);
      });
    });
  });

  describe('Special Operators - Options Parameter Branches', () => {
    describe('between method', () => {
      it('should handle all arguments.length branches', () => {
        const rule2 = h.between('user.age', [18, 65]);
        expect(rule2.between).toHaveLength(2);

        const rule3 = h.between('user.age', [18, 65], { inclusive: true });
        expect(rule3.between).toHaveLength(3);

        const ruleUndef = h.between('user.age', [18, 65], undefined);
        expect(ruleUndef.between[2]).toEqual({});
      });
    });

    describe('isNull method', () => {
      it('should handle single argument', () => {
        const rule = h.isNull('user.optional');
        expect(rule).toEqual({ isNull: ['user.optional'] });
        expectRuleToPass(engine, h.isNull('user.nonexistent'));
      });
    });

    describe('isNotNull method', () => {
      it('should handle single argument', () => {
        const rule = h.isNotNull('user.name');
        expect(rule).toEqual({ isNotNull: ['user.name'] });
        expectRuleToPass(engine, rule);
      });
    });
  });

  describe('Convenience Methods', () => {
    describe('isTrue method', () => {
      it('should create eq rule with true', () => {
        const rule = h.isTrue('user.active');
        expect(rule).toEqual({ eq: ['user.active', true] });

        const context = { user: { active: true } };
        expectRuleToPass(engine, rule, context);
      });
    });

    describe('isFalse method', () => {
      it('should create eq rule with false', () => {
        const rule = h.isFalse('user.archived');
        expect(rule).toEqual({ eq: ['user.archived', false] });

        const context = { user: { archived: false } };
        expectRuleToPass(engine, rule, context);
      });
    });

    describe('isEmpty method', () => {
      it('should create eq rule with empty string', () => {
        const rule = h.isEmpty('user.middleName');
        expect(rule).toEqual({ eq: ['user.middleName', ''] });

        const context = { user: { middleName: '' } };
        expectRuleToPass(engine, rule, context);
      });
    });

    describe('isNotEmpty method', () => {
      it('should create neq rule with empty string', () => {
        const rule = h.isNotEmpty('user.firstName');
        expect(rule).toEqual({ neq: ['user.firstName', ''] });
        expectRuleToPass(engine, rule);
      });
    });

    describe('exists method', () => {
      it('should create complex and rule', () => {
        const rule = h.exists('user.name');
        expect(rule).toEqual({
          and: [
            { isNotNull: ['user.name'] },
            { neq: ['user.name', ''] },
            { neq: ['user.name', false] },
          ],
        });
        expectRuleToPass(engine, rule);
      });

      it('should fail for non-existent fields', () => {
        expectRuleToFail(engine, h.exists('user.nonexistent'));
      });

      it('should fail for empty values', () => {
        const context = { user: { empty: '', falsy: false, nullValue: null } };
        expectRuleToFail(engine, h.exists('user.empty'), context);
        expectRuleToFail(engine, h.exists('user.falsy'), context);
        expectRuleToFail(engine, h.exists('user.nullValue'), context);
      });
    });
  });

  describe('Dynamic Field Comparison Helpers', () => {
    describe('field.equals method', () => {
      it('should handle 2 arguments', () => {
        const rule = h.field.equals('form.password', 'form.confirmPassword');
        // The field helper always includes options as 3rd parameter (empty object by default)
        expect(rule).toEqual({ eq: ['form.password', 'form.confirmPassword', {}] });

        // Test with proper context where fields are actually equal
        const context = { form: { password: 'secret', confirmPassword: 'secret' } };
        expectRuleToPass(engine, rule, context);
      });

      it('should handle 3 arguments with options', () => {
        const rule = h.field.equals('form.a', 'form.b', { strict: true });
        expect(rule).toEqual({ eq: ['form.a', 'form.b', { strict: true }] });

        // Test rule structure
        expect(rule.eq).toHaveLength(3);
        expect(rule.eq[2]).toEqual({ strict: true });
      });
    });

    describe('field.greaterThan method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.field.greaterThan('form.score', 'form.minScore');
        // Field helper always includes options parameter
        expect(rule2).toEqual({ gt: ['form.score', 'form.minScore', {}] });
        expect(rule2.gt).toHaveLength(3);

        const rule3 = h.field.greaterThan('form.score', 'form.minScore', { strict: false });
        expect(rule3.gt).toHaveLength(3);
        expect(rule3).toEqual({ gt: ['form.score', 'form.minScore', { strict: false }] });

        // Test with context where score > minScore
        const context = { form: { score: 85, minScore: 70 } };
        expectRuleToPass(engine, rule2, context);
      });
    });

    describe('field.greaterThanOrEqual method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.field.greaterThanOrEqual('form.current', 'form.minimum');
        expect(rule2).toEqual({ gte: ['form.current', 'form.minimum', {}] });
        expect(rule2.gte).toHaveLength(3);

        const rule3 = h.field.greaterThanOrEqual('form.current', 'form.minimum', { custom: true });
        expect(rule3.gte).toHaveLength(3);
        expect(rule3).toEqual({ gte: ['form.current', 'form.minimum', { custom: true }] });

        // Test with context where current >= minimum
        const context = { form: { current: 100, minimum: 100 } };
        expectRuleToPass(engine, rule2, context);
      });
    });

    describe('field.lessThan method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.field.lessThan('form.value', 'form.max');
        expect(rule2).toEqual({ lt: ['form.value', 'form.max', {}] });
        expect(rule2.lt).toHaveLength(3);

        const rule3 = h.field.lessThan('form.value', 'form.max', { strict: true });
        expect(rule3.lt).toHaveLength(3);
        expect(rule3).toEqual({ lt: ['form.value', 'form.max', { strict: true }] });

        // Test with context where value < max
        const context = { form: { value: 75, max: 100 } };
        expectRuleToPass(engine, rule2, context);
      });
    });

    describe('field.lessThanOrEqual method', () => {
      it('should handle all conditional branches', () => {
        const rule2 = h.field.lessThanOrEqual('form.bid', 'form.budget');
        expect(rule2).toEqual({ lte: ['form.bid', 'form.budget', {}] });
        expect(rule2.lte).toHaveLength(3);

        const rule3 = h.field.lessThanOrEqual('form.bid', 'form.budget', { inclusive: true });
        expect(rule3.lte).toHaveLength(3);
        expect(rule3).toEqual({ lte: ['form.bid', 'form.budget', { inclusive: true }] });

        // Test with context where bid <= budget
        const context = { form: { bid: 50000, budget: 50000 } };
        expectRuleToPass(engine, rule2, context);
      });
    });
  });

  describe('Validation Patterns', () => {
    describe('validation.email method', () => {
      it('should create regex rule for email validation', () => {
        const rule = h.validation.email('user.email');
        expect(rule).toEqual({
          regex: ['user.email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$'],
        });
        expectRuleToPass(engine, rule);
      });
    });

    describe('validation.required method', () => {
      it('should create and rule for required validation', () => {
        const rule = h.validation.required('user.name');
        expect(rule).toEqual({
          and: [{ isNotNull: ['user.name'] }, { neq: ['user.name', ''] }],
        });
        expectRuleToPass(engine, rule);
      });

      it('should fail for empty or null values', () => {
        const context = { user: { empty: '', nullValue: null } };
        expectRuleToFail(engine, h.validation.required('user.empty'), context);
        expectRuleToFail(engine, h.validation.required('user.nullValue'), context);
        expectRuleToFail(engine, h.validation.required('user.nonexistent'), context);
      });
    });

    describe('validation.minAge method', () => {
      it('should create gte rule', () => {
        const rule = h.validation.minAge('user.age', 18);
        expect(rule).toEqual({ gte: ['user.age', 18] });
        expectRuleToPass(engine, rule);
      });
    });

    describe('validation.maxAge method', () => {
      it('should create lte rule', () => {
        const rule = h.validation.maxAge('user.age', 65);
        expect(rule).toEqual({ lte: ['user.age', 65] });
        expectRuleToPass(engine, rule);
      });
    });

    describe('validation.ageRange method', () => {
      it('should create between rule', () => {
        const rule = h.validation.ageRange('user.age', 18, 65);
        expect(rule).toEqual({ between: ['user.age', [18, 65]] });
        expectRuleToPass(engine, rule);
      });
    });

    describe('validation.oneOf method', () => {
      it('should create in rule', () => {
        const values = ['admin', 'user', 'guest'];
        const rule = h.validation.oneOf('user.role', values);
        expect(rule).toEqual({ in: ['user.role', values] });
        expectRuleToPass(engine, rule);
      });
    });
  });

  describe('Integration and Complex Scenarios', () => {
    it('should handle complex nested rules with all operator types', () => {
      const rule = h.and(
        h.validation.required('user.name'),
        h.validation.email('user.email'),
        h.or(
          h.eq('user.role', 'admin'),
          h.and(
            h.validation.minAge('user.age', 18),
            h.in('user.department', ['engineering', 'sales'])
          )
        ),
        h.not(h.in('user.status', ['banned', 'suspended'])),
        h.field.equals('user.password', 'user.confirmPassword')
      );

      const context = {
        user: {
          name: 'John Doe',
          email: 'john@company.com',
          role: 'user',
          age: 25,
          department: 'engineering',
          status: 'active',
          password: 'secret123',
          confirmPassword: 'secret123',
        },
      };

      expectRuleToPass(engine, rule, context);
    });

    it('should handle all options parameter variations in complex rule', () => {
      const rule = h.and(
        h.eq('user.name', 'John', { strict: true }),
        h.gte('user.age', 18, { strict: false }),
        h.contains('user.email', '@company.com', undefined),
        h.in('user.role', ['admin', 'user'], null),
        h.between('user.score', [70, 100], {}),
        h.field.greaterThan('form.a', 'form.b', { compareAsNumbers: true })
      );

      // Verify all branches of arguments.length > 2 are tested
      expect(rule.and[0].eq).toHaveLength(3);
      expect(rule.and[1].gte).toHaveLength(3);
      expect(rule.and[2].contains).toHaveLength(3);
      expect(rule.and[3].in).toHaveLength(3);
      expect(rule.and[4].between).toHaveLength(3);
      expect(rule.and[5].gt).toHaveLength(3);

      // Verify null/undefined options are converted to {}
      expect(rule.and[2].contains[2]).toEqual({});
      expect(rule.and[3].in[2]).toEqual({});
    });

    it('should handle edge cases in all helper methods', () => {
      // Test all single-argument methods
      expect(h.isNull('path')).toEqual({ isNull: ['path'] });
      expect(h.isNotNull('path')).toEqual({ isNotNull: ['path'] });
      expect(h.isTrue('path')).toEqual({ eq: ['path', true] });
      expect(h.isFalse('path')).toEqual({ eq: ['path', false] });
      expect(h.isEmpty('path')).toEqual({ eq: ['path', ''] });
      expect(h.isNotEmpty('path')).toEqual({ neq: ['path', ''] });

      // Test validation helpers
      expect(h.validation.email('email')).toHaveProperty('regex');
      expect(h.validation.required('field')).toHaveProperty('and');
      expect(h.validation.minAge('age', 18)).toEqual({ gte: ['age', 18] });
      expect(h.validation.maxAge('age', 65)).toEqual({ lte: ['age', 65] });
      expect(h.validation.ageRange('age', 18, 65)).toEqual({ between: ['age', [18, 65]] });
      expect(h.validation.oneOf('role', ['a', 'b'])).toEqual({ in: ['role', ['a', 'b']] });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty and null arguments gracefully', () => {
      // These should not crash, just create the expected structure
      expect(h.and()).toEqual({ and: [] });
      expect(h.or()).toEqual({ or: [] });

      // Single argument methods should work with any input
      expect(h.isNull('')).toEqual({ isNull: [''] });
      expect(h.isNotNull(null)).toEqual({ isNotNull: [null] });
      expect(h.isTrue(undefined)).toEqual({ eq: [undefined, true] });
    });

    it('should handle all falsy values in options parameter', () => {
      const falsyValues = [null, undefined, false, 0, '', NaN];

      falsyValues.forEach((falsy) => {
        const rule = h.eq('test', 'value', falsy);
        expect(rule.eq).toHaveLength(3);
        expect(rule.eq[2]).toEqual({});
      });
    });

    it('should maintain operator constants integrity', () => {
      // Verify that ops object contains all expected operators
      const expectedOps = [
        'EQ',
        'NEQ',
        'GT',
        'GTE',
        'LT',
        'LTE',
        'IN',
        'NOT_IN',
        'AND',
        'OR',
        'NOT',
        'CONTAINS',
        'STARTS_WITH',
        'ENDS_WITH',
        'REGEX',
        'BETWEEN',
        'IS_NULL',
        'IS_NOT_NULL',
      ];

      expectedOps.forEach((op) => {
        expect(h.ops[op]).toBeDefined();
        expect(typeof h.ops[op]).toBe('string');
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should create rules efficiently', () => {
      const startTime = performance.now();

      // Create many rules to test performance
      for (let i = 0; i < 100; i++) {
        h.and(
          h.eq(`field${i}`, `value${i}`, { strict: i % 2 === 0 }),
          h.gte(`number${i}`, i),
          h.contains(`text${i}`, `search${i}`),
          h.in(`role${i}`, [`option${i}`, `alt${i}`])
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should create 100 complex rules quickly (under 50ms)
      expect(totalTime).toBeLessThan(50);
    });

    it('should not leak memory with many helper instances', () => {
      const helpers = [];

      for (let i = 0; i < 100; i++) {
        helpers.push(createRuleHelpers());
      }

      // All helpers should be independent
      expect(helpers).toHaveLength(100);
      expect(helpers[0]).not.toBe(helpers[99]);
      expect(helpers[0].field).not.toBe(helpers[99].field);
    });
  });
});
