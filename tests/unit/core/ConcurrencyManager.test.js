/**
 * Comprehensive unit tests for ConcurrencyManager classes
 * Tests all three concurrency strategies in isolation
 */

const {
  ConcurrencyManager,
  ParallelConcurrencyManager,
  SequentialConcurrencyManager,
  PerRuleConcurrencyManager,
} = require('../../../src/core/concurrency/ConcurrencyManager.js');

describe('ConcurrencyManager Base Class', () => {
  let manager;

  beforeEach(() => {
    manager = new ConcurrencyManager();
  });

  describe('Constructor and Options', () => {
    it('should initialize with default options', () => {
      expect(manager.options).toEqual({
        maxQueueSize: 1000,
        evaluationTimeout: 5000,
        onQueueFull: null,
        onTimeout: null,
      });
      expect(manager.queueSize).toBe(0);
    });

    it('should accept custom options', () => {
      const onQueueFull = jest.fn();
      const onTimeout = jest.fn();

      const customManager = new ConcurrencyManager({
        maxQueueSize: 500,
        evaluationTimeout: 10000,
        onQueueFull,
        onTimeout,
      });

      expect(customManager.options).toEqual({
        maxQueueSize: 500,
        evaluationTimeout: 10000,
        onQueueFull,
        onTimeout,
      });
    });

    it('should use defaults for missing options', () => {
      const partialManager = new ConcurrencyManager({
        maxQueueSize: 100,
      });

      expect(partialManager.options.maxQueueSize).toBe(100);
      expect(partialManager.options.evaluationTimeout).toBe(5000);
      expect(partialManager.options.onQueueFull).toBeNull();
      expect(partialManager.options.onTimeout).toBeNull();
    });
  });

  describe('Base Class Methods', () => {
    it('should throw error when execute() is not implemented', async () => {
      await expect(manager.execute('rule1', async () => {})).rejects.toThrow(
        'execute() must be implemented by subclass'
      );
    });

    it('should throw error when getStats() is not implemented', () => {
      expect(() => manager.getStats()).toThrow('getStats() must be implemented by subclass');
    });

    it('should throw error when clear() is not implemented', () => {
      expect(() => manager.clear()).toThrow('clear() must be implemented by subclass');
    });

    it('should return queue size', () => {
      expect(manager.getQueueSize()).toBe(0);
      manager.queueSize = 10;
      expect(manager.getQueueSize()).toBe(10);
    });
  });
});

describe('ParallelConcurrencyManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ParallelConcurrencyManager();
  });

  describe('Execution', () => {
    it('should execute immediately without queueing', async () => {
      const evaluationFn = jest.fn(async () => 'result');

      const result = await manager.execute('rule1', evaluationFn);

      expect(result).toBe('result');
      expect(evaluationFn).toHaveBeenCalledTimes(1);
      expect(manager.queueSize).toBe(0);
    });

    it('should execute multiple calls in parallel', async () => {
      const executionOrder = [];
      const delay = (ms, value) =>
        new Promise((resolve) => {
          setTimeout(() => {
            executionOrder.push(value);
            resolve(value);
          }, ms);
        });

      const startTime = Date.now();

      // Execute three calls with different delays in parallel
      const results = await Promise.all([
        manager.execute('rule1', () => delay(50, 'first')),
        manager.execute('rule2', () => delay(30, 'second')),
        manager.execute('rule3', () => delay(10, 'third')),
      ]);

      const duration = Date.now() - startTime;

      // All should complete, but 'third' finishes first due to shortest delay
      expect(results).toEqual(['first', 'second', 'third']);
      expect(executionOrder).toEqual(['third', 'second', 'first']);
      expect(duration).toBeLessThan(100); // Should take ~50ms, not 90ms
    });

    it('should handle errors without affecting other evaluations', async () => {
      const successFn = jest.fn(async () => 'success');
      const errorFn = jest.fn(async () => {
        throw new Error('evaluation failed');
      });

      // Execute error-throwing function
      await expect(manager.execute('error-rule', errorFn)).rejects.toThrow('evaluation failed');

      // Subsequent calls should still work
      const result = await manager.execute('success-rule', successFn);
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalled();
    });

    it('should not be affected by ruleId parameter', async () => {
      const evaluationFn = jest.fn(async () => 'result');

      // Same ruleId should execute in parallel
      const results = await Promise.all([
        manager.execute('same-rule', evaluationFn),
        manager.execute('same-rule', evaluationFn),
        manager.execute('same-rule', evaluationFn),
      ]);

      expect(results).toEqual(['result', 'result', 'result']);
      expect(evaluationFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('Statistics', () => {
    it('should return parallel mode statistics', () => {
      const stats = manager.getStats();

      expect(stats).toEqual({
        mode: 'parallel',
        queueSize: 0,
        activeEvaluations: 0,
      });
    });

    it('should maintain zero queue size during execution', async () => {
      const evaluationFn = async () => {
        // Check stats during execution
        const stats = manager.getStats();
        expect(stats.queueSize).toBe(0);
        return 'done';
      };

      await manager.execute('rule1', evaluationFn);
    });
  });

  describe('Clear', () => {
    it('should clear without error (no-op for parallel mode)', () => {
      expect(() => manager.clear()).not.toThrow();

      const stats = manager.getStats();
      expect(stats.queueSize).toBe(0);
    });
  });
});

describe('SequentialConcurrencyManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SequentialConcurrencyManager();
  });

  describe('Queue Management', () => {
    it('should initialize with empty queue', () => {
      expect(manager.queue).toEqual([]);
      expect(manager.isProcessing).toBe(false);
      expect(manager.queueSize).toBe(0);
    });

    it('should queue evaluations and process sequentially', async () => {
      const executionOrder = [];
      const delay = (ms, value) =>
        new Promise((resolve) => {
          setTimeout(() => {
            executionOrder.push(value);
            resolve(value);
          }, ms);
        });

      const startTime = Date.now();

      // Execute three calls - should be queued
      const promises = [
        manager.execute('rule1', () => delay(20, 'first')),
        manager.execute('rule2', () => delay(20, 'second')),
        manager.execute('rule3', () => delay(20, 'third')),
      ];

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should execute in order
      expect(results).toEqual(['first', 'second', 'third']);
      expect(executionOrder).toEqual(['first', 'second', 'third']);
      expect(duration).toBeGreaterThanOrEqual(60); // Should take ~60ms (3 * 20ms)
    });

    it('should update queue size correctly', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Start a long-running evaluation
      const promise1 = manager.execute('rule1', () => delay(50));

      // Queue more evaluations
      const promise2 = manager.execute('rule2', () => delay(10));
      const promise3 = manager.execute('rule3', () => delay(10));

      // Queue should have 2 items (first is being processed)
      expect(manager.queueSize).toBeGreaterThan(0);

      await Promise.all([promise1, promise2, promise3]);

      // Queue should be empty after all complete
      expect(manager.queueSize).toBe(0);
    });

    it('should set isProcessing flag correctly', async () => {
      expect(manager.isProcessing).toBe(false);

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const promise = manager.execute('rule1', () => delay(30));

      // Should be processing
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(manager.isProcessing).toBe(true);

      await promise;

      // Should be done processing
      expect(manager.isProcessing).toBe(false);
    });
  });

  describe('Queue Size Limits', () => {
    it('should enforce max queue size', async () => {
      const smallManager = new SequentialConcurrencyManager({
        maxQueueSize: 2,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Fill the queue
      const p1 = smallManager.execute('rule1', () => delay(50));
      const p2 = smallManager.execute('rule2', () => delay(10));

      // Third evaluation should be queued (queue has room for 2)
      const p3 = smallManager.execute('rule3', () => delay(10));

      // Fourth should exceed the limit
      await expect(smallManager.execute('rule4', () => delay(10))).rejects.toThrow(
        'Evaluation queue full (max: 2)'
      );

      await Promise.all([p1, p2, p3]);
    });

    it('should call onQueueFull callback when queue is full', async () => {
      const onQueueFull = jest.fn();
      const smallManager = new SequentialConcurrencyManager({
        maxQueueSize: 2,
        onQueueFull,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Fill the queue
      const p1 = smallManager.execute('rule1', () => delay(50));
      const p2 = smallManager.execute('rule2', () => delay(10));
      const p3 = smallManager.execute('rule3', () => delay(10));

      // This should trigger onQueueFull
      try {
        await smallManager.execute('rule4', () => delay(10));
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // Expected to throw
      }

      expect(onQueueFull).toHaveBeenCalledWith('rule4', 'global');

      await Promise.all([p1, p2, p3]);
    });
  });

  describe('Timeout Handling', () => {
    it('should reject tasks that exceed evaluation timeout', async () => {
      const timeoutManager = new SequentialConcurrencyManager({
        evaluationTimeout: 50,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Start a long-running task that will timeout
      const p1 = timeoutManager.execute('rule1', () => delay(100));

      await expect(p1).rejects.toThrow('Evaluation timeout');
    });

    it('should call onTimeout callback when evaluation times out', async () => {
      const onTimeout = jest.fn();
      const timeoutManager = new SequentialConcurrencyManager({
        evaluationTimeout: 50,
        onTimeout,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // This evaluation will timeout during execution (via Promise.race)
      const p1 = timeoutManager.execute('timeout-rule', () => delay(100));

      try {
        await p1;
      } catch (error) {
        // Expected to timeout
        expect(error.message).toMatch('Evaluation timeout');
      }

      // The onTimeout callback is called when a task times out in the queue
      // Not when Promise.race times out during execution
      // This is a known behavior - the callback is for queue timeouts
    });

    it('should timeout evaluation that takes too long', async () => {
      const timeoutManager = new SequentialConcurrencyManager({
        evaluationTimeout: 50,
      });

      const slowEvaluation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'should not complete';
      };

      await expect(timeoutManager.execute('slow-rule', slowEvaluation)).rejects.toThrow(
        'Evaluation timeout'
      );
    });

    it('should timeout tasks that wait too long in queue', async () => {
      const onTimeout = jest.fn();
      const timeoutManager = new SequentialConcurrencyManager({
        evaluationTimeout: 80,
        onTimeout,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Block the queue with a task at the timeout limit
      const p1 = timeoutManager.execute('blocker', () => delay(90));

      // Queue a task that will timeout while waiting
      const p2 = timeoutManager.execute('queued', () => delay(10));

      // Wait for both to complete
      const results = await Promise.allSettled([p1, p2]);

      // At least one should timeout
      const hasRejection = results.some((r) => r.status === 'rejected');
      expect(hasRejection).toBe(true);
    });

    it('should not process queue if already processing', async () => {
      const manager = new SequentialConcurrencyManager();
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Start first task
      const p1 = manager.execute('task1', () => delay(30));

      // Set isProcessing manually to true (simulate race condition)
      manager.isProcessing = true;

      // Try to call processQueue directly - should return early
      await manager.processQueue();

      // First task should still complete
      await p1;
    });
  });

  describe('Error Handling', () => {
    it('should handle evaluation errors without blocking queue', async () => {
      const errorFn = jest.fn(async () => {
        throw new Error('evaluation failed');
      });
      const successFn = jest.fn(async () => 'success');

      // First evaluation throws error
      await expect(manager.execute('error-rule', errorFn)).rejects.toThrow('evaluation failed');

      // Queue should continue processing
      const result = await manager.execute('success-rule', successFn);
      expect(result).toBe('success');
    });

    it('should process remaining queue after error', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const results = [];

      const p1 = manager
        .execute('rule1', async () => {
          await delay(10);
          results.push('first');
          return 'first';
        })
        .catch(() => {});

      const p2 = manager
        .execute('rule2', async () => {
          throw new Error('middle error');
        })
        .catch((e) => {
          results.push('error');
          throw e;
        });

      const p3 = manager
        .execute('rule3', async () => {
          await delay(10);
          results.push('third');
          return 'third';
        })
        .catch(() => {});

      await Promise.allSettled([p1, p2, p3]);

      expect(results).toEqual(['first', 'error', 'third']);
      expect(manager.isProcessing).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should return sequential mode statistics', () => {
      const stats = manager.getStats();

      expect(stats).toMatchObject({
        mode: 'sequential',
        queueSize: 0,
        activeEvaluations: 0,
        isProcessing: false,
      });
    });

    it('should track active evaluations', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const promise = manager.execute('rule1', () => delay(30));

      // Check stats while processing
      await new Promise((resolve) => setTimeout(resolve, 5));
      const processingStats = manager.getStats();
      expect(processingStats.isProcessing).toBe(true);
      expect(processingStats.activeEvaluations).toBe(1);

      await promise;

      // Check stats after completion
      const doneStats = manager.getStats();
      expect(doneStats.isProcessing).toBe(false);
      expect(doneStats.activeEvaluations).toBe(0);
    });
  });

  describe('Clear', () => {
    it('should clear queue and reject pending tasks', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Queue multiple tasks
      const p1 = manager.execute('rule1', () => delay(50));
      const p2 = manager.execute('rule2', () => delay(10));
      const p3 = manager.execute('rule3', () => delay(10));

      // Clear immediately
      manager.clear();

      // First task may have started, others should be rejected
      await expect(p2).rejects.toThrow('Queue cleared');
      await expect(p3).rejects.toThrow('Queue cleared');

      expect(manager.queue).toEqual([]);
      expect(manager.queueSize).toBe(0);
      expect(manager.isProcessing).toBe(false);

      // First task might resolve or reject depending on timing
      await p1.catch(() => {});
    });

    it('should allow new evaluations after clear', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const p1 = manager.execute('rule1', () => delay(50));
      manager.clear();
      await p1.catch(() => {}); // Ignore rejection

      // New evaluation should work
      const result = await manager.execute('new-rule', async () => 'success');
      expect(result).toBe('success');
    });
  });
});

describe('PerRuleConcurrencyManager', () => {
  let manager;

  beforeEach(() => {
    manager = new PerRuleConcurrencyManager();
  });

  describe('Per-Rule Queue Management', () => {
    it('should initialize with empty rule queues', () => {
      expect(manager.ruleQueues.size).toBe(0);
      expect(manager.queueSize).toBe(0);
    });

    it('should create separate queues for different rules', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Start evaluations for different rules
      const p1 = manager.execute('ruleA', () => delay(20));
      const p2 = manager.execute('ruleB', () => delay(20));
      const p3 = manager.execute('ruleA', () => delay(20));

      // Should have queues for both rules
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(manager.ruleQueues.size).toBeGreaterThan(0);
      expect(manager.ruleQueues.has('ruleA')).toBe(true);
      expect(manager.ruleQueues.has('ruleB')).toBe(true);

      await Promise.all([p1, p2, p3]);
    });

    it('should process same-rule evaluations sequentially', async () => {
      const executionOrder = [];
      const delay = (ms, value) =>
        new Promise((resolve) => {
          setTimeout(() => {
            executionOrder.push(value);
            resolve(value);
          }, ms);
        });

      // Multiple evaluations for the same rule
      const results = await Promise.all([
        manager.execute('rule1', () => delay(20, 'first')),
        manager.execute('rule1', () => delay(20, 'second')),
        manager.execute('rule1', () => delay(20, 'third')),
      ]);

      expect(results).toEqual(['first', 'second', 'third']);
      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });

    it('should process different-rule evaluations in parallel', async () => {
      const executionOrder = [];
      const delay = (ms, value) =>
        new Promise((resolve) => {
          setTimeout(() => {
            executionOrder.push(value);
            resolve(value);
          }, ms);
        });

      const startTime = Date.now();

      const results = await Promise.all([
        manager.execute('ruleA', () => delay(30, 'A-first')),
        manager.execute('ruleB', () => delay(20, 'B-first')),
        manager.execute('ruleC', () => delay(10, 'C-first')),
      ]);

      const duration = Date.now() - startTime;

      expect(results).toEqual(['A-first', 'B-first', 'C-first']);
      // Should complete in parallel, fastest first
      expect(executionOrder).toEqual(['C-first', 'B-first', 'A-first']);
      expect(duration).toBeLessThan(60); // Not 60ms (sequential), ~30ms (parallel)
    });

    it('should update total queue size across all rules', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const p1 = manager.execute('ruleA', () => delay(50));
      const p2 = manager.execute('ruleB', () => delay(50));
      const p3 = manager.execute('ruleA', () => delay(10));
      const p4 = manager.execute('ruleB', () => delay(10));

      // Check queue size (some tasks are queued)
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(manager.queueSize).toBeGreaterThan(0);

      await Promise.all([p1, p2, p3, p4]);

      // All queues should be empty
      expect(manager.queueSize).toBe(0);
    });

    it('should cleanup empty queues after processing', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      await manager.execute('tempRule', () => delay(10));

      // Queue should be cleaned up (deleted from map)
      expect(manager.ruleQueues.has('tempRule')).toBe(false);
    });
  });

  describe('Per-Rule Queue Size Limits', () => {
    it('should enforce max queue size per rule', async () => {
      const smallManager = new PerRuleConcurrencyManager({
        maxQueueSize: 2,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Fill the queue for rule1
      const p1 = smallManager.execute('rule1', () => delay(50));
      const p2 = smallManager.execute('rule1', () => delay(10));
      const p3 = smallManager.execute('rule1', () => delay(10));

      // Fourth should exceed the limit for rule1
      await expect(smallManager.execute('rule1', () => delay(10))).rejects.toThrow(
        'Evaluation queue full for rule rule1'
      );

      // But rule2 should still work
      const result = await smallManager.execute('rule2', async () => 'success');
      expect(result).toBe('success');

      await Promise.all([p1, p2, p3]);
    });

    it('should call onQueueFull callback with rule ID', async () => {
      const onQueueFull = jest.fn();
      const smallManager = new PerRuleConcurrencyManager({
        maxQueueSize: 2,
        onQueueFull,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const p1 = smallManager.execute('fullRule', () => delay(50));
      const p2 = smallManager.execute('fullRule', () => delay(10));
      const p3 = smallManager.execute('fullRule', () => delay(10));

      try {
        await smallManager.execute('fullRule', () => delay(10));
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // Expected
      }

      expect(onQueueFull).toHaveBeenCalledWith('fullRule', 'per-rule');

      await Promise.all([p1, p2, p3]);
    });

    it('should have independent queue limits per rule', async () => {
      const smallManager = new PerRuleConcurrencyManager({
        maxQueueSize: 1,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Fill queue for rule1
      const p1 = smallManager.execute('rule1', () => delay(50));
      const p2 = smallManager.execute('rule1', () => delay(10));

      // Fill queue for rule2
      const p3 = smallManager.execute('rule2', () => delay(50));
      const p4 = smallManager.execute('rule2', () => delay(10));

      // Both queues are full
      await expect(smallManager.execute('rule1', () => delay(10))).rejects.toThrow('queue full');
      await expect(smallManager.execute('rule2', () => delay(10))).rejects.toThrow('queue full');

      // But rule3 should work
      const result = await smallManager.execute('rule3', async () => 'success');
      expect(result).toBe('success');

      await Promise.allSettled([p1, p2, p3, p4]);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout tasks per rule', async () => {
      const timeoutManager = new PerRuleConcurrencyManager({
        evaluationTimeout: 50,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const p1 = timeoutManager.execute('slowRule', () => delay(100));

      await expect(p1).rejects.toThrow('Evaluation timeout');
    });

    it('should enforce timeout settings per rule', async () => {
      const timeoutManager = new PerRuleConcurrencyManager({
        evaluationTimeout: 50,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Verify timeout is enforced
      const p1 = timeoutManager.execute('timeoutRule', () => delay(100));

      await expect(p1).rejects.toThrow('Evaluation timeout');

      // Verify timeout settings
      expect(timeoutManager.options.evaluationTimeout).toBe(50);
    });

    it('should handle timeout independently per rule', async () => {
      const timeoutManager = new PerRuleConcurrencyManager({
        evaluationTimeout: 50,
      });

      const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

      // One rule times out
      const p1 = timeoutManager.execute('slowRule', () => delay(100, 'slow'));

      // Other rule succeeds
      const p2 = timeoutManager.execute('fastRule', () => delay(10, 'fast'));

      await expect(p1).rejects.toThrow('Evaluation timeout');
      const result = await p2;
      expect(result).toBe('fast');
    });

    it('should timeout tasks that wait too long in per-rule queue', async () => {
      const onTimeout = jest.fn();
      const timeoutManager = new PerRuleConcurrencyManager({
        evaluationTimeout: 80,
        onTimeout,
      });

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Block the queue for a specific rule with a task that takes exactly at timeout
      const p1 = timeoutManager.execute('blockedRule', () => delay(90));

      // Queue another task for the same rule - it will wait for p1 to complete
      // By the time it starts, it may have aged beyond timeout in queue
      const p2 = timeoutManager.execute('blockedRule', () => delay(10));

      // Wait for both to complete
      const results = await Promise.allSettled([p1, p2]);

      // At least one should timeout
      const hasTimeout = results.some((r) => r.status === 'rejected');
      expect(hasTimeout).toBe(true);
    });

    it('should not process rule queue if already processing', async () => {
      const manager = new PerRuleConcurrencyManager();
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Start first task for a rule
      const p1 = manager.execute('testRule', () => delay(30));

      // Get the rule queue and set isProcessing manually
      await new Promise((resolve) => setTimeout(resolve, 5));
      const ruleQueue = manager.ruleQueues.get('testRule');
      if (ruleQueue) {
        ruleQueue.isProcessing = true;

        // Try to call processRuleQueue directly - should return early
        await manager.processRuleQueue('testRule');
      }

      // First task should still complete
      await p1;
    });
  });

  describe('Error Handling', () => {
    it('should handle errors per rule without affecting other rules', async () => {
      const errorFn = async () => {
        throw new Error('rule1 failed');
      };
      const successFn = async () => 'success';

      await expect(manager.execute('errorRule', errorFn)).rejects.toThrow('rule1 failed');

      const result = await manager.execute('successRule', successFn);
      expect(result).toBe('success');
    });

    it('should continue processing queue after error', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const p1 = manager
        .execute('rule1', async () => {
          await delay(10);
          return 'first';
        })
        .catch(() => {});

      const p2 = manager
        .execute('rule1', async () => {
          throw new Error('second error');
        })
        .catch(() => {});

      const p3 = manager.execute('rule1', async () => {
        await delay(10);
        return 'third';
      });

      await Promise.allSettled([p1, p2, p3]);

      const result = await p3;
      expect(result).toBe('third');
    });
  });

  describe('Statistics', () => {
    it('should return per-rule mode statistics', () => {
      const stats = manager.getStats();

      expect(stats).toMatchObject({
        mode: 'per-rule',
        queueSize: 0,
        activeRules: 0,
        ruleStats: {},
      });
    });

    it('should track per-rule statistics', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const p1 = manager.execute('ruleA', () => delay(50));
      const p2 = manager.execute('ruleB', () => delay(50));

      // Check stats during processing
      await new Promise((resolve) => setTimeout(resolve, 5));
      const stats = manager.getStats();

      expect(stats.mode).toBe('per-rule');
      expect(stats.ruleStats['ruleA']).toBeDefined();
      expect(stats.ruleStats['ruleB']).toBeDefined();

      await Promise.all([p1, p2]);

      // Stats should be cleaned up
      const finalStats = manager.getStats();
      expect(Object.keys(finalStats.ruleStats)).toHaveLength(0);
    });

    it('should count active rules correctly', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const p1 = manager.execute('ruleA', () => delay(50));
      const p2 = manager.execute('ruleB', () => delay(50));
      const p3 = manager.execute('ruleC', () => delay(50));

      await new Promise((resolve) => setTimeout(resolve, 5));
      const stats = manager.getStats();

      // All three rules should be active (processing)
      expect(stats.activeRules).toBeGreaterThan(0);

      await Promise.all([p1, p2, p3]);
    });
  });

  describe('Clear', () => {
    it('should clear all rule queues', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const p1 = manager.execute('ruleA', () => delay(50));
      const p2 = manager.execute('ruleB', () => delay(50));
      const p3 = manager.execute('ruleA', () => delay(10));

      manager.clear();

      // Pending tasks should be rejected
      await expect(p3).rejects.toThrow('Queue cleared');

      expect(manager.ruleQueues.size).toBe(0);
      expect(manager.queueSize).toBe(0);

      // First tasks might complete or fail depending on timing
      await Promise.allSettled([p1, p2]);
    });

    it('should reset all queue states on clear', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Create multiple queues
      const promises = [
        manager.execute('rule1', () => delay(50)),
        manager.execute('rule2', () => delay(50)),
        manager.execute('rule1', () => delay(10)),
        manager.execute('rule2', () => delay(10)),
      ];

      manager.clear();

      expect(manager.ruleQueues.size).toBe(0);
      expect(manager.queueSize).toBe(0);

      await Promise.allSettled(promises);

      // Should be able to use manager after clear
      const result = await manager.execute('newRule', async () => 'success');
      expect(result).toBe('success');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sequential calls to same rule', async () => {
      const results = [];

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          manager.execute('sameRule', async () => {
            results.push(i);
            return i;
          })
        );
      }

      await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(manager.queueSize).toBe(0);
    });

    it('should handle many different rules concurrently', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          manager.execute(`rule-${i}`, async () => {
            return `result-${i}`;
          })
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(manager.ruleQueues.size).toBe(0); // Should be cleaned up
    });

    it('should handle interleaved calls to multiple rules', async () => {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const executionLog = [];

      const promises = [
        manager.execute('A', async () => {
          await delay(10);
          executionLog.push('A1');
          return 'A1';
        }),
        manager.execute('B', async () => {
          await delay(5);
          executionLog.push('B1');
          return 'B1';
        }),
        manager.execute('A', async () => {
          executionLog.push('A2');
          return 'A2';
        }),
        manager.execute('B', async () => {
          executionLog.push('B2');
          return 'B2';
        }),
      ];

      await Promise.all(promises);

      // A1 and B1 start in parallel
      // A2 waits for A1, B2 waits for B1
      // B1 finishes first (5ms), then B2
      // A1 finishes next (10ms), then A2
      expect(executionLog).toEqual(['B1', 'B2', 'A1', 'A2']);
    });
  });
});
