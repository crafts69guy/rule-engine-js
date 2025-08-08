/**
 * Base rule engine error class
 */
export class RuleEngineError extends Error {
  constructor(message, operator = null, context = {}, originalError = null) {
    super(message);
    this.name = 'RuleEngineError';
    this.operator = operator;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RuleEngineError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operator: this.operator,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation specific error
 */
export class ValidationError extends RuleEngineError {
  constructor(message, context = {}) {
    super(message, null, context);
    this.name = 'ValidationError';
  }
}

/**
 * Operator specific error
 */
export class OperatorError extends RuleEngineError {
  constructor(message, operator, context = {}, originalError = null) {
    super(message, operator, context, originalError);
    this.name = 'OperatorError';
  }
}
