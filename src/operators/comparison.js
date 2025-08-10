import { BaseOperator } from './base/BaseOperator.js';
import { OPERATOR_NAMES } from '../constants/operators.js';
import { TypeUtils } from '../utils/TypeUtils.js';

/**
 * Comparison operators (EQ, NEQ)
 * Supports dynamic field comparison with both strict and loose modes
 */
export class ComparisonOperators extends BaseOperator {
  /**
   * Register comparison operators with the engine
   */
  register(engine) {
    const { EQ, NEQ } = OPERATOR_NAMES;

    engine.registerOperator(EQ, this.createEqualityOperator(true).bind(this));
    engine.registerOperator(NEQ, this.createEqualityOperator(false).bind(this));
  }

  /**
   * Create equality operator (EQ or NEQ)
   */
  createEqualityOperator(shouldEqual) {
    return (args, context) => {
      // Validate arguments - 2 or 3 arguments allowed
      this.validateArgs(args, [2, 3], shouldEqual ? 'EQ' : 'NEQ');

      const [left, right, options = {}] = args;
      const strict = this.isStrictMode(options);

      // Resolve both operands with literal fallback for dynamic comparison
      const { left: resolvedLeft, right: resolvedRight } = this.resolveOperands(
        context,
        left,
        right,
        'literal'
      );

      // Perform equality check
      const isEqual = TypeUtils.isEqual(resolvedLeft, resolvedRight, strict);

      return shouldEqual ? isEqual : !isEqual;
    };
  }
}
