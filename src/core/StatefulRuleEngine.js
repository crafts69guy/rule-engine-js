import { StateChangeOperators } from '../operators/state.js';
import { GlobalHistoryManager, PerRuleHistoryManager } from './history/index.js';
import {
  ParallelConcurrencyManager,
  SequentialConcurrencyManager,
  PerRuleConcurrencyManager,
} from './concurrency/index.js';
import { ErrorRecoveryManager } from './recovery/index.js';

/**
 * ============================================================================
 * STATEFUL RULE ENGINE WRAPPER
 * Wraps the base rule engine to add state tracking and event triggering
 * ============================================================================
 */
export class StatefulRuleEngine {
  constructor(baseEngine, options = {}) {
    this.engine = baseEngine;
    this.options = {
      triggerOnEveryChange: options.triggerOnEveryChange || false,
      storeHistory: options.storeHistory || false,
      maxHistorySize: options.maxHistorySize || 100, // Global limit (legacy)
      maxHistoryPerRule: options.maxHistoryPerRule || null, // Per-rule limit (Phase 2)
      stateExpirationMs: options.stateExpirationMs || null, // null = no expiration
      cleanupIntervalMs: options.cleanupIntervalMs || 60000, // 1 minute default
      enableDeepCopy: options.enableDeepCopy !== false, // true by default
      maxListeners: options.maxListeners || 100, // Warn at 100 listeners per event
      // Phase 3.1: Persistence hooks
      persistence: options.persistence || null,
      // Phase 3.2: Concurrency control
      concurrency: options.concurrency || null,
      // Phase 3.3: Error recovery
      errorRecovery: options.errorRecovery || null,
      ...options,
    };

    // State storage with timestamps
    this.previousStates = new Map();
    this.ruleStates = new Map();
    this.stateTimestamps = new Map(); // Track when each state was last accessed

    // History manager: Strategy Pattern (Phase 2)
    if (this.options.maxHistoryPerRule) {
      this.historyManager = new PerRuleHistoryManager(this.options.maxHistoryPerRule);
    } else {
      this.historyManager = new GlobalHistoryManager(this.options.maxHistorySize);
    }

    // Event listeners
    this.listeners = {
      triggered: [], // false → true
      untriggered: [], // true → false
      changed: [], // any state change
      evaluated: [], // every evaluation
    };

    // Start cleanup timer if expiration is enabled
    this.cleanupTimer = null;
    if (this.options.stateExpirationMs) {
      this.startCleanupTimer();
    }

    // Phase 3.1: Persistence setup
    this.persistenceTimer = null;
    this.pendingSaves = new Set(); // Track rules pending save
    if (this.options.persistence?.enabled) {
      this.validatePersistenceConfig();
      if (this.options.persistence.autoSaveInterval) {
        this.startPersistenceTimer();
      }
    }

    // Phase 3.2: Concurrency control setup
    this.concurrencyManager = this.createConcurrencyManager();

    // Phase 3.3: Error recovery setup
    this.errorRecoveryManager = this.createErrorRecoveryManager();

    // Register state change operators
    const stateOps = new StateChangeOperators(
      this.engine._internal.pathResolver,
      this.engine._internal.engine.config
    );
    stateOps.register(this.engine._internal.engine);
  }

  /**
   * Create concurrency manager based on configuration
   */
  createConcurrencyManager() {
    const concurrency = this.options.concurrency;

    if (!concurrency) {
      // Default: parallel execution (no concurrency control)
      return new ParallelConcurrencyManager();
    }

    // Support both string shorthand and object configuration
    let mode = 'parallel';
    let options = {};

    if (typeof concurrency === 'string') {
      // Shorthand: concurrency: 'sequential'
      mode = concurrency;
    } else if (typeof concurrency === 'object') {
      // Full configuration object
      mode = concurrency.mode || 'parallel';
      options = {
        maxQueueSize: concurrency.maxQueueSize,
        evaluationTimeout: concurrency.evaluationTimeout,
        onQueueFull: concurrency.onQueueFull,
        onTimeout: concurrency.onTimeout,
      };
    }

    switch (mode) {
      case 'sequential':
        return new SequentialConcurrencyManager(options);
      case 'per-rule':
        return new PerRuleConcurrencyManager(options);
      case 'parallel':
        return new ParallelConcurrencyManager(options);
      default:
        throw new Error(
          `Invalid concurrency mode: ${mode}. Must be 'parallel', 'sequential', or 'per-rule'`
        );
    }
  }

  /**
   * Create error recovery manager based on configuration
   */
  createErrorRecoveryManager() {
    const errorRecovery = this.options.errorRecovery;

    if (!errorRecovery) {
      // Default: disabled error recovery
      return new ErrorRecoveryManager({ enabled: false });
    }

    return new ErrorRecoveryManager(errorRecovery);
  }

  /**
   * Deep copy utility to prevent context mutation issues
   */
  deepCopy(obj, seen = new WeakMap()) {
    if (!this.options.enableDeepCopy) {
      return obj;
    }

    // Handle primitives and null
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Check for circular references
    if (seen.has(obj)) {
      return seen.get(obj);
    }

    // Handle Date
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    // Handle Array
    if (Array.isArray(obj)) {
      const copied = [];
      seen.set(obj, copied);
      for (const item of obj) {
        copied.push(this.deepCopy(item, seen));
      }
      return copied;
    }

    // Handle Object
    const copied = {};
    seen.set(obj, copied);
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Skip internal meta properties
        if (key === '_previous' || key === '_meta') {
          continue;
        }
        copied[key] = this.deepCopy(obj[key], seen);
      }
    }
    return copied;
  }

  /**
   * Evaluate rule with state tracking (async)
   * @param {string} ruleId - Rule identifier
   * @param {Object} rule - Rule definition
   * @param {Object} context - Evaluation context
   * @param {Object} options - Evaluation options
   * @returns {Promise<Object>} - Evaluation result
   */
  async evaluate(ruleId, rule, context, options = {}) {
    // Phase 3.3: Wrap with error recovery (retry, circuit breaker, fallback)
    return await this.errorRecoveryManager.execute(
      ruleId,
      async () => {
        // Phase 3.2: Use concurrency manager for proper queueing and timeout handling
        return await this.concurrencyManager.execute(ruleId, async () => {
          return this._evaluateInternal(ruleId, rule, context, options);
        });
      },
      // Fallback function - if primary rule fails, try fallback rule
      async (fallbackRule) => {
        return await this.concurrencyManager.execute(ruleId, async () => {
          return this._evaluateInternal(ruleId, fallbackRule, context, options);
        });
      }
    );
  }

  /**
   * Internal evaluation logic (without concurrency control)
   */
  _evaluateInternal(ruleId, rule, context, options = {}) {
    // Update timestamp for this rule (for TTL tracking)
    this.stateTimestamps.set(ruleId, Date.now());

    // Prepare context with previous state
    const previousContext = this.previousStates.get(ruleId);
    const enrichedContext = {
      ...context,
      _previous: previousContext,
      _meta: { hasChangeOperator: false },
    };

    // Evaluate the rule
    const result = this.engine.evaluateExpr(rule, enrichedContext);

    // Check if rule contains change operators and determine if it's purely change-based
    const hasChangeOperator = enrichedContext._meta.hasChangeOperator;
    const isPureChangeRule = this.isPureChangeRule(rule);

    // Get previous rule result
    const previousResult = this.ruleStates.get(ruleId);

    // Determine if we should trigger
    const shouldTrigger = this.shouldTrigger(
      previousResult,
      result,
      hasChangeOperator,
      isPureChangeRule,
      options
    );

    // Create event data
    const eventData = {
      ruleId,
      rule,
      context,
      previousContext,
      result,
      previousResult,
      triggered: shouldTrigger,
      timestamp: new Date().toISOString(),
    };

    // Store current state for next evaluation (with deep copy to prevent mutation)
    this.previousStates.set(ruleId, this.deepCopy(context));
    this.ruleStates.set(ruleId, result);

    // Phase 3: Mark rule for persistence
    this.markForSave(ruleId);

    // Store history if enabled
    if (this.options.storeHistory) {
      this.historyManager.add(eventData);

      // Phase 3: Save history to persistence if configured
      if (this.options.persistence?.onHistorySave) {
        // Don't await - fire and forget for performance
        this.saveHistoryEntry(eventData).catch((err) => {
          console.error('Failed to save history entry:', err);
        });
      }
    }

    // Fire events
    this.fireEvents(eventData, previousResult);

    return {
      ...result,
      triggered: shouldTrigger,
      hasChangeOperator,
      stateChange: this.detectStateChange(previousResult, result),
    };
  }

  /**
   * Determine if rule should trigger based on state change
   */
  shouldTrigger(previousResult, currentResult, hasChangeOperator, isPureChangeRule, options = {}) {
    // No previous state - first run (always trigger if rule succeeds)
    if (!previousResult) {
      return currentResult.success;
    }

    // Override option for this evaluation
    const triggerOnEveryChange = options.triggerOnEveryChange ?? this.options.triggerOnEveryChange;

    // If rule contains change operators
    if (hasChangeOperator) {
      if (triggerOnEveryChange) {
        // Trigger on every successful evaluation (every change detected)
        return currentResult.success;
      } else {
        // Default behavior: trigger only on false → true transition
        // This applies to both pure change and mixed rules
        return !previousResult.success && currentResult.success;
      }
    }

    // Standard behavior for non-change operators: trigger only on false → true transition
    return !previousResult.success && currentResult.success;
  }

  /**
   * Detect type of state change
   */
  detectStateChange(previousResult, currentResult) {
    if (!previousResult) {
      return 'initial';
    }
    if (!previousResult.success && currentResult.success) {
      return 'triggered';
    }
    if (previousResult.success && !currentResult.success) {
      return 'untriggered';
    }
    if (previousResult.success && currentResult.success) {
      return 'maintained-true';
    }
    return 'maintained-false';
  }

  /**
   * Fire appropriate events
   */
  fireEvents(eventData, previousResult) {
    const { result, triggered } = eventData;

    // Always fire evaluated event
    this.emit('evaluated', eventData);

    // Fire trigger events based on whether rule was triggered
    if (triggered) {
      this.emit('triggered', eventData);
    }

    // Fire state change events based on rule success state changes
    if (!previousResult || previousResult.success !== result.success) {
      this.emit('changed', eventData);

      if (!triggered && !result.success) {
        // Only fire untriggered if rule wasn't triggered but state changed to false
        this.emit('untriggered', eventData);
      }
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);

      // Warn if listener count exceeds threshold
      if (this.listeners[event].length >= this.options.maxListeners) {
        console.warn(
          `Warning: ${this.listeners[event].length} listeners registered for '${event}' event. ` +
            `This may indicate a memory leak. Consider removing unused listeners or increasing maxListeners.`
        );
      }
    }
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  /**
   * Remove all listeners for a specific event or all events
   */
  removeAllListeners(event = null) {
    if (event) {
      if (this.listeners[event]) {
        this.listeners[event] = [];
      }
    } else {
      // Remove all listeners for all events
      for (const evt in this.listeners) {
        this.listeners[evt] = [];
      }
    }
  }

  /**
   * Get the number of listeners for a specific event
   */
  getListenerCount(event) {
    return this.listeners[event] ? this.listeners[event].length : 0;
  }

  /**
   * Get all listener counts
   */
  getAllListenerCounts() {
    const counts = {};
    for (const event in this.listeners) {
      counts[event] = this.listeners[event].length;
    }
    return counts;
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Get history for a specific rule
   */
  getHistory(ruleId) {
    return this.historyManager.get(ruleId);
  }

  /**
   * Get all history (across all rules)
   */
  getAllHistory() {
    return this.historyManager.getAll();
  }

  /**
   * Get history statistics
   */
  getHistoryStats() {
    return this.historyManager.getStats();
  }

  /**
   * Start the cleanup timer for expired states
   */
  startCleanupTimer() {
    if (this.cleanupTimer) {
      return; // Already running
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredStates();
    }, this.options.cleanupIntervalMs);

    // Allow Node.js process to exit even if timer is running
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clean up expired states based on TTL
   */
  cleanupExpiredStates() {
    if (!this.options.stateExpirationMs) {
      return { removedCount: 0 };
    }

    const now = Date.now();
    const expirationThreshold = now - this.options.stateExpirationMs;
    const removedRules = [];

    for (const [ruleId, timestamp] of this.stateTimestamps.entries()) {
      if (timestamp < expirationThreshold) {
        this.previousStates.delete(ruleId);
        this.ruleStates.delete(ruleId);
        this.stateTimestamps.delete(ruleId);
        removedRules.push(ruleId);
      }
    }

    return {
      removedCount: removedRules.length,
      removedRules,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear all state
   */
  clearState(ruleId = null) {
    if (ruleId) {
      this.previousStates.delete(ruleId);
      this.ruleStates.delete(ruleId);
      this.stateTimestamps.delete(ruleId);
      this.historyManager.clearRule(ruleId);
    } else {
      this.previousStates.clear();
      this.ruleStates.clear();
      this.stateTimestamps.clear();
      this.historyManager.clear();
    }
  }

  /**
   * Get statistics about current state storage
   */
  getStateStats() {
    return {
      totalRules: this.previousStates.size,
      historySize: this.historyManager.size(),
      listenerCounts: this.getAllListenerCounts(),
      oldestStateAge: this.getOldestStateAge(),
      memoryEstimate: this.estimateMemoryUsage(),
    };
  }

  /**
   * Get the age of the oldest state in milliseconds
   */
  getOldestStateAge() {
    if (this.stateTimestamps.size === 0) {
      return null;
    }

    const now = Date.now();
    let oldest = now;

    for (const timestamp of this.stateTimestamps.values()) {
      if (timestamp < oldest) {
        oldest = timestamp;
      }
    }

    return now - oldest;
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  estimateMemoryUsage() {
    const bytesPerEntry = 1000; // Rough estimate: 1KB per state entry
    const stateMemory = this.previousStates.size * bytesPerEntry;
    const historyMemory = this.historyManager.size() * bytesPerEntry;

    return {
      states: `~${Math.round(stateMemory / 1024)}KB`,
      history: `~${Math.round(historyMemory / 1024)}KB`,
      total: `~${Math.round((stateMemory + historyMemory) / 1024)}KB`,
    };
  }

  /**
   * Get concurrency statistics (Phase 3.2)
   */
  getConcurrencyStats() {
    return this.concurrencyManager.getStats();
  }

  /**
   * Destroy the engine and cleanup resources
   */
  async destroy() {
    // Phase 3.3: Cleanup error recovery resources
    if (this.errorRecoveryManager) {
      this.errorRecoveryManager.destroy();
    }

    // Phase 3.2: Clear concurrency queues
    if (this.concurrencyManager) {
      this.concurrencyManager.clear();
    }

    // Phase 3.1: Flush any pending saves before destroying
    if (this.options.persistence?.enabled) {
      await this.flushPendingSaves();
      this.stopPersistenceTimer();
    }

    this.stopCleanupTimer();
    this.removeAllListeners();
    this.clearState();
  }

  /**
   * Determine if a rule contains only change operators (no mixed logic)
   */
  isPureChangeRule(rule) {
    const changeOperators = [
      'changed',
      'changedBy',
      'changedFrom',
      'changedTo',
      'increased',
      'decreased',
    ];

    const checkRule = (r) => {
      if (typeof r !== 'object' || r === null) {
        return true; // literals are neutral
      }

      for (const [operator, args] of Object.entries(r)) {
        if (changeOperators.includes(operator)) {
          continue; // change operators are allowed
        } else if (operator === 'and' || operator === 'or') {
          // Logical operators - check all sub-rules
          if (Array.isArray(args)) {
            for (const subRule of args) {
              if (!checkRule(subRule)) {
                return false;
              }
            }
          }
        } else {
          // Non-change operator found - this is a mixed rule
          return false;
        }
      }
      return true;
    };

    return checkRule(rule);
  }

  /**
   * Batch evaluate multiple rules with enhanced error handling (async)
   * @returns {Promise<Object>} - Batch evaluation results
   */
  async evaluateBatch(rules, context, options = {}) {
    const batchOptions = {
      stopOnError: options.stopOnError || false, // Continue on error by default
      collectErrors: options.collectErrors !== false, // Collect errors by default
      ...options,
    };

    const results = {};
    const errors = [];
    let successCount = 0;
    let errorCount = 0;

    for (const [ruleId, rule] of Object.entries(rules)) {
      try {
        const result = await this.evaluate(ruleId, rule, context, batchOptions);
        results[ruleId] = result;

        // Check if the result contains an error (engine returns error info in result)
        if (result.error) {
          errorCount++;

          // Collect error information
          if (batchOptions.collectErrors) {
            errors.push({
              ruleId,
              rule,
              error: {
                message: result.error,
                operator: result.operator,
                details: result.details,
              },
              timestamp: result.timestamp,
            });
          }

          // Stop processing if stopOnError is enabled
          if (batchOptions.stopOnError) {
            break;
          }
        } else {
          successCount++;
        }
      } catch (error) {
        // Handle unexpected exceptions (shouldn't normally happen)
        errorCount++;

        // Collect error information
        if (batchOptions.collectErrors) {
          errors.push({
            ruleId,
            rule,
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Store error result
        results[ruleId] = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        };

        // Stop processing if stopOnError is enabled
        if (batchOptions.stopOnError) {
          break;
        }
      }
    }

    return {
      results,
      success: errorCount === 0,
      successCount,
      errorCount,
      totalCount: Object.keys(rules).length,
      errors: batchOptions.collectErrors ? errors : undefined,
    };
  }

  /**
   * ============================================================================
   * PHASE 3: PERSISTENCE HOOKS
   * ============================================================================
   */

  /**
   * Validate persistence configuration
   */
  validatePersistenceConfig() {
    const { persistence } = this.options;

    if (!persistence || !persistence.enabled) {
      return;
    }

    // Validate required hooks if auto-save is enabled
    if (persistence.autoSaveInterval && !persistence.onStateSave) {
      throw new Error('persistence.onStateSave is required when autoSaveInterval is enabled');
    }

    // Validate hook types
    if (persistence.onStateSave && typeof persistence.onStateSave !== 'function') {
      throw new Error('persistence.onStateSave must be a function');
    }

    if (persistence.onStateLoad && typeof persistence.onStateLoad !== 'function') {
      throw new Error('persistence.onStateLoad must be a function');
    }

    if (persistence.onHistorySave && typeof persistence.onHistorySave !== 'function') {
      throw new Error('persistence.onHistorySave must be a function');
    }

    // Validate autoSaveInterval
    if (persistence.autoSaveInterval && typeof persistence.autoSaveInterval !== 'number') {
      throw new Error('persistence.autoSaveInterval must be a number');
    }
  }

  /**
   * Start the persistence timer for auto-save
   */
  startPersistenceTimer() {
    if (this.persistenceTimer) {
      return; // Already running
    }

    const interval = this.options.persistence.autoSaveInterval;
    this.persistenceTimer = setInterval(async () => {
      await this.flushPendingSaves();
    }, interval);

    // Allow Node.js process to exit even if timer is running
    if (this.persistenceTimer.unref) {
      this.persistenceTimer.unref();
    }
  }

  /**
   * Stop the persistence timer
   */
  stopPersistenceTimer() {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }
  }

  /**
   * Flush all pending state saves
   */
  async flushPendingSaves() {
    if (!this.options.persistence?.onStateSave) {
      return;
    }

    const rulesToSave = Array.from(this.pendingSaves);
    this.pendingSaves.clear();

    const savePromises = rulesToSave.map(async (ruleId) => {
      try {
        const state = {
          previousContext: this.previousStates.get(ruleId),
          ruleState: this.ruleStates.get(ruleId),
          timestamp: this.stateTimestamps.get(ruleId),
        };

        await this.options.persistence.onStateSave(ruleId, state);
      } catch (error) {
        console.error(`Failed to save state for rule ${ruleId}:`, error);
        // Re-add to pending saves for retry
        this.pendingSaves.add(ruleId);
      }
    });

    await Promise.all(savePromises);
  }

  /**
   * Mark a rule as having pending changes that need to be saved
   */
  markForSave(ruleId) {
    if (this.options.persistence?.enabled) {
      this.pendingSaves.add(ruleId);
    }
  }

  /**
   * Manually save state for a specific rule
   */
  async saveState(ruleId) {
    if (!this.options.persistence?.onStateSave) {
      throw new Error('persistence.onStateSave hook is not configured');
    }

    const state = {
      previousContext: this.previousStates.get(ruleId),
      ruleState: this.ruleStates.get(ruleId),
      timestamp: this.stateTimestamps.get(ruleId),
    };

    await this.options.persistence.onStateSave(ruleId, state);
    this.pendingSaves.delete(ruleId); // Remove from pending
  }

  /**
   * Load state for a specific rule from persistence
   */
  async loadState(ruleId) {
    if (!this.options.persistence?.onStateLoad) {
      throw new Error('persistence.onStateLoad hook is not configured');
    }

    const state = await this.options.persistence.onStateLoad(ruleId);

    if (state) {
      if (state.previousContext !== undefined) {
        this.previousStates.set(ruleId, state.previousContext);
      }
      if (state.ruleState !== undefined) {
        this.ruleStates.set(ruleId, state.ruleState);
      }
      if (state.timestamp !== undefined) {
        this.stateTimestamps.set(ruleId, state.timestamp);
      }
    }

    return state;
  }

  /**
   * Serialize entire engine state to a plain object
   */
  serialize() {
    const states = {};
    for (const [ruleId, previousContext] of this.previousStates.entries()) {
      states[ruleId] = {
        previousContext,
        ruleState: this.ruleStates.get(ruleId),
        timestamp: this.stateTimestamps.get(ruleId),
      };
    }

    return {
      states,
      history: this.historyManager.getAll(),
      options: {
        triggerOnEveryChange: this.options.triggerOnEveryChange,
        storeHistory: this.options.storeHistory,
        maxHistorySize: this.options.maxHistorySize,
        maxHistoryPerRule: this.options.maxHistoryPerRule,
      },
      metadata: {
        serializedAt: new Date().toISOString(),
        ruleCount: this.previousStates.size,
        historySize: this.historyManager.size(),
      },
    };
  }

  /**
   * Hydrate engine state from a serialized object
   */
  async hydrate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Hydration data must be an object');
    }

    // Clear existing state
    this.clearState();

    // Restore states
    if (data.states) {
      for (const [ruleId, state] of Object.entries(data.states)) {
        if (state.previousContext !== undefined) {
          this.previousStates.set(ruleId, state.previousContext);
        }
        if (state.ruleState !== undefined) {
          this.ruleStates.set(ruleId, state.ruleState);
        }
        if (state.timestamp !== undefined) {
          this.stateTimestamps.set(ruleId, state.timestamp);
        }
      }
    }

    // Restore history
    if (data.history && Array.isArray(data.history)) {
      for (const eventData of data.history) {
        this.historyManager.add(eventData);
      }
    }

    return {
      restoredRules: Object.keys(data.states || {}).length,
      restoredHistory: data.history?.length || 0,
      metadata: data.metadata,
    };
  }

  /**
   * Save history entry to persistence
   */
  async saveHistoryEntry(eventData) {
    if (!this.options.persistence?.onHistorySave) {
      return;
    }

    try {
      await this.options.persistence.onHistorySave(eventData);
    } catch (error) {
      console.error('Failed to save history entry:', error);
    }
  }

  /**
   * Phase 3.3: Error Recovery Helper Methods
   */

  /**
   * Register a fallback rule for a specific rule
   * @param {string} ruleId
   * @param {Object} fallbackRule
   */
  registerFallbackRule(ruleId, fallbackRule) {
    this.errorRecoveryManager.registerFallbackRule(ruleId, fallbackRule);
  }

  /**
   * Register a fallback value for a specific rule
   * @param {string} ruleId
   * @param {any} value
   */
  registerFallbackValue(ruleId, value) {
    this.errorRecoveryManager.registerFallbackValue(ruleId, value);
  }

  /**
   * Get error recovery statistics
   * @returns {Object}
   */
  getErrorRecoveryStats() {
    return this.errorRecoveryManager.getStats();
  }

  /**
   * Get circuit breaker state for a rule
   * @param {string} ruleId
   * @returns {string}
   */
  getCircuitState(ruleId) {
    return this.errorRecoveryManager.getCircuitState(ruleId);
  }

  /**
   * Reset circuit breaker for a rule
   * @param {string} ruleId - Optional specific rule
   */
  resetCircuit(ruleId) {
    this.errorRecoveryManager.resetCircuit(ruleId);
  }

  /**
   * Get error history for a rule
   * @param {string} ruleId
   * @returns {Array}
   */
  getErrorHistory(ruleId) {
    return this.errorRecoveryManager.getErrorHistory(ruleId);
  }

  /**
   * Get error rate for a rule
   * @param {string} ruleId
   * @returns {Object|null}
   */
  getErrorRate(ruleId) {
    return this.errorRecoveryManager.getErrorRate(ruleId);
  }
}
