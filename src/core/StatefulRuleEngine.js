import { StateChangeOperators } from '../operators/state.js';

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
      maxHistorySize: options.maxHistorySize || 100,
      ...options,
    };

    // State storage
    this.previousStates = new Map();
    this.ruleStates = new Map();
    this.history = [];

    // Event listeners
    this.listeners = {
      triggered: [], // false → true
      untriggered: [], // true → false
      changed: [], // any state change
      evaluated: [], // every evaluation
    };

    // Register state change operators
    const stateOps = new StateChangeOperators(
      this.engine._internal.pathResolver,
      this.engine._internal.engine.config
    );
    stateOps.register(this.engine._internal.engine);
  }

  /**
   * Evaluate rule with state tracking
   */
  evaluate(ruleId, rule, context, options = {}) {
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

    // Store current state for next evaluation
    this.previousStates.set(ruleId, context);
    this.ruleStates.set(ruleId, result);

    // Store history if enabled
    if (this.options.storeHistory) {
      this.addToHistory(eventData);
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
   * Emit event to all listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Add to history with size limit
   */
  addToHistory(eventData) {
    this.history.push(eventData);
    if (this.history.length > this.options.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get history for a specific rule
   */
  getHistory(ruleId) {
    return this.history.filter((h) => h.ruleId === ruleId);
  }

  /**
   * Clear all state
   */
  clearState(ruleId = null) {
    if (ruleId) {
      this.previousStates.delete(ruleId);
      this.ruleStates.delete(ruleId);
    } else {
      this.previousStates.clear();
      this.ruleStates.clear();
      this.history = [];
    }
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
   * Batch evaluate multiple rules
   */
  evaluateBatch(rules, context, options = {}) {
    const results = {};

    for (const [ruleId, rule] of Object.entries(rules)) {
      results[ruleId] = this.evaluate(ruleId, rule, context, options);
    }

    return results;
  }
}
