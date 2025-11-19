/**
 * Circuit breaker states
 */
export const CircuitState = {
  CLOSED: 'closed', // Normal operation
  OPEN: 'open', // Failing, reject requests
  HALF_OPEN: 'half-open', // Testing if service recovered
};

/**
 * Circuit breaker implementation to prevent cascading failures
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      halfOpenMaxAttempts: options.halfOpenMaxAttempts || 3,
      onCircuitOpen: options.onCircuitOpen || null,
      onCircuitClose: options.onCircuitClose || null,
      onCircuitHalfOpen: options.onCircuitHalfOpen || null,
    };

    this.circuits = new Map(); // Per-rule circuit breakers
  }

  /**
   * Get or create circuit for a rule
   * @param {string} ruleId
   * @returns {Object}
   */
  getCircuit(ruleId) {
    if (!this.circuits.has(ruleId)) {
      this.circuits.set(ruleId, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        resetTimer: null,
      });
    }
    return this.circuits.get(ruleId);
  }

  /**
   * Execute function with circuit breaker protection
   * @param {string} ruleId
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>}
   */
  async execute(ruleId, fn) {
    if (!this.options.enabled) {
      return await fn();
    }

    const circuit = this.getCircuit(ruleId);

    // Check if circuit is open
    if (circuit.state === CircuitState.OPEN) {
      throw new Error(`Circuit breaker open for rule: ${ruleId}`);
    }

    try {
      const result = await fn();

      // Success
      this.recordSuccess(ruleId);

      return result;
    } catch (error) {
      // Failure
      this.recordFailure(ruleId);

      throw error;
    }
  }

  /**
   * Record successful execution
   * @param {string} ruleId
   */
  recordSuccess(ruleId) {
    const circuit = this.getCircuit(ruleId);

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCount++;

      // If enough successes in half-open state, close the circuit
      if (circuit.successCount >= this.options.halfOpenMaxAttempts) {
        this.closeCircuit(ruleId);
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // Reset failure count on success
      circuit.failureCount = 0;
    }
  }

  /**
   * Record failed execution
   * @param {string} ruleId
   */
  recordFailure(ruleId) {
    const circuit = this.getCircuit(ruleId);
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    if (circuit.state === CircuitState.HALF_OPEN) {
      // Failed during half-open, reopen circuit
      this.openCircuit(ruleId);
    } else if (
      circuit.state === CircuitState.CLOSED &&
      circuit.failureCount >= this.options.failureThreshold
    ) {
      // Threshold reached, open circuit
      this.openCircuit(ruleId);
    }
  }

  /**
   * Open circuit (start rejecting requests)
   * @param {string} ruleId
   */
  openCircuit(ruleId) {
    const circuit = this.getCircuit(ruleId);
    circuit.state = CircuitState.OPEN;
    circuit.successCount = 0;

    // Call hook
    if (this.options.onCircuitOpen) {
      this.options.onCircuitOpen(ruleId, {
        failureCount: circuit.failureCount,
        lastFailureTime: circuit.lastFailureTime,
      });
    }

    // Schedule reset to half-open after timeout
    if (circuit.resetTimer) {
      clearTimeout(circuit.resetTimer);
    }

    circuit.resetTimer = setTimeout(() => {
      this.halfOpenCircuit(ruleId);
    }, this.options.resetTimeout);
  }

  /**
   * Transition to half-open state (test if recovered)
   * @param {string} ruleId
   */
  halfOpenCircuit(ruleId) {
    const circuit = this.getCircuit(ruleId);
    circuit.state = CircuitState.HALF_OPEN;
    circuit.successCount = 0;
    circuit.failureCount = 0;

    // Call hook
    if (this.options.onCircuitHalfOpen) {
      this.options.onCircuitHalfOpen(ruleId);
    }
  }

  /**
   * Close circuit (resume normal operation)
   * @param {string} ruleId
   */
  closeCircuit(ruleId) {
    const circuit = this.getCircuit(ruleId);
    circuit.state = CircuitState.CLOSED;
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.lastFailureTime = null;

    if (circuit.resetTimer) {
      clearTimeout(circuit.resetTimer);
      circuit.resetTimer = null;
    }

    // Call hook
    if (this.options.onCircuitClose) {
      this.options.onCircuitClose(ruleId);
    }
  }

  /**
   * Get circuit state for a rule
   * @param {string} ruleId
   * @returns {string}
   */
  getState(ruleId) {
    const circuit = this.getCircuit(ruleId);
    return circuit.state;
  }

  /**
   * Manually reset circuit to closed state
   * @param {string} ruleId
   */
  reset(ruleId) {
    if (ruleId) {
      this.closeCircuit(ruleId);
    } else {
      // Reset all circuits
      for (const id of this.circuits.keys()) {
        this.closeCircuit(id);
      }
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const stats = {
      enabled: this.options.enabled,
      totalCircuits: this.circuits.size,
      circuitStates: {
        closed: 0,
        open: 0,
        halfOpen: 0,
      },
      circuits: {},
    };

    for (const [ruleId, circuit] of this.circuits.entries()) {
      stats.circuitStates[circuit.state]++;
      stats.circuits[ruleId] = {
        state: circuit.state,
        failureCount: circuit.failureCount,
        successCount: circuit.successCount,
        lastFailureTime: circuit.lastFailureTime,
      };
    }

    return stats;
  }

  /**
   * Cleanup timers
   */
  destroy() {
    for (const circuit of this.circuits.values()) {
      if (circuit.resetTimer) {
        clearTimeout(circuit.resetTimer);
      }
    }
    this.circuits.clear();
  }
}
