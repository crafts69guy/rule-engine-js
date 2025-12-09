/**
 * ============================================================================
 * PER-RULE HISTORY MANAGER
 * Manages history with separate queues per rule (Phase 2)
 * Prevents one rule from dominating the global history
 * ============================================================================
 */
export class PerRuleHistoryManager {
  constructor(maxPerRule = 100) {
    this.history = new Map(); // Map<ruleId, Array<eventData>>
    this.maxPerRule = maxPerRule;
  }

  /**
   * Add event to per-rule history
   */
  add(eventData) {
    const ruleId = eventData.ruleId;

    if (!this.history.has(ruleId)) {
      this.history.set(ruleId, []);
    }

    const ruleHistory = this.history.get(ruleId);
    ruleHistory.push(eventData);

    // Enforce per-rule limit
    if (ruleHistory.length > this.maxPerRule) {
      ruleHistory.shift();
    }
  }

  /**
   * Get history for a specific rule
   */
  get(ruleId) {
    return this.history.get(ruleId) || [];
  }

  /**
   * Get all history (across all rules), sorted by timestamp
   */
  getAll() {
    const allHistory = [];
    for (const ruleHistory of this.history.values()) {
      allHistory.push(...ruleHistory);
    }
    // Sort by timestamp (oldest first)
    return allHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Get history statistics
   */
  getStats() {
    const stats = {
      mode: 'per-rule',
      totalRules: this.history.size,
      totalEvents: 0,
      maxPerRule: this.maxPerRule,
      perRule: {},
    };

    for (const [ruleId, ruleHistory] of this.history.entries()) {
      stats.totalEvents += ruleHistory.length;
      stats.perRule[ruleId] = ruleHistory.length;
    }

    return stats;
  }

  /**
   * Get total event count across all rules
   */
  size() {
    let total = 0;
    for (const ruleHistory of this.history.values()) {
      total += ruleHistory.length;
    }
    return total;
  }

  /**
   * Clear history for specific rule
   */
  clearRule(ruleId) {
    this.history.delete(ruleId);
  }

  /**
   * Clear all history
   */
  clear() {
    this.history.clear();
  }

  /**
   * Check if history exists for a rule
   */
  has(ruleId) {
    return this.history.has(ruleId) && this.history.get(ruleId).length > 0;
  }

  /**
   * Get number of rules with history
   */
  getRuleCount() {
    return this.history.size;
  }

  /**
   * Get all rule IDs with history
   */
  getRuleIds() {
    return Array.from(this.history.keys());
  }
}
