import {
  RetryStrategy,
  ExponentialBackoffStrategy,
  FixedDelayStrategy,
  LinearBackoffStrategy,
  RetryManager,
} from '../../../src/core/recovery/RetryStrategies.js';

describe('RetryStrategies', () => {
  describe('RetryStrategy (Base Class)', () => {
    describe('constructor', () => {
      it('should initialize with default options', () => {
        const strategy = new RetryStrategy();
        expect(strategy.maxAttempts).toBe(3);
        expect(strategy.initialDelay).toBe(100);
        expect(strategy.maxDelay).toBe(5000);
      });

      it('should accept custom options', () => {
        const strategy = new RetryStrategy({
          maxAttempts: 5,
          initialDelay: 200,
          maxDelay: 10000,
        });
        expect(strategy.maxAttempts).toBe(5);
        expect(strategy.initialDelay).toBe(200);
        expect(strategy.maxDelay).toBe(10000);
      });

      it('should handle partial options', () => {
        const strategy = new RetryStrategy({ maxAttempts: 10 });
        expect(strategy.maxAttempts).toBe(10);
        expect(strategy.initialDelay).toBe(100);
        expect(strategy.maxDelay).toBe(5000);
      });
    });

    describe('getDelay', () => {
      it('should throw error when not implemented', () => {
        const strategy = new RetryStrategy();
        expect(() => strategy.getDelay(1)).toThrow('getDelay() must be implemented by subclass');
      });
    });

    describe('shouldRetry', () => {
      it('should return true when below max attempts', () => {
        const strategy = new RetryStrategy({ maxAttempts: 3 });
        expect(strategy.shouldRetry(1)).toBe(true);
        expect(strategy.shouldRetry(2)).toBe(true);
      });

      it('should return false when at or above max attempts', () => {
        const strategy = new RetryStrategy({ maxAttempts: 3 });
        expect(strategy.shouldRetry(3)).toBe(false);
        expect(strategy.shouldRetry(4)).toBe(false);
      });

      it('should handle edge case with 1 max attempt', () => {
        const strategy = new RetryStrategy({ maxAttempts: 1 });
        expect(strategy.shouldRetry(1)).toBe(false);
        expect(strategy.shouldRetry(0)).toBe(true);
      });
    });
  });

  describe('ExponentialBackoffStrategy', () => {
    describe('getDelay', () => {
      it('should calculate exponential backoff delays', () => {
        const strategy = new ExponentialBackoffStrategy({
          initialDelay: 100,
          maxDelay: 10000,
        });

        // Attempt 1: 100 * 2^0 = 100
        expect(strategy.getDelay(1)).toBe(100);

        // Attempt 2: 100 * 2^1 = 200
        expect(strategy.getDelay(2)).toBe(200);

        // Attempt 3: 100 * 2^2 = 400
        expect(strategy.getDelay(3)).toBe(400);

        // Attempt 4: 100 * 2^3 = 800
        expect(strategy.getDelay(4)).toBe(800);

        // Attempt 5: 100 * 2^4 = 1600
        expect(strategy.getDelay(5)).toBe(1600);
      });

      it('should respect maxDelay cap', () => {
        const strategy = new ExponentialBackoffStrategy({
          initialDelay: 100,
          maxDelay: 500,
        });

        expect(strategy.getDelay(1)).toBe(100); // 100
        expect(strategy.getDelay(2)).toBe(200); // 200
        expect(strategy.getDelay(3)).toBe(400); // 400
        expect(strategy.getDelay(4)).toBe(500); // 800 -> capped at 500
        expect(strategy.getDelay(5)).toBe(500); // 1600 -> capped at 500
      });

      it('should handle large attempt numbers', () => {
        const strategy = new ExponentialBackoffStrategy({
          initialDelay: 100,
          maxDelay: 5000,
        });

        // Attempt 10: 100 * 2^9 = 51200 -> capped at 5000
        expect(strategy.getDelay(10)).toBe(5000);
      });

      it('should handle different initial delays', () => {
        const strategy = new ExponentialBackoffStrategy({
          initialDelay: 500,
          maxDelay: 10000,
        });

        expect(strategy.getDelay(1)).toBe(500); // 500
        expect(strategy.getDelay(2)).toBe(1000); // 1000
        expect(strategy.getDelay(3)).toBe(2000); // 2000
      });
    });

    describe('inheritance', () => {
      it('should inherit shouldRetry from base class', () => {
        const strategy = new ExponentialBackoffStrategy({ maxAttempts: 3 });
        expect(strategy.shouldRetry(1)).toBe(true);
        expect(strategy.shouldRetry(3)).toBe(false);
      });
    });
  });

  describe('FixedDelayStrategy', () => {
    describe('getDelay', () => {
      it('should return same delay for all attempts', () => {
        const strategy = new FixedDelayStrategy({
          initialDelay: 200,
          maxDelay: 5000,
        });

        expect(strategy.getDelay(1)).toBe(200);
        expect(strategy.getDelay(2)).toBe(200);
        expect(strategy.getDelay(3)).toBe(200);
        expect(strategy.getDelay(10)).toBe(200);
      });

      it('should respect maxDelay cap', () => {
        const strategy = new FixedDelayStrategy({
          initialDelay: 1000,
          maxDelay: 500,
        });

        // initialDelay exceeds maxDelay, should be capped
        expect(strategy.getDelay(1)).toBe(500);
        expect(strategy.getDelay(5)).toBe(500);
      });

      it('should handle zero delay with explicit value', () => {
        // Note: The base class uses `options.initialDelay || 100`
        // So passing 0 will default to 100. This test verifies the behavior.
        const strategy = new FixedDelayStrategy({
          initialDelay: 0,
          maxDelay: 1000,
        });

        // When initialDelay is 0 (falsy), defaults to 100
        expect(strategy.getDelay(1)).toBe(100);
      });
    });

    describe('inheritance', () => {
      it('should inherit shouldRetry from base class', () => {
        const strategy = new FixedDelayStrategy({ maxAttempts: 5 });
        expect(strategy.shouldRetry(4)).toBe(true);
        expect(strategy.shouldRetry(5)).toBe(false);
      });
    });
  });

  describe('LinearBackoffStrategy', () => {
    describe('getDelay', () => {
      it('should calculate linear backoff delays', () => {
        const strategy = new LinearBackoffStrategy({
          initialDelay: 100,
          maxDelay: 10000,
        });

        // Attempt 1: 100 * 1 = 100
        expect(strategy.getDelay(1)).toBe(100);

        // Attempt 2: 100 * 2 = 200
        expect(strategy.getDelay(2)).toBe(200);

        // Attempt 3: 100 * 3 = 300
        expect(strategy.getDelay(3)).toBe(300);

        // Attempt 4: 100 * 4 = 400
        expect(strategy.getDelay(4)).toBe(400);

        // Attempt 10: 100 * 10 = 1000
        expect(strategy.getDelay(10)).toBe(1000);
      });

      it('should respect maxDelay cap', () => {
        const strategy = new LinearBackoffStrategy({
          initialDelay: 100,
          maxDelay: 350,
        });

        expect(strategy.getDelay(1)).toBe(100); // 100
        expect(strategy.getDelay(2)).toBe(200); // 200
        expect(strategy.getDelay(3)).toBe(300); // 300
        expect(strategy.getDelay(4)).toBe(350); // 400 -> capped at 350
        expect(strategy.getDelay(5)).toBe(350); // 500 -> capped at 350
      });

      it('should handle different initial delays', () => {
        const strategy = new LinearBackoffStrategy({
          initialDelay: 250,
          maxDelay: 10000,
        });

        expect(strategy.getDelay(1)).toBe(250); // 250
        expect(strategy.getDelay(2)).toBe(500); // 500
        expect(strategy.getDelay(3)).toBe(750); // 750
        expect(strategy.getDelay(4)).toBe(1000); // 1000
      });
    });

    describe('inheritance', () => {
      it('should inherit shouldRetry from base class', () => {
        const strategy = new LinearBackoffStrategy({ maxAttempts: 4 });
        expect(strategy.shouldRetry(3)).toBe(true);
        expect(strategy.shouldRetry(4)).toBe(false);
      });
    });
  });

  describe('RetryManager', () => {
    describe('constructor', () => {
      it('should initialize with default options', () => {
        const manager = new RetryManager();

        expect(manager.options.enabled).toBe(true);
        expect(manager.options.maxAttempts).toBe(3);
        expect(manager.options.strategy).toBe('exponential');
        expect(manager.options.initialDelay).toBe(100);
        expect(manager.options.maxDelay).toBe(5000);
        expect(manager.options.retryableErrors).toEqual([]);
        expect(manager.options.onRetry).toBeNull();
      });

      it('should accept custom options', () => {
        const onRetry = jest.fn();
        const manager = new RetryManager({
          enabled: false,
          maxAttempts: 5,
          strategy: 'fixed',
          initialDelay: 200,
          maxDelay: 10000,
          retryableErrors: ['timeout', 'network'],
          onRetry,
        });

        expect(manager.options.enabled).toBe(false);
        expect(manager.options.maxAttempts).toBe(5);
        expect(manager.options.strategy).toBe('fixed');
        expect(manager.options.initialDelay).toBe(200);
        expect(manager.options.maxDelay).toBe(10000);
        expect(manager.options.retryableErrors).toEqual(['timeout', 'network']);
        expect(manager.options.onRetry).toBe(onRetry);
      });

      it('should initialize retry history map', () => {
        const manager = new RetryManager();
        expect(manager.retryHistory).toBeInstanceOf(Map);
        expect(manager.retryHistory.size).toBe(0);
      });
    });

    describe('createStrategy', () => {
      it('should create exponential backoff strategy by default', () => {
        const manager = new RetryManager();
        expect(manager.strategy).toBeInstanceOf(ExponentialBackoffStrategy);
      });

      it('should create exponential strategy when specified', () => {
        const manager = new RetryManager({ strategy: 'exponential' });
        expect(manager.strategy).toBeInstanceOf(ExponentialBackoffStrategy);
      });

      it('should create fixed delay strategy when specified', () => {
        const manager = new RetryManager({ strategy: 'fixed' });
        expect(manager.strategy).toBeInstanceOf(FixedDelayStrategy);
      });

      it('should create linear backoff strategy when specified', () => {
        const manager = new RetryManager({ strategy: 'linear' });
        expect(manager.strategy).toBeInstanceOf(LinearBackoffStrategy);
      });

      it('should throw error for unknown strategy', () => {
        expect(() => new RetryManager({ strategy: 'invalid' })).toThrow(
          'Unknown retry strategy: invalid'
        );
      });

      it('should pass options to strategy', () => {
        const manager = new RetryManager({
          maxAttempts: 5,
          initialDelay: 200,
          maxDelay: 10000,
        });

        expect(manager.strategy.maxAttempts).toBe(5);
        expect(manager.strategy.initialDelay).toBe(200);
        expect(manager.strategy.maxDelay).toBe(10000);
      });
    });

    describe('isRetryableError', () => {
      it('should return true for all errors when retryableErrors is empty', () => {
        const manager = new RetryManager();

        expect(manager.isRetryableError(new Error('timeout error'))).toBe(true);
        expect(manager.isRetryableError(new Error('network error'))).toBe(true);
        expect(manager.isRetryableError(new Error('validation error'))).toBe(true);
      });

      it('should match errors by pattern', () => {
        const manager = new RetryManager({
          retryableErrors: ['timeout', 'network'],
        });

        expect(manager.isRetryableError(new Error('Connection timeout'))).toBe(true);
        expect(manager.isRetryableError(new Error('Network unreachable'))).toBe(true);
        expect(manager.isRetryableError(new Error('Validation failed'))).toBe(false);
      });

      it('should be case-insensitive', () => {
        const manager = new RetryManager({
          retryableErrors: ['TIMEOUT', 'Network'],
        });

        expect(manager.isRetryableError(new Error('timeout error'))).toBe(true);
        expect(manager.isRetryableError(new Error('NETWORK ISSUE'))).toBe(true);
        expect(manager.isRetryableError(new Error('Timeout'))).toBe(true);
      });

      it('should match partial strings', () => {
        const manager = new RetryManager({
          retryableErrors: ['time'],
        });

        expect(manager.isRetryableError(new Error('timeout occurred'))).toBe(true);
        expect(manager.isRetryableError(new Error('timed out'))).toBe(true);
        expect(manager.isRetryableError(new Error('overtime'))).toBe(true);
      });

      it('should handle multiple patterns', () => {
        const manager = new RetryManager({
          retryableErrors: ['timeout', 'connection', 'unavailable'],
        });

        expect(manager.isRetryableError(new Error('timeout'))).toBe(true);
        expect(manager.isRetryableError(new Error('connection refused'))).toBe(true);
        expect(manager.isRetryableError(new Error('service unavailable'))).toBe(true);
        expect(manager.isRetryableError(new Error('invalid input'))).toBe(false);
      });
    });

    describe('execute', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should execute function successfully on first attempt', async () => {
        const manager = new RetryManager();
        const fn = jest.fn().mockResolvedValue('success');

        const promise = manager.execute('test-rule', fn);
        jest.runAllTimers();
        const result = await promise;

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
        expect(manager.getRetryHistory('test-rule')).toEqual([]);
      });

      it('should retry on failure and succeed', async () => {
        const manager = new RetryManager({ initialDelay: 100 });
        const fn = jest
          .fn()
          .mockRejectedValueOnce(new Error('temporary error'))
          .mockResolvedValueOnce('success');

        const promise = manager.execute('test-rule', fn);
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2);

        // History should be cleared after success
        expect(manager.getRetryHistory('test-rule')).toEqual([]);
      });

      it('should retry up to maxAttempts', async () => {
        const manager = new RetryManager({ maxAttempts: 3, initialDelay: 100 });
        const error = new Error('persistent error');
        const fn = jest.fn().mockRejectedValue(error);

        const executePromise = manager.execute('test-rule', fn);

        // Wait for all timers and the promise to resolve/reject
        await Promise.all([
          jest.runAllTimersAsync(),
          expect(executePromise).rejects.toThrow('persistent error'),
        ]);

        expect(fn).toHaveBeenCalledTimes(3);

        const history = manager.getRetryHistory('test-rule');
        expect(history).toHaveLength(3);
        expect(history[0].attempt).toBe(1);
        expect(history[1].attempt).toBe(2);
        expect(history[2].attempt).toBe(3);
      });

      it('should not retry non-retryable errors', async () => {
        const manager = new RetryManager({
          retryableErrors: ['timeout'],
          maxAttempts: 3,
        });
        const error = new Error('validation error');
        const fn = jest.fn().mockRejectedValue(error);

        const promise = manager.execute('test-rule', fn);
        jest.runAllTimers();

        await expect(promise).rejects.toThrow('validation error');
        expect(fn).toHaveBeenCalledTimes(1); // No retries

        const history = manager.getRetryHistory('test-rule');
        expect(history).toHaveLength(1);
      });

      it('should call onRetry hook on each retry', async () => {
        const onRetry = jest.fn();
        const manager = new RetryManager({
          maxAttempts: 3,
          initialDelay: 100,
          onRetry,
        });
        const error = new Error('retry error');
        const fn = jest.fn().mockRejectedValue(error);

        const executePromise = manager.execute('test-rule', fn);

        await Promise.all([
          jest.runAllTimersAsync(),
          expect(executePromise).rejects.toThrow('retry error'),
        ]);

        expect(onRetry).toHaveBeenCalledTimes(2); // Called before attempt 2 and 3
        expect(onRetry).toHaveBeenCalledWith(1, error, 'test-rule');
        expect(onRetry).toHaveBeenCalledWith(2, error, 'test-rule');
      });

      it('should wait between retry attempts', async () => {
        const manager = new RetryManager({
          strategy: 'fixed',
          initialDelay: 500,
          maxAttempts: 3,
        });
        const fn = jest
          .fn()
          .mockRejectedValueOnce(new Error('error 1'))
          .mockResolvedValueOnce('success');

        const sleepSpy = jest.spyOn(manager, 'sleep');

        const promise = manager.execute('test-rule', fn);
        await jest.runAllTimersAsync();
        await promise;

        expect(sleepSpy).toHaveBeenCalledWith(500);
      });

      it('should track retry history correctly', async () => {
        const manager = new RetryManager({ maxAttempts: 3, initialDelay: 100 });
        const error = new Error('test error');
        const fn = jest.fn().mockRejectedValue(error);

        const executePromise = manager.execute('test-rule', fn);

        await Promise.all([
          jest.runAllTimersAsync(),
          expect(executePromise).rejects.toThrow('test error'),
        ]);

        const history = manager.getRetryHistory('test-rule');
        expect(history).toHaveLength(3);

        history.forEach((entry, index) => {
          expect(entry.attempt).toBe(index + 1);
          expect(entry.error).toBe('test error');
          expect(entry.timestamp).toBeGreaterThan(0);
        });
      });

      it('should handle multiple rules independently', async () => {
        const manager = new RetryManager({ maxAttempts: 2, initialDelay: 100 });

        const fn1 = jest.fn().mockRejectedValue(new Error('error 1'));
        const fn2 = jest.fn().mockResolvedValue('success 2');

        const promise1 = manager.execute('rule-1', fn1);
        const promise2 = manager.execute('rule-2', fn2);

        await Promise.all([
          jest.runAllTimersAsync(),
          expect(promise1).rejects.toThrow('error 1'),
          expect(promise2).resolves.toBe('success 2'),
        ]);

        expect(manager.getRetryHistory('rule-1')).toHaveLength(2);
        expect(manager.getRetryHistory('rule-2')).toHaveLength(0);
      });

      it('should bypass retry logic when disabled', async () => {
        const manager = new RetryManager({ enabled: false });
        const fn = jest.fn().mockResolvedValue('success');

        const result = await manager.execute('test-rule', fn);

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
      });

      it('should throw immediately when disabled and error occurs', async () => {
        const manager = new RetryManager({ enabled: false });
        const error = new Error('immediate error');
        const fn = jest.fn().mockRejectedValue(error);

        await expect(manager.execute('test-rule', fn)).rejects.toThrow('immediate error');
        expect(fn).toHaveBeenCalledTimes(1);
      });
    });

    describe('sleep', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should resolve after specified delay', async () => {
        const manager = new RetryManager();
        const callback = jest.fn();

        const promise = manager.sleep(1000).then(callback);

        expect(callback).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);
        expect(callback).not.toHaveBeenCalled();

        jest.advanceTimersByTime(500);
        await promise;
        expect(callback).toHaveBeenCalledTimes(1);
      });

      it('should handle zero delay', async () => {
        const manager = new RetryManager();
        const callback = jest.fn();

        const promise = manager.sleep(0).then(callback);

        jest.runAllTimers();
        await promise;
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    describe('getRetryHistory', () => {
      it('should return empty array for rule with no history', () => {
        const manager = new RetryManager();
        expect(manager.getRetryHistory('non-existent-rule')).toEqual([]);
      });

      it('should return retry history for specific rule', () => {
        const manager = new RetryManager();

        // Manually add history
        manager.retryHistory.set('test-rule', [
          { attempt: 1, error: 'error 1', timestamp: 1000 },
          { attempt: 2, error: 'error 2', timestamp: 2000 },
        ]);

        const history = manager.getRetryHistory('test-rule');
        expect(history).toHaveLength(2);
        expect(history[0].attempt).toBe(1);
        expect(history[1].attempt).toBe(2);
      });
    });

    describe('clearHistory', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should clear history for specific rule', async () => {
        const manager = new RetryManager({ maxAttempts: 2 });
        const fn = jest.fn().mockRejectedValue(new Error('error'));

        const promise1 = manager.execute('rule-1', fn);
        const promise2 = manager.execute('rule-2', fn);

        await Promise.all([
          jest.runAllTimersAsync(),
          expect(promise1).rejects.toThrow(),
          expect(promise2).rejects.toThrow(),
        ]);

        expect(manager.getRetryHistory('rule-1')).toHaveLength(2);
        expect(manager.getRetryHistory('rule-2')).toHaveLength(2);

        manager.clearHistory('rule-1');

        expect(manager.getRetryHistory('rule-1')).toEqual([]);
        expect(manager.getRetryHistory('rule-2')).toHaveLength(2);
      });

      it('should clear history for all rules when no ruleId provided', async () => {
        const manager = new RetryManager({ maxAttempts: 2 });
        const fn = jest.fn().mockRejectedValue(new Error('error'));

        const promise1 = manager.execute('rule-1', fn);
        const promise2 = manager.execute('rule-2', fn);

        await Promise.all([
          jest.runAllTimersAsync(),
          expect(promise1).rejects.toThrow(),
          expect(promise2).rejects.toThrow(),
        ]);

        expect(manager.retryHistory.size).toBe(2);

        manager.clearHistory();

        expect(manager.retryHistory.size).toBe(0);
        expect(manager.getRetryHistory('rule-1')).toEqual([]);
        expect(manager.getRetryHistory('rule-2')).toEqual([]);
      });

      it('should handle clearing non-existent rule', () => {
        const manager = new RetryManager();
        expect(() => manager.clearHistory('non-existent')).not.toThrow();
      });
    });

    describe('getStats', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should return stats with no retry history', () => {
        const manager = new RetryManager({
          enabled: true,
          strategy: 'exponential',
          maxAttempts: 3,
        });

        const stats = manager.getStats();

        expect(stats).toEqual({
          enabled: true,
          strategy: 'exponential',
          maxAttempts: 3,
          totalRulesWithRetries: 0,
          retryHistorySize: 0,
        });
      });

      it('should return stats with retry history', async () => {
        const manager = new RetryManager({
          enabled: true,
          strategy: 'linear',
          maxAttempts: 4,
        });

        const fn = jest.fn().mockRejectedValue(new Error('error'));

        const promise1 = manager.execute('rule-1', fn);
        const promise2 = manager.execute('rule-2', fn);

        await Promise.all([
          jest.runAllTimersAsync(),
          expect(promise1).rejects.toThrow(),
          expect(promise2).rejects.toThrow(),
        ]);

        const stats = manager.getStats();

        expect(stats).toEqual({
          enabled: true,
          strategy: 'linear',
          maxAttempts: 4,
          totalRulesWithRetries: 2,
          retryHistorySize: 8, // 2 rules * 4 attempts each
        });
      });

      it('should reflect disabled state', () => {
        const manager = new RetryManager({ enabled: false });
        const stats = manager.getStats();
        expect(stats.enabled).toBe(false);
      });

      it('should count retry history correctly for multiple rules', () => {
        const manager = new RetryManager();

        // Manually add history
        manager.retryHistory.set('rule-1', [
          { attempt: 1, error: 'error', timestamp: 1000 },
          { attempt: 2, error: 'error', timestamp: 2000 },
        ]);
        manager.retryHistory.set('rule-2', [{ attempt: 1, error: 'error', timestamp: 1000 }]);
        manager.retryHistory.set('rule-3', [
          { attempt: 1, error: 'error', timestamp: 1000 },
          { attempt: 2, error: 'error', timestamp: 2000 },
          { attempt: 3, error: 'error', timestamp: 3000 },
        ]);

        const stats = manager.getStats();

        expect(stats.totalRulesWithRetries).toBe(3);
        expect(stats.retryHistorySize).toBe(6); // 2 + 1 + 3
      });
    });

    describe('integration with different strategies', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should use exponential backoff delays', async () => {
        const manager = new RetryManager({
          strategy: 'exponential',
          initialDelay: 100,
          maxAttempts: 3,
        });

        const fn = jest.fn().mockRejectedValue(new Error('error'));
        const sleepSpy = jest.spyOn(manager, 'sleep');

        const executePromise = manager.execute('test-rule', fn);

        await Promise.all([jest.runAllTimersAsync(), expect(executePromise).rejects.toThrow()]);

        expect(sleepSpy).toHaveBeenNthCalledWith(1, 100); // After attempt 1
        expect(sleepSpy).toHaveBeenNthCalledWith(2, 200); // After attempt 2
      });

      it('should use fixed delays', async () => {
        const manager = new RetryManager({
          strategy: 'fixed',
          initialDelay: 300,
          maxAttempts: 3,
        });

        const fn = jest.fn().mockRejectedValue(new Error('error'));
        const sleepSpy = jest.spyOn(manager, 'sleep');

        const executePromise = manager.execute('test-rule', fn);

        await Promise.all([jest.runAllTimersAsync(), expect(executePromise).rejects.toThrow()]);

        expect(sleepSpy).toHaveBeenNthCalledWith(1, 300); // After attempt 1
        expect(sleepSpy).toHaveBeenNthCalledWith(2, 300); // After attempt 2
      });

      it('should use linear backoff delays', async () => {
        const manager = new RetryManager({
          strategy: 'linear',
          initialDelay: 100,
          maxAttempts: 4,
        });

        const fn = jest.fn().mockRejectedValue(new Error('error'));
        const sleepSpy = jest.spyOn(manager, 'sleep');

        const executePromise = manager.execute('test-rule', fn);

        await Promise.all([jest.runAllTimersAsync(), expect(executePromise).rejects.toThrow()]);

        expect(sleepSpy).toHaveBeenNthCalledWith(1, 100); // 100 * 1
        expect(sleepSpy).toHaveBeenNthCalledWith(2, 200); // 100 * 2
        expect(sleepSpy).toHaveBeenNthCalledWith(3, 300); // 100 * 3
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should handle async function that throws synchronously', async () => {
        const manager = new RetryManager({ maxAttempts: 2 });
        const fn = jest.fn(() => {
          throw new Error('sync error');
        });

        const promise = manager.execute('test-rule', fn);
        jest.runAllTimers();

        await expect(promise).rejects.toThrow('sync error');
        expect(fn).toHaveBeenCalledTimes(2);
      });

      it('should handle maxAttempts = 1', async () => {
        const manager = new RetryManager({ maxAttempts: 1 });
        const fn = jest.fn().mockRejectedValue(new Error('error'));

        const promise = manager.execute('test-rule', fn);
        jest.runAllTimers();

        await expect(promise).rejects.toThrow('error');
        expect(fn).toHaveBeenCalledTimes(1);

        const history = manager.getRetryHistory('test-rule');
        expect(history).toHaveLength(1);
      });

      it('should handle very large maxAttempts', async () => {
        const manager = new RetryManager({
          maxAttempts: 100,
          initialDelay: 10,
        });
        const fn = jest
          .fn()
          .mockRejectedValueOnce(new Error('error'))
          .mockResolvedValueOnce('success');

        const promise = manager.execute('test-rule', fn);
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2);
      });

      it('should handle empty error message', async () => {
        const manager = new RetryManager({
          retryableErrors: ['timeout'],
          maxAttempts: 2,
        });
        const fn = jest.fn().mockRejectedValue(new Error(''));

        const promise = manager.execute('test-rule', fn);
        jest.runAllTimers();

        await expect(promise).rejects.toThrow();
        expect(fn).toHaveBeenCalledTimes(1); // Won't match 'timeout' pattern
      });
    });
  });
});
