import { BaseOperator } from './base/BaseOperator.js';
import { OPERATOR_NAMES } from '../constants/operators.js';
import { OperatorError } from '../utils/errors.js';

/**
 * Logical operators (AND, OR, NOT)
 * Handles rule composition and boolean logic
 */
export class LogicalOperators extends BaseOperator {
  /**
   * Register logical operators with the engine
   */
  register(engine) {
    const { AND, OR, NOT } = OPERATOR_NAMES;

    engine.registerOperator(AND, this.createAndOperator().bind(this));
    engine.registerOperator(OR, this.createOrOperator().bind(this));
    engine.registerOperator(NOT, this.createNotOperator().bind(this));
  }

  /**
   * Create AND operator
   */
  createAndOperator() {
    return (args, context, evaluateExpr, depth) => {
      if (!Array.isArray(args) || args.length === 0) {
        throw new OperatorError('AND operator requires at least one argument', 'AND', { args });
      }

      // All expressions must be true
      for (const expr of args) {
        const result = evaluateExpr(expr, context, depth + 1);
        if (!result.success) {
          return false;
        }
      }

      return true;
    };
  }

  /**
   * Create OR operator
   */
  createOrOperator() {
    return (args, context, evaluateExpr, depth) => {
      if (!Array.isArray(args) || args.length === 0) {
        throw new OperatorError('OR operator requires at least one argument', 'OR', { args });
      }

      // At least one expression must be true
      for (const expr of args) {
        const result = evaluateExpr(expr, context, depth + 1);
        if (result.success) {
          return true;
        }
      }

      return false;
    };
  }

  /**
   * Create NOT operator
   */
  createNotOperator() {
    return (args, context, evaluateExpr, depth) => {
      this.validateArgs(args, 1, 'NOT');

      const [expr] = args;
      const result = evaluateExpr(expr, context, depth + 1);

      return !result.success;
    };
  }
}
