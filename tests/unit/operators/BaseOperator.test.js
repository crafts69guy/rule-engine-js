const { BaseOperator } = require('../../../src/operators/base/BaseOperator.js');
const { PathResolver } = require('../../../src/core/PathResolver.js');
const { LogicalOperators } = require('../../../src/operators/logical.js');

describe('BaseOperator validation and resolution', () => {
  const operator = new BaseOperator(new PathResolver(), { strict: true });

  it('validates arrays even when no length constraint is supplied', () => {
    expect(() => operator.validateArgs({}, undefined, 'CUSTOM')).toThrow('array arguments');
    expect(() => operator.validateArgs([], undefined, 'CUSTOM')).not.toThrow();
    expect(() => operator.validateArgs([1], [2, 3], 'CUSTOM')).toThrow('2-3 arguments');
    expect(() => operator.validateArgs([1, 2, 3, 4], [2, 3], 'CUSTOM')).toThrow('2-3 arguments');
  });

  it('resolves literals by default and supports explicit missing-value defaults', () => {
    const context = { present: 5 };
    expect(operator.resolveOperands(context, 'present', 'missing')).toEqual({
      left: 5,
      right: 'missing',
    });
    expect(operator.resolveOperands(context, 'present', 'missing', 'default', 0)).toEqual({
      left: 5,
      right: 0,
    });
    expect(() => operator.resolveOperands(context, 1, 2, 'invalid')).toThrow(
      'Invalid resolution strategy'
    );
  });

  it('uses config strictness unless explicitly overridden', () => {
    expect(operator.isStrictMode()).toBe(true);
    expect(operator.isStrictMode({ strict: false })).toBe(false);
    expect(new BaseOperator(new PathResolver(), { strict: false }).isStrictMode()).toBe(false);
  });

  it('rejects non-array OR arguments before calling the evaluator', () => {
    const evaluate = jest.fn();
    const or = new LogicalOperators(new PathResolver(), {}).createOrOperator();
    expect(() => or(null, {}, evaluate, 0)).toThrow('at least one argument');
    expect(evaluate).not.toHaveBeenCalled();
  });
});
