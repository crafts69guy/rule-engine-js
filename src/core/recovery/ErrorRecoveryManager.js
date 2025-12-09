import { RetryManager } from './RetryStrategies.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { FallbackManager } from './FallbackManager.js';

/**
 * Centralized error recovery manager
 * Coordinates retry, circuit breaker, and fallback strategies
 */
export class ErrorRecoveryManager {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      ...options,
    };

    // Initialize sub-managers
    this.retryManager = new RetryManager(options.retry || {});
    this.circuitBreaker = new CircuitBreaker(options.circuitBreaker || {});
    this.fallbackManager = new FallbackManager(options.fallback || {});

    // Error tracking
    this.errorHistory = new Map(); // Rule ID -> error history
    this.errorRates = new Map(); // Rule ID -> error rate info
    this.maxErrorHistory = options.maxErrorHistory || 100;
    this.errorRateWindow = options.errorRateWindow || 60000; // 1 minute

    // Custom hooks
    this.onError = options.onError || null;
  }

  /**
   * Execute function with full error recovery pipeline
   * Order: Circuit Breaker -> Retry -> Fallback
   * @param {string} ruleId
   * @param {Function} fn - Primary execution function
   * @param {Function} fallbackFn - Optional fallback execution function
   * @returns {Promise<any>}
   */
  async execute(ruleId, fn, fallbackFn = null) {
    if (!this.options.enabled) {
      return await fn();
    }

    try {
      // Execute through circuit breaker and retry
      const result = await this.circuitBreaker.execute(ruleId, async () => {
        return await this.retryManager.execute(ruleId, fn);
      });

      // Success - record it
      this.recordSuccess(ruleId);

      return result;
    } catch (error) {
      // Record error
      this.recordError(ruleId, error);

      // Call custom error hook
      if (this.onError) {
        this.onError(error, ruleId);
      }

      // Try fallback
      return await this.fallbackManager.execute(
        ruleId,
        () => {
          throw error; // Re-throw to trigger fallback
        },
        fallbackFn
      );
    }
  }

  /**
   * Record successful execution
   * @param {string} ruleId
   */
  recordSuccess(ruleId) {
    // Update error rate tracking
    if (this.errorRates.has(ruleId)) {
      const rateInfo = this.errorRates.get(ruleId);
      rateInfo.successCount++;
    }
  }

  /**
   * Record error
   * @param {string} ruleId
   * @param {Error} error
   */
  recordError(ruleId, error) {
    // Add to error history
    if (!this.errorHistory.has(ruleId)) {
      this.errorHistory.set(ruleId, []);
    }

    const history = this.errorHistory.get(ruleId);
    history.push({
      message: error.message,
      operator: error.operator || null,
      timestamp: Date.now(),
    });

    // Limit history size
    if (history.length > this.maxErrorHistory) {
      history.shift();
    }

    // Update error rate
    if (!this.errorRates.has(ruleId)) {
      this.errorRates.set(ruleId, {
        errorCount: 0,
        successCount: 0,
        windowStart: Date.now(),
      });
    }

    const rateInfo = this.errorRates.get(ruleId);
    rateInfo.errorCount++;

    // Reset window if expired
    if (Date.now() - rateInfo.windowStart > this.errorRateWindow) {
      rateInfo.errorCount = 1;
      rateInfo.successCount = 0;
      rateInfo.windowStart = Date.now();
    }
  }

  /**
   * Get error history for a rule
   * @param {string} ruleId
   * @returns {Array}
   */
  getErrorHistory(ruleId) {
    return this.errorHistory.get(ruleId) || [];
  }

  /**
   * Get error rate for a rule
   * @param {string} ruleId
   * @returns {Object|null}
   */
  getErrorRate(ruleId) {
    const rateInfo = this.errorRates.get(ruleId);
    if (!rateInfo) {
      return null;
    }

    const total = rateInfo.errorCount + rateInfo.successCount;
    const rate = total > 0 ? rateInfo.errorCount / total : 0;

    return {
      errorCount: rateInfo.errorCount,
      successCount: rateInfo.successCount,
      total,
      rate,
      windowStart: rateInfo.windowStart,
      windowDuration: Date.now() - rateInfo.windowStart,
    };
  }

  /**
   * Register fallback rule
   * @param {string} ruleId
   * @param {Object} fallbackRule
   */
  registerFallbackRule(ruleId, fallbackRule) {
    this.fallbackManager.registerFallbackRule(ruleId, fallbackRule);
  }

  /**
   * Register fallback value
   * @param {string} ruleId
   * @param {any} value
   */
  registerFallbackValue(ruleId, value) {
    this.fallbackManager.registerFallbackValue(ruleId, value);
  }

  /**
   * Get circuit breaker state
   * @param {string} ruleId
   * @returns {string}
   */
  getCircuitState(ruleId) {
    return this.circuitBreaker.getState(ruleId);
  }

  /**
   * Reset circuit breaker
   * @param {string} ruleId - Optional specific rule
   */
  resetCircuit(ruleId) {
    this.circuitBreaker.reset(ruleId);
  }

  /**
   * Get comprehensive statistics
   * @returns {Object}
   */
  getStats() {
    return {
      enabled: this.options.enabled,
      retry: this.retryManager.getStats(),
      circuitBreaker: this.circuitBreaker.getStats(),
      fallback: this.fallbackManager.getStats(),
      errorTracking: {
        totalRulesWithErrors: this.errorHistory.size,
        totalErrorsRecorded: Array.from(this.errorHistory.values()).reduce(
          (sum, history) => sum + history.length,
          0
        ),
        errorRates: Object.fromEntries(
          Array.from(this.errorRates.entries()).map(([ruleId]) => [
            ruleId,
            this.getErrorRate(ruleId),
          ])
        ),
      },
    };
  }

  /**
   * Clear all history and state
   * @param {string} ruleId - Optional specific rule
   */
  clear(ruleId) {
    if (ruleId) {
      this.errorHistory.delete(ruleId);
      this.errorRates.delete(ruleId);
      this.retryManager.clearHistory(ruleId);
      this.fallbackManager.clearHistory(ruleId);
      this.circuitBreaker.reset(ruleId);
    } else {
      this.errorHistory.clear();
      this.errorRates.clear();
      this.retryManager.clearHistory();
      this.fallbackManager.clearHistory();
      this.circuitBreaker.reset();
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.circuitBreaker.destroy();
    this.fallbackManager.clear();
    this.errorHistory.clear();
    this.errorRates.clear();
  }
}
