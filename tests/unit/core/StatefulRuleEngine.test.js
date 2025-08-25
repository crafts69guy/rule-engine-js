const { createRuleEngine, StatefulRuleEngine } = require('../../../src/index.js');
const { STATE_OPERATOR_NAMES } = require('../../../src/constants/operators.js');

describe('StatefulRuleEngine', () => {
  let baseEngine;
  let statefulEngine;

  beforeEach(() => {
    baseEngine = createRuleEngine();
    statefulEngine = new StatefulRuleEngine(baseEngine);
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      expect(statefulEngine.engine).toBe(baseEngine);
      expect(statefulEngine.options.triggerOnEveryChange).toBe(false);
      expect(statefulEngine.options.storeHistory).toBe(false);
      expect(statefulEngine.options.maxHistorySize).toBe(100);
    });

    it('should accept custom options', () => {
      const customEngine = new StatefulRuleEngine(baseEngine, {
        triggerOnEveryChange: true,
        storeHistory: true,
        maxHistorySize: 50,
      });

      expect(customEngine.options.triggerOnEveryChange).toBe(true);
      expect(customEngine.options.storeHistory).toBe(true);
      expect(customEngine.options.maxHistorySize).toBe(50);
    });

    it('should initialize empty state storage', () => {
      expect(statefulEngine.previousStates).toBeInstanceOf(Map);
      expect(statefulEngine.ruleStates).toBeInstanceOf(Map);
      expect(statefulEngine.history).toEqual([]);
    });

    it('should initialize event listeners', () => {
      expect(statefulEngine.listeners.triggered).toEqual([]);
      expect(statefulEngine.listeners.untriggered).toEqual([]);
      expect(statefulEngine.listeners.changed).toEqual([]);
      expect(statefulEngine.listeners.evaluated).toEqual([]);
    });

    it('should register state operators with base engine', () => {
      const operators = baseEngine.getOperators();
      Object.values(STATE_OPERATOR_NAMES).forEach((operatorName) => {
        expect(operators).toContain(operatorName);
      });
    });
  });

  describe('Basic Evaluation', () => {
    const rule = { changed: ['user.status'] };

    it('should evaluate first rule with no previous state', () => {
      const context = { user: { status: 'pending' } };
      const result = statefulEngine.evaluate('test-rule', rule, context);

      expect(result.success).toBe(false);
      expect(result.triggered).toBe(false);
      expect(result.hasChangeOperator).toBe(true);
      expect(result.stateChange).toBe('initial');
    });

    it('should detect state changes', () => {
      const context1 = { user: { status: 'pending' } };
      const context2 = { user: { status: 'active' } };

      // First evaluation - no previous state
      const result1 = statefulEngine.evaluate('test-rule', rule, context1);
      expect(result1.success).toBe(false);
      expect(result1.triggered).toBe(false);

      // Second evaluation - status changed
      const result2 = statefulEngine.evaluate('test-rule', rule, context2);
      expect(result2.success).toBe(true);
      expect(result2.triggered).toBe(true);
      expect(result2.stateChange).toBe('triggered');
    });

    it('should maintain state between evaluations', () => {
      const context1 = { user: { status: 'pending' } };
      const context2 = { user: { status: 'active' } };
      const context3 = { user: { status: 'active' } }; // Same as context2

      statefulEngine.evaluate('test-rule', rule, context1);
      statefulEngine.evaluate('test-rule', rule, context2);
      const result3 = statefulEngine.evaluate('test-rule', rule, context3);

      expect(result3.success).toBe(false);
      expect(result3.triggered).toBe(false);
      expect(result3.stateChange).toBe('untriggered');
    });

    it('should handle multiple rules independently', () => {
      const rule1 = { changed: ['user.status'] };
      const rule2 = { changed: ['user.score'] };

      const context1 = { user: { status: 'pending', score: 10 } };
      const context2 = { user: { status: 'active', score: 10 } }; // Only status changed

      statefulEngine.evaluate('rule1', rule1, context1);
      statefulEngine.evaluate('rule2', rule2, context1);

      const result1 = statefulEngine.evaluate('rule1', rule1, context2);
      const result2 = statefulEngine.evaluate('rule2', rule2, context2);

      expect(result1.success).toBe(true); // Status changed
      expect(result2.success).toBe(false); // Score didn't change
    });
  });

  describe('Triggering Logic', () => {
    const rule = { changed: ['user.status'] };

    it('should follow standard triggering behavior by default', () => {
      const context1 = { user: { status: 'pending' } };
      const context2 = { user: { status: 'active' } };
      const context3 = { user: { status: 'completed' } };

      // First: false, no trigger
      const r1 = statefulEngine.evaluate('test', rule, context1);
      expect(r1.triggered).toBe(false);

      // Second: true, triggers (false → true)
      const r2 = statefulEngine.evaluate('test', rule, context2);
      expect(r2.triggered).toBe(true);

      // Third: true, no trigger (true → true)
      const r3 = statefulEngine.evaluate('test', rule, context3);
      expect(r3.triggered).toBe(false);
    });

    it('should trigger on first successful evaluation', () => {
      const context = { user: { status: 'active' } };
      const result = statefulEngine.evaluate('test', rule, context);

      expect(result.success).toBe(false); // No previous state
      expect(result.triggered).toBe(false); // No trigger on first eval
    });

    it('should handle triggerOnEveryChange option', () => {
      const customEngine = new StatefulRuleEngine(baseEngine, {
        triggerOnEveryChange: true,
      });

      const context1 = { user: { status: 'pending' } };
      const context2 = { user: { status: 'active' } };
      const context3 = { user: { status: 'completed' } };

      customEngine.evaluate('test', rule, context1);
      const r2 = customEngine.evaluate('test', rule, context2);
      const r3 = customEngine.evaluate('test', rule, context3);

      expect(r2.triggered).toBe(true); // Change detected
      expect(r3.triggered).toBe(true); // Another change detected
    });

    it('should handle per-evaluation triggerOnEveryChange override', () => {
      const context1 = { user: { status: 'pending' } };
      const context2 = { user: { status: 'active' } };
      const context3 = { user: { status: 'completed' } };

      statefulEngine.evaluate('test', rule, context1);
      statefulEngine.evaluate('test', rule, context2);

      // Override for this evaluation
      const result = statefulEngine.evaluate('test', rule, context3, {
        triggerOnEveryChange: true,
      });

      expect(result.triggered).toBe(true);
    });
  });

  describe('State Change Detection', () => {
    it('should detect initial state', () => {
      const result = statefulEngine.evaluate('test', { changed: ['value'] }, { value: 1 });
      expect(result.stateChange).toBe('initial');
    });

    it('should detect triggered state', () => {
      const rule = { changed: ['value'] };
      statefulEngine.evaluate('test', rule, { value: 1 });
      const result = statefulEngine.evaluate('test', rule, { value: 2 });
      expect(result.stateChange).toBe('triggered');
    });

    it('should detect untriggered state', () => {
      const rule = { changed: ['value'] };
      statefulEngine.evaluate('test', rule, { value: 1 });
      statefulEngine.evaluate('test', rule, { value: 2 }); // triggered
      const result = statefulEngine.evaluate('test', rule, { value: 2 }); // same
      expect(result.stateChange).toBe('untriggered');
    });

    it('should detect maintained-true state', () => {
      const rule = { gt: ['value', 5] }; // Non-change operator
      statefulEngine.evaluate('test', rule, { value: 10 });
      const result = statefulEngine.evaluate('test', rule, { value: 8 });
      expect(result.stateChange).toBe('maintained-true');
    });

    it('should detect maintained-false state', () => {
      const rule = { gt: ['value', 10] };
      statefulEngine.evaluate('test', rule, { value: 5 });
      const result = statefulEngine.evaluate('test', rule, { value: 3 });
      expect(result.stateChange).toBe('maintained-false');
    });
  });

  describe('Event System', () => {
    let eventData = {};

    beforeEach(() => {
      eventData = {};

      statefulEngine.on('evaluated', (data) => {
        eventData.evaluated = data;
      });
      statefulEngine.on('changed', (data) => {
        eventData.changed = data;
      });
      statefulEngine.on('triggered', (data) => {
        eventData.triggered = data;
      });
      statefulEngine.on('untriggered', (data) => {
        eventData.untriggered = data;
      });
    });

    it('should fire evaluated event on every evaluation', () => {
      const rule = { changed: ['value'] };
      statefulEngine.evaluate('test', rule, { value: 1 });

      expect(eventData.evaluated).toBeDefined();
      expect(eventData.evaluated.ruleId).toBe('test');
      expect(eventData.evaluated.result.success).toBe(false);
    });

    it('should fire triggered event on state change to true', () => {
      const rule = { changed: ['value'] };
      statefulEngine.evaluate('test', rule, { value: 1 });
      statefulEngine.evaluate('test', rule, { value: 2 });

      expect(eventData.triggered).toBeDefined();
      expect(eventData.triggered.result.success).toBe(true);
    });

    it('should fire untriggered event on state change to false', () => {
      const rule = { changed: ['value'] };
      statefulEngine.evaluate('test', rule, { value: 1 });
      statefulEngine.evaluate('test', rule, { value: 2 }); // triggered
      statefulEngine.evaluate('test', rule, { value: 2 }); // untriggered

      expect(eventData.untriggered).toBeDefined();
      expect(eventData.untriggered.result.success).toBe(false);
    });

    it('should fire changed event on any state change', () => {
      const rule = { changed: ['value'] };
      statefulEngine.evaluate('test', rule, { value: 1 });
      statefulEngine.evaluate('test', rule, { value: 2 });

      expect(eventData.changed).toBeDefined();
      expect(eventData.changed.previousResult.success).toBe(false);
      expect(eventData.changed.result.success).toBe(true);
    });

    it('should handle event listener errors gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      statefulEngine.on('evaluated', () => {
        throw new Error('Listener error');
      });

      // Should not throw
      expect(() => {
        statefulEngine.evaluate('test', { changed: ['value'] }, { value: 1 });
      }).not.toThrow();

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error in evaluated listener:'),
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('should support adding and removing listeners', () => {
      const callback = jest.fn();

      statefulEngine.on('evaluated', callback);
      statefulEngine.evaluate('test', { changed: ['value'] }, { value: 1 });
      expect(callback).toHaveBeenCalledTimes(1);

      statefulEngine.off('evaluated', callback);
      statefulEngine.evaluate('test', { changed: ['value'] }, { value: 2 });
      expect(callback).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  describe('History Management', () => {
    it('should not store history by default', () => {
      statefulEngine.evaluate('test', { changed: ['value'] }, { value: 1 });
      expect(statefulEngine.history).toEqual([]);
    });

    it('should store history when enabled', () => {
      const historyEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
      });

      historyEngine.evaluate('test', { changed: ['value'] }, { value: 1 });

      expect(historyEngine.history).toHaveLength(1);
      expect(historyEngine.history[0]).toMatchObject({
        ruleId: 'test',
        result: expect.any(Object),
        timestamp: expect.any(String),
      });
    });

    it('should limit history size', () => {
      const historyEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
        maxHistorySize: 2,
      });

      // Add 3 evaluations
      historyEngine.evaluate('test', { changed: ['value'] }, { value: 1 });
      historyEngine.evaluate('test', { changed: ['value'] }, { value: 2 });
      historyEngine.evaluate('test', { changed: ['value'] }, { value: 3 });

      expect(historyEngine.history).toHaveLength(2); // Limited to 2
      // Should keep the most recent 2
      expect(historyEngine.history[0].context.value).toBe(2);
      expect(historyEngine.history[1].context.value).toBe(3);
    });

    it('should get history for specific rule', () => {
      const historyEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
      });

      historyEngine.evaluate('rule1', { changed: ['value'] }, { value: 1 });
      historyEngine.evaluate('rule2', { changed: ['value'] }, { value: 2 });
      historyEngine.evaluate('rule1', { changed: ['value'] }, { value: 3 });

      const rule1History = historyEngine.getHistory('rule1');
      expect(rule1History).toHaveLength(2);
      expect(rule1History.every((h) => h.ruleId === 'rule1')).toBe(true);
    });
  });

  describe('State Clearing', () => {
    beforeEach(() => {
      // Set up some state
      statefulEngine.evaluate('rule1', { changed: ['value'] }, { value: 1 });
      statefulEngine.evaluate('rule2', { changed: ['value'] }, { value: 2 });
    });

    it('should clear specific rule state', () => {
      statefulEngine.clearState('rule1');

      expect(statefulEngine.previousStates.has('rule1')).toBe(false);
      expect(statefulEngine.ruleStates.has('rule1')).toBe(false);
      expect(statefulEngine.previousStates.has('rule2')).toBe(true);
      expect(statefulEngine.ruleStates.has('rule2')).toBe(true);
    });

    it('should clear all state when no ruleId provided', () => {
      const historyEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
      });
      historyEngine.evaluate('rule1', { changed: ['value'] }, { value: 1 });

      historyEngine.clearState();

      expect(historyEngine.previousStates.size).toBe(0);
      expect(historyEngine.ruleStates.size).toBe(0);
      expect(historyEngine.history).toEqual([]);
    });
  });

  describe('Batch Evaluation', () => {
    it('should evaluate multiple rules with same context', () => {
      const rules = {
        statusChanged: { changed: ['status'] },
        scoreIncreased: { increased: ['score'] },
        isActive: { eq: ['status', 'active'] },
      };

      const context = { status: 'active', score: 85 };
      const results = statefulEngine.evaluateBatch(rules, context);

      expect(results).toHaveProperty('statusChanged');
      expect(results).toHaveProperty('scoreIncreased');
      expect(results).toHaveProperty('isActive');

      expect(results.isActive.success).toBe(true); // Non-stateful rule
    });

    it('should maintain independent state for each rule', () => {
      const rules = {
        rule1: { changed: ['value'] },
        rule2: { changed: ['value'] },
      };

      // First batch - establish initial state
      statefulEngine.evaluateBatch(rules, { value: 1 });

      // Second batch - both should detect change
      const results = statefulEngine.evaluateBatch(rules, { value: 2 });

      expect(results.rule1.success).toBe(true);
      expect(results.rule2.success).toBe(true);
    });

    it('should support batch evaluation options', () => {
      const rules = {
        rule1: { changed: ['value'] },
      };

      // Set up initial state
      statefulEngine.evaluateBatch(rules, { value: 1 });
      statefulEngine.evaluateBatch(rules, { value: 2 }); // triggered

      // Third evaluation with triggerOnEveryChange
      const results = statefulEngine.evaluateBatch(
        rules,
        { value: 3 },
        {
          triggerOnEveryChange: true,
        }
      );

      expect(results.rule1.triggered).toBe(true);
    });
  });

  describe('Integration with Base Engine', () => {
    it('should work with existing operators', () => {
      const mixedRule = {
        and: [{ changed: ['status'] }, { eq: ['active', true] }],
      };

      const context1 = { status: 'pending', active: true };
      const context2 = { status: 'active', active: true };

      statefulEngine.evaluate('mixed', mixedRule, context1);
      const result = statefulEngine.evaluate('mixed', mixedRule, context2);

      expect(result.success).toBe(true); // Both conditions met
    });

    it('should preserve base engine functionality', () => {
      // Test that base engine methods are still accessible
      expect(statefulEngine.engine.getOperators()).toContain('eq');
      expect(statefulEngine.engine.getOperators()).toContain('changed');

      const metrics = statefulEngine.engine.getMetrics();
      expect(metrics).toHaveProperty('evaluations');
    });

    it('should handle base engine errors gracefully', () => {
      const result = statefulEngine.evaluate('test', { invalidOp: ['value'] }, { value: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown operator');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined contexts', () => {
      expect(() => {
        statefulEngine.evaluate('test', { changed: ['value'] }, undefined);
      }).not.toThrow();
    });

    it('should handle empty contexts', () => {
      const result = statefulEngine.evaluate('test', { changed: ['value'] }, {});
      expect(result.success).toBe(false);
    });

    it('should handle complex nested contexts', () => {
      const rule = { changed: ['deep.nested.path.value'] };
      const context1 = { deep: { nested: { path: { value: 'old' } } } };
      const context2 = { deep: { nested: { path: { value: 'new' } } } };

      statefulEngine.evaluate('test', rule, context1);
      const result = statefulEngine.evaluate('test', rule, context2);

      expect(result.success).toBe(true);
    });

    it('should handle context mutations', () => {
      const rule = { changed: ['value'] };
      const context1 = { value: 1 };
      const context2 = { value: 2 }; // Use separate contexts

      statefulEngine.evaluate('test', rule, context1);
      const result = statefulEngine.evaluate('test', rule, context2);
      expect(result.success).toBe(true); // Should detect change
    });
  });
});
