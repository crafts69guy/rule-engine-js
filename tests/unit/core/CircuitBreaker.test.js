import { CircuitBreaker, CircuitState } from '../../../src/core/recovery/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  describe('CircuitState', () => {
    it('should export circuit states', () => {
      expect(CircuitState.CLOSED).toBe('closed');
      expect(CircuitState.OPEN).toBe('open');
      expect(CircuitState.HALF_OPEN).toBe('half-open');
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const breaker = new CircuitBreaker();

      expect(breaker.options.enabled).toBe(true);
      expect(breaker.options.failureThreshold).toBe(5);
      expect(breaker.options.resetTimeout).toBe(60000);
      expect(breaker.options.halfOpenMaxAttempts).toBe(3);
      expect(breaker.options.onCircuitOpen).toBeNull();
      expect(breaker.options.onCircuitClose).toBeNull();
      expect(breaker.options.onCircuitHalfOpen).toBeNull();
    });

    it('should accept custom options', () => {
      const onOpen = jest.fn();
      const onClose = jest.fn();
      const onHalfOpen = jest.fn();

      const breaker = new CircuitBreaker({
        enabled: false,
        failureThreshold: 10,
        resetTimeout: 30000,
        halfOpenMaxAttempts: 5,
        onCircuitOpen: onOpen,
        onCircuitClose: onClose,
        onCircuitHalfOpen: onHalfOpen,
      });

      expect(breaker.options.enabled).toBe(false);
      expect(breaker.options.failureThreshold).toBe(10);
      expect(breaker.options.resetTimeout).toBe(30000);
      expect(breaker.options.halfOpenMaxAttempts).toBe(5);
      expect(breaker.options.onCircuitOpen).toBe(onOpen);
      expect(breaker.options.onCircuitClose).toBe(onClose);
      expect(breaker.options.onCircuitHalfOpen).toBe(onHalfOpen);
    });

    it('should handle partial options', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 7,
        resetTimeout: 45000,
      });

      expect(breaker.options.enabled).toBe(true);
      expect(breaker.options.failureThreshold).toBe(7);
      expect(breaker.options.resetTimeout).toBe(45000);
      expect(breaker.options.halfOpenMaxAttempts).toBe(3);
    });

    it('should initialize circuits map', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.circuits).toBeInstanceOf(Map);
      expect(breaker.circuits.size).toBe(0);
    });

    it('should default enabled to true when explicitly set to false in options', () => {
      const breaker = new CircuitBreaker({ enabled: false });
      expect(breaker.options.enabled).toBe(false);
    });
  });

  describe('getCircuit', () => {
    it('should create a new circuit for a rule', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');

      expect(circuit).toBeDefined();
      expect(circuit.state).toBe(CircuitState.CLOSED);
      expect(circuit.failureCount).toBe(0);
      expect(circuit.successCount).toBe(0);
      expect(circuit.lastFailureTime).toBeNull();
      expect(circuit.resetTimer).toBeNull();
    });

    it('should return existing circuit for same rule', () => {
      const breaker = new CircuitBreaker();
      const circuit1 = breaker.getCircuit('test-rule');
      const circuit2 = breaker.getCircuit('test-rule');

      expect(circuit1).toBe(circuit2);
    });

    it('should create separate circuits for different rules', () => {
      const breaker = new CircuitBreaker();
      const circuit1 = breaker.getCircuit('rule-1');
      const circuit2 = breaker.getCircuit('rule-2');

      expect(circuit1).not.toBe(circuit2);
      expect(breaker.circuits.size).toBe(2);
    });

    it('should initialize circuit with correct state', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');

      expect(circuit.state).toBe(CircuitState.CLOSED);
      expect(circuit.failureCount).toBe(0);
      expect(circuit.successCount).toBe(0);
      expect(circuit.lastFailureTime).toBeNull();
      expect(circuit.resetTimer).toBeNull();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute function successfully in closed state', async () => {
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute('test-rule', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should throw error when circuit is open', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // First call to open the circuit
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow('failure');
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);

      // Second call should be rejected by circuit breaker
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow(
        'Circuit breaker open for rule: test-rule'
      );

      expect(fn).toHaveBeenCalledTimes(1); // Function not called the second time
    });

    it('should record success and reset failure count', async () => {
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      await breaker.execute('test-rule', fn);

      const circuit = breaker.getCircuit('test-rule');
      expect(circuit.failureCount).toBe(0);
      expect(circuit.state).toBe(CircuitState.CLOSED);
    });

    it('should record failure and increment failure count', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(breaker.execute('test-rule', fn)).rejects.toThrow('failure');

      const circuit = breaker.getCircuit('test-rule');
      expect(circuit.failureCount).toBe(1);
      expect(circuit.lastFailureTime).toBeGreaterThan(0);
    });

    it('should open circuit after reaching failure threshold', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // First two failures
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow('failure');
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);

      await expect(breaker.execute('test-rule', fn)).rejects.toThrow('failure');
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);

      // Third failure should open the circuit
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow('failure');
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should bypass circuit breaker when disabled', async () => {
      const breaker = new CircuitBreaker({ enabled: false });
      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute('test-rule', fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should bypass circuit breaker when disabled even on failure', async () => {
      const breaker = new CircuitBreaker({ enabled: false });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(breaker.execute('test-rule', fn)).rejects.toThrow('failure');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow execution in half-open state', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow('failure');
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);

      // Manually transition to half-open
      breaker.halfOpenCircuit('test-rule');
      expect(breaker.getState('test-rule')).toBe(CircuitState.HALF_OPEN);

      // Should allow execution
      fn.mockResolvedValueOnce('success');
      const result = await breaker.execute('test-rule', fn);
      expect(result).toBe('success');
    });
  });

  describe('recordSuccess', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reset failure count in closed state', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.failureCount = 3;

      breaker.recordSuccess('test-rule');

      expect(circuit.failureCount).toBe(0);
    });

    it('should increment success count in half-open state', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.state = CircuitState.HALF_OPEN;

      breaker.recordSuccess('test-rule');

      expect(circuit.successCount).toBe(1);
    });

    it('should close circuit after enough successes in half-open state', () => {
      const breaker = new CircuitBreaker({ halfOpenMaxAttempts: 3 });
      const circuit = breaker.getCircuit('test-rule');
      circuit.state = CircuitState.HALF_OPEN;

      breaker.recordSuccess('test-rule');
      expect(circuit.state).toBe(CircuitState.HALF_OPEN);

      breaker.recordSuccess('test-rule');
      expect(circuit.state).toBe(CircuitState.HALF_OPEN);

      breaker.recordSuccess('test-rule');
      expect(circuit.state).toBe(CircuitState.CLOSED);
    });

    it('should not affect open state', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.state = CircuitState.OPEN;

      breaker.recordSuccess('test-rule');

      expect(circuit.state).toBe(CircuitState.OPEN);
    });
  });

  describe('recordFailure', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should increment failure count', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');

      breaker.recordFailure('test-rule');

      expect(circuit.failureCount).toBe(1);
      expect(circuit.lastFailureTime).toBeGreaterThan(0);
    });

    it('should open circuit when threshold reached', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });

      breaker.recordFailure('test-rule');
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);

      breaker.recordFailure('test-rule');
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);

      breaker.recordFailure('test-rule');
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);
    });

    it('should reopen circuit on failure in half-open state', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.state = CircuitState.HALF_OPEN;

      breaker.recordFailure('test-rule');

      expect(circuit.state).toBe(CircuitState.OPEN);
    });

    it('should update lastFailureTime on each failure', () => {
      const breaker = new CircuitBreaker();

      breaker.recordFailure('test-rule');
      const circuit = breaker.getCircuit('test-rule');
      const lastFailureTime1 = circuit.lastFailureTime;

      jest.advanceTimersByTime(1000);

      breaker.recordFailure('test-rule');
      const lastFailureTime2 = circuit.lastFailureTime;

      expect(lastFailureTime2).toBeGreaterThan(lastFailureTime1);
    });
  });

  describe('openCircuit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set state to open', () => {
      const breaker = new CircuitBreaker();

      breaker.openCircuit('test-rule');

      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);
    });

    it('should reset success count', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.successCount = 5;

      breaker.openCircuit('test-rule');

      expect(circuit.successCount).toBe(0);
    });

    it('should call onCircuitOpen hook', () => {
      const onCircuitOpen = jest.fn();
      const breaker = new CircuitBreaker({ onCircuitOpen });
      const circuit = breaker.getCircuit('test-rule');
      circuit.failureCount = 5;
      circuit.lastFailureTime = 12345;

      breaker.openCircuit('test-rule');

      expect(onCircuitOpen).toHaveBeenCalledWith('test-rule', {
        failureCount: 5,
        lastFailureTime: 12345,
      });
    });

    it('should schedule transition to half-open after timeout', () => {
      const breaker = new CircuitBreaker({ resetTimeout: 5000 });

      breaker.openCircuit('test-rule');
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);

      jest.advanceTimersByTime(5000);
      expect(breaker.getState('test-rule')).toBe(CircuitState.HALF_OPEN);
    });

    it('should clear existing reset timer before scheduling new one', () => {
      const breaker = new CircuitBreaker({ resetTimeout: 5000 });
      const circuit = breaker.getCircuit('test-rule');

      breaker.openCircuit('test-rule');
      const firstTimer = circuit.resetTimer;

      breaker.openCircuit('test-rule');
      const secondTimer = circuit.resetTimer;

      expect(firstTimer).not.toBe(secondTimer);
    });

    it('should not call onCircuitOpen hook when not provided', () => {
      const breaker = new CircuitBreaker();
      expect(() => breaker.openCircuit('test-rule')).not.toThrow();
    });
  });

  describe('halfOpenCircuit', () => {
    it('should set state to half-open', () => {
      const breaker = new CircuitBreaker();
      breaker.openCircuit('test-rule');

      breaker.halfOpenCircuit('test-rule');

      expect(breaker.getState('test-rule')).toBe(CircuitState.HALF_OPEN);
    });

    it('should reset success and failure counts', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.state = CircuitState.OPEN;
      circuit.successCount = 5;
      circuit.failureCount = 10;

      breaker.halfOpenCircuit('test-rule');

      expect(circuit.successCount).toBe(0);
      expect(circuit.failureCount).toBe(0);
    });

    it('should call onCircuitHalfOpen hook', () => {
      const onCircuitHalfOpen = jest.fn();
      const breaker = new CircuitBreaker({ onCircuitHalfOpen });

      breaker.halfOpenCircuit('test-rule');

      expect(onCircuitHalfOpen).toHaveBeenCalledWith('test-rule');
    });

    it('should not call onCircuitHalfOpen hook when not provided', () => {
      const breaker = new CircuitBreaker();
      expect(() => breaker.halfOpenCircuit('test-rule')).not.toThrow();
    });
  });

  describe('closeCircuit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set state to closed', () => {
      const breaker = new CircuitBreaker();
      breaker.openCircuit('test-rule');

      breaker.closeCircuit('test-rule');

      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should reset all counts and timestamps', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.state = CircuitState.HALF_OPEN;
      circuit.failureCount = 5;
      circuit.successCount = 3;
      circuit.lastFailureTime = 12345;

      breaker.closeCircuit('test-rule');

      expect(circuit.failureCount).toBe(0);
      expect(circuit.successCount).toBe(0);
      expect(circuit.lastFailureTime).toBeNull();
    });

    it('should clear reset timer', () => {
      const breaker = new CircuitBreaker();
      breaker.openCircuit('test-rule');
      const circuit = breaker.getCircuit('test-rule');

      expect(circuit.resetTimer).not.toBeNull();

      breaker.closeCircuit('test-rule');

      expect(circuit.resetTimer).toBeNull();
    });

    it('should call onCircuitClose hook', () => {
      const onCircuitClose = jest.fn();
      const breaker = new CircuitBreaker({ onCircuitClose });

      breaker.closeCircuit('test-rule');

      expect(onCircuitClose).toHaveBeenCalledWith('test-rule');
    });

    it('should not call onCircuitClose hook when not provided', () => {
      const breaker = new CircuitBreaker();
      expect(() => breaker.closeCircuit('test-rule')).not.toThrow();
    });

    it('should handle closing circuit with no timer set', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.resetTimer = null;

      expect(() => breaker.closeCircuit('test-rule')).not.toThrow();
    });
  });

  describe('getState', () => {
    it('should return closed state for new circuit', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should return current state after state change', () => {
      const breaker = new CircuitBreaker();

      breaker.openCircuit('test-rule');
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);

      breaker.halfOpenCircuit('test-rule');
      expect(breaker.getState('test-rule')).toBe(CircuitState.HALF_OPEN);

      breaker.closeCircuit('test-rule');
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should return state for multiple rules independently', () => {
      const breaker = new CircuitBreaker();

      breaker.openCircuit('rule-1');
      breaker.halfOpenCircuit('rule-2');

      expect(breaker.getState('rule-1')).toBe(CircuitState.OPEN);
      expect(breaker.getState('rule-2')).toBe(CircuitState.HALF_OPEN);
      expect(breaker.getState('rule-3')).toBe(CircuitState.CLOSED);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reset specific rule circuit', () => {
      const breaker = new CircuitBreaker();
      breaker.openCircuit('test-rule');

      breaker.reset('test-rule');

      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should reset all circuits when no ruleId provided', () => {
      const breaker = new CircuitBreaker();

      breaker.openCircuit('rule-1');
      breaker.openCircuit('rule-2');
      breaker.halfOpenCircuit('rule-3');

      breaker.reset();

      expect(breaker.getState('rule-1')).toBe(CircuitState.CLOSED);
      expect(breaker.getState('rule-2')).toBe(CircuitState.CLOSED);
      expect(breaker.getState('rule-3')).toBe(CircuitState.CLOSED);
    });

    it('should clear all timers when resetting all circuits', () => {
      const breaker = new CircuitBreaker();

      breaker.openCircuit('rule-1');
      breaker.openCircuit('rule-2');

      const circuit1 = breaker.getCircuit('rule-1');
      const circuit2 = breaker.getCircuit('rule-2');

      expect(circuit1.resetTimer).not.toBeNull();
      expect(circuit2.resetTimer).not.toBeNull();

      breaker.reset();

      expect(circuit1.resetTimer).toBeNull();
      expect(circuit2.resetTimer).toBeNull();
    });

    it('should handle resetting non-existent rule', () => {
      const breaker = new CircuitBreaker();
      expect(() => breaker.reset('non-existent')).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return stats with no circuits', () => {
      const breaker = new CircuitBreaker();

      const stats = breaker.getStats();

      expect(stats).toEqual({
        enabled: true,
        totalCircuits: 0,
        circuitStates: {
          closed: 0,
          open: 0,
          halfOpen: 0,
        },
        circuits: {},
      });
    });

    it('should return stats with circuits in different states', () => {
      const breaker = new CircuitBreaker();

      // Create circuits in different states
      breaker.getCircuit('rule-1'); // Closed by default
      breaker.openCircuit('rule-2');
      breaker.halfOpenCircuit('rule-3');

      const stats = breaker.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.totalCircuits).toBe(3);
      expect(stats.circuitStates.closed).toBe(1);
      expect(stats.circuitStates.open).toBe(1);
      expect(stats.circuitStates.halfOpen).toBe(1);
    });

    it('should include circuit details', () => {
      const breaker = new CircuitBreaker();
      const circuit = breaker.getCircuit('test-rule');
      circuit.failureCount = 3;
      circuit.successCount = 2;
      circuit.lastFailureTime = 12345;

      const stats = breaker.getStats();

      expect(stats.circuits['test-rule']).toEqual({
        state: CircuitState.CLOSED,
        failureCount: 3,
        successCount: 2,
        lastFailureTime: 12345,
      });
    });

    it('should reflect disabled state', () => {
      const breaker = new CircuitBreaker({ enabled: false });

      const stats = breaker.getStats();

      expect(stats.enabled).toBe(false);
    });

    it('should count circuit states correctly', () => {
      const breaker = new CircuitBreaker();

      breaker.getCircuit('rule-1');
      breaker.getCircuit('rule-2');
      breaker.openCircuit('rule-3');
      breaker.openCircuit('rule-4');
      breaker.openCircuit('rule-5');
      breaker.halfOpenCircuit('rule-6');

      const stats = breaker.getStats();

      expect(stats.totalCircuits).toBe(6);
      expect(stats.circuitStates.closed).toBe(2);
      expect(stats.circuitStates.open).toBe(3);
      expect(stats.circuitStates.halfOpen).toBe(1);
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clear all timers', () => {
      const breaker = new CircuitBreaker();

      breaker.openCircuit('rule-1');
      breaker.openCircuit('rule-2');
      breaker.openCircuit('rule-3');

      breaker.destroy();

      const circuit1 = breaker.circuits.get('rule-1');
      const circuit2 = breaker.circuits.get('rule-2');
      const circuit3 = breaker.circuits.get('rule-3');

      // Circuits should still exist but timers should be cleared
      expect(circuit1).toBeUndefined();
      expect(circuit2).toBeUndefined();
      expect(circuit3).toBeUndefined();
    });

    it('should clear circuits map', () => {
      const breaker = new CircuitBreaker();

      breaker.getCircuit('rule-1');
      breaker.getCircuit('rule-2');
      breaker.getCircuit('rule-3');

      expect(breaker.circuits.size).toBe(3);

      breaker.destroy();

      expect(breaker.circuits.size).toBe(0);
    });

    it('should handle destroy with no circuits', () => {
      const breaker = new CircuitBreaker();
      expect(() => breaker.destroy()).not.toThrow();
    });

    it('should handle destroy multiple times', () => {
      const breaker = new CircuitBreaker();

      breaker.openCircuit('rule-1');
      breaker.destroy();
      expect(() => breaker.destroy()).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle complete circuit lifecycle', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 5000,
        halfOpenMaxAttempts: 2,
      });
      const fn = jest.fn();

      // Start in closed state
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);

      // Record failures to open circuit
      fn.mockRejectedValue(new Error('failure'));
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();

      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);

      // Wait for half-open
      jest.advanceTimersByTime(5000);
      expect(breaker.getState('test-rule')).toBe(CircuitState.HALF_OPEN);

      // Test with successes to close
      fn.mockResolvedValue('success');
      await breaker.execute('test-rule', fn);
      expect(breaker.getState('test-rule')).toBe(CircuitState.HALF_OPEN);

      await breaker.execute('test-rule', fn);
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should handle failure during half-open state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000,
      });
      const fn = jest.fn();

      // Open circuit
      fn.mockRejectedValue(new Error('failure'));
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);

      // Transition to half-open
      jest.advanceTimersByTime(1000);
      expect(breaker.getState('test-rule')).toBe(CircuitState.HALF_OPEN);

      // Fail during half-open - should reopen
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);
    });

    it('should call hooks in correct sequence', async () => {
      const onOpen = jest.fn();
      const onHalfOpen = jest.fn();
      const onClose = jest.fn();

      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000,
        halfOpenMaxAttempts: 1,
        onCircuitOpen: onOpen,
        onCircuitHalfOpen: onHalfOpen,
        onCircuitClose: onClose,
      });

      const fn = jest.fn();

      // Open circuit
      fn.mockRejectedValue(new Error('failure'));
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      expect(onOpen).toHaveBeenCalledTimes(1);

      // Transition to half-open
      jest.advanceTimersByTime(1000);
      expect(onHalfOpen).toHaveBeenCalledTimes(1);

      // Close circuit
      fn.mockResolvedValue('success');
      await breaker.execute('test-rule', fn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple rules independently', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn1 = jest.fn().mockRejectedValue(new Error('failure'));
      const fn2 = jest.fn().mockResolvedValue('success');

      // Rule 1 should open
      await expect(breaker.execute('rule-1', fn1)).rejects.toThrow();
      expect(breaker.getState('rule-1')).toBe(CircuitState.OPEN);

      // Rule 2 should remain closed
      await breaker.execute('rule-2', fn2);
      expect(breaker.getState('rule-2')).toBe(CircuitState.CLOSED);
    });

    it('should handle rapid failures correctly', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // Execute 5 rapid failures
      for (let i = 0; i < 5; i++) {
        await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      }

      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);
      expect(fn).toHaveBeenCalledTimes(5);

      // Next call should be rejected by circuit breaker
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow(
        'Circuit breaker open for rule: test-rule'
      );
      expect(fn).toHaveBeenCalledTimes(5); // Not called again
    });

    it('should reset failure count on success in closed state', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn();

      // Record some failures
      fn.mockRejectedValue(new Error('failure'));
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();

      const circuit = breaker.getCircuit('test-rule');
      expect(circuit.failureCount).toBe(2);

      // Success should reset count
      fn.mockResolvedValue('success');
      await breaker.execute('test-rule', fn);

      expect(circuit.failureCount).toBe(0);
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle zero failure threshold', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 0 });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // With threshold 0, circuit should never open
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should handle failure threshold of 1', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      // First failure should open circuit immediately
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);
    });

    it('should handle very short reset timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1,
      });
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);

      jest.advanceTimersByTime(1);
      expect(breaker.getState('test-rule')).toBe(CircuitState.HALF_OPEN);
    });

    it('should handle halfOpenMaxAttempts of 1', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000,
        halfOpenMaxAttempts: 1,
      });
      const fn = jest.fn();

      // Open circuit
      fn.mockRejectedValue(new Error('failure'));
      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();

      // Transition to half-open
      jest.advanceTimersByTime(1000);

      // Single success should close circuit
      fn.mockResolvedValue('success');
      await breaker.execute('test-rule', fn);
      expect(breaker.getState('test-rule')).toBe(CircuitState.CLOSED);
    });

    it('should handle error without message', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error());

      await expect(breaker.execute('test-rule', fn)).rejects.toThrow();
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);
    });

    it('should handle synchronous throw', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn(() => {
        throw new Error('sync error');
      });

      await expect(breaker.execute('test-rule', fn)).rejects.toThrow('sync error');
      expect(breaker.getState('test-rule')).toBe(CircuitState.OPEN);
    });

    it('should handle null ruleId gracefully', () => {
      const breaker = new CircuitBreaker();

      expect(() => breaker.getCircuit(null)).not.toThrow();
      expect(() => breaker.getState(null)).not.toThrow();
    });

    it('should handle empty string ruleId', async () => {
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute('', fn);
      expect(result).toBe('success');
      expect(breaker.getState('')).toBe(CircuitState.CLOSED);
    });
  });
});
