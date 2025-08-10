import { OPERATOR_NAMES } from '../constants/operators.js';

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
   */
  eq(left, right, options) {
    // If options is explicitly passed (even if undefined), include it
    return arguments.length > 2
      ? { [this.ops.EQ]: [left, right, options || {}] }
      : { [this.ops.EQ]: [left, right] };
  }

  /**
   * Not equal to
   */
  neq(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.NEQ]: [left, right, options || {}] }
      : { [this.ops.NEQ]: [left, right] };
  }

  /**
   * Greater than
   */
  gt(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.GT]: [left, right, options || {}] }
      : { [this.ops.GT]: [left, right] };
  }

  /**
   * Greater than or equal
   */
  gte(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.GTE]: [left, right, options || {}] }
      : { [this.ops.GTE]: [left, right] };
  }

  /**
   * Less than
   */
  lt(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.LT]: [left, right, options || {}] }
      : { [this.ops.LT]: [left, right] };
  }

  /**
   * Less than or equal
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
   */
  and(...expressions) {
    return { [this.ops.AND]: expressions };
  }

  /**
   * Logical OR - at least one condition must be true
   */
  or(...expressions) {
    return { [this.ops.OR]: expressions };
  }

  /**
   * Logical NOT - negates the expression
   */
  not(expression) {
    return { [this.ops.NOT]: [expression] };
  }

  // ============================================================================
  // STRING OPERATORS
  // ============================================================================

  /**
   * String contains
   */
  contains(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.CONTAINS]: [left, right, options || {}] }
      : { [this.ops.CONTAINS]: [left, right] };
  }

  /**
   * String starts with
   */
  startsWith(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.STARTS_WITH]: [left, right, options || {}] }
      : { [this.ops.STARTS_WITH]: [left, right] };
  }

  /**
   * String ends with
   */
  endsWith(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.ENDS_WITH]: [left, right, options || {}] }
      : { [this.ops.ENDS_WITH]: [left, right] };
  }

  /**
   * Regular expression match
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
   * Value is in array
   */
  in(left, right, options) {
    return arguments.length > 2
      ? { [this.ops.IN]: [left, right, options || {}] }
      : { [this.ops.IN]: [left, right] };
  }

  /**
   * Value is not in array
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
   */
  between(value, range, options) {
    return arguments.length > 2
      ? { [this.ops.BETWEEN]: [value, range, options || {}] }
      : { [this.ops.BETWEEN]: [value, range] };
  }

  /**
   * Value is null or undefined
   */
  isNull(path) {
    return { [this.ops.IS_NULL]: [path] };
  }

  /**
   * Value is not null and not undefined
   */
  isNotNull(path) {
    return { [this.ops.IS_NOT_NULL]: [path] };
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Field equals true
   */
  isTrue(path) {
    return this.eq(path, true);
  }

  /**
   * Field equals false
   */
  isFalse(path) {
    return this.eq(path, false);
  }

  /**
   * Field equals empty string
   */
  isEmpty(path) {
    return this.eq(path, '');
  }

  /**
   * Field does not equal empty string
   */
  isNotEmpty(path) {
    return this.neq(path, '');
  }

  /**
   * Field has any truthy value (exists and is not empty/false)
   */
  exists(path) {
    return this.and(this.isNotNull(path), this.neq(path, ''), this.neq(path, false));
  }

  // ============================================================================
  // DYNAMIC FIELD COMPARISON - Initialize in constructor
  // ============================================================================

  /**
   * Initialize field comparison helpers
   */
  _initializeFieldHelpers() {
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
   */
  _initializeValidationHelpers() {
    this.validation = {
      email: (path) => this.regex(path, '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$'),
      required: (path) => this.and(this.isNotNull(path), this.isNotEmpty(path)),
      minAge: (path, minAge) => this.gte(path, minAge),
      maxAge: (path, maxAge) => this.lte(path, maxAge),
      ageRange: (path, minAge, maxAge) => this.between(path, [minAge, maxAge]),
      oneOf: (path, values) => this.in(path, values),
    };
  }
}
