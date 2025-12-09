import { FallbackManager } from '../../../src/core/recovery/FallbackManager.js';

describe('FallbackManager', () => {
  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new FallbackManager();

      expect(manager.options.enabled).toBe(true);
      expect(manager.options.defaultValue).toBeNull();
      expect(manager.options.useFallbackRules).toBe(true);
      expect(manager.options.onFallback).toBeNull();
    });

    it('should accept custom options', () => {
      const onFallback = jest.fn();
      const manager = new FallbackManager({
        enabled: false,
        defaultValue: { success: false },
        useFallbackRules: false,
        onFallback,
      });

      expect(manager.options.enabled).toBe(false);
      expect(manager.options.defaultValue).toEqual({ success: false });
      expect(manager.options.useFallbackRules).toBe(false);
      expect(manager.options.onFallback).toBe(onFallback);
    });

    it('should handle partial options', () => {
      const manager = new FallbackManager({
        defaultValue: 'fallback',
      });

      expect(manager.options.enabled).toBe(true);
      expect(manager.options.defaultValue).toBe('fallback');
      expect(manager.options.useFallbackRules).toBe(true);
      expect(manager.options.onFallback).toBeNull();
    });

    it('should initialize empty maps', () => {
      const manager = new FallbackManager();

      expect(manager.fallbackRules).toBeInstanceOf(Map);
      expect(manager.fallbackRules.size).toBe(0);
      expect(manager.fallbackValues).toBeInstanceOf(Map);
      expect(manager.fallbackValues.size).toBe(0);
      expect(manager.fallbackHistory).toBeInstanceOf(Map);
      expect(manager.fallbackHistory.size).toBe(0);
    });

    it('should handle defaultValue of undefined explicitly', () => {
      const manager = new FallbackManager({ defaultValue: undefined });
      // When undefined is explicitly passed, the ternary defaults to null
      expect(manager.options.defaultValue).toBeNull();
    });

    it('should handle defaultValue of 0', () => {
      const manager = new FallbackManager({ defaultValue: 0 });
      expect(manager.options.defaultValue).toBe(0);
    });

    it('should handle defaultValue of false', () => {
      const manager = new FallbackManager({ defaultValue: false });
      expect(manager.options.defaultValue).toBe(false);
    });

    it('should handle defaultValue of empty string', () => {
      const manager = new FallbackManager({ defaultValue: '' });
      expect(manager.options.defaultValue).toBe('');
    });
  });

  describe('registerFallbackRule', () => {
    it('should register a fallback rule', () => {
      const manager = new FallbackManager();
      const fallbackRule = { eq: ['status', 'active'] };

      manager.registerFallbackRule('test-rule', fallbackRule);

      expect(manager.fallbackRules.has('test-rule')).toBe(true);
      expect(manager.fallbackRules.get('test-rule')).toBe(fallbackRule);
    });

    it('should register multiple fallback rules', () => {
      const manager = new FallbackManager();
      const rule1 = { eq: ['status', 'active'] };
      const rule2 = { eq: ['status', 'pending'] };

      manager.registerFallbackRule('rule-1', rule1);
      manager.registerFallbackRule('rule-2', rule2);

      expect(manager.fallbackRules.size).toBe(2);
      expect(manager.fallbackRules.get('rule-1')).toBe(rule1);
      expect(manager.fallbackRules.get('rule-2')).toBe(rule2);
    });

    it('should overwrite existing fallback rule', () => {
      const manager = new FallbackManager();
      const rule1 = { eq: ['status', 'active'] };
      const rule2 = { eq: ['status', 'pending'] };

      manager.registerFallbackRule('test-rule', rule1);
      manager.registerFallbackRule('test-rule', rule2);

      expect(manager.fallbackRules.size).toBe(1);
      expect(manager.fallbackRules.get('test-rule')).toBe(rule2);
    });
  });

  describe('registerFallbackValue', () => {
    it('should register a fallback value', () => {
      const manager = new FallbackManager();
      const fallbackValue = { success: false, fallback: true };

      manager.registerFallbackValue('test-rule', fallbackValue);

      expect(manager.fallbackValues.has('test-rule')).toBe(true);
      expect(manager.fallbackValues.get('test-rule')).toBe(fallbackValue);
    });

    it('should register multiple fallback values', () => {
      const manager = new FallbackManager();

      manager.registerFallbackValue('rule-1', 'value-1');
      manager.registerFallbackValue('rule-2', 'value-2');

      expect(manager.fallbackValues.size).toBe(2);
      expect(manager.fallbackValues.get('rule-1')).toBe('value-1');
      expect(manager.fallbackValues.get('rule-2')).toBe('value-2');
    });

    it('should overwrite existing fallback value', () => {
      const manager = new FallbackManager();

      manager.registerFallbackValue('test-rule', 'value-1');
      manager.registerFallbackValue('test-rule', 'value-2');

      expect(manager.fallbackValues.size).toBe(1);
      expect(manager.fallbackValues.get('test-rule')).toBe('value-2');
    });

    it('should handle null as fallback value', () => {
      const manager = new FallbackManager();
      manager.registerFallbackValue('test-rule', null);

      expect(manager.fallbackValues.get('test-rule')).toBeNull();
    });

    it('should handle undefined as fallback value', () => {
      const manager = new FallbackManager();
      manager.registerFallbackValue('test-rule', undefined);

      expect(manager.fallbackValues.get('test-rule')).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should execute function successfully', async () => {
      const manager = new FallbackManager();
      const fn = jest.fn().mockResolvedValue('success');

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should bypass fallback logic when disabled', async () => {
      const manager = new FallbackManager({ enabled: false });
      const fn = jest.fn().mockResolvedValue('success');

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw error when disabled and error occurs', async () => {
      const manager = new FallbackManager({ enabled: false });
      const error = new Error('test error');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(manager.execute('test-rule', fn)).rejects.toThrow('test error');
    });

    it('should use fallback rule when primary function fails', async () => {
      const manager = new FallbackManager();
      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);

      const fn = jest.fn().mockRejectedValue(new Error('primary failed'));
      const fallbackFn = jest.fn().mockResolvedValue({ success: true });

      const result = await manager.execute('test-rule', fn, fallbackFn);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fallbackFn).toHaveBeenCalledWith(fallbackRule);
      expect(result.success).toBe(true);
      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBe('primary failed');
    });

    it('should use fallback value when fallback rule fails', async () => {
      const manager = new FallbackManager();
      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);
      manager.registerFallbackValue('test-rule', { success: false, fallbackValue: true });

      const fn = jest.fn().mockRejectedValue(new Error('primary failed'));
      const fallbackFn = jest.fn().mockRejectedValue(new Error('fallback rule failed'));

      const result = await manager.execute('test-rule', fn, fallbackFn);

      expect(result).toEqual({ success: false, fallbackValue: true });
    });

    it('should use default value when no specific fallback available', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('default');
    });

    it('should use null default value when no other fallback available', async () => {
      const manager = new FallbackManager();
      const error = new Error('no fallback');
      const fn = jest.fn().mockRejectedValue(error);

      // Default defaultValue is null (from line 8 of FallbackManager.js)
      // So it will return null instead of throwing
      const result = await manager.execute('test-rule', fn);
      expect(result).toBeNull();
    });

    it('should throw error when defaultValue is not set and no fallback available', async () => {
      // This is a tricky case - the constructor always sets defaultValue to null
      // So we need to manually delete it to test the throw path
      const manager = new FallbackManager();
      delete manager.options.defaultValue;

      const error = new Error('no fallback');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(manager.execute('test-rule', fn)).rejects.toThrow('no fallback');
    });

    it('should call onFallback hook for fallback rule', async () => {
      const onFallback = jest.fn();
      const manager = new FallbackManager({ onFallback });
      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);

      const fn = jest.fn().mockRejectedValue(new Error('failed'));
      const fallbackFn = jest.fn().mockResolvedValue({ success: true });

      await manager.execute('test-rule', fn, fallbackFn);

      expect(onFallback).toHaveBeenCalledWith(
        'test-rule',
        'rule',
        expect.objectContaining({
          success: true,
          isFallback: true,
        })
      );
    });

    it('should call onFallback hook for fallback value', async () => {
      const onFallback = jest.fn();
      const manager = new FallbackManager({ onFallback });
      manager.registerFallbackValue('test-rule', { fallback: true });

      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      await manager.execute('test-rule', fn);

      expect(onFallback).toHaveBeenCalledWith('test-rule', 'value', { fallback: true });
    });

    it('should call onFallback hook for default value', async () => {
      const onFallback = jest.fn();
      const manager = new FallbackManager({ defaultValue: 'default', onFallback });

      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      await manager.execute('test-rule', fn);

      expect(onFallback).toHaveBeenCalledWith('test-rule', 'default', 'default');
    });

    it('should not call onFallback hook when not provided', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('default');
    });

    it('should skip fallback rule when useFallbackRules is false', async () => {
      const manager = new FallbackManager({
        useFallbackRules: false,
        defaultValue: 'default',
      });
      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);

      const fn = jest.fn().mockRejectedValue(new Error('failed'));
      const fallbackFn = jest.fn().mockResolvedValue({ success: true });

      const result = await manager.execute('test-rule', fn, fallbackFn);

      expect(fallbackFn).not.toHaveBeenCalled();
      expect(result).toBe('default');
    });

    it('should not use fallback rule when fallbackFn is not provided', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);

      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('default');
    });

    it('should prefer fallback value over default value', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      manager.registerFallbackValue('test-rule', 'specific');

      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('specific');
    });

    it('should prefer fallback rule over fallback value', async () => {
      const manager = new FallbackManager();
      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);
      manager.registerFallbackValue('test-rule', 'value');

      const fn = jest.fn().mockRejectedValue(new Error('failed'));
      const fallbackFn = jest.fn().mockResolvedValue({ fromRule: true });

      const result = await manager.execute('test-rule', fn, fallbackFn);

      expect(result.fromRule).toBe(true);
      expect(result).not.toBe('value');
    });

    it('should handle synchronous throw in primary function', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fn = jest.fn(() => {
        throw new Error('sync error');
      });

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('default');
    });

    it('should handle synchronous throw in fallback function', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);

      const fn = jest.fn().mockRejectedValue(new Error('failed'));
      const fallbackFn = jest.fn(() => {
        throw new Error('fallback sync error');
      });

      const result = await manager.execute('test-rule', fn, fallbackFn);

      expect(result).toBe('default');
    });
  });

  describe('recordFallback', () => {
    it('should record fallback usage', () => {
      const manager = new FallbackManager();
      const error = new Error('test error');

      manager.recordFallback('test-rule', error);

      const history = manager.getFallbackHistory('test-rule');
      expect(history).toHaveLength(1);
      expect(history[0].error).toBe('test error');
      expect(history[0].timestamp).toBeGreaterThan(0);
    });

    it('should record multiple fallbacks for same rule', () => {
      const manager = new FallbackManager();

      manager.recordFallback('test-rule', new Error('error 1'));
      manager.recordFallback('test-rule', new Error('error 2'));
      manager.recordFallback('test-rule', new Error('error 3'));

      const history = manager.getFallbackHistory('test-rule');
      expect(history).toHaveLength(3);
      expect(history[0].error).toBe('error 1');
      expect(history[1].error).toBe('error 2');
      expect(history[2].error).toBe('error 3');
    });

    it('should record fallbacks for different rules independently', () => {
      const manager = new FallbackManager();

      manager.recordFallback('rule-1', new Error('error 1'));
      manager.recordFallback('rule-2', new Error('error 2'));

      expect(manager.getFallbackHistory('rule-1')).toHaveLength(1);
      expect(manager.getFallbackHistory('rule-2')).toHaveLength(1);
    });

    it('should limit history size to 100 entries', () => {
      const manager = new FallbackManager();

      // Record 150 fallbacks
      for (let i = 0; i < 150; i++) {
        manager.recordFallback('test-rule', new Error(`error ${i}`));
      }

      const history = manager.getFallbackHistory('test-rule');
      expect(history).toHaveLength(100);
      // Should keep the most recent 100
      expect(history[0].error).toBe('error 50');
      expect(history[99].error).toBe('error 149');
    });

    it('should record timestamp for each fallback', () => {
      const manager = new FallbackManager();

      const beforeTime = Date.now();
      manager.recordFallback('test-rule', new Error('test'));
      const afterTime = Date.now();

      const history = manager.getFallbackHistory('test-rule');
      expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(history[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle errors without messages', () => {
      const manager = new FallbackManager();
      manager.recordFallback('test-rule', new Error());

      const history = manager.getFallbackHistory('test-rule');
      expect(history[0].error).toBe('');
    });
  });

  describe('getFallbackHistory', () => {
    it('should return empty array for rule with no history', () => {
      const manager = new FallbackManager();
      expect(manager.getFallbackHistory('non-existent')).toEqual([]);
    });

    it('should return history for specific rule', () => {
      const manager = new FallbackManager();

      manager.recordFallback('test-rule', new Error('error 1'));
      manager.recordFallback('test-rule', new Error('error 2'));

      const history = manager.getFallbackHistory('test-rule');
      expect(history).toHaveLength(2);
      expect(history[0].error).toBe('error 1');
      expect(history[1].error).toBe('error 2');
    });

    it('should not affect other rules history', () => {
      const manager = new FallbackManager();

      manager.recordFallback('rule-1', new Error('error 1'));
      manager.recordFallback('rule-2', new Error('error 2'));

      expect(manager.getFallbackHistory('rule-1')).toHaveLength(1);
      expect(manager.getFallbackHistory('rule-2')).toHaveLength(1);
      expect(manager.getFallbackHistory('rule-3')).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should clear history for specific rule', () => {
      const manager = new FallbackManager();

      manager.recordFallback('rule-1', new Error('error 1'));
      manager.recordFallback('rule-2', new Error('error 2'));

      expect(manager.getFallbackHistory('rule-1')).toHaveLength(1);
      expect(manager.getFallbackHistory('rule-2')).toHaveLength(1);

      manager.clearHistory('rule-1');

      expect(manager.getFallbackHistory('rule-1')).toEqual([]);
      expect(manager.getFallbackHistory('rule-2')).toHaveLength(1);
    });

    it('should clear all history when no ruleId provided', () => {
      const manager = new FallbackManager();

      manager.recordFallback('rule-1', new Error('error 1'));
      manager.recordFallback('rule-2', new Error('error 2'));
      manager.recordFallback('rule-3', new Error('error 3'));

      expect(manager.fallbackHistory.size).toBe(3);

      manager.clearHistory();

      expect(manager.fallbackHistory.size).toBe(0);
      expect(manager.getFallbackHistory('rule-1')).toEqual([]);
      expect(manager.getFallbackHistory('rule-2')).toEqual([]);
      expect(manager.getFallbackHistory('rule-3')).toEqual([]);
    });

    it('should handle clearing non-existent rule', () => {
      const manager = new FallbackManager();
      expect(() => manager.clearHistory('non-existent')).not.toThrow();
    });

    it('should handle clearing already cleared history', () => {
      const manager = new FallbackManager();

      manager.recordFallback('test-rule', new Error('error'));
      manager.clearHistory('test-rule');
      manager.clearHistory('test-rule');

      expect(manager.getFallbackHistory('test-rule')).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return stats with no fallbacks', () => {
      const manager = new FallbackManager();

      const stats = manager.getStats();

      expect(stats).toEqual({
        enabled: true,
        totalRulesWithFallbacks: 0,
        fallbackRulesCount: 0,
        fallbackValuesCount: 0,
        totalFallbackUsage: 0,
      });
    });

    it('should count registered fallback rules', () => {
      const manager = new FallbackManager();

      manager.registerFallbackRule('rule-1', { eq: ['a', 'b'] });
      manager.registerFallbackRule('rule-2', { eq: ['c', 'd'] });

      const stats = manager.getStats();

      expect(stats.fallbackRulesCount).toBe(2);
      expect(stats.totalRulesWithFallbacks).toBe(2);
    });

    it('should count registered fallback values', () => {
      const manager = new FallbackManager();

      manager.registerFallbackValue('rule-1', 'value-1');
      manager.registerFallbackValue('rule-2', 'value-2');
      manager.registerFallbackValue('rule-3', 'value-3');

      const stats = manager.getStats();

      expect(stats.fallbackValuesCount).toBe(3);
      expect(stats.totalRulesWithFallbacks).toBe(3);
    });

    it('should count both rules and values', () => {
      const manager = new FallbackManager();

      manager.registerFallbackRule('rule-1', { eq: ['a', 'b'] });
      manager.registerFallbackValue('rule-2', 'value');
      manager.registerFallbackValue('rule-3', 'value');

      const stats = manager.getStats();

      expect(stats.fallbackRulesCount).toBe(1);
      expect(stats.fallbackValuesCount).toBe(2);
      expect(stats.totalRulesWithFallbacks).toBe(3);
    });

    it('should count total fallback usage', () => {
      const manager = new FallbackManager();

      manager.recordFallback('rule-1', new Error('error 1'));
      manager.recordFallback('rule-1', new Error('error 2'));
      manager.recordFallback('rule-2', new Error('error 3'));

      const stats = manager.getStats();

      expect(stats.totalFallbackUsage).toBe(3);
    });

    it('should reflect disabled state', () => {
      const manager = new FallbackManager({ enabled: false });

      const stats = manager.getStats();

      expect(stats.enabled).toBe(false);
    });

    it('should handle same rule with both fallback rule and value', () => {
      const manager = new FallbackManager();

      manager.registerFallbackRule('test-rule', { eq: ['a', 'b'] });
      manager.registerFallbackValue('test-rule', 'value');

      const stats = manager.getStats();

      // Same rule, so totalRulesWithFallbacks should be 2 (counted separately)
      expect(stats.totalRulesWithFallbacks).toBe(2);
      expect(stats.fallbackRulesCount).toBe(1);
      expect(stats.fallbackValuesCount).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all fallback rules', () => {
      const manager = new FallbackManager();

      manager.registerFallbackRule('rule-1', { eq: ['a', 'b'] });
      manager.registerFallbackRule('rule-2', { eq: ['c', 'd'] });

      expect(manager.fallbackRules.size).toBe(2);

      manager.clear();

      expect(manager.fallbackRules.size).toBe(0);
    });

    it('should clear all fallback values', () => {
      const manager = new FallbackManager();

      manager.registerFallbackValue('rule-1', 'value-1');
      manager.registerFallbackValue('rule-2', 'value-2');

      expect(manager.fallbackValues.size).toBe(2);

      manager.clear();

      expect(manager.fallbackValues.size).toBe(0);
    });

    it('should clear all fallback history', () => {
      const manager = new FallbackManager();

      manager.recordFallback('rule-1', new Error('error 1'));
      manager.recordFallback('rule-2', new Error('error 2'));

      expect(manager.fallbackHistory.size).toBe(2);

      manager.clear();

      expect(manager.fallbackHistory.size).toBe(0);
    });

    it('should clear everything at once', () => {
      const manager = new FallbackManager();

      manager.registerFallbackRule('rule-1', { eq: ['a', 'b'] });
      manager.registerFallbackValue('rule-2', 'value');
      manager.recordFallback('rule-3', new Error('error'));

      manager.clear();

      expect(manager.fallbackRules.size).toBe(0);
      expect(manager.fallbackValues.size).toBe(0);
      expect(manager.fallbackHistory.size).toBe(0);
    });

    it('should handle clearing empty manager', () => {
      const manager = new FallbackManager();
      expect(() => manager.clear()).not.toThrow();
    });

    it('should handle clearing multiple times', () => {
      const manager = new FallbackManager();

      manager.registerFallbackRule('rule-1', { eq: ['a', 'b'] });
      manager.clear();
      manager.clear();

      expect(manager.fallbackRules.size).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete fallback hierarchy', async () => {
      const onFallback = jest.fn();
      const manager = new FallbackManager({
        defaultValue: 'default',
        onFallback,
      });

      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);
      manager.registerFallbackValue('test-rule', 'specific-value');

      const fn = jest.fn().mockRejectedValue(new Error('primary failed'));
      const fallbackFn = jest.fn().mockResolvedValue({ fromRule: true });

      // Should use fallback rule (highest priority)
      const result = await manager.execute('test-rule', fn, fallbackFn);

      expect(result.fromRule).toBe(true);
      expect(onFallback).toHaveBeenCalledWith('test-rule', 'rule', expect.any(Object));
    });

    it('should fall through hierarchy when earlier fallbacks fail', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });

      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);
      manager.registerFallbackValue('test-rule', 'specific-value');

      const fn = jest.fn().mockRejectedValue(new Error('primary failed'));
      const fallbackFn = jest.fn().mockRejectedValue(new Error('fallback rule failed'));

      // Should fall through to fallback value
      const result = await manager.execute('test-rule', fn, fallbackFn);

      expect(result).toBe('specific-value');
    });

    it('should track history through multiple fallback attempts', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fn = jest.fn().mockRejectedValue(new Error('test error'));

      await manager.execute('rule-1', fn);
      await manager.execute('rule-1', fn);
      await manager.execute('rule-2', fn);

      const history1 = manager.getFallbackHistory('rule-1');
      const history2 = manager.getFallbackHistory('rule-2');

      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(1);

      const stats = manager.getStats();
      expect(stats.totalFallbackUsage).toBe(3);
    });

    it('should handle multiple rules with different fallback strategies', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });

      // Rule 1: Has fallback rule
      manager.registerFallbackRule('rule-1', { eq: ['a', 'b'] });

      // Rule 2: Has fallback value
      manager.registerFallbackValue('rule-2', 'value-2');

      // Rule 3: Uses default only

      const fn1 = jest.fn().mockRejectedValue(new Error('fail-1'));
      const fn2 = jest.fn().mockRejectedValue(new Error('fail-2'));
      const fn3 = jest.fn().mockRejectedValue(new Error('fail-3'));

      const fallbackFn1 = jest.fn().mockResolvedValue({ fromRule1: true });

      const result1 = await manager.execute('rule-1', fn1, fallbackFn1);
      const result2 = await manager.execute('rule-2', fn2);
      const result3 = await manager.execute('rule-3', fn3);

      expect(result1.fromRule1).toBe(true);
      expect(result2).toBe('value-2');
      expect(result3).toBe('default');
    });

    it('should work with async fallback functions', async () => {
      const manager = new FallbackManager();
      const fallbackRule = { eq: ['status', 'fallback'] };
      manager.registerFallbackRule('test-rule', fallbackRule);

      const fn = jest.fn().mockRejectedValue(new Error('failed'));
      const fallbackFn = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { asyncResult: true };
      });

      const result = await manager.execute('test-rule', fn, fallbackFn);

      expect(result.asyncResult).toBe(true);
      expect(result.isFallback).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null ruleId', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      const result = await manager.execute(null, fn);

      expect(result).toBe('default');
    });

    it('should handle empty string ruleId', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      const result = await manager.execute('', fn);

      expect(result).toBe('default');
    });

    it('should handle complex object as defaultValue', async () => {
      const defaultValue = {
        success: false,
        error: 'default error',
        metadata: { source: 'fallback' },
      };
      const manager = new FallbackManager({ defaultValue });

      const fn = jest.fn().mockRejectedValue(new Error('failed'));
      const result = await manager.execute('test-rule', fn);

      expect(result).toEqual(defaultValue);
    });

    it('should handle array as fallback value', async () => {
      const manager = new FallbackManager();
      const fallbackArray = [1, 2, 3, 4, 5];
      manager.registerFallbackValue('test-rule', fallbackArray);

      const fn = jest.fn().mockRejectedValue(new Error('failed'));
      const result = await manager.execute('test-rule', fn);

      expect(result).toEqual(fallbackArray);
    });

    it('should handle function as fallback value', async () => {
      const manager = new FallbackManager();
      const fallbackFunc = () => 'function result';
      manager.registerFallbackValue('test-rule', fallbackFunc);

      const fn = jest.fn().mockRejectedValue(new Error('failed'));
      const result = await manager.execute('test-rule', fn);

      expect(result).toBe(fallbackFunc);
    });

    it('should handle very long error messages', async () => {
      const manager = new FallbackManager();
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);

      manager.recordFallback('test-rule', error);

      const history = manager.getFallbackHistory('test-rule');
      expect(history[0].error.length).toBe(10000);
    });

    it('should handle rapid fallback executions', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fn = jest.fn().mockRejectedValue(new Error('failed'));

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(manager.execute(`rule-${i}`, fn));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(results.every((r) => r === 'default')).toBe(true);
    });

    it('should handle fallback with promise rejection reason that is not an Error', async () => {
      const manager = new FallbackManager({ defaultValue: 'default' });
      const fn = jest.fn().mockRejectedValue('string rejection');

      const result = await manager.execute('test-rule', fn);

      expect(result).toBe('default');
    });
  });

  describe('memory management', () => {
    it('should not leak memory with many registrations', () => {
      const manager = new FallbackManager();

      for (let i = 0; i < 10000; i++) {
        manager.registerFallbackRule(`rule-${i}`, { eq: ['a', 'b'] });
        manager.registerFallbackValue(`value-${i}`, `value-${i}`);
      }

      expect(manager.fallbackRules.size).toBe(10000);
      expect(manager.fallbackValues.size).toBe(10000);

      manager.clear();

      expect(manager.fallbackRules.size).toBe(0);
      expect(manager.fallbackValues.size).toBe(0);
    });

    it('should limit history size to prevent memory bloat', () => {
      const manager = new FallbackManager();

      // Add 1000 fallback records
      for (let i = 0; i < 1000; i++) {
        manager.recordFallback('test-rule', new Error(`error ${i}`));
      }

      const history = manager.getFallbackHistory('test-rule');

      // Should only keep 100 most recent
      expect(history.length).toBe(100);
    });
  });
});
