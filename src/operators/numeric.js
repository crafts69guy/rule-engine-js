import { BaseOperator } from './base/BaseOperator.js';
import { OPERATOR_NAMES } from '../constants/operators.js';

/**
 * Numeric comparison operators (GT, GTE, LT, LTE)
 * Supports dynamic field comparison with automatic type coercion
 */
export class NumericOperators extends BaseOperator {
  /**
   * Register numeric operators with the engine
   */
  register(engine) {
    const { GT, GTE, LT, LTE } = OPERATOR_NAMES;

    engine.registerOperator(GT, this.createNumericOperator('GT').bind(this));
    engine.registerOperator(GTE, this.createNumericOperator('GTE').bind(this));
    engine.registerOperator(LT, this.createNumericOperator('LT').bind(this));
    engine.registerOperator(LTE, this.createNumericOperator('LTE').bind(this));
  }

  /**
   * Create numeric comparison operator
   */
  createNumericOperator(type) {
    return (args, context) => {
      // Validate arguments - 2 or 3 arguments allowed
      this.validateArgs(args, [2, 3], type);

      const [left, right, options = {}] = args;
      const strict = this.isStrictMode(options);

      // Resolve both operands with literal fallback for dynamic comparison
      const { left: resolvedLeft, right: resolvedRight } = this.resolveOperands(
        context,
        left,
        right,
        'literal'
      );

      // Coerce to numbers
      const { left: leftNum, right: rightNum } = this.coerceToNumbers(
        resolvedLeft,
        resolvedRight,
        strict,
        type
      );

      // Perform comparison
      switch (type) {
        case 'GT':
          return leftNum > rightNum;
        case 'GTE':
          return leftNum >= rightNum;
        case 'LT':
          return leftNum < rightNum;
        case 'LTE':
          return leftNum <= rightNum;
        default:
          throw new Error(`Unknown numeric operator: ${type}`);
      }
    };
  }
}
