import { OPERATOR_NAMES } from '../constants/operators.js';
import { TypeUtils } from '../utils/TypeUtils.js';
import { OperatorError } from '../utils/errors.js';
import { BaseOperator } from './base/BaseOperator.js';

/**
 * Array operators (IN, NOT_IN)
 * Supports dynamic field comparison for both value and array
 */
export class ArrayOperators extends BaseOperator {
  /**
   * Register array operators with the engine
   */
  register(engine) {
    const { IN, NOT_IN } = OPERATOR_NAMES;

    engine.registerOperator(IN, this.createArrayOperator('IN').bind(this));
    engine.registerOperator(NOT_IN, this.createArrayOperator('NOT_IN').bind(this));
  }

  /**
   * Create array membership operator
   */
  createArrayOperator(type) {
    return (args, context) => {
      this.validateArgs(args, 2, type);

      const [left, right, options = {}] = args;
      const strict = this.isStrictMode(options);

      // Resolve both operands - array can also be dynamic
      const { left: resolvedLeft, right: resolvedRight } = this.resolveOperands(
        context,
        left,
        right,
        'literal'
      );

      // Validate that right operand is an array
      if (!Array.isArray(resolvedRight)) {
        throw new OperatorError(`${type} operator requires array as right operand`, type, {
          left: resolvedLeft,
          right: resolvedRight,
          rightType: typeof resolvedRight,
          originalRight: right,
        });
      }

      // Check membership
      const isInArray = resolvedRight.some((item) => TypeUtils.isEqual(item, resolvedLeft, strict));

      return type === 'IN' ? isInArray : !isInArray;
    };
  }
}
