import { BaseOperator } from './base/BaseOperator.js';
import { OPERATOR_NAMES } from '../constants/operators.js';
import { TypeUtils } from '../utils/TypeUtils.js';
import { OperatorError } from '../utils/errors.js';

/**
 * Regex operator with pattern caching for performance
 */
export class RegexOperator extends BaseOperator {
  constructor(pathResolver, config) {
    super(pathResolver, config);

    // Cache compiled regex patterns for performance
    this.regexCache = new Map();
    this.maxCacheSize = config.maxCacheSize || 1000;
  }

  /**
   * Register regex operator with the engine
   */
  register(engine) {
    const { REGEX } = OPERATOR_NAMES;
    engine.registerOperator(REGEX, this.createRegexOperator().bind(this));
  }

  /**
   * Create regex operator
   */
  createRegexOperator() {
    return (args, context) => {
      // Validate arguments - can be 2 or 3 args
      if (!Array.isArray(args) || args.length < 2 || args.length > 3) {
        throw new OperatorError('REGEX operator requires 2 or 3 arguments', 'REGEX', {
          args,
          actualLength: args.length,
        });
      }

      const [left, right, options = {}] = args;

      // Resolve both operands
      const { left: resolvedLeft, right: resolvedRight } = this.resolveOperands(
        context,
        left,
        right,
        'literal'
      );

      // Coerce to strings
      const text = TypeUtils.coerceToString(resolvedLeft, false);
      const pattern = TypeUtils.coerceToString(resolvedRight, false);

      if (text === null || pattern === null) {
        throw new OperatorError('REGEX operator requires valid text and pattern', 'REGEX', {
          text: resolvedLeft,
          pattern: resolvedRight,
        });
      }

      try {
        // Get compiled regex from cache or create new one
        const flags = options.flags || '';
        const regex = this.getCompiledRegex(pattern, flags);
        return regex.test(text);
      } catch (error) {
        throw new OperatorError(
          `Invalid regex pattern: ${pattern}`,
          'REGEX',
          { pattern, text, flags: options.flags },
          error
        );
      }
    };
  }

  /**
   * Get compiled regex from cache or create new one
   */
  getCompiledRegex(pattern, flags = '') {
    const cacheKey = `${pattern}:::${flags}`;

    // Check cache first
    if (this.regexCache.has(cacheKey)) {
      return this.regexCache.get(cacheKey);
    }

    // Create new regex
    const regex = new RegExp(pattern, flags);

    // Cache with LRU eviction
    if (this.regexCache.size >= this.maxCacheSize) {
      const firstKey = this.regexCache.keys().next().value;
      this.regexCache.delete(firstKey);
    }

    this.regexCache.set(cacheKey, regex);
    return regex;
  }

  /**
   * Clear regex cache
   */
  clearCache() {
    this.regexCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.regexCache.size,
      maxSize: this.maxCacheSize,
    };
  }
}
