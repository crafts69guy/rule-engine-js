import { BaseOperator } from './base/BaseOperator.js';
import { OPERATOR_NAMES } from '../constants/operators.js';
import { TypeUtils } from '../utils/TypeUtils.js';
import { OperatorError } from '../utils/errors.js';

/**
 * Special operators (BETWEEN, IS_NULL, IS_NOT_NULL)
 * Handles range checking and null validation
 */
export class SpecialOperators extends BaseOperator {
  /**
   * Register special operators with the engine
   */
  register(engine) {
    const { BETWEEN, IS_NULL, IS_NOT_NULL } = OPERATOR_NAMES;

    engine.registerOperator(BETWEEN, this.createBetweenOperator().bind(this));
    engine.registerOperator(IS_NULL, this.createNullCheckOperator('IS_NULL').bind(this));
    engine.registerOperator(IS_NOT_NULL, this.createNullCheckOperator('IS_NOT_NULL').bind(this));
  }

  /**
   * Create BETWEEN operator for range checking
   */
  createBetweenOperator() {
    return (args, context) => {
      this.validateArgs(args, 2, 'BETWEEN');

      const [left, range, options = {}] = args;
      const strict = this.isStrictMode(options);

      // Resolve value
      const resolvedLeft = this.pathResolver.resolveValueOrLiteral(context, left);

      // Resolve range - can be dynamic array
      const resolvedRange = this.pathResolver.resolveValueOrLiteral(context, range);

      // Validate range format
      if (!Array.isArray(resolvedRange) || resolvedRange.length !== 2) {
        throw new OperatorError('BETWEEN operator requires array of 2 values', 'BETWEEN', {
          range: resolvedRange,
          originalRange: range,
          rangeType: typeof resolvedRange,
        });
      }

      const [min, max] = resolvedRange;

      // Resolve min and max in case they are also paths
      const resolvedMin = this.pathResolver.resolveValueOrLiteral(context, min);
      const resolvedMax = this.pathResolver.resolveValueOrLiteral(context, max);

      // Coerce all values to numbers
      const valueNum = TypeUtils.coerceToNumber(resolvedLeft, strict);
      const minNum = TypeUtils.coerceToNumber(resolvedMin, strict);
      const maxNum = TypeUtils.coerceToNumber(resolvedMax, strict);

      if (valueNum === null || minNum === null || maxNum === null) {
        throw new OperatorError('BETWEEN operator requires numeric operands', 'BETWEEN', {
          value: resolvedLeft,
          min: resolvedMin,
          max: resolvedMax,
          strict,
          valueCoerced: valueNum,
          minCoerced: minNum,
          maxCoerced: maxNum,
        });
      }

      return valueNum >= minNum && valueNum <= maxNum;
    };
  }

  /**
   * Create null check operators
   */
  createNullCheckOperator(type) {
    return (args, context) => {
      this.validateArgs(args, 1, type);

      const [left] = args;

      // Resolve value
      const resolved = this.pathResolver.resolveValueOrLiteral(context, left);

      const isNull = resolved === null || resolved === undefined;

      return type === 'IS_NULL' ? isNull : !isNull;
    };
  }
}
