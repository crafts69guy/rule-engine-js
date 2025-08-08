import { PathResolver } from './PathResolver.js';
import { RuleEngineError } from '../utils/errors.js';
import { DEFAULT_CONFIG } from '../constants/operators.js';

/**
 * Main Rule Engine class
 * Handles rule evaluation, operator management, and performance tracking
 */
export class RuleEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pathResolver = new PathResolver(this.config);
    this.operators = new Map();

    // Performance metrics
    this.metrics = {
      evaluations: 0,
      cacheHits: 0,
      errors: 0,
      totalTime: 0,
      avgTime: 0,
    };

    // Expression cache with LRU behavior
    this.expressionCache = this.config.enableCache ? new Map() : null;
  }

  /**
   * Evaluate a rule expression against a context
   * @param {Object} expr - The rule expression to evaluate
   * @param {Object} context - The data context for evaluation
   * @param {number} depth - Current recursion depth (for internal use)
   * @returns {Object} Evaluation result with success flag and details
   */
  evaluateExpr(expr, context, depth = 0) {
    // eslint-disable-next-line no-undef
    const startTime = performance.now();
    this.metrics.evaluations++;

    try {
      // Validate rule structure and depth
      this._validateRule(expr, depth);

      // Check expression cache for performance
      const cacheResult = this._checkExpressionCache(expr, context);
      if (cacheResult) {
        this.metrics.cacheHits++;
        this._updateMetrics(startTime, true);
        return cacheResult;
      }

      // Evaluate the expression
      const result = this._evaluateExpression(expr, context, depth);

      // Cache successful results
      this._cacheExpressionResult(expr, context, result);

      this._updateMetrics(startTime, false);
      return result;
    } catch (error) {
      this.metrics.errors++;
      this._updateMetrics(startTime, false);

      return this._createErrorResult(error, expr, context);
    }
  }

  /**
   * Register a custom operator
   * @param {string} name - Operator name
   * @param {Function} handler - Operator implementation function
   * @param {Object} options - Registration options
   */
  registerOperator(name, handler, options = {}) {
    if (!options.allowOverwrite && this.operators.has(name)) {
      throw new RuleEngineError(`Operator '${name}' already exists`, name);
    }

    if (typeof handler !== 'function') {
      throw new RuleEngineError('Operator handler must be a function', name);
    }

    this.operators.set(name, handler);
  }

  /**
   * Get all registered operators
   * @returns {string[]} Array of operator names
   */
  getOperators() {
    return Array.from(this.operators.keys());
  }

  /**
   * Get performance metrics
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    if (this.expressionCache) {
      this.expressionCache.clear();
    }
    this.pathResolver.clearCache();
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration object
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics for monitoring
   */
  getCacheStats() {
    return {
      expression: this.expressionCache
        ? {
            size: this.expressionCache.size,
            maxSize: this.config.maxCacheSize,
          }
        : null,
      path: this.pathResolver.getCacheStats(),
    };
  }

  // Private methods

  /**
   * Validate rule structure and depth
   * @private
   */
  _validateRule(rule, depth) {
    if (depth > this.config.maxDepth) {
      throw new RuleEngineError(`Rule exceeds maximum depth of ${this.config.maxDepth}`, null, {
        depth,
        maxDepth: this.config.maxDepth,
      });
    }

    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      throw new RuleEngineError('Rule must be a non-null object', null, { rule });
    }

    const operators = Object.keys(rule);
    if (operators.length === 0) {
      throw new RuleEngineError('Rule must contain at least one operator', null, { rule });
    }

    // Validate operator count
    const operatorCount = this._countOperators(rule);
    if (operatorCount > this.config.maxOperators) {
      throw new RuleEngineError(
        `Rule exceeds maximum operators of ${this.config.maxOperators}`,
        null,
        { operatorCount, maxOperators: this.config.maxOperators }
      );
    }
  }

  /**
   * Count total operators in a rule (including nested ones)
   * @private
   */
  _countOperators(rule, count = 0) {
    if (!rule || typeof rule !== 'object') {
      return count;
    }

    for (const [key, value] of Object.entries(rule)) {
      if (this.operators.has(key)) {
        count++;
        if (Array.isArray(value)) {
          for (const item of value) {
            count = this._countOperators(item, count);
          }
        }
      }
    }

    return count;
  }

  /**
   * Check expression cache for existing result
   * @private
   */
  _checkExpressionCache(expr, context) {
    if (!this.expressionCache) {
      return null;
    }

    const cacheKey = this._createExpressionCacheKey(expr, context);
    return this.expressionCache.get(cacheKey) || null;
  }

  /**
   * Cache expression result with LRU eviction
   * @private
   */
  _cacheExpressionResult(expr, context, result) {
    if (!this.expressionCache || !result.success) {
      return;
    }

    const cacheKey = this._createExpressionCacheKey(expr, context);

    // LRU eviction: remove oldest entry if cache is full
    if (this.expressionCache.size >= this.config.maxCacheSize) {
      const firstKey = this.expressionCache.keys().next().value;
      this.expressionCache.delete(firstKey);
    }

    this.expressionCache.set(cacheKey, result);
  }

  /**
   * Evaluate the actual expression
   * @private
   */
  _evaluateExpression(expr, context, depth) {
    const operators = Object.keys(expr);

    for (const operatorName of operators) {
      const args = expr[operatorName];
      const operator = this.operators.get(operatorName);

      if (!operator) {
        throw new RuleEngineError(`Unknown operator: ${operatorName}`, operatorName, { args });
      }

      if (!Array.isArray(args)) {
        throw new RuleEngineError(`Invalid arguments for operator ${operatorName}`, operatorName, {
          args,
          type: typeof args,
        });
      }

      try {
        const result = operator(args, context, this.evaluateExpr.bind(this), depth);
        if (!result) {
          return {
            success: false,
            operator: operatorName,
            details: { args, context },
          };
        }
      } catch (error) {
        throw new RuleEngineError(
          `Error in operator ${operatorName}: ${error.message}`,
          operatorName,
          { args, context },
          error
        );
      }
    }

    return { success: true };
  }

  /**
   * Create cache key for expression
   * @private
   */
  _createExpressionCacheKey(expr, context) {
    try {
      // Create a stable cache key
      const exprStr = JSON.stringify(expr);
      const contextId = this._getContextId(context);
      return `expr:${exprStr}:ctx:${contextId}`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('error', error);
      // Fallback for circular references or other JSON issues
      return `fallback:${Date.now()}:${Math.random()}`;
    }
  }

  /**
   * Get context identifier for caching
   * @private
   */
  _getContextId(context) {
    if (context && typeof context === 'object') {
      // Try explicit identifiers first
      if (context._id) {return String(context._id);}
      if (context.id) {return String(context.id);}

      // Generate based on structure
      const keys = Object.keys(context).sort();
      return `keys:${keys.join(',')}:count:${keys.length}`;
    }

    return 'default';
  }

  /**
   * Create error result object
   * @private
   */
  _createErrorResult(error, expr, context) {
    const ruleError =
      error instanceof RuleEngineError
        ? error
        : new RuleEngineError('Expression evaluation failed', null, { expr, context }, error);

    if (this.config.enableDebug) {
      // eslint-disable-next-line no-console
      console.error('Rule evaluation failed:', ruleError);
    }

    return {
      success: false,
      operator: ruleError.operator,
      error: ruleError.message,
      details: ruleError.context,
      timestamp: ruleError.timestamp,
    };
  }

  /**
   * Update performance metrics
   * @private
   */
  _updateMetrics(startTime, wasCacheHit) {
    // eslint-disable-next-line no-undef
    const duration = performance.now() - startTime;
    this.metrics.totalTime += duration;
    this.metrics.avgTime = this.metrics.totalTime / this.metrics.evaluations;

    if (wasCacheHit) {
      this.metrics.cacheHits++;
    }
  }
}
