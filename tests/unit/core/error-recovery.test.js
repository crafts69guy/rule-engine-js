const { createRuleEngine, StatefulRuleEngine } = require('../../../src/index.js');

describe('Phase 3.3: Error Recovery', () => {
  let baseEngine;

  beforeEach(() => {
    baseEngine = createRuleEngine();
  });

  describe('Retry Mechanisms', () => {
    it.skip('should retry failed evaluations with exponential backoff', async () => {
      let attempts = 0;
      const customEngine = createRuleEngine();

      // Mock a failing operator that succeeds on 3rd attempt
      customEngine.registerOperator('flaky', async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return true;
      });

      const engine = new StatefulRuleEngine(customEngine, {
        errorRecovery: {
          retry: {
            enabled: true,
            maxAttempts: 3,
            strategy: 'exponential',
            initialDelay: 10,
          },
        },
      });

      const rule = { flaky: [] };
      const result = await engine.evaluate('test-rule', rule, {});

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should use different retry strategies', async () => {
      const fixed = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          retry: {
            strategy: 'fixed',
          },
        },
      });

      const linear = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          retry: {
            strategy: 'linear',
          },
        },
      });

      expect(fixed.getErrorRecoveryStats().retry.strategy).toBe('fixed');
      expect(linear.getErrorRecoveryStats().retry.strategy).toBe('linear');
    });
  });

  describe('Circuit Breaker', () => {
    it('should get circuit breaker state', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          circuitBreaker: {
            enabled: true,
            failureThreshold: 5,
          },
        },
      });

      const stats = engine.getErrorRecoveryStats();

      expect(stats.circuitBreaker.enabled).toBe(true);
      expect(stats.circuitBreaker.totalCircuits).toBeGreaterThanOrEqual(0);
    });

    it('should manually reset circuit', () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          circuitBreaker: {
            enabled: true,
          },
        },
      });

      engine.resetCircuit('test-rule');
      expect(engine.getCircuitState('test-rule')).toBe('closed');
    });
  });

  describe('Fallback Strategies', () => {
    it('should register fallback rule', () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          fallback: {
            enabled: true,
          },
        },
      });

      const fallbackRule = { eq: ['status', 'active'] };
      engine.registerFallbackRule('test-rule', fallbackRule);

      const stats = engine.getErrorRecoveryStats();
      expect(stats.fallback.fallbackRulesCount).toBe(1);
    });

    it('should register fallback value', () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          fallback: {
            enabled: true,
          },
        },
      });

      engine.registerFallbackValue('test-rule', { fallback: true });

      const stats = engine.getErrorRecoveryStats();
      expect(stats.fallback.fallbackValuesCount).toBe(1);
    });
  });

  describe('Error Tracking', () => {
    it('should get error history', () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          enabled: true,
        },
      });

      const errorHistory = engine.getErrorHistory('test-rule');
      expect(Array.isArray(errorHistory)).toBe(true);
    });

    it('should get error rate', () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          enabled: true,
        },
      });

      const errorRate = engine.getErrorRate('test-rule');
      expect(errorRate).toBeNull(); // No evaluations yet
    });
  });

  describe('Integration', () => {
    it('should cleanup on destroy', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          circuitBreaker: {
            enabled: true,
          },
        },
      });

      await engine.destroy();

      // Should not throw
      expect(() => engine.getErrorRecoveryStats()).not.toThrow();
    });

    it('should work when error recovery is disabled', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          enabled: false,
        },
      });

      const rule = { eq: ['status', 'active'] };
      const result = await engine.evaluate('test-rule', rule, { status: 'active' });

      expect(result.success).toBe(true);
    });

    it('should have comprehensive statistics', () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        errorRecovery: {
          retry: {
            enabled: true,
            maxAttempts: 5,
          },
          circuitBreaker: {
            enabled: true,
            failureThreshold: 3,
          },
          fallback: {
            enabled: true,
          },
        },
      });

      const stats = engine.getErrorRecoveryStats();

      expect(stats.enabled).toBeDefined();
      expect(stats.retry).toBeDefined();
      expect(stats.circuitBreaker).toBeDefined();
      expect(stats.fallback).toBeDefined();
      expect(stats.errorTracking).toBeDefined();
    });
  });
});
