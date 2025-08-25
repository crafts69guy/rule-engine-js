const { createRuleEngine } = require('../../../src/index.js');
const { StateChangeOperators } = require('../../../src/operators/state.js');
const { STATE_OPERATOR_NAMES } = require('../../../src/constants/operators.js');

describe('State Change Operators', () => {
  let engine;
  let stateOperators;

  beforeEach(() => {
    engine = createRuleEngine();
    stateOperators = new StateChangeOperators(
      engine._internal.pathResolver,
      engine._internal.engine.config
    );
    stateOperators.register(engine._internal.engine);
  });

  // Helper to create context with previous state
  const createContext = (current, previous = null) => ({
    ...current,
    _previous: previous,
    _meta: { hasChangeOperator: false },
  });

  describe('CHANGED Operator', () => {
    it('should return false when no previous context', () => {
      const context = createContext({ user: { status: 'active' } });
      const result = engine.evaluateExpr({ changed: ['user.status'] }, context);
      expect(result.success).toBe(false);
      expect(context._meta.hasChangeOperator).toBe(true);
    });

    it('should detect string value changes', () => {
      const context = createContext(
        { user: { status: 'active' } },
        { user: { status: 'pending' } }
      );
      expectRuleToPass(engine, { changed: ['user.status'] }, context);
      expect(context._meta.hasChangeOperator).toBe(true);
    });

    it('should return false when values are same', () => {
      const context = createContext({ user: { status: 'active' } }, { user: { status: 'active' } });
      expectRuleToFail(engine, { changed: ['user.status'] }, context);
      expect(context._meta.hasChangeOperator).toBe(true);
    });

    it('should detect numeric value changes', () => {
      const context = createContext({ score: 85 }, { score: 70 });
      expectRuleToPass(engine, { changed: ['score'] }, context);
    });

    it('should detect boolean value changes', () => {
      const context = createContext({ flags: { active: true } }, { flags: { active: false } });
      expectRuleToPass(engine, { changed: ['flags.active'] }, context);
    });

    it('should detect object value changes', () => {
      const context = createContext({ config: { theme: 'dark' } }, { config: { theme: 'light' } });
      expectRuleToPass(engine, { changed: ['config.theme'] }, context);
    });

    it('should detect array value changes', () => {
      const context = createContext({ items: ['a', 'b', 'c'] }, { items: ['a', 'b'] });
      expectRuleToPass(engine, { changed: ['items'] }, context);
    });

    it('should handle nested path changes', () => {
      const context = createContext(
        { order: { customer: { name: 'Jane' } } },
        { order: { customer: { name: 'John' } } }
      );
      expectRuleToPass(engine, { changed: ['order.customer.name'] }, context);
    });

    it('should handle null to value changes', () => {
      const context = createContext({ data: { value: 'new' } }, { data: { value: null } });
      expectRuleToPass(engine, { changed: ['data.value'] }, context);
    });

    it('should handle value to null changes', () => {
      const context = createContext({ data: { value: null } }, { data: { value: 'old' } });
      expectRuleToPass(engine, { changed: ['data.value'] }, context);
    });

    it('should validate arguments', () => {
      const context = createContext({ user: { status: 'active' } });
      const result = engine.evaluateExpr({ changed: [] }, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires 1 arguments');
    });
  });

  describe('CHANGED_BY Operator', () => {
    it('should detect numeric change by threshold', () => {
      const context = createContext({ temperature: 25 }, { temperature: 20 });
      expectRuleToPass(engine, { changedBy: ['temperature', 5] }, context);
      expectRuleToFail(engine, { changedBy: ['temperature', 6] }, context);
    });

    it('should handle negative changes', () => {
      const context = createContext({ temperature: 15 }, { temperature: 25 });
      expectRuleToPass(engine, { changedBy: ['temperature', 10] }, context);
      expectRuleToPass(engine, { changedBy: ['temperature', 5] }, context);
    });

    it('should handle exact threshold match', () => {
      const context = createContext({ value: 100 }, { value: 90 });
      expectRuleToPass(engine, { changedBy: ['value', 10] }, context);
    });

    it('should handle decimal changes', () => {
      const context = createContext({ price: 20.0 }, { price: 15.0 });
      expectRuleToPass(engine, { changedBy: ['price', 5.0] }, context);
      expectRuleToFail(engine, { changedBy: ['price', 5.1] }, context); // Change smaller than actual
    });

    it('should handle string number coercion', () => {
      const context = createContext({ count: '25' }, { count: '20' });
      expectRuleToPass(engine, { changedBy: ['count', 5] }, context);
    });

    it('should throw error for non-numeric values', () => {
      const context = createContext({ status: 'active' }, { status: 'pending' });
      const result = engine.evaluateExpr({ changedBy: ['status', 5] }, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires numeric values');
    });

    it('should return false when no previous context', () => {
      const context = createContext({ temperature: 25 });
      expectRuleToFail(engine, { changedBy: ['temperature', 5] }, context);
    });

    it('should validate arguments', () => {
      const context = createContext({ value: 10 });
      const result = engine.evaluateExpr({ changedBy: ['value'] }, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires 2 arguments');
    });
  });

  describe('CHANGED_FROM Operator', () => {
    it('should detect change from specific value', () => {
      const context = createContext({ status: 'completed' }, { status: 'pending' });
      expectRuleToPass(engine, { changedFrom: ['status', 'pending'] }, context);
      expectRuleToFail(engine, { changedFrom: ['status', 'active'] }, context);
    });

    it('should return false when current equals from value', () => {
      const context = createContext({ status: 'pending' }, { status: 'pending' });
      expectRuleToFail(engine, { changedFrom: ['status', 'pending'] }, context);
    });

    it('should return false when previous not equals from value', () => {
      const context = createContext({ status: 'completed' }, { status: 'active' });
      expectRuleToFail(engine, { changedFrom: ['status', 'pending'] }, context);
    });

    it('should handle numeric values', () => {
      const context = createContext({ score: 90 }, { score: 75 });
      expectRuleToPass(engine, { changedFrom: ['score', 75] }, context);
    });

    it('should handle boolean values', () => {
      const context = createContext({ active: true }, { active: false });
      expectRuleToPass(engine, { changedFrom: ['active', false] }, context);
    });

    it('should handle dynamic from value (path resolution)', () => {
      const context = createContext(
        { current: { status: 'completed' }, expected: { from: 'pending' } },
        { current: { status: 'pending' } }
      );
      expectRuleToPass(engine, { changedFrom: ['current.status', 'expected.from'] }, context);
    });

    it('should return false when no previous context', () => {
      const context = createContext({ status: 'active' });
      expectRuleToFail(engine, { changedFrom: ['status', 'pending'] }, context);
    });

    it('should validate arguments', () => {
      const context = createContext({ status: 'active' });
      const result = engine.evaluateExpr({ changedFrom: ['status'] }, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires 2 arguments');
    });
  });

  describe('CHANGED_TO Operator', () => {
    it('should detect change to specific value', () => {
      const context = createContext({ status: 'completed' }, { status: 'pending' });
      expectRuleToPass(engine, { changedTo: ['status', 'completed'] }, context);
      expectRuleToFail(engine, { changedTo: ['status', 'active'] }, context);
    });

    it('should return false when previous equals to value', () => {
      const context = createContext({ status: 'completed' }, { status: 'completed' });
      expectRuleToFail(engine, { changedTo: ['status', 'completed'] }, context);
    });

    it('should return false when current not equals to value', () => {
      const context = createContext({ status: 'active' }, { status: 'pending' });
      expectRuleToFail(engine, { changedTo: ['status', 'completed'] }, context);
    });

    it('should handle numeric values', () => {
      const context = createContext({ score: 90 }, { score: 75 });
      expectRuleToPass(engine, { changedTo: ['score', 90] }, context);
    });

    it('should handle boolean values', () => {
      const context = createContext({ active: true }, { active: false });
      expectRuleToPass(engine, { changedTo: ['active', true] }, context);
    });

    it('should handle dynamic to value (path resolution)', () => {
      const context = createContext(
        { current: { status: 'completed' }, expected: { to: 'completed' } },
        { current: { status: 'pending' } }
      );
      expectRuleToPass(engine, { changedTo: ['current.status', 'expected.to'] }, context);
    });

    it('should return false when no previous context', () => {
      const context = createContext({ status: 'completed' });
      expectRuleToFail(engine, { changedTo: ['status', 'completed'] }, context);
    });

    it('should validate arguments', () => {
      const context = createContext({ status: 'active' });
      const result = engine.evaluateExpr({ changedTo: ['status'] }, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires 2 arguments');
    });
  });

  describe('INCREASED Operator', () => {
    it('should detect numeric increases', () => {
      const context = createContext({ score: 90 }, { score: 75 });
      expectRuleToPass(engine, { increased: ['score'] }, context);
    });

    it('should return false for decreases', () => {
      const context = createContext({ score: 70 }, { score: 85 });
      expectRuleToFail(engine, { increased: ['score'] }, context);
    });

    it('should return false for equal values', () => {
      const context = createContext({ score: 85 }, { score: 85 });
      expectRuleToFail(engine, { increased: ['score'] }, context);
    });

    it('should handle decimal numbers', () => {
      const context = createContext({ price: 19.99 }, { price: 15.49 });
      expectRuleToPass(engine, { increased: ['price'] }, context);
    });

    it('should handle string number coercion', () => {
      const context = createContext({ count: '25' }, { count: '20' });
      expectRuleToPass(engine, { increased: ['count'] }, context);
    });

    it('should handle negative numbers', () => {
      const context = createContext({ temperature: -5 }, { temperature: -10 });
      expectRuleToPass(engine, { increased: ['temperature'] }, context);
    });

    it('should return false for non-numeric values', () => {
      const context = createContext({ status: 'active' }, { status: 'pending' });
      expectRuleToFail(engine, { increased: ['status'] }, context);
    });

    it('should return false when no previous context', () => {
      const context = createContext({ score: 85 });
      expectRuleToFail(engine, { increased: ['score'] }, context);
    });

    it('should validate arguments', () => {
      const context = createContext({ score: 85 });
      const result = engine.evaluateExpr({ increased: [] }, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires 1 arguments');
    });
  });

  describe('DECREASED Operator', () => {
    it('should detect numeric decreases', () => {
      const context = createContext({ score: 70 }, { score: 85 });
      expectRuleToPass(engine, { decreased: ['score'] }, context);
    });

    it('should return false for increases', () => {
      const context = createContext({ score: 90 }, { score: 75 });
      expectRuleToFail(engine, { decreased: ['score'] }, context);
    });

    it('should return false for equal values', () => {
      const context = createContext({ score: 85 }, { score: 85 });
      expectRuleToFail(engine, { decreased: ['score'] }, context);
    });

    it('should handle decimal numbers', () => {
      const context = createContext({ price: 15.49 }, { price: 19.99 });
      expectRuleToPass(engine, { decreased: ['price'] }, context);
    });

    it('should handle string number coercion', () => {
      const context = createContext({ count: '20' }, { count: '25' });
      expectRuleToPass(engine, { decreased: ['count'] }, context);
    });

    it('should handle negative numbers', () => {
      const context = createContext({ temperature: -10 }, { temperature: -5 });
      expectRuleToPass(engine, { decreased: ['temperature'] }, context);
    });

    it('should return false for non-numeric values', () => {
      const context = createContext({ status: 'pending' }, { status: 'active' });
      expectRuleToFail(engine, { decreased: ['status'] }, context);
    });

    it('should return false when no previous context', () => {
      const context = createContext({ score: 70 });
      expectRuleToFail(engine, { decreased: ['score'] }, context);
    });

    it('should validate arguments', () => {
      const context = createContext({ score: 70 });
      const result = engine.evaluateExpr({ decreased: [] }, context);
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires 1 arguments');
    });
  });

  describe('Operator Constants', () => {
    it('should have all required state operator names', () => {
      expect(STATE_OPERATOR_NAMES).toEqual({
        CHANGED: 'changed',
        CHANGED_BY: 'changedBy',
        CHANGED_FROM: 'changedFrom',
        CHANGED_TO: 'changedTo',
        INCREASED: 'increased',
        DECREASED: 'decreased',
      });
    });

    it('should register all state operators', () => {
      const operators = engine.getOperators();
      Object.values(STATE_OPERATOR_NAMES).forEach((operatorName) => {
        expect(operators).toContain(operatorName);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined previous values', () => {
      const context = createContext(
        { data: { value: 'new' } },
        { data: {} } // missing value property
      );
      expectRuleToPass(engine, { changed: ['data.value'] }, context);
    });

    it('should handle missing paths in current context', () => {
      const context = createContext(
        { data: {} }, // missing value property
        { data: { value: 'old' } }
      );
      expectRuleToPass(engine, { changed: ['data.value'] }, context);
    });

    it('should handle deeply nested path changes', () => {
      const context = createContext(
        { level1: { level2: { level3: { value: 'new' } } } },
        { level1: { level2: { level3: { value: 'old' } } } }
      );
      expectRuleToPass(engine, { changed: ['level1.level2.level3.value'] }, context);
    });

    it('should handle array index changes', () => {
      const context = createContext({ items: ['a', 'b', 'c'] }, { items: ['a', 'x', 'c'] });
      expectRuleToPass(engine, { changed: ['items'] }, context);
    });

    it('should handle type coercion edge cases', () => {
      const context = createContext({ value: 0 }, { value: false });
      // In strict mode, 0 !== false
      expectRuleToPass(engine, { changed: ['value'] }, context);
    });
  });
});
