/**
 * Type coercion and validation utilities
 */
export class TypeUtils {
  /**
   * Coerce value to number
   */
  static coerceToNumber(value, strict = false) {
    if (strict) {
      return typeof value === 'number' && !isNaN(value) ? value : null;
    }

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Coerce value to string
   */
  static coerceToString(value, strict = false) {
    if (strict) {
      return typeof value === 'string' ? value : null;
    }

    if (value === null || value === undefined) {
      return null;
    }

    return String(value);
  }

  /**
   * Coerce value to boolean
   */
  static coerceToBoolean(value, strict = false) {
    if (strict) {
      return typeof value === 'boolean' ? value : null;
    }

    return Boolean(value);
  }

  /**
   * Check equality with optional strict mode
   */
  static isEqual(left, right, strict = false) {
    if (strict) {
      return left === right;
    }
    return left == right; // eslint-disable-line eqeqeq
  }

  /**
   * Type checking utilities
   */
  static isArray(value) {
    return Array.isArray(value);
  }

  static isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  static isString(value) {
    return typeof value === 'string';
  }

  static isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  }

  static isBoolean(value) {
    return typeof value === 'boolean';
  }

  static isNull(value) {
    return value === null || value === undefined;
  }
}
