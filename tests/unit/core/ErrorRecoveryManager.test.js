import { ErrorRecoveryManager } from '../../../src/core/recovery/ErrorRecoveryManager.js';
import { CircuitState } from '../../../src/core/recovery/CircuitBreaker.js';

describe('ErrorRecoveryManager', () => {
  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new ErrorRecoveryManager();

      expect(manager.options.enabled).toBe(true);
      expect(manager.retryManager).toBeDefined();
      expect(manager.circuitBreaker).toBeDefined();
      expect(manager.fallbackManager).toBeDefined();
      expect(manager.errorHistory).toBeInstanceOf(Map);
      expect(manager.errorRates).toBeInstanceOf(Map);
      expect(manager.maxErrorHistory).toBe(100);
      expect(manager.errorRateWindow).toBe(60000);
      expect(manager.onError).toBeNull();
    });

    it('should accept custom options', () => {
      const onError = jest.fn();
      const manager = new ErrorRecoveryManager({
        enabled: false,
        maxErrorHistory: 50,
        errorRateWindow: 30000,
        onError,
      });

      expect(manager.options.enabled).toBe(false);
      expect(manager.maxErrorHistory).toBe(50);
      expect(manager.errorRateWindow).toBe(30000);
      expect(manager.onError).toBe(onError);
    });

    it('should initialize sub-managers with custom options', () => {
      const manager = new ErrorRecoveryManager({
        retry: {
          maxAttempts: 5,
          strategy: 'fixed',
        },
        circuitBreaker: {
          failureThreshold: 10,
        },
        fallback: {
          defaultValue: 'custom-default',
        },
      });

      expect(manager.retryManager.options.maxAttempts).toBe(5);
      expect(manager.retryManager.options.strategy).toBe('fixed');
      expect(manager.circuitBreaker.options.failureThreshold).toBe(10);
      expect(manager.fallbackManager.options.defaultValue).toBe('custom-default');
    });

    it('should initialize empty error tracking maps', () => {
      const manager = new ErrorRecoveryManager();

      expect(manager.errorHistory.size).toBe(0);
      expect(manager.errorRates.size).toBe(0);
    });

    it('should handle partial options', () => {
      const manager = new ErrorRecoveryManager({
        maxErrorHistory: 200,
      });

      expect(manager.maxErrorHistory).toBe(200);
      expect(manager.errorRateWindow).toBe(60000);
      expect(manager.options.enabled).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute function successfully', async () => {
      const manager = new ErrorRecoveryManager();
      const fn = jest.fn().mockResolvedValue('success');

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should bypass all recovery when disabled', async () => {
      const manager = new ErrorRecoveryManager({ enabled: false });
      const fn = jest.fn().mockResolvedValue('success');

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should record success on successful execution', async () => {
      const manager = new ErrorRecoveryManager();
      const fn = jest.fn().mockResolvedValue('success');

      await manager.execute('test-rule', fn);

      const errorRate = manager.getErrorRate('test-rule');
      expect(errorRate).toBeNull(); // No errors, so no rate info created
    });

    it('should use retry manager on failure', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 3 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockRejectedValueOnce(new Error('fail-2'))
        .mockResolvedValueOnce('success');

      const executePromise = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      const result = await executePromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use fallback when all retries fail', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 2 },
        fallback: { defaultValue: 'fallback-value' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

      const executePromise = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      const result = await executePromise;

      expect(result).toBe('fallback-value');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect circuit breaker state', async () => {
      const manager = new ErrorRecoveryManager({
        circuitBreaker: { failureThreshold: 1, resetTimeout: 100000 },
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // First call opens the circuit
      const executePromise1 = manager.execute('test-rule', fn);
      await jest.advanceTimersByTimeAsync(1000);
      await executePromise1;

      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.OPEN);

      // Second call should be blocked by circuit breaker
      const result2 = await manager.execute('test-rule', fn);

      expect(result2).toBe('fallback');
      expect(fn).toHaveBeenCalledTimes(1); // Not called again due to open circuit
    });

    it('should call onError hook on failure', async () => {
      const onError = jest.fn();
      const manager = new ErrorRecoveryManager({
        onError,
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const error = new Error('test error');
      const fn = jest.fn().mockRejectedValue(error);

      const executePromise = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      await executePromise;

      expect(onError).toHaveBeenCalledWith(error, 'test-rule');
    });

    it('should record error in history', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const error = new Error('test error');
      const fn = jest.fn().mockRejectedValue(error);

      const executePromise = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      await executePromise;

      const history = manager.getErrorHistory('test-rule');
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('test error');
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should use fallback function when provided', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 1 },
        fallback: { useFallbackRules: true },
      });

      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);

      const fn = jest.fn().mockRejectedValue(new Error('primary failed'));
      const fallbackFn = jest.fn().mockResolvedValue({ fromFallback: true });

      const executePromise = manager.execute('test-rule', fn, fallbackFn);
      await jest.runAllTimersAsync();
      const result = await executePromise;

      expect(result.fromFallback).toBe(true);
      expect(fallbackFn).toHaveBeenCalledWith(fallbackRule);
    });

    it('should coordinate full recovery pipeline', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 2 },
        circuitBreaker: { failureThreshold: 3 },
        fallback: { defaultValue: 'final-fallback' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // Execute multiple times to test full coordination
      const executePromise1 = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      const result1 = await executePromise1;

      expect(result1).toBe('final-fallback');
      expect(fn).toHaveBeenCalledTimes(2); // Retry attempted
      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should handle synchronous throws', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest.fn(() => {
        throw new Error('sync error');
      });

      const executePromise = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      const result = await executePromise;

      expect(result).toBe('fallback');
    });
  });

  describe('recordSuccess', () => {
    it('should update success count in error rate tracking', () => {
      const manager = new ErrorRecoveryManager();

      // First create an error rate entry
      manager.recordError('test-rule', new Error('error'));
      expect(manager.errorRates.get('test-rule').successCount).toBe(0);

      manager.recordSuccess('test-rule');
      expect(manager.errorRates.get('test-rule').successCount).toBe(1);

      manager.recordSuccess('test-rule');
      expect(manager.errorRates.get('test-rule').successCount).toBe(2);
    });

    it('should not create error rate entry if none exists', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordSuccess('test-rule');

      expect(manager.errorRates.has('test-rule')).toBe(false);
    });
  });

  describe('recordError', () => {
    it('should add error to history', () => {
      const manager = new ErrorRecoveryManager();
      const error = new Error('test error');

      manager.recordError('test-rule', error);

      const history = manager.getErrorHistory('test-rule');
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('test error');
      expect(history[0].operator).toBeNull();
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should record operator from error', () => {
      const manager = new ErrorRecoveryManager();
      const error = new Error('operator error');
      error.operator = 'eq';

      manager.recordError('test-rule', error);

      const history = manager.getErrorHistory('test-rule');
      expect(history[0].operator).toBe('eq');
    });

    it('should limit history size', () => {
      const manager = new ErrorRecoveryManager({ maxErrorHistory: 10 });

      // Add 20 errors
      for (let i = 0; i < 20; i++) {
        manager.recordError('test-rule', new Error(`error ${i}`));
      }

      const history = manager.getErrorHistory('test-rule');
      expect(history).toHaveLength(10);
      // Should keep the most recent 10
      expect(history[0].message).toBe('error 10');
      expect(history[9].message).toBe('error 19');
    });

    it('should create error rate tracking', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('test-rule', new Error('error'));

      const rateInfo = manager.errorRates.get('test-rule');
      expect(rateInfo.errorCount).toBe(1);
      expect(rateInfo.successCount).toBe(0);
      expect(rateInfo.windowStart).toBeGreaterThan(0);
    });

    it('should increment error count', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('test-rule', new Error('error 1'));
      manager.recordError('test-rule', new Error('error 2'));
      manager.recordError('test-rule', new Error('error 3'));

      const rateInfo = manager.errorRates.get('test-rule');
      expect(rateInfo.errorCount).toBe(3);
    });

    it('should reset window after expiration', () => {
      jest.useFakeTimers();
      const manager = new ErrorRecoveryManager({ errorRateWindow: 1000 });

      manager.recordError('test-rule', new Error('error 1'));
      const firstWindowStart = manager.errorRates.get('test-rule').windowStart;

      jest.advanceTimersByTime(1500);

      manager.recordError('test-rule', new Error('error 2'));
      const rateInfo = manager.errorRates.get('test-rule');

      expect(rateInfo.errorCount).toBe(1); // Reset to 1
      expect(rateInfo.successCount).toBe(0); // Reset
      expect(rateInfo.windowStart).toBeGreaterThan(firstWindowStart);

      jest.useRealTimers();
    });

    it('should handle errors without messages', () => {
      const manager = new ErrorRecoveryManager();
      manager.recordError('test-rule', new Error());

      const history = manager.getErrorHistory('test-rule');
      expect(history[0].message).toBe('');
    });

    it('should track errors for different rules independently', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('rule-1', new Error('error 1'));
      manager.recordError('rule-2', new Error('error 2'));

      expect(manager.getErrorHistory('rule-1')).toHaveLength(1);
      expect(manager.getErrorHistory('rule-2')).toHaveLength(1);
      expect(manager.errorRates.size).toBe(2);
    });
  });

  describe('getErrorHistory', () => {
    it('should return empty array for rule with no history', () => {
      const manager = new ErrorRecoveryManager();
      expect(manager.getErrorHistory('non-existent')).toEqual([]);
    });

    it('should return error history for specific rule', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('test-rule', new Error('error 1'));
      manager.recordError('test-rule', new Error('error 2'));

      const history = manager.getErrorHistory('test-rule');
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('error 1');
      expect(history[1].message).toBe('error 2');
    });

    it('should not affect other rules', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('rule-1', new Error('error 1'));
      manager.recordError('rule-2', new Error('error 2'));

      expect(manager.getErrorHistory('rule-1')).toHaveLength(1);
      expect(manager.getErrorHistory('rule-2')).toHaveLength(1);
      expect(manager.getErrorHistory('rule-3')).toEqual([]);
    });
  });

  describe('getErrorRate', () => {
    it('should return null for rule with no rate info', () => {
      const manager = new ErrorRecoveryManager();
      expect(manager.getErrorRate('non-existent')).toBeNull();
    });

    it('should calculate error rate correctly', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('test-rule', new Error('error 1'));
      manager.recordSuccess('test-rule');
      manager.recordError('test-rule', new Error('error 2'));
      manager.recordSuccess('test-rule');
      manager.recordSuccess('test-rule');

      const rate = manager.getErrorRate('test-rule');

      expect(rate.errorCount).toBe(2);
      expect(rate.successCount).toBe(3);
      expect(rate.total).toBe(5);
      expect(rate.rate).toBe(2 / 5); // 0.4
    });

    it('should return 0 rate when total is 0', () => {
      const manager = new ErrorRecoveryManager();

      // Create empty rate info
      manager.errorRates.set('test-rule', {
        errorCount: 0,
        successCount: 0,
        windowStart: Date.now(),
      });

      const rate = manager.getErrorRate('test-rule');

      expect(rate.rate).toBe(0);
      expect(rate.total).toBe(0);
    });

    it('should include window duration', () => {
      jest.useFakeTimers();
      const manager = new ErrorRecoveryManager();

      manager.recordError('test-rule', new Error('error'));
      jest.advanceTimersByTime(5000);

      const rate = manager.getErrorRate('test-rule');

      expect(rate.windowDuration).toBeGreaterThanOrEqual(5000);
      expect(rate.windowStart).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should calculate 100% error rate', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('test-rule', new Error('error 1'));
      manager.recordError('test-rule', new Error('error 2'));
      manager.recordError('test-rule', new Error('error 3'));

      const rate = manager.getErrorRate('test-rule');

      expect(rate.errorCount).toBe(3);
      expect(rate.successCount).toBe(0);
      expect(rate.rate).toBe(1); // 100%
    });

    it('should calculate 0% error rate', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('test-rule', new Error('error')); // Create rate info
      manager.recordSuccess('test-rule');
      manager.recordSuccess('test-rule');
      manager.recordSuccess('test-rule');

      // Manually adjust to simulate successes after initial error
      const rateInfo = manager.errorRates.get('test-rule');
      rateInfo.errorCount = 0;

      const rate = manager.getErrorRate('test-rule');

      expect(rate.errorCount).toBe(0);
      expect(rate.successCount).toBe(3);
      expect(rate.rate).toBe(0); // 0%
    });
  });

  describe('registerFallbackRule', () => {
    it('should register fallback rule in fallback manager', () => {
      const manager = new ErrorRecoveryManager();
      const fallbackRule = { eq: ['status', 'fallback'] };

      manager.registerFallbackRule('test-rule', fallbackRule);

      expect(manager.fallbackManager.fallbackRules.has('test-rule')).toBe(true);
      expect(manager.fallbackManager.fallbackRules.get('test-rule')).toBe(fallbackRule);
    });

    it('should allow multiple rules to be registered', () => {
      const manager = new ErrorRecoveryManager();

      manager.registerFallbackRule('rule-1', { eq: ['a', 'b'] });
      manager.registerFallbackRule('rule-2', { eq: ['c', 'd'] });

      expect(manager.fallbackManager.fallbackRules.size).toBe(2);
    });
  });

  describe('registerFallbackValue', () => {
    it('should register fallback value in fallback manager', () => {
      const manager = new ErrorRecoveryManager();
      const fallbackValue = { success: false };

      manager.registerFallbackValue('test-rule', fallbackValue);

      expect(manager.fallbackManager.fallbackValues.has('test-rule')).toBe(true);
      expect(manager.fallbackManager.fallbackValues.get('test-rule')).toBe(fallbackValue);
    });

    it('should allow multiple values to be registered', () => {
      const manager = new ErrorRecoveryManager();

      manager.registerFallbackValue('rule-1', 'value-1');
      manager.registerFallbackValue('rule-2', 'value-2');

      expect(manager.fallbackManager.fallbackValues.size).toBe(2);
    });
  });

  describe('getCircuitState', () => {
    it('should return circuit state from circuit breaker', () => {
      const manager = new ErrorRecoveryManager();

      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should return correct state after circuit opens', async () => {
      jest.useFakeTimers();
      const manager = new ErrorRecoveryManager({
        circuitBreaker: { failureThreshold: 1, resetTimeout: 100000 },
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      const executePromise = manager.execute('test-rule', fn);
      await jest.advanceTimersByTimeAsync(1000);
      await executePromise;

      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.OPEN);

      jest.useRealTimers();
    });
  });

  describe('resetCircuit', () => {
    it('should reset specific circuit', async () => {
      jest.useFakeTimers();
      const manager = new ErrorRecoveryManager({
        circuitBreaker: { failureThreshold: 1, resetTimeout: 100000 },
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit
      const executePromise = manager.execute('test-rule', fn);
      await jest.advanceTimersByTimeAsync(1000);
      await executePromise;

      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.OPEN);

      manager.resetCircuit('test-rule');

      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.CLOSED);

      jest.useRealTimers();
    });

    it('should reset all circuits when no ruleId provided', async () => {
      jest.useFakeTimers();
      const manager = new ErrorRecoveryManager({
        circuitBreaker: { failureThreshold: 1, resetTimeout: 100000 },
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // Open multiple circuits
      const executePromise1 = manager.execute('rule-1', fn);
      const executePromise2 = manager.execute('rule-2', fn);
      await jest.advanceTimersByTimeAsync(1000);
      await Promise.all([executePromise1, executePromise2]);

      expect(manager.getCircuitState('rule-1')).toBe(CircuitState.OPEN);
      expect(manager.getCircuitState('rule-2')).toBe(CircuitState.OPEN);

      manager.resetCircuit();

      expect(manager.getCircuitState('rule-1')).toBe(CircuitState.CLOSED);
      expect(manager.getCircuitState('rule-2')).toBe(CircuitState.CLOSED);

      jest.useRealTimers();
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', () => {
      const manager = new ErrorRecoveryManager();

      const stats = manager.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.retry).toBeDefined();
      expect(stats.circuitBreaker).toBeDefined();
      expect(stats.fallback).toBeDefined();
      expect(stats.errorTracking).toBeDefined();
    });

    it('should include error tracking statistics', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('rule-1', new Error('error 1'));
      manager.recordError('rule-2', new Error('error 2'));
      manager.recordError('rule-2', new Error('error 3'));

      const stats = manager.getStats();

      expect(stats.errorTracking.totalRulesWithErrors).toBe(2);
      expect(stats.errorTracking.totalErrorsRecorded).toBe(3);
      expect(stats.errorTracking.errorRates).toHaveProperty('rule-1');
      expect(stats.errorTracking.errorRates).toHaveProperty('rule-2');
    });

    it('should include error rates for all rules', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('rule-1', new Error('error'));
      manager.recordSuccess('rule-1');

      const stats = manager.getStats();

      expect(stats.errorTracking.errorRates['rule-1']).toBeDefined();
      expect(stats.errorTracking.errorRates['rule-1'].errorCount).toBe(1);
      expect(stats.errorTracking.errorRates['rule-1'].successCount).toBe(1);
    });

    it('should reflect disabled state', () => {
      const manager = new ErrorRecoveryManager({ enabled: false });

      const stats = manager.getStats();

      expect(stats.enabled).toBe(false);
    });

    it('should include stats from all sub-managers', () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 5 },
        circuitBreaker: { failureThreshold: 10 },
        fallback: { defaultValue: 'fallback' },
      });

      const stats = manager.getStats();

      expect(stats.retry.maxAttempts).toBe(5);
      expect(stats.circuitBreaker.enabled).toBe(true);
      expect(stats.fallback.enabled).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear specific rule data', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('rule-1', new Error('error 1'));
      manager.recordError('rule-2', new Error('error 2'));
      manager.registerFallbackValue('rule-1', 'value');

      manager.clear('rule-1');

      expect(manager.getErrorHistory('rule-1')).toEqual([]);
      expect(manager.getErrorRate('rule-1')).toBeNull();
      expect(manager.getErrorHistory('rule-2')).toHaveLength(1);
    });

    it('should clear all data when no ruleId provided', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('rule-1', new Error('error 1'));
      manager.recordError('rule-2', new Error('error 2'));
      manager.registerFallbackValue('rule-1', 'value-1');
      manager.registerFallbackValue('rule-2', 'value-2');

      manager.clear();

      expect(manager.errorHistory.size).toBe(0);
      expect(manager.errorRates.size).toBe(0);
      // Note: clear() only clears fallback history, not fallback values/rules
      expect(manager.fallbackManager.fallbackValues.size).toBe(2);
    });

    it('should clear retry history', () => {
      const manager = new ErrorRecoveryManager();

      // Manually add retry history
      manager.retryManager.retryHistory.set('rule-1', [
        { attempt: 1, error: 'error', timestamp: Date.now() },
      ]);

      manager.clear('rule-1');

      expect(manager.retryManager.retryHistory.has('rule-1')).toBe(false);
    });

    it('should reset circuit breaker', async () => {
      jest.useFakeTimers();
      const manager = new ErrorRecoveryManager({
        circuitBreaker: { failureThreshold: 1, resetTimeout: 100000 },
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      const executePromise = manager.execute('test-rule', fn);
      await jest.advanceTimersByTimeAsync(1000);
      await executePromise;

      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.OPEN);

      manager.clear('test-rule');

      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.CLOSED);

      jest.useRealTimers();
    });

    it('should handle clearing non-existent rule', () => {
      const manager = new ErrorRecoveryManager();
      expect(() => manager.clear('non-existent')).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should destroy circuit breaker', () => {
      const manager = new ErrorRecoveryManager();

      manager.circuitBreaker.openCircuit('test-rule');

      manager.destroy();

      expect(manager.circuitBreaker.circuits.size).toBe(0);
    });

    it('should clear fallback manager', () => {
      const manager = new ErrorRecoveryManager();

      manager.registerFallbackRule('rule-1', { eq: ['a', 'b'] });
      manager.registerFallbackValue('rule-2', 'value');

      manager.destroy();

      expect(manager.fallbackManager.fallbackRules.size).toBe(0);
      expect(manager.fallbackManager.fallbackValues.size).toBe(0);
    });

    it('should clear error tracking', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('rule-1', new Error('error 1'));
      manager.recordError('rule-2', new Error('error 2'));

      manager.destroy();

      expect(manager.errorHistory.size).toBe(0);
      expect(manager.errorRates.size).toBe(0);
    });

    it('should handle destroying empty manager', () => {
      const manager = new ErrorRecoveryManager();
      expect(() => manager.destroy()).not.toThrow();
    });

    it('should handle destroying multiple times', () => {
      const manager = new ErrorRecoveryManager();

      manager.recordError('test-rule', new Error('error'));
      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should coordinate retry and fallback', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 3 },
        fallback: { defaultValue: 'fallback-value' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

      const executePromise = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      const result = await executePromise;

      expect(result).toBe('fallback-value');
      expect(fn).toHaveBeenCalledTimes(3); // All retries attempted
      expect(manager.getErrorHistory('test-rule')).toHaveLength(1);
    });

    it('should coordinate circuit breaker and fallback', async () => {
      const manager = new ErrorRecoveryManager({
        circuitBreaker: { failureThreshold: 1, resetTimeout: 100000 },
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'circuit-fallback' },
      });

      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // First call opens circuit
      const executePromise1 = manager.execute('test-rule', fn);
      // Advance timers just enough for retries (not for circuit reset)
      await jest.advanceTimersByTimeAsync(1000);
      await executePromise1;

      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.OPEN);

      // Second call blocked by circuit, uses fallback
      const result2 = await manager.execute('test-rule', fn);

      expect(result2).toBe('circuit-fallback');
      expect(fn).toHaveBeenCalledTimes(1); // Not called second time
    });

    it('should handle full recovery pipeline with all strategies', async () => {
      const onError = jest.fn();
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 2 },
        circuitBreaker: { failureThreshold: 5 },
        fallback: { defaultValue: 'final-fallback' },
        onError,
      });

      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail-1'))
        .mockResolvedValueOnce('success');

      const executePromise = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      const result = await executePromise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(onError).not.toHaveBeenCalled(); // Success on retry
      expect(manager.getCircuitState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should track error rates across multiple executions', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 1 },
        fallback: { defaultValue: 'fallback' },
      });

      const failFn = jest.fn().mockRejectedValue(new Error('failure'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Mix of failures and successes
      await manager.execute('test-rule', failFn);
      await manager.execute('test-rule', successFn);
      await manager.execute('test-rule', failFn);
      await manager.execute('test-rule', successFn);
      await manager.execute('test-rule', successFn);

      const rate = manager.getErrorRate('test-rule');

      expect(rate.errorCount).toBe(2);
      expect(rate.successCount).toBe(3);
      expect(rate.rate).toBe(0.4); // 2/5
    });

    it('should use fallback rule with fallback function', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 1 },
        fallback: { useFallbackRules: true },
      });

      const fallbackRule = { eq: ['status', 'ok'] };
      manager.registerFallbackRule('test-rule', fallbackRule);

      const fn = jest.fn().mockRejectedValue(new Error('primary failed'));
      const fallbackFn = jest.fn().mockResolvedValue({ fallbackResult: true });

      const executePromise = manager.execute('test-rule', fn, fallbackFn);
      await jest.runAllTimersAsync();
      const result = await executePromise;

      expect(result.fallbackResult).toBe(true);
      expect(result.isFallback).toBe(true);
      expect(fallbackFn).toHaveBeenCalledWith(fallbackRule);
    });

    it('should handle multiple rules independently', async () => {
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 1 },
        circuitBreaker: { failureThreshold: 1, resetTimeout: 100000 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn1 = jest.fn().mockRejectedValue(new Error('failure'));
      const fn2 = jest.fn().mockResolvedValue('success');

      const executePromise1 = manager.execute('rule-1', fn1);
      // Advance timers just enough for retries (not for circuit reset)
      await jest.advanceTimersByTimeAsync(1000);
      await executePromise1;

      const result2 = await manager.execute('rule-2', fn2);

      expect(manager.getCircuitState('rule-1')).toBe(CircuitState.OPEN);
      expect(manager.getCircuitState('rule-2')).toBe(CircuitState.CLOSED);
      expect(result2).toBe('success');
    });
  });

  describe('edge cases', () => {
    it('should handle null ruleId', async () => {
      const manager = new ErrorRecoveryManager({
        fallback: { defaultValue: 'fallback' },
      });
      const fn = jest.fn().mockResolvedValue('success');

      const result = await manager.execute(null, fn);

      expect(result).toBe('success');
    });

    it('should handle empty string ruleId', async () => {
      const manager = new ErrorRecoveryManager({
        fallback: { defaultValue: 'fallback' },
      });
      const fn = jest.fn().mockResolvedValue('success');

      const result = await manager.execute('', fn);

      expect(result).toBe('success');
    });

    it('should handle errors without operator property', () => {
      const manager = new ErrorRecoveryManager();
      const error = new Error('simple error');

      manager.recordError('test-rule', error);

      const history = manager.getErrorHistory('test-rule');
      expect(history[0].operator).toBeNull();
    });

    it('should handle very large error history', () => {
      const manager = new ErrorRecoveryManager({ maxErrorHistory: 1000 });

      for (let i = 0; i < 2000; i++) {
        manager.recordError('test-rule', new Error(`error ${i}`));
      }

      const history = manager.getErrorHistory('test-rule');
      expect(history).toHaveLength(1000);
    });

    it('should handle rapid executions', async () => {
      const manager = new ErrorRecoveryManager({
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest.fn().mockResolvedValue('success');
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(manager.execute(`rule-${i}`, fn));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(results.every((r) => r === 'success')).toBe(true);
    });

    it('should handle mixed async and sync errors', async () => {
      jest.useFakeTimers();
      const manager = new ErrorRecoveryManager({
        retry: { maxAttempts: 2 },
        fallback: { defaultValue: 'fallback' },
      });

      const fn = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('sync error');
        })
        .mockRejectedValueOnce(new Error('async error'));

      const executePromise = manager.execute('test-rule', fn);
      await jest.runAllTimersAsync();
      const result = await executePromise;

      expect(result).toBe('fallback');
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('memory management', () => {
    it('should limit error history size per rule', () => {
      const manager = new ErrorRecoveryManager({ maxErrorHistory: 50 });

      for (let i = 0; i < 100; i++) {
        manager.recordError('test-rule', new Error(`error ${i}`));
      }

      const history = manager.getErrorHistory('test-rule');
      expect(history.length).toBeLessThanOrEqual(50);
    });

    it('should handle clearing large datasets efficiently', () => {
      const manager = new ErrorRecoveryManager();

      // Create large dataset
      for (let i = 0; i < 1000; i++) {
        manager.recordError(`rule-${i}`, new Error('error'));
        manager.registerFallbackValue(`rule-${i}`, 'value');
      }

      expect(manager.errorHistory.size).toBe(1000);

      manager.clear();

      expect(manager.errorHistory.size).toBe(0);
      expect(manager.errorRates.size).toBe(0);
      // Note: clear() only clears fallback history, not fallback values/rules
      expect(manager.fallbackManager.fallbackValues.size).toBe(1000);
    });
  });
});
