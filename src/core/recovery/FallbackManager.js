/**
 * Fallback manager handles graceful degradation strategies
 */
export class FallbackManager {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      defaultValue: options.defaultValue !== undefined ? options.defaultValue : null,
      useFallbackRules: options.useFallbackRules !== false,
      onFallback: options.onFallback || null,
    };

    this.fallbackRules = new Map(); // Rule ID -> fallback rule
    this.fallbackValues = new Map(); // Rule ID -> fallback value
    this.fallbackHistory = new Map(); // Track fallback usage
  }

  /**
   * Register a fallback rule for a specific rule
   * @param {string} ruleId - Primary rule ID
   * @param {Object} fallbackRule - Alternative rule to use
   */
  registerFallbackRule(ruleId, fallbackRule) {
    this.fallbackRules.set(ruleId, fallbackRule);
  }

  /**
   * Register a fallback value for a specific rule
   * @param {string} ruleId
   * @param {any} value
   */
  registerFallbackValue(ruleId, value) {
    this.fallbackValues.set(ruleId, value);
  }

  /**
   * Execute with fallback handling
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
      return await fn();
    } catch (error) {
      // Track fallback usage
      this.recordFallback(ruleId, error);

      // Try fallback rule if available
      if (this.options.useFallbackRules && this.fallbackRules.has(ruleId)) {
        if (fallbackFn) {
          try {
            const fallbackRule = this.fallbackRules.get(ruleId);
            const fallbackResult = await fallbackFn(fallbackRule);

            // Mark result as fallback
            fallbackResult.isFallback = true;
            fallbackResult.fallbackReason = error.message;

            // Call hook
            if (this.options.onFallback) {
              this.options.onFallback(ruleId, 'rule', fallbackResult);
            }

            return fallbackResult;
          } catch {
            // Fallback rule also failed, continue to default value
          }
        }
      }

      // Try specific fallback value
      if (this.fallbackValues.has(ruleId)) {
        const fallbackValue = this.fallbackValues.get(ruleId);

        // Call hook
        if (this.options.onFallback) {
          this.options.onFallback(ruleId, 'value', fallbackValue);
        }

        return fallbackValue;
      }

      // Use default fallback value
      if (this.options.defaultValue !== undefined) {
        // Call hook
        if (this.options.onFallback) {
          this.options.onFallback(ruleId, 'default', this.options.defaultValue);
        }

        return this.options.defaultValue;
      }

      // No fallback available, rethrow error
      throw error;
    }
  }

  /**
   * Record fallback usage
   * @param {string} ruleId
   * @param {Error} error
   */
  recordFallback(ruleId, error) {
    if (!this.fallbackHistory.has(ruleId)) {
      this.fallbackHistory.set(ruleId, []);
    }

    this.fallbackHistory.get(ruleId).push({
      error: error.message,
      timestamp: Date.now(),
    });

    // Limit history size
    const history = this.fallbackHistory.get(ruleId);
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get fallback history for a rule
   * @param {string} ruleId
   * @returns {Array}
   */
  getFallbackHistory(ruleId) {
    return this.fallbackHistory.get(ruleId) || [];
  }

  /**
   * Clear fallback history
   * @param {string} ruleId - Optional specific rule
   */
  clearHistory(ruleId) {
    if (ruleId) {
      this.fallbackHistory.delete(ruleId);
    } else {
      this.fallbackHistory.clear();
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      enabled: this.options.enabled,
      totalRulesWithFallbacks: this.fallbackRules.size + this.fallbackValues.size,
      fallbackRulesCount: this.fallbackRules.size,
      fallbackValuesCount: this.fallbackValues.size,
      totalFallbackUsage: 0,
    };

    for (const history of this.fallbackHistory.values()) {
      stats.totalFallbackUsage += history.length;
    }

    return stats;
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.fallbackRules.clear();
    this.fallbackValues.clear();
    this.fallbackHistory.clear();
  }
}
