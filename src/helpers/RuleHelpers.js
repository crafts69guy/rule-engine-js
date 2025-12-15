import { OPERATOR_NAMES } from '../constants/operators.js';

/**
 * @typedef {import('../types.d.ts').RuleExpression} RuleExpression
 * @typedef {import('../types.d.ts').ComparisonOptions} ComparisonOptions
 * @typedef {import('../types.d.ts').StringOptions} StringOptions
 * @typedef {import('../types.d.ts').FieldHelpers} FieldHelpers
 * @typedef {import('../types.d.ts').ValidationHelpers} ValidationHelpers
 */

/**
 * Rule building helpers
 * Makes it easy to construct rules without memorizing operator syntax
 */
export class RuleHelpers {
  constructor() {
    this.ops = OPERATOR_NAMES;

    // Initialize helper objects in constructor to avoid class field syntax issues
    this._initializeFieldHelpers();
    this._initializeValidationHelpers();
  }

  // ============================================================================
  // COMPARISON OPERATORS
  // ============================================================================

  /**
   * Equal to
   * @param {string|number} left - Left operand (path or value)
   * @param {string|number|boolean} right - Right operand (path or value)
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  eq(left, right, options) {
    // If options is explicitly passed (even if undefined), include it
    return arguments.length > 2
      ? { [this.ops.EQ]: [left, right, options || {}] }
      : { [this.ops.EQ]: [left, right] };
  }

  /**
   * Not equal to
   * @param {string|number} left - Left operand (path or value)
   * @param {string|number|boolean} right - Right operand (path or value)
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  neq(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.NEQ]: [left, right, options || {}] }
      : { [this.ops.NEQ]: [left, right] };
  }

  /**
   * Greater than
   * @param {string|number} left - Left operand (path or value)
   * @param {string|number} right - Right operand (path or value)
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  gt(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.GT]: [left, right, options || {}] }
      : { [this.ops.GT]: [left, right] };
  }

  /**
   * Greater than or equal
   * @param {string|number} left - Left operand (path or value)
   * @param {string|number} right - Right operand (path or value)
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  gte(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.GTE]: [left, right, options || {}] }
      : { [this.ops.GTE]: [left, right] };
  }

  /**
   * Less than
   * @param {string|number} left - Left operand (path or value)
   * @param {string|number} right - Right operand (path or value)
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  lt(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.LT]: [left, right, options || {}] }
      : { [this.ops.LT]: [left, right] };
  }

  /**
   * Less than or equal
   * @param {string|number} left - Left operand (path or value)
   * @param {string|number} right - Right operand (path or value)
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  lte(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.LTE]: [left, right, options || {}] }
      : { [this.ops.LTE]: [left, right] };
  }

  // ============================================================================
  // LOGICAL OPERATORS
  // ============================================================================

  /**
   * Logical AND - all conditions must be true
   * @param {...RuleExpression} expressions - Rule expressions to AND together
   * @returns {RuleExpression} Combined rule expression
   */
  and(...expressions) {
    return { [this.ops.AND]: expressions };
  }

  /**
   * Logical OR - at least one condition must be true
   * @param {...RuleExpression} expressions - Rule expressions to OR together
   * @returns {RuleExpression} Combined rule expression
   */
  or(...expressions) {
    return { [this.ops.OR]: expressions };
  }

  /**
   * Logical NOT - negates the expression
   * @param {RuleExpression} expression - Rule expression to negate
   * @returns {RuleExpression} Negated rule expression
   */
  not(expression) {
    return { [this.ops.NOT]: [expression] };
  }

  // ============================================================================
  // STRING OPERATORS
  // ============================================================================

  /**
   * String contains
   * @param {string} left - Path to the string field
   * @param {string} right - Substring to search for
   * @param {StringOptions} [options] - Optional string options
   * @returns {RuleExpression} Rule expression object
   */
  contains(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.CONTAINS]: [left, right, options || {}] }
      : { [this.ops.CONTAINS]: [left, right] };
  }

  /**
   * String starts with
   * @param {string} left - Path to the string field
   * @param {string} right - Prefix to check for
   * @param {StringOptions} [options] - Optional string options
   * @returns {RuleExpression} Rule expression object
   */
  startsWith(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.STARTS_WITH]: [left, right, options || {}] }
      : { [this.ops.STARTS_WITH]: [left, right] };
  }

  /**
   * String ends with
   * @param {string} left - Path to the string field
   * @param {string} right - Suffix to check for
   * @param {StringOptions} [options] - Optional string options
   * @returns {RuleExpression} Rule expression object
   */
  endsWith(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.ENDS_WITH]: [left, right, options || {}] }
      : { [this.ops.ENDS_WITH]: [left, right] };
  }

  /**
   * Regular expression match
   * @param {string} left - Path to the string field
   * @param {string} right - Regular expression pattern
   * @param {StringOptions} [options] - Optional string options
   * @returns {RuleExpression} Rule expression object
   */
  regex(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.REGEX]: [left, right, options || {}] }
      : { [this.ops.REGEX]: [left, right] };
  }

  // ============================================================================
  // ARRAY OPERATORS
  // ============================================================================

  /**
   * Value is in array (includes)
   * @param {string} left - Path to the value
   * @param {unknown[]|string} right - Array of values to check against or string separated by dot (path to array of values)
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  in(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.IN]: [left, right, options || {}] }
      : { [this.ops.IN]: [left, right] };
  }

  /**
   * Value is not in array (not includes)
   * @param {string} left - Path to the value
   * @param {unknown[] | string} right - Array of values to check against or string separated by dot (path to array of values)
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  notIn(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.NOT_IN]: [left, right, options || {}] }
      : { [this.ops.NOT_IN]: [left, right] };
  }

  // ============================================================================
  // SPECIAL OPERATORS
  // ============================================================================

  /**
   * Value is between min and max (inclusive)
   * @param {string} value - Path to the value
   * @param {[number, number]} range - [min, max] range tuple
   * @param {ComparisonOptions} [options] - Optional comparison options
   * @returns {RuleExpression} Rule expression object
   */
  between(value, range, options) {
    return arguments.length > 2
      ? { [this.ops.BETWEEN]: [value, range, options || {}] }
      : { [this.ops.BETWEEN]: [value, range] };
  }

  /**
   * Value is null or undefined
   * @param {string} path - Path to the value
   * @returns {RuleExpression} Rule expression object
   */
  isNull(path) {
    return { [this.ops.IS_NULL]: [path] };
  }

  /**
   * Value is not null and not undefined
   * @param {string} path - Path to the value
   * @returns {RuleExpression} Rule expression object
   */
  isNotNull(path) {
    return { [this.ops.IS_NOT_NULL]: [path] };
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Field equals true
   * @param {string} path - Path to the boolean field
   * @returns {RuleExpression} Rule expression object
   */
  isTrue(path) {
    return this.eq(path, true);
  }

  /**
   * Field equals false
   * @param {string} path - Path to the boolean field
   * @returns {RuleExpression} Rule expression object
   */
  isFalse(path) {
    return this.eq(path, false);
  }

  /**
   * Field equals empty string
   * @param {string} path - Path to the string field
   * @returns {RuleExpression} Rule expression object
   */
  isEmpty(path) {
    return this.eq(path, '');
  }

  /**
   * Field does not equal empty string
   * @param {string} path - Path to the string field
   * @returns {RuleExpression} Rule expression object
   */
  isNotEmpty(path) {
    return this.neq(path, '');
  }

  /**
   * Field has any truthy value (exists and is not empty/false)
   * @param {string} path - Path to the field
   * @returns {RuleExpression} Rule expression object
   */
  exists(path) {
    return this.and(this.isNotNull(path), this.neq(path, ''), this.neq(path, false));
  }

  // ============================================================================
  // DYNAMIC FIELD COMPARISON - Initialize in constructor
  // ============================================================================

  /**
   * Initialize field comparison helpers
   * @returns {void}
   * @private
   */
  _initializeFieldHelpers() {
    /**
     * Field comparison helpers for comparing two fields dynamically
     * @type {FieldHelpers}
     */
    this.field = {
      equals: (leftPath, rightPath, options) => this.eq(leftPath, rightPath, options),
      greaterThan: (leftPath, rightPath, options) => this.gt(leftPath, rightPath, options),
      greaterThanOrEqual: (leftPath, rightPath, options) => this.gte(leftPath, rightPath, options),
      lessThan: (leftPath, rightPath, options) => this.lt(leftPath, rightPath, options),
      lessThanOrEqual: (leftPath, rightPath, options) => this.lte(leftPath, rightPath, options),
    };
  }

  // ============================================================================
  // VALIDATION PATTERNS - Initialize in constructor
  // ============================================================================

  /**
   * Initialize validation helpers
   * @returns {void}
   * @private
   */
  _initializeValidationHelpers() {
    /**
     * Validation pattern helpers for common validation rules
     * @type {ValidationHelpers}
     */
    this.validation = {
      email: (path) => this.regex(path, '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$'),
      required: (path) => this.and(this.isNotNull(path), this.isNotEmpty(path)),
      minAge: (path, minAge) => this.gte(path, minAge),
      maxAge: (path, maxAge) => this.lte(path, maxAge),
      ageRange: (path, minAge, maxAge) => this.between(path, [minAge, maxAge]),
      oneOf: (path, values) => this.in(path, values),

      // String length validators
      minLength: (path, minLength) => this.gte(`${path}.length`, minLength),
      maxLength: (path, maxLength) => this.lte(`${path}.length`, maxLength),
      lengthRange: (path, minLength, maxLength) =>
        this.between(`${path}.length`, [minLength, maxLength]),
      exactLength: (path, length) => this.eq(`${path}.length`, length),
    };
  }
}
