// Ops
import { STATE_OPERATOR_NAMES } from '../constants/operators.js';
import { BaseOperator } from './base/BaseOperator.js';

// Utils
import { OperatorError } from '../utils/errors.js';
import { TypeUtils } from '../utils/TypeUtils.js';

/**
 * State Change Operators
 * Requires previousContext to be passed in options
 */
export class StateChangeOperators extends BaseOperator {
  constructor(pathResolver, config) {
    super(pathResolver, config);
  }

  /**
   * Register state change operators with the engine
   */
  register(engine) {
    // Store reference to engine for metadata tracking
    this.engine = engine;

    engine.registerOperator(STATE_OPERATOR_NAMES.CHANGED, this.createChangedOperator().bind(this), {
      allowOverwrite: true,
    });
    engine.registerOperator(
      STATE_OPERATOR_NAMES.CHANGED_BY,
      this.createChangedByOperator().bind(this),
      { allowOverwrite: true }
    );
    engine.registerOperator(
      STATE_OPERATOR_NAMES.CHANGED_FROM,
      this.createChangedFromOperator().bind(this),
      { allowOverwrite: true }
    );
    engine.registerOperator(
      STATE_OPERATOR_NAMES.CHANGED_TO,
      this.createChangedToOperator().bind(this),
      { allowOverwrite: true }
    );
    engine.registerOperator(
      STATE_OPERATOR_NAMES.INCREASED,
      this.createIncreasedOperator().bind(this),
      { allowOverwrite: true }
    );
    engine.registerOperator(
      STATE_OPERATOR_NAMES.DECREASED,
      this.createDecreasedOperator().bind(this),
      { allowOverwrite: true }
    );
  }

  /**
   * Extract previous context from evaluation context
   * Can be passed as context._previous or context.$previous
   */
  getPreviousContext(context) {
    return context._previous || context.$previous || null;
  }

  /**
   * CHANGED operator - detects any value change
   * Usage: { changed: ["user.status"] }
   */
  createChangedOperator() {
    return (args, context) => {
      this.validateArgs(args, 1, 'CHANGED');
      const [path] = args;

      // Mark this operator as a "change detector" in metadata
      if (context._meta) {
        context._meta.hasChangeOperator = true;
      }

      const previousContext = this.getPreviousContext(context);
      if (!previousContext) {
        // No previous state = no change detected
        return false;
      }

      const currentValue = this.pathResolver.resolve(context, path);
      const previousValue = this.pathResolver.resolve(previousContext, path);

      return !TypeUtils.isEqual(currentValue, previousValue, true);
    };
  }

  /**
   * CHANGED_BY operator - detects numeric change by specific amount
   * Usage: { changedBy: ["temperature", 5] } // changed by at least 5
   */
  createChangedByOperator() {
    return (args, context) => {
      this.validateArgs(args, 2, 'CHANGED_BY');
      const [path, threshold] = args;

      // Mark this operator as a "change detector" in metadata
      if (context._meta) {
        context._meta.hasChangeOperator = true;
      }

      const previousContext = this.getPreviousContext(context);
      if (!previousContext) {
        return false;
      }

      const currentValue = this.pathResolver.resolve(context, path);
      const previousValue = this.pathResolver.resolve(previousContext, path);

      // Coerce to numbers
      const currentNum = TypeUtils.coerceToNumber(currentValue);
      const previousNum = TypeUtils.coerceToNumber(previousValue);
      const thresholdNum = TypeUtils.coerceToNumber(threshold);

      if (currentNum === null || previousNum === null || thresholdNum === null) {
        throw new OperatorError('CHANGED_BY requires numeric values', 'CHANGED_BY', {
          current: currentValue,
          previous: previousValue,
          threshold,
        });
      }

      const change = Math.abs(currentNum - previousNum);
      return change >= Math.abs(thresholdNum);
    };
  }

  /**
   * CHANGED_FROM operator - detects change from specific value
   * Usage: { changedFrom: ["order.status", "pending"] }
   */
  createChangedFromOperator() {
    return (args, context) => {
      this.validateArgs(args, 2, 'CHANGED_FROM');
      const [path, fromValue] = args;

      // Mark this operator as a "change detector" in metadata
      if (context._meta) {
        context._meta.hasChangeOperator = true;
      }

      const previousContext = this.getPreviousContext(context);
      if (!previousContext) {
        return false;
      }

      const currentValue = this.pathResolver.resolve(context, path);
      const previousValue = this.pathResolver.resolve(previousContext, path);

      // Resolve fromValue in case it's a path
      const resolvedFromValue = this.pathResolver.resolveValueOrLiteral(context, fromValue);

      return (
        TypeUtils.isEqual(previousValue, resolvedFromValue, false) &&
        !TypeUtils.isEqual(currentValue, resolvedFromValue, false)
      );
    };
  }

  /**
   * CHANGED_TO operator - detects change to specific value
   * Usage: { changedTo: ["order.status", "completed"] }
   */
  createChangedToOperator() {
    return (args, context) => {
      this.validateArgs(args, 2, 'CHANGED_TO');
      const [path, toValue] = args;

      // Mark this operator as a "change detector" in metadata
      if (context._meta) {
        context._meta.hasChangeOperator = true;
      }

      const previousContext = this.getPreviousContext(context);
      if (!previousContext) {
        return false;
      }

      const currentValue = this.pathResolver.resolve(context, path);
      const previousValue = this.pathResolver.resolve(previousContext, path);

      // Resolve toValue in case it's a path
      const resolvedToValue = this.pathResolver.resolveValueOrLiteral(context, toValue);

      return (
        !TypeUtils.isEqual(previousValue, resolvedToValue, false) &&
        TypeUtils.isEqual(currentValue, resolvedToValue, false)
      );
    };
  }

  /**
   * INCREASED operator - detects numeric increase
   * Usage: { increased: ["score"] }
   */
  createIncreasedOperator() {
    return (args, context) => {
      this.validateArgs(args, 1, 'INCREASED');
      const [path] = args;

      // Mark this operator as a "change detector" in metadata
      if (context._meta) {
        context._meta.hasChangeOperator = true;
      }

      const previousContext = this.getPreviousContext(context);
      if (!previousContext) {
        return false;
      }

      const currentValue = this.pathResolver.resolve(context, path);
      const previousValue = this.pathResolver.resolve(previousContext, path);

      const currentNum = TypeUtils.coerceToNumber(currentValue);
      const previousNum = TypeUtils.coerceToNumber(previousValue);

      if (currentNum === null || previousNum === null) {
        return false;
      }

      return currentNum > previousNum;
    };
  }

  /**
   * DECREASED operator - detects numeric decrease
   * Usage: { decreased: ["score"] }
   */
  createDecreasedOperator() {
    return (args, context) => {
      this.validateArgs(args, 1, 'DECREASED');
      const [path] = args;

      // Mark this operator as a "change detector" in metadata
      if (context._meta) {
        context._meta.hasChangeOperator = true;
      }

      const previousContext = this.getPreviousContext(context);
      if (!previousContext) {
        return false;
      }

      const currentValue = this.pathResolver.resolve(context, path);
      const previousValue = this.pathResolver.resolve(previousContext, path);

      const currentNum = TypeUtils.coerceToNumber(currentValue);
      const previousNum = TypeUtils.coerceToNumber(previousValue);

      if (currentNum === null || previousNum === null) {
        return false;
      }

      return currentNum < previousNum;
    };
  }
}
