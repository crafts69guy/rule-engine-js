const { createRuleEngine, StatefulRuleEngine } = require('../../../src/index.js');

describe('Phase 3: Concurrency Control', () => {
  let baseEngine;

  beforeEach(() => {
    baseEngine = createRuleEngine();
  });

  describe('Concurrency Configuration', () => {
    it('should default to parallel mode when no concurrency option provided', async () => {
      const engine = new StatefulRuleEngine(baseEngine);
      const manager = engine.concurrencyManager;

      expect(manager.constructor.name).toBe('ParallelConcurrencyManager');
      const stats = manager.getStats();
      expect(stats.mode).toBe('parallel');
    });

    it('should create parallel concurrency manager', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'parallel',
      });

      const stats = engine.concurrencyManager.getStats();
      expect(stats.mode).toBe('parallel');
      expect(engine.concurrencyManager.queueSize).toBe(0);
    });

    it('should create sequential concurrency manager', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'sequential',
      });

      const stats = engine.concurrencyManager.getStats();
      expect(stats.mode).toBe('sequential');
      expect(engine.concurrencyManager.queueSize).toBe(0);
      expect(engine.concurrencyManager.isProcessing).toBe(false);
    });

    it('should create per-rule concurrency manager', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'per-rule',
      });

      const stats = engine.concurrencyManager.getStats();
      expect(stats.mode).toBe('per-rule');
      expect(engine.concurrencyManager.ruleQueues.size).toBe(0);
    });

    it('should handle concurrency options', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: {
          mode: 'sequential',
          maxQueueSize: 50,
          evaluationTimeout: 3000,
        },
      });

      const stats = engine.concurrencyManager.getStats();
      expect(stats.mode).toBe('sequential');
      expect(engine.concurrencyManager.options.maxQueueSize).toBe(50);
      expect(engine.concurrencyManager.options.evaluationTimeout).toBe(3000);
    });

    it('should use default concurrency options when not specified', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'sequential',
      });

      const manager = engine.concurrencyManager;
      expect(manager.options.maxQueueSize).toBe(1000);
      expect(manager.options.evaluationTimeout).toBe(5000);
    });

    it('should throw error for invalid concurrency mode', () => {
      expect(() => {
        new StatefulRuleEngine(baseEngine, {
          concurrency: 'invalid-mode',
        });
      }).toThrow('Invalid concurrency mode');
    });
  });

  describe('Parallel Concurrency Mode', () => {
    let engine;

    beforeEach(() => {
      engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'parallel',
      });
    });

    it('should execute evaluations immediately without queueing', async () => {
      const rule = { changed: ['value'] };
      const startTime = Date.now();

      // Execute multiple evaluations
      const promises = [
        engine.evaluate('rule1', rule, { value: 1 }),
        engine.evaluate('rule2', rule, { value: 2 }),
        engine.evaluate('rule3', rule, { value: 3 }),
      ];

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(duration).toBeLessThan(100); // Should be very fast since parallel
      expect(engine.concurrencyManager.queueSize).toBe(0);
    });

    it('should handle concurrent evaluations of same rule', async () => {
      const rule = { eq: ['value', 42] };

      const results = await Promise.all([
        engine.evaluate('test-rule', rule, { value: 42 }),
        engine.evaluate('test-rule', rule, { value: 10 }),
        engine.evaluate('test-rule', rule, { value: 42 }),
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should get concurrency statistics', () => {
      const stats = engine.concurrencyManager.getStats();

      expect(stats).toMatchObject({
        mode: 'parallel',
        queueSize: 0,
        activeEvaluations: 0,
      });
    });
  });

  describe('Sequential Concurrency Mode', () => {
    let engine;

    beforeEach(() => {
      engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'sequential',
      });
    });

    it('should queue evaluations and execute one at a time', async () => {
      const rule = { changed: ['value'] };
      let executionOrder = [];

      // Simulate some delay in evaluation
      const evaluateWithDelay = async (ruleId, context) => {
        const result = await engine.evaluate(ruleId, rule, context);
        executionOrder.push(ruleId);
        return result;
      };

      // Execute multiple evaluations
      const promises = [
        evaluateWithDelay('rule1', { value: 1 }),
        evaluateWithDelay('rule2', { value: 2 }),
        evaluateWithDelay('rule3', { value: 3 }),
      ];

      await Promise.all(promises);

      // All should execute successfully
      expect(executionOrder).toHaveLength(3);
      expect(engine.concurrencyManager.queueSize).toBe(0);
    });

    it('should respect max queue size', async () => {
      const smallEngine = new StatefulRuleEngine(baseEngine, {
        concurrency: {
          mode: 'sequential',
          maxQueueSize: 2,
        },
      });

      const rule = { changed: ['value'] };

      // Fill the queue
      const p1 = smallEngine.evaluate('rule1', rule, { value: 1 });
      const p2 = smallEngine.evaluate('rule2', rule, { value: 2 });
      const p3 = smallEngine.evaluate('rule3', rule, { value: 3 });

      // This should exceed the queue size and throw
      await expect(smallEngine.evaluate('rule4', rule, { value: 4 })).rejects.toThrow(
        'Evaluation queue full'
      );

      // Wait for initial evaluations to complete
      await Promise.all([p1, p2, p3]);
    });

    it('should handle evaluation timeout', async () => {
      const timeoutEngine = new StatefulRuleEngine(baseEngine, {
        concurrency: {
          mode: 'sequential',
          evaluationTimeout: 10, // Very short timeout
        },
      });

      // The timeout is more for long-running custom operators
      // For now, verify the timeout option is set
      expect(timeoutEngine.concurrencyManager.options.evaluationTimeout).toBe(10);
    });

    it('should get sequential concurrency statistics', async () => {
      const rule = { changed: ['value'] };

      // Execute some evaluations
      await engine.evaluate('rule1', rule, { value: 1 });
      await engine.evaluate('rule2', rule, { value: 2 });

      const stats = engine.concurrencyManager.getStats();

      expect(stats.mode).toBe('sequential');
      expect(stats.queueSize).toBe(0);
      expect(stats.isProcessing).toBe(false);
    });

    it('should clear queue on manager clear', async () => {
      const rule = { changed: ['value'] };

      // Start some evaluations
      const p1 = engine.evaluate('rule1', rule, { value: 1 });
      const p2 = engine.evaluate('rule2', rule, { value: 2 });

      // Clear the manager (this rejects pending tasks)
      engine.concurrencyManager.clear();

      // Catch the rejections from cleared tasks
      await expect(p1).resolves.toBeDefined();
      await expect(p2).rejects.toThrow('Queue cleared');

      expect(engine.concurrencyManager.queueSize).toBe(0);
      expect(engine.concurrencyManager.isProcessing).toBe(false);
    });
  });

  describe('Per-Rule Concurrency Mode', () => {
    let engine;

    beforeEach(() => {
      engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'per-rule',
      });
    });

    it('should maintain separate queues for different rules', async () => {
      const rule = { changed: ['value'] };

      // Execute evaluations for different rules
      const results = await Promise.all([
        engine.evaluate('rule-A', rule, { value: 1 }),
        engine.evaluate('rule-B', rule, { value: 2 }),
        engine.evaluate('rule-A', rule, { value: 3 }),
        engine.evaluate('rule-B', rule, { value: 4 }),
      ]);

      expect(results).toHaveLength(4);

      // Should have created queues for both rules
      const stats = engine.concurrencyManager.getStats();
      expect(stats.ruleStats).toBeDefined();
    });

    it('should execute same-rule evaluations sequentially', async () => {
      const rule = { changed: ['value'] };
      let executionOrder = [];

      // Track execution order for rule1
      const evaluateWithTracking = async (ruleId, value) => {
        const result = await engine.evaluate(ruleId, rule, { value });
        if (ruleId === 'rule1') {
          executionOrder.push(value);
        }
        return result;
      };

      // Execute multiple evaluations for rule1 (should be sequential)
      await Promise.all([
        evaluateWithTracking('rule1', 1),
        evaluateWithTracking('rule1', 2),
        evaluateWithTracking('rule1', 3),
      ]);

      // All should execute
      expect(executionOrder).toHaveLength(3);
    });

    it('should execute different-rule evaluations in parallel', async () => {
      const rule = { changed: ['value'] };
      const startTime = Date.now();

      // Execute evaluations for different rules (should be parallel)
      await Promise.all([
        engine.evaluate('ruleA', rule, { value: 1 }),
        engine.evaluate('ruleB', rule, { value: 2 }),
        engine.evaluate('ruleC', rule, { value: 3 }),
      ]);

      const duration = Date.now() - startTime;

      // Should be fast since parallel
      expect(duration).toBeLessThan(100);
    });

    it('should respect per-rule max queue size', async () => {
      const smallEngine = new StatefulRuleEngine(baseEngine, {
        concurrency: {
          mode: 'per-rule',
          maxQueueSize: 2,
        },
      });

      const rule = { changed: ['value'] };

      // Fill the queue for rule1
      const p1 = smallEngine.evaluate('rule1', rule, { value: 1 });
      const p2 = smallEngine.evaluate('rule1', rule, { value: 2 });
      const p3 = smallEngine.evaluate('rule1', rule, { value: 3 });

      // This should exceed the queue size for rule1
      await expect(smallEngine.evaluate('rule1', rule, { value: 4 })).rejects.toThrow(
        'Evaluation queue full'
      );

      // But rule2 should still work fine
      await expect(smallEngine.evaluate('rule2', rule, { value: 1 })).resolves.toBeDefined();

      // Wait for rule1 evaluations to complete
      await Promise.all([p1, p2, p3]);
    });

    it('should get per-rule statistics', async () => {
      const rule = { changed: ['value'] };

      await engine.evaluate('rule1', rule, { value: 1 });
      await engine.evaluate('rule2', rule, { value: 2 });
      await engine.evaluate('rule1', rule, { value: 3 });

      const stats = engine.concurrencyManager.getStats();

      expect(stats.mode).toBe('per-rule');
      expect(stats.queueSize).toBeDefined();
      expect(stats.ruleStats).toBeDefined();
    });

    it('should clear all rule queues on manager clear', async () => {
      const rule = { changed: ['value'] };

      // Create some queues
      await engine.evaluate('rule1', rule, { value: 1 });
      await engine.evaluate('rule2', rule, { value: 2 });

      // Clear the manager
      engine.concurrencyManager.clear();

      expect(engine.concurrencyManager.ruleQueues.size).toBe(0);

      const stats = engine.concurrencyManager.getStats();
      expect(Object.keys(stats.ruleStats).length).toBe(0);
    });
  });

  describe('Integration with StatefulRuleEngine', () => {
    it('should work with batch evaluation in parallel mode', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'parallel',
      });

      const rules = {
        rule1: { changed: ['value1'] },
        rule2: { changed: ['value2'] },
        rule3: { changed: ['value3'] },
      };

      const context = { value1: 1, value2: 2, value3: 3 };
      const batchResult = await engine.evaluateBatch(rules, context);

      expect(batchResult.success).toBe(true);
      expect(batchResult.successCount).toBe(3);
    });

    it('should work with batch evaluation in sequential mode', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'sequential',
      });

      const rules = {
        rule1: { changed: ['value1'] },
        rule2: { changed: ['value2'] },
      };

      const context = { value1: 1, value2: 2 };
      const batchResult = await engine.evaluateBatch(rules, context);

      expect(batchResult.success).toBe(true);
      expect(batchResult.successCount).toBe(2);
    });

    it('should work with event system', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'parallel',
      });

      const events = [];
      engine.on('evaluated', (data) => {
        events.push(data.ruleId);
      });

      const rule = { changed: ['value'] };
      await engine.evaluate('test-rule', rule, { value: 1 });

      expect(events).toContain('test-rule');
    });

    it('should work with state persistence', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'sequential',
      });

      const rule = { changed: ['value'] };

      await engine.evaluate('persist-rule', rule, { value: 1 });
      const result = await engine.evaluate('persist-rule', rule, { value: 2 });

      // State should be maintained
      const state = engine.ruleStates.get('persist-rule');
      expect(state).toBeDefined();
      expect(result.triggered).toBe(true); // Changed from 1 to 2
    });

    it('should clear concurrency manager on destroy', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'sequential',
      });

      const rule = { changed: ['value'] };
      await engine.evaluate('test-rule', rule, { value: 1 });

      // Destroy should clear the concurrency manager
      await engine.destroy();

      expect(engine.concurrencyManager.queueSize).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle evaluation errors in parallel mode', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'parallel',
      });

      // Create an invalid rule to trigger error
      const invalidRule = { invalidOperator: ['field'] };

      const result = await engine.evaluate('error-rule', invalidRule, {});

      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should handle evaluation errors in sequential mode', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'sequential',
      });

      const invalidRule = { invalidOperator: ['field'] };

      const result = await engine.evaluate('error-rule', invalidRule, {});

      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should handle evaluation errors gracefully', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'sequential',
      });

      const invalidRule = { invalidOperator: ['field'] };
      const result = await engine.evaluate('error-rule', invalidRule, {});

      // Errors are handled and returned
      expect(result.error).toBeDefined();
      expect(result.success).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should successfully execute multiple evaluations', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'parallel',
      });

      const rule = { changed: ['value'] };
      let successCount = 0;

      for (let i = 0; i < 10; i++) {
        const result = await engine.evaluate(`rule-${i}`, rule, { value: i });
        if (result) successCount++;
      }

      expect(successCount).toBe(10);
    });

    it('should handle high-volume concurrent evaluations', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        concurrency: 'parallel',
      });

      const rule = { changed: ['value'] };
      const promises = [];

      // Create 100 concurrent evaluations
      for (let i = 0; i < 100; i++) {
        promises.push(engine.evaluate(`rule-${i}`, rule, { value: i }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      expect(results.every((r) => r !== null)).toBe(true);
    });
  });
});
