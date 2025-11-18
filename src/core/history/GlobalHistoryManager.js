/**
 * ============================================================================
 * GLOBAL HISTORY MANAGER
 * Manages history with a global FIFO queue (legacy mode)
 * ============================================================================
 */
export class GlobalHistoryManager {
  constructor(maxSize = 100) {
    this.history = [];
    this.maxSize = maxSize;
  }

  /**
   * Add event to global history
   */
  add(eventData) {
    this.history.push(eventData);
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
  }

  /**
   * Get history for a specific rule
   */
  get(ruleId) {
    return this.history.filter((h) => h.ruleId === ruleId);
  }

  /**
   * Get all history
   */
  getAll() {
    return [...this.history];
  }

  /**
   * Get history statistics
   */
  getStats() {
    const ruleCount = new Map();
    for (const event of this.history) {
      ruleCount.set(event.ruleId, (ruleCount.get(event.ruleId) || 0) + 1);
    }

    return {
      mode: 'global',
      totalRules: ruleCount.size,
      totalEvents: this.history.length,
      maxSize: this.maxSize,
      perRule: Object.fromEntries(ruleCount),
    };
  }

  /**
   * Get total event count
   */
  size() {
    return this.history.length;
  }

  /**
   * Clear history for specific rule
   */
  clearRule(ruleId) {
    this.history = this.history.filter((h) => h.ruleId !== ruleId);
  }

  /**
   * Clear all history
   */
  clear() {
    this.history = [];
  }

  /**
   * Check if history exists for a rule
   */
  has(ruleId) {
    return this.history.some((h) => h.ruleId === ruleId);
  }
}
