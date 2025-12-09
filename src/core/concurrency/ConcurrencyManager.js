/**
 * Base class for concurrency management strategies
 */
export class ConcurrencyManager {
  constructor(options = {}) {
    this.options = {
      maxQueueSize: options.maxQueueSize || 1000,
      evaluationTimeout: options.evaluationTimeout || 5000,
      onQueueFull: options.onQueueFull || null,
      onTimeout: options.onTimeout || null,
    };
    this.queueSize = 0;
  }

  /**
   * Execute an evaluation with concurrency control
   * @param {string} ruleId - The rule identifier
   * @param {Function} evaluationFn - The async evaluation function
   * @returns {Promise<any>} - The evaluation result
   */
  // eslint-disable-next-line no-unused-vars
  async execute(ruleId, evaluationFn) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Get current queue size
   * @returns {number}
   */
  getQueueSize() {
    return this.queueSize;
  }

  /**
   * Get statistics about concurrency
   * @returns {Object}
   */
  getStats() {
    throw new Error('getStats() must be implemented by subclass');
  }

  /**
   * Clear all queues and locks
   */
  clear() {
    throw new Error('clear() must be implemented by subclass');
  }
}

/**
 * Parallel execution - no concurrency control (default)
 */
export class ParallelConcurrencyManager extends ConcurrencyManager {
  async execute(ruleId, evaluationFn) {
    // No queueing, execute immediately
    return await evaluationFn();
  }

  getStats() {
    return {
      mode: 'parallel',
      queueSize: 0,
      activeEvaluations: 0,
    };
  }

  clear() {
    // Nothing to clear
  }
}

/**
 * Sequential execution - global queue, one evaluation at a time
 */
export class SequentialConcurrencyManager extends ConcurrencyManager {
  constructor(options = {}) {
    super(options);
    this.queue = [];
    this.isProcessing = false;
  }

  async execute(ruleId, evaluationFn) {
    // Check queue size
    if (this.queue.length >= this.options.maxQueueSize) {
      if (this.options.onQueueFull) {
        this.options.onQueueFull(ruleId, 'global');
      }
      throw new Error(`Evaluation queue full (max: ${this.options.maxQueueSize})`);
    }

    // Create a promise that will be resolved when evaluation completes
    return new Promise((resolve, reject) => {
      const task = {
        ruleId,
        evaluationFn,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(task);
      this.queueSize = this.queue.length;

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.queueSize = this.queue.length;

      try {
        // Check for timeout
        const age = Date.now() - task.timestamp;
        if (age > this.options.evaluationTimeout) {
          if (this.options.onTimeout) {
            this.options.onTimeout(task.ruleId, age);
          }
          task.reject(new Error(`Evaluation timeout for rule ${task.ruleId} (${age}ms)`));
          continue;
        }

        // Execute with timeout
        const result = await Promise.race([
          task.evaluationFn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Evaluation timeout')),
              this.options.evaluationTimeout - age
            )
          ),
        ]);

        task.resolve(result);
      } catch (error) {
        task.reject(error);
      }
    }

    this.isProcessing = false;
  }

  getStats() {
    return {
      mode: 'sequential',
      queueSize: this.queue.length,
      activeEvaluations: this.isProcessing ? 1 : 0,
      isProcessing: this.isProcessing,
    };
  }

  clear() {
    // Reject all pending tasks
    for (const task of this.queue) {
      task.reject(new Error('Queue cleared'));
    }
    this.queue = [];
    this.queueSize = 0;
    this.isProcessing = false;
  }
}

/**
 * Per-rule execution - separate queue per rule ID
 */
export class PerRuleConcurrencyManager extends ConcurrencyManager {
  constructor(options = {}) {
    super(options);
    this.ruleQueues = new Map(); // Map<ruleId, { queue: [], isProcessing: boolean }>
  }

  async execute(ruleId, evaluationFn) {
    // Get or create queue for this rule
    if (!this.ruleQueues.has(ruleId)) {
      this.ruleQueues.set(ruleId, {
        queue: [],
        isProcessing: false,
      });
    }

    const ruleQueue = this.ruleQueues.get(ruleId);

    // Check queue size for this specific rule
    if (ruleQueue.queue.length >= this.options.maxQueueSize) {
      if (this.options.onQueueFull) {
        this.options.onQueueFull(ruleId, 'per-rule');
      }
      throw new Error(
        `Evaluation queue full for rule ${ruleId} (max: ${this.options.maxQueueSize})`
      );
    }

    // Create a promise that will be resolved when evaluation completes
    return new Promise((resolve, reject) => {
      const task = {
        ruleId,
        evaluationFn,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      ruleQueue.queue.push(task);
      this.updateQueueSize();

      // Start processing if not already running for this rule
      if (!ruleQueue.isProcessing) {
        this.processRuleQueue(ruleId);
      }
    });
  }

  async processRuleQueue(ruleId) {
    const ruleQueue = this.ruleQueues.get(ruleId);
    if (!ruleQueue || ruleQueue.isProcessing || ruleQueue.queue.length === 0) {
      return;
    }

    ruleQueue.isProcessing = true;

    while (ruleQueue.queue.length > 0) {
      const task = ruleQueue.queue.shift();
      this.updateQueueSize();

      try {
        // Check for timeout
        const age = Date.now() - task.timestamp;
        if (age > this.options.evaluationTimeout) {
          if (this.options.onTimeout) {
            this.options.onTimeout(task.ruleId, age);
          }
          task.reject(new Error(`Evaluation timeout for rule ${task.ruleId} (${age}ms)`));
          continue;
        }

        // Execute with timeout
        const result = await Promise.race([
          task.evaluationFn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Evaluation timeout')),
              this.options.evaluationTimeout - age
            )
          ),
        ]);

        task.resolve(result);
      } catch (error) {
        task.reject(error);
      }
    }

    ruleQueue.isProcessing = false;

    // Clean up empty queues
    if (ruleQueue.queue.length === 0) {
      this.ruleQueues.delete(ruleId);
    }
  }

  updateQueueSize() {
    let total = 0;
    for (const ruleQueue of this.ruleQueues.values()) {
      total += ruleQueue.queue.length;
    }
    this.queueSize = total;
  }

  getStats() {
    const stats = {
      mode: 'per-rule',
      queueSize: this.queueSize,
      activeRules: 0,
      ruleStats: {},
    };

    for (const [ruleId, ruleQueue] of this.ruleQueues.entries()) {
      if (ruleQueue.isProcessing) {
        stats.activeRules++;
      }
      stats.ruleStats[ruleId] = {
        queueSize: ruleQueue.queue.length,
        isProcessing: ruleQueue.isProcessing,
      };
    }

    return stats;
  }

  clear() {
    // Reject all pending tasks
    for (const ruleQueue of this.ruleQueues.values()) {
      for (const task of ruleQueue.queue) {
        task.reject(new Error('Queue cleared'));
      }
      ruleQueue.queue = [];
      ruleQueue.isProcessing = false;
    }
    this.ruleQueues.clear();
    this.queueSize = 0;
  }
}
