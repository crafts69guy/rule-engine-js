/**
 * Base class for retry strategies
 */
export class RetryStrategy {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.initialDelay = options.initialDelay || 100;
    this.maxDelay = options.maxDelay || 5000;
  }

  /**
   * Calculate delay for next retry attempt
   * @param {number} attempt - Current attempt number (1-based)
   * @returns {number} - Delay in milliseconds
   */
  // eslint-disable-next-line no-unused-vars
  getDelay(attempt) {
    throw new Error('getDelay() must be implemented by subclass');
  }

  /**
   * Check if should retry
   * @param {number} attempt - Current attempt number
   * @returns {boolean}
   */
  shouldRetry(attempt) {
    return attempt < this.maxAttempts;
  }
}

/**
 * Exponential backoff strategy: delay doubles each attempt
 * Delay = initialDelay * (2 ^ (attempt - 1))
 */
export class ExponentialBackoffStrategy extends RetryStrategy {
  getDelay(attempt) {
    const delay = this.initialDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }
}

/**
 * Fixed delay strategy: same delay for all attempts
 */
export class FixedDelayStrategy extends RetryStrategy {
  getDelay() {
    return Math.min(this.initialDelay, this.maxDelay);
  }
}

/**
 * Linear backoff strategy: delay increases linearly
 * Delay = initialDelay * attempt
 */
export class LinearBackoffStrategy extends RetryStrategy {
  getDelay(attempt) {
    const delay = this.initialDelay * attempt;
    return Math.min(delay, this.maxDelay);
  }
}

/**
 * Retry manager handles retry logic with configurable strategies
 */
export class RetryManager {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      maxAttempts: options.maxAttempts || 3,
      strategy: options.strategy || 'exponential',
      initialDelay: options.initialDelay || 100,
      maxDelay: options.maxDelay || 5000,
      retryableErrors: options.retryableErrors || [],
      onRetry: options.onRetry || null,
    };

    this.strategy = this.createStrategy();
    this.retryHistory = new Map(); // Track retry attempts per rule
  }

  createStrategy() {
    const strategyOptions = {
      maxAttempts: this.options.maxAttempts,
      initialDelay: this.options.initialDelay,
      maxDelay: this.options.maxDelay,
    };

    switch (this.options.strategy) {
      case 'exponential':
        return new ExponentialBackoffStrategy(strategyOptions);
      case 'fixed':
        return new FixedDelayStrategy(strategyOptions);
      case 'linear':
        return new LinearBackoffStrategy(strategyOptions);
      default:
        throw new Error(`Unknown retry strategy: ${this.options.strategy}`);
    }
  }

  /**
   * Check if error is retryable
   * @param {Error} error
   * @returns {boolean}
   */
  isRetryableError(error) {
    if (this.options.retryableErrors.length === 0) {
      return true; // Retry all errors if no specific errors configured
    }

    const errorMessage = error.message.toLowerCase();
    return this.options.retryableErrors.some((pattern) =>
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * Execute function with retry logic
   * @param {string} ruleId - Rule identifier
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>}
   */
  async execute(ruleId, fn) {
    if (!this.options.enabled) {
      return await fn();
    }

    let lastError;
    let attempt = 0;

    while (attempt < this.options.maxAttempts) {
      attempt++;

      try {
        const result = await fn();

        // Success - clear retry history
        if (attempt > 1) {
          this.retryHistory.delete(ruleId);
        }

        return result;
      } catch (error) {
        lastError = error;

        // Track retry attempt
        if (!this.retryHistory.has(ruleId)) {
          this.retryHistory.set(ruleId, []);
        }
        this.retryHistory.get(ruleId).push({
          attempt,
          error: error.message,
          timestamp: Date.now(),
        });

        // Check if should retry
        if (!this.isRetryableError(error)) {
          throw error; // Non-retryable error
        }

        if (!this.strategy.shouldRetry(attempt)) {
          throw error; // Max attempts reached
        }

        // Call onRetry hook
        if (this.options.onRetry) {
          this.options.onRetry(attempt, error, ruleId);
        }

        // Wait before next attempt
        const delay = this.strategy.getDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry history for a rule
   * @param {string} ruleId
   * @returns {Array}
   */
  getRetryHistory(ruleId) {
    return this.retryHistory.get(ruleId) || [];
  }

  /**
   * Clear retry history
   * @param {string} ruleId - Optional specific rule
   */
  clearHistory(ruleId) {
    if (ruleId) {
      this.retryHistory.delete(ruleId);
    } else {
      this.retryHistory.clear();
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      enabled: this.options.enabled,
      strategy: this.options.strategy,
      maxAttempts: this.options.maxAttempts,
      totalRulesWithRetries: this.retryHistory.size,
      retryHistorySize: 0,
    };

    for (const history of this.retryHistory.values()) {
      stats.retryHistorySize += history.length;
    }

    return stats;
  }
}
