import { OperatorError } from '../../utils/errors.js';
import { TypeUtils } from '../../utils/TypeUtils.js';

/**
 * Base class for all operators
 * Provides common functionality and validation
 */
export class BaseOperator {
  constructor(pathResolver, config) {
    this.pathResolver = pathResolver;
    this.config = config;
  }

  /**
   * Validate operator arguments
   */
  validateArgs(args, expectedLength, operatorName) {
    if (!Array.isArray(args)) {
      throw new OperatorError(`${operatorName} operator requires array arguments`, operatorName, {
        args,
        type: typeof args,
      });
    }

    if (expectedLength && args.length !== expectedLength) {
      throw new OperatorError(
        `${operatorName} operator requires ${expectedLength} arguments, got ${args.length}`,
        operatorName,
        { args, expectedLength, actualLength: args.length }
      );
    }
  }

  /**
   * Resolve both operands using the appropriate strategy
   */
  resolveOperands(context, left, right, strategy = 'literal', defaultValue = undefined) {
    if (strategy === 'literal') {
      return {
        left: this.pathResolver.resolveValueOrLiteral(context, left),
        right: this.pathResolver.resolveValueOrLiteral(context, right),
      };
    } else if (strategy === 'default') {
      return {
        left: this.pathResolver.resolveValueOrDefault(context, left, defaultValue),
        right: this.pathResolver.resolveValueOrDefault(context, right, defaultValue),
      };
    } else {
      throw new OperatorError('Invalid resolution strategy', null, { strategy });
    }
  }

  /**
   * Check if operation should use strict mode
   */
  isStrictMode(options = {}) {
    if (typeof options.strict === 'boolean') {
      return options.strict;
    }
    return this.config.strict !== false;
  }

  /**
   * Coerce operands to numbers for numeric operations
   */
  coerceToNumbers(left, right, strict, operatorName) {
    const leftNum = TypeUtils.coerceToNumber(left, strict);
    const rightNum = TypeUtils.coerceToNumber(right, strict);

    if (leftNum === null || rightNum === null) {
      throw new OperatorError(`${operatorName} operator requires numeric operands`, operatorName, {
        left,
        right,
        leftType: typeof left,
        rightType: typeof right,
        strict,
        leftCoerced: leftNum,
        rightCoerced: rightNum,
      });
    }

    return { left: leftNum, right: rightNum };
  }
}
