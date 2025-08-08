import { OPERATOR_NAMES } from '../constants/operators.js';
import { TypeUtils } from '../utils/TypeUtils.js';
import { OperatorError } from '../utils/errors.js';
import { BaseOperator } from './base/BaseOperator.js';

/**
 * String operators (CONTAINS, STARTS_WITH, ENDS_WITH)
 * Supports dynamic field comparison with automatic type coercion
 */
export class StringOperators extends BaseOperator {
  /**
   * Register string operators with the engine
   */
  register(engine) {
    const { CONTAINS, STARTS_WITH, ENDS_WITH } = OPERATOR_NAMES;

    engine.registerOperator(CONTAINS, this.createStringOperator('CONTAINS').bind(this));
    engine.registerOperator(STARTS_WITH, this.createStringOperator('STARTS_WITH').bind(this));
    engine.registerOperator(ENDS_WITH, this.createStringOperator('ENDS_WITH').bind(this));
  }

  /**
   * Create string operation operator
   */
  createStringOperator(type) {
    return (args, context) => {
      this.validateArgs(args, 2, type);

      const [left, right, options = {}] = args;
      const strict = this.isStrictMode(options);

      // Resolve both operands with literal fallback for dynamic comparison
      const { left: resolvedLeft, right: resolvedRight } = this.resolveOperands(
        context,
        left,
        right,
        'literal'
      );

      // Coerce to strings
      const { left: leftStr, right: rightStr } = this.coerceToStrings(
        resolvedLeft,
        resolvedRight,
        strict,
        type
      );

      // Perform string operation
      switch (type) {
        case 'CONTAINS':
          return leftStr.includes(rightStr);
        case 'STARTS_WITH':
          return leftStr.startsWith(rightStr);
        case 'ENDS_WITH':
          return leftStr.endsWith(rightStr);
        default:
          throw new Error(`Unknown string operator: ${type}`);
      }
    };
  }

  /**
   * Coerce operands to strings for string operations
   */
  coerceToStrings(left, right, strict, operatorName) {
    const leftStr = TypeUtils.coerceToString(left, strict);
    const rightStr = TypeUtils.coerceToString(right, strict);

    if (leftStr === null || rightStr === null) {
      throw new OperatorError(
        `${operatorName} operator requires string operands`,
        operatorName,
        {
          left,
          right,
          leftType: typeof left,
          rightType: typeof right,
          strict
        }
      );
    }

    return { left: leftStr, right: rightStr };
  }
}
