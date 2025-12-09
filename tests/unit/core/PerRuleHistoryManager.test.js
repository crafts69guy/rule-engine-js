const { PerRuleHistoryManager } = require('../../../src/core/history/PerRuleHistoryManager.js');

describe('PerRuleHistoryManager', () => {
  let historyManager;

  beforeEach(() => {
    historyManager = new PerRuleHistoryManager();
  });

  describe('Constructor', () => {
    it('should initialize with default maxPerRule of 100', () => {
      expect(historyManager.maxPerRule).toBe(100);
      expect(historyManager.history).toBeInstanceOf(Map);
      expect(historyManager.history.size).toBe(0);
    });

    it('should accept custom maxPerRule', () => {
      const customManager = new PerRuleHistoryManager(50);
      expect(customManager.maxPerRule).toBe(50);
      expect(customManager.history).toBeInstanceOf(Map);
    });

    it('should initialize empty history Map', () => {
      expect(historyManager.history).toBeInstanceOf(Map);
      expect(historyManager.history.size).toBe(0);
    });
  });

  describe('add()', () => {
    it('should add a single event to history', () => {
      const event = {
        ruleId: 'rule-1',
        timestamp: new Date().toISOString(),
        result: { success: true },
      };

      historyManager.add(event);

      expect(historyManager.history.has('rule-1')).toBe(true);
      expect(historyManager.history.get('rule-1').length).toBe(1);
      expect(historyManager.history.get('rule-1')[0]).toEqual(event);
    });

    it('should create separate queues for different rules', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-3', value: 'c' });

      expect(historyManager.history.size).toBe(3);
      expect(historyManager.history.get('rule-1').length).toBe(1);
      expect(historyManager.history.get('rule-2').length).toBe(1);
      expect(historyManager.history.get('rule-3').length).toBe(1);
    });

    it('should add multiple events to the same rule queue', () => {
      historyManager.add({ ruleId: 'rule-1', attempt: 1 });
      historyManager.add({ ruleId: 'rule-1', attempt: 2 });
      historyManager.add({ ruleId: 'rule-1', attempt: 3 });

      const rule1History = historyManager.history.get('rule-1');
      expect(rule1History.length).toBe(3);
      expect(rule1History[0].attempt).toBe(1);
      expect(rule1History[1].attempt).toBe(2);
      expect(rule1History[2].attempt).toBe(3);
    });

    it('should maintain FIFO order within each rule queue', () => {
      historyManager.add({ ruleId: 'rule-1', order: 1 });
      historyManager.add({ ruleId: 'rule-2', order: 1 });
      historyManager.add({ ruleId: 'rule-1', order: 2 });
      historyManager.add({ ruleId: 'rule-2', order: 2 });
      historyManager.add({ ruleId: 'rule-1', order: 3 });

      const rule1History = historyManager.history.get('rule-1');
      const rule2History = historyManager.history.get('rule-2');

      expect(rule1History[0].order).toBe(1);
      expect(rule1History[1].order).toBe(2);
      expect(rule1History[2].order).toBe(3);

      expect(rule2History[0].order).toBe(1);
      expect(rule2History[1].order).toBe(2);
    });

    it('should enforce maxPerRule limit for each rule independently', () => {
      const smallManager = new PerRuleHistoryManager(3);

      // Add 4 events to rule-1
      smallManager.add({ ruleId: 'rule-1', order: 1 });
      smallManager.add({ ruleId: 'rule-1', order: 2 });
      smallManager.add({ ruleId: 'rule-1', order: 3 });
      smallManager.add({ ruleId: 'rule-1', order: 4 }); // Should remove first event

      // Add 4 events to rule-2
      smallManager.add({ ruleId: 'rule-2', order: 1 });
      smallManager.add({ ruleId: 'rule-2', order: 2 });
      smallManager.add({ ruleId: 'rule-2', order: 3 });
      smallManager.add({ ruleId: 'rule-2', order: 4 }); // Should remove first event

      const rule1History = smallManager.history.get('rule-1');
      const rule2History = smallManager.history.get('rule-2');

      expect(rule1History.length).toBe(3);
      expect(rule1History[0].order).toBe(2); // First event removed
      expect(rule1History[1].order).toBe(3);
      expect(rule1History[2].order).toBe(4);

      expect(rule2History.length).toBe(3);
      expect(rule2History[0].order).toBe(2); // First event removed
      expect(rule2History[1].order).toBe(3);
      expect(rule2History[2].order).toBe(4);
    });

    it('should remove oldest event per rule when exceeding maxPerRule', () => {
      const smallManager = new PerRuleHistoryManager(2);

      smallManager.add({ ruleId: 'rule-1', value: 'oldest' });
      smallManager.add({ ruleId: 'rule-1', value: 'middle' });
      smallManager.add({ ruleId: 'rule-1', value: 'newest' });

      const rule1History = smallManager.history.get('rule-1');
      expect(rule1History.length).toBe(2);
      expect(rule1History[0].value).toBe('middle');
      expect(rule1History[1].value).toBe('newest');
    });

    it('should not affect other rules when one rule exceeds maxPerRule', () => {
      const smallManager = new PerRuleHistoryManager(2);

      // rule-1 exceeds limit
      smallManager.add({ ruleId: 'rule-1', value: 'a1' });
      smallManager.add({ ruleId: 'rule-1', value: 'a2' });
      smallManager.add({ ruleId: 'rule-1', value: 'a3' }); // Exceeds limit

      // rule-2 stays within limit
      smallManager.add({ ruleId: 'rule-2', value: 'b1' });

      expect(smallManager.history.get('rule-1').length).toBe(2);
      expect(smallManager.history.get('rule-2').length).toBe(1);
      expect(smallManager.history.get('rule-2')[0].value).toBe('b1'); // Unaffected
    });

    it('should handle adding events to a manager with maxPerRule of 1', () => {
      const tinyManager = new PerRuleHistoryManager(1);

      tinyManager.add({ ruleId: 'rule-1', value: 'first' });
      expect(tinyManager.history.get('rule-1').length).toBe(1);
      expect(tinyManager.history.get('rule-1')[0].value).toBe('first');

      tinyManager.add({ ruleId: 'rule-1', value: 'second' });
      expect(tinyManager.history.get('rule-1').length).toBe(1);
      expect(tinyManager.history.get('rule-1')[0].value).toBe('second');
    });

    it('should create new queue when adding event for new rule', () => {
      expect(historyManager.history.has('rule-1')).toBe(false);

      historyManager.add({ ruleId: 'rule-1', value: 'a' });

      expect(historyManager.history.has('rule-1')).toBe(true);
      expect(historyManager.history.get('rule-1')).toBeInstanceOf(Array);
    });
  });

  describe('get()', () => {
    beforeEach(() => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-1', value: 'c' });
      historyManager.add({ ruleId: 'rule-3', value: 'd' });
      historyManager.add({ ruleId: 'rule-1', value: 'e' });
    });

    it('should get all events for a specific ruleId', () => {
      const rule1History = historyManager.get('rule-1');

      expect(rule1History.length).toBe(3);
      expect(rule1History[0].value).toBe('a');
      expect(rule1History[1].value).toBe('c');
      expect(rule1History[2].value).toBe('e');
    });

    it('should return empty array for non-existent ruleId', () => {
      const result = historyManager.get('non-existent');

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return the actual array reference (not a copy)', () => {
      const result1 = historyManager.get('rule-1');
      const result2 = historyManager.get('rule-1');

      expect(result1).toBe(result2); // Same reference
    });

    it('should handle get for rule with single event', () => {
      const result = historyManager.get('rule-2');

      expect(result.length).toBe(1);
      expect(result[0].value).toBe('b');
    });

    it('should return empty array for never-added rule', () => {
      const result = historyManager.get('never-added');

      expect(result).toEqual([]);
    });
  });

  describe('getAll()', () => {
    it('should return empty array when no history exists', () => {
      const result = historyManager.getAll();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return all events from all rules', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-3', value: 'c' });

      const result = historyManager.getAll();

      expect(result.length).toBe(3);
      expect(result.map((e) => e.value)).toContain('a');
      expect(result.map((e) => e.value)).toContain('b');
      expect(result.map((e) => e.value)).toContain('c');
    });

    it('should sort all events by timestamp (oldest first)', () => {
      const now = new Date();
      const timestamps = [
        new Date(now.getTime() + 2000).toISOString(), // Latest
        new Date(now.getTime() + 0).toISOString(), // Oldest
        new Date(now.getTime() + 1000).toISOString(), // Middle
      ];

      historyManager.add({ ruleId: 'rule-1', timestamp: timestamps[0], order: 3 });
      historyManager.add({ ruleId: 'rule-2', timestamp: timestamps[1], order: 1 });
      historyManager.add({ ruleId: 'rule-3', timestamp: timestamps[2], order: 2 });

      const result = historyManager.getAll();

      expect(result.length).toBe(3);
      expect(result[0].order).toBe(1); // Oldest
      expect(result[1].order).toBe(2); // Middle
      expect(result[2].order).toBe(3); // Latest
    });

    it('should include events from multiple rules in sorted order', () => {
      const now = new Date();

      historyManager.add({
        ruleId: 'rule-1',
        timestamp: new Date(now.getTime() + 0).toISOString(),
        sequence: 1,
      });
      historyManager.add({
        ruleId: 'rule-2',
        timestamp: new Date(now.getTime() + 500).toISOString(),
        sequence: 2,
      });
      historyManager.add({
        ruleId: 'rule-1',
        timestamp: new Date(now.getTime() + 1000).toISOString(),
        sequence: 3,
      });
      historyManager.add({
        ruleId: 'rule-2',
        timestamp: new Date(now.getTime() + 1500).toISOString(),
        sequence: 4,
      });

      const result = historyManager.getAll();

      expect(result.length).toBe(4);
      expect(result[0].sequence).toBe(1);
      expect(result[1].sequence).toBe(2);
      expect(result[2].sequence).toBe(3);
      expect(result[3].sequence).toBe(4);
    });

    it('should handle events with identical timestamps', () => {
      const timestamp = new Date().toISOString();

      historyManager.add({ ruleId: 'rule-1', timestamp, value: 'a' });
      historyManager.add({ ruleId: 'rule-2', timestamp, value: 'b' });
      historyManager.add({ ruleId: 'rule-3', timestamp, value: 'c' });

      const result = historyManager.getAll();

      expect(result.length).toBe(3);
      // Order may vary for same timestamp, just ensure all are present
      expect(result.map((e) => e.value).sort()).toEqual(['a', 'b', 'c']);
    });

    it('should return new array (not a reference)', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });

      const result1 = historyManager.getAll();
      const result2 = historyManager.getAll();

      expect(result1).not.toBe(result2); // Different array instances
      expect(result1).toEqual(result2); // Same content
    });
  });

  describe('getStats()', () => {
    it('should return correct stats for empty history', () => {
      const stats = historyManager.getStats();

      expect(stats).toEqual({
        mode: 'per-rule',
        totalRules: 0,
        totalEvents: 0,
        maxPerRule: 100,
        perRule: {},
      });
    });

    it('should return correct stats for single rule', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-1', value: 'b' });

      const stats = historyManager.getStats();

      expect(stats.mode).toBe('per-rule');
      expect(stats.totalRules).toBe(1);
      expect(stats.totalEvents).toBe(2);
      expect(stats.maxPerRule).toBe(100);
      expect(stats.perRule).toEqual({ 'rule-1': 2 });
    });

    it('should return correct stats for multiple rules', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-1', value: 'c' });
      historyManager.add({ ruleId: 'rule-3', value: 'd' });
      historyManager.add({ ruleId: 'rule-1', value: 'e' });
      historyManager.add({ ruleId: 'rule-2', value: 'f' });

      const stats = historyManager.getStats();

      expect(stats.mode).toBe('per-rule');
      expect(stats.totalRules).toBe(3);
      expect(stats.totalEvents).toBe(6);
      expect(stats.maxPerRule).toBe(100);
      expect(stats.perRule).toEqual({
        'rule-1': 3,
        'rule-2': 2,
        'rule-3': 1,
      });
    });

    it('should reflect custom maxPerRule in stats', () => {
      const customManager = new PerRuleHistoryManager(50);
      customManager.add({ ruleId: 'rule-1', value: 'a' });

      const stats = customManager.getStats();

      expect(stats.maxPerRule).toBe(50);
    });

    it('should update stats correctly after per-rule FIFO removal', () => {
      const smallManager = new PerRuleHistoryManager(2);

      smallManager.add({ ruleId: 'rule-1', value: 'a' });
      smallManager.add({ ruleId: 'rule-1', value: 'b' });
      smallManager.add({ ruleId: 'rule-2', value: 'c' });
      smallManager.add({ ruleId: 'rule-1', value: 'd' }); // rule-1's 'a' gets removed

      const stats = smallManager.getStats();

      expect(stats.totalRules).toBe(2);
      expect(stats.totalEvents).toBe(3);
      expect(stats.perRule).toEqual({
        'rule-1': 2, // Capped at maxPerRule
        'rule-2': 1,
      });
    });

    it('should calculate totalEvents correctly across all rules', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-3', value: 'c' });
      historyManager.add({ ruleId: 'rule-1', value: 'd' });

      const stats = historyManager.getStats();

      expect(stats.totalEvents).toBe(4);
      expect(stats.perRule['rule-1'] + stats.perRule['rule-2'] + stats.perRule['rule-3']).toBe(4);
    });
  });

  describe('size()', () => {
    it('should return 0 for empty history', () => {
      expect(historyManager.size()).toBe(0);
    });

    it('should return correct total size across all rules', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      expect(historyManager.size()).toBe(1);

      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      expect(historyManager.size()).toBe(2);

      historyManager.add({ ruleId: 'rule-1', value: 'c' });
      expect(historyManager.size()).toBe(3);
    });

    it('should reflect maxPerRule limit when enforced', () => {
      const smallManager = new PerRuleHistoryManager(2);

      smallManager.add({ ruleId: 'rule-1', value: 'a' });
      smallManager.add({ ruleId: 'rule-1', value: 'b' });
      expect(smallManager.size()).toBe(2);

      smallManager.add({ ruleId: 'rule-1', value: 'c' }); // Triggers FIFO removal
      expect(smallManager.size()).toBe(2); // Still 2 for rule-1

      smallManager.add({ ruleId: 'rule-2', value: 'd' });
      expect(smallManager.size()).toBe(3); // 2 for rule-1 + 1 for rule-2
    });

    it('should update after clear operations', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      expect(historyManager.size()).toBe(2);

      historyManager.clearRule('rule-1');
      expect(historyManager.size()).toBe(1);

      historyManager.clear();
      expect(historyManager.size()).toBe(0);
    });

    it('should count events across multiple rules correctly', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-1', value: 'b' });
      historyManager.add({ ruleId: 'rule-2', value: 'c' });
      historyManager.add({ ruleId: 'rule-2', value: 'd' });
      historyManager.add({ ruleId: 'rule-2', value: 'e' });

      expect(historyManager.size()).toBe(5);
    });
  });

  describe('clearRule()', () => {
    beforeEach(() => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-1', value: 'c' });
      historyManager.add({ ruleId: 'rule-3', value: 'd' });
      historyManager.add({ ruleId: 'rule-1', value: 'e' });
    });

    it('should remove all events for a specific ruleId', () => {
      historyManager.clearRule('rule-1');

      expect(historyManager.history.has('rule-1')).toBe(false);
      expect(historyManager.get('rule-1').length).toBe(0);
    });

    it('should not affect other rules', () => {
      const rule2Before = historyManager.get('rule-2');
      const rule3Before = historyManager.get('rule-3');

      historyManager.clearRule('rule-1');

      expect(historyManager.get('rule-2')).toBe(rule2Before); // Same reference
      expect(historyManager.get('rule-3')).toBe(rule3Before); // Same reference
    });

    it('should handle clearing non-existent ruleId gracefully', () => {
      const sizeBefore = historyManager.size();

      historyManager.clearRule('non-existent');

      expect(historyManager.size()).toBe(sizeBefore);
    });

    it('should remove rule from Map', () => {
      expect(historyManager.history.has('rule-1')).toBe(true);

      historyManager.clearRule('rule-1');

      expect(historyManager.history.has('rule-1')).toBe(false);
    });

    it('should update stats correctly after clearing rule', () => {
      historyManager.clearRule('rule-1');

      const stats = historyManager.getStats();
      expect(stats.totalRules).toBe(2);
      expect(stats.totalEvents).toBe(2);
      expect(stats.perRule).toEqual({
        'rule-2': 1,
        'rule-3': 1,
      });
      expect(stats.perRule).not.toHaveProperty('rule-1');
    });

    it('should clear rule with single event', () => {
      historyManager.clearRule('rule-2');

      expect(historyManager.get('rule-2').length).toBe(0);
      expect(historyManager.history.has('rule-2')).toBe(false);
    });
  });

  describe('clear()', () => {
    beforeEach(() => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-3', value: 'c' });
    });

    it('should remove all history', () => {
      historyManager.clear();

      expect(historyManager.history.size).toBe(0);
      expect(historyManager.size()).toBe(0);
    });

    it('should clear the Map completely', () => {
      historyManager.clear();

      expect(historyManager.history.size).toBe(0);
      expect(historyManager.getAll()).toEqual([]);
    });

    it('should clear history for all rules', () => {
      historyManager.clear();

      expect(historyManager.get('rule-1').length).toBe(0);
      expect(historyManager.get('rule-2').length).toBe(0);
      expect(historyManager.get('rule-3').length).toBe(0);
    });

    it('should reset stats to empty state', () => {
      historyManager.clear();

      const stats = historyManager.getStats();
      expect(stats).toEqual({
        mode: 'per-rule',
        totalRules: 0,
        totalEvents: 0,
        maxPerRule: 100,
        perRule: {},
      });
    });

    it('should allow adding events after clear', () => {
      historyManager.clear();
      historyManager.add({ ruleId: 'rule-4', value: 'd' });

      expect(historyManager.size()).toBe(1);
      expect(historyManager.get('rule-4').length).toBe(1);
    });

    it('should handle clearing already empty history', () => {
      const emptyManager = new PerRuleHistoryManager();
      emptyManager.clear();

      expect(emptyManager.history.size).toBe(0);
      expect(emptyManager.size()).toBe(0);
    });
  });

  describe('has()', () => {
    beforeEach(() => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
    });

    it('should return true when history exists for ruleId', () => {
      expect(historyManager.has('rule-1')).toBe(true);
      expect(historyManager.has('rule-2')).toBe(true);
    });

    it('should return false when no history exists for ruleId', () => {
      expect(historyManager.has('non-existent')).toBe(false);
      expect(historyManager.has('rule-3')).toBe(false);
    });

    it('should return false after clearing rule', () => {
      historyManager.clearRule('rule-1');

      expect(historyManager.has('rule-1')).toBe(false);
    });

    it('should return false after clearing all history', () => {
      historyManager.clear();

      expect(historyManager.has('rule-1')).toBe(false);
      expect(historyManager.has('rule-2')).toBe(false);
    });

    it('should return false for empty rule queue', () => {
      // Manually create empty queue (edge case)
      historyManager.history.set('rule-3', []);

      expect(historyManager.has('rule-3')).toBe(false);
    });

    it('should handle empty history', () => {
      const emptyManager = new PerRuleHistoryManager();

      expect(emptyManager.has('any-rule')).toBe(false);
    });

    it('should return true after FIFO removal (if events still remain)', () => {
      const smallManager = new PerRuleHistoryManager(2);

      smallManager.add({ ruleId: 'rule-1', value: 'a' });
      smallManager.add({ ruleId: 'rule-1', value: 'b' });
      smallManager.add({ ruleId: 'rule-1', value: 'c' }); // 'a' removed

      expect(smallManager.has('rule-1')).toBe(true);
    });
  });

  describe('getRuleCount()', () => {
    it('should return 0 for empty history', () => {
      expect(historyManager.getRuleCount()).toBe(0);
    });

    it('should return correct count for single rule', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-1', value: 'b' });

      expect(historyManager.getRuleCount()).toBe(1);
    });

    it('should return correct count for multiple rules', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-3', value: 'c' });
      historyManager.add({ ruleId: 'rule-1', value: 'd' }); // Same rule, no increase

      expect(historyManager.getRuleCount()).toBe(3);
    });

    it('should decrease after clearing a rule', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      expect(historyManager.getRuleCount()).toBe(2);

      historyManager.clearRule('rule-1');
      expect(historyManager.getRuleCount()).toBe(1);
    });

    it('should return 0 after clearing all history', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });

      historyManager.clear();

      expect(historyManager.getRuleCount()).toBe(0);
    });

    it('should not change after per-rule FIFO removal', () => {
      const smallManager = new PerRuleHistoryManager(2);

      smallManager.add({ ruleId: 'rule-1', value: 'a' });
      smallManager.add({ ruleId: 'rule-1', value: 'b' });
      expect(smallManager.getRuleCount()).toBe(1);

      smallManager.add({ ruleId: 'rule-1', value: 'c' }); // Triggers FIFO, but rule still exists
      expect(smallManager.getRuleCount()).toBe(1);
    });
  });

  describe('getRuleIds()', () => {
    it('should return empty array for empty history', () => {
      expect(historyManager.getRuleIds()).toEqual([]);
    });

    it('should return array of all rule IDs', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-3', value: 'c' });

      const ruleIds = historyManager.getRuleIds();

      expect(ruleIds).toHaveLength(3);
      expect(ruleIds).toContain('rule-1');
      expect(ruleIds).toContain('rule-2');
      expect(ruleIds).toContain('rule-3');
    });

    it('should not include duplicate rule IDs', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-1', value: 'b' });
      historyManager.add({ ruleId: 'rule-2', value: 'c' });

      const ruleIds = historyManager.getRuleIds();

      expect(ruleIds).toHaveLength(2);
      expect(ruleIds.filter((id) => id === 'rule-1')).toHaveLength(1);
    });

    it('should update after clearing a rule', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-3', value: 'c' });

      historyManager.clearRule('rule-2');

      const ruleIds = historyManager.getRuleIds();
      expect(ruleIds).toHaveLength(2);
      expect(ruleIds).toContain('rule-1');
      expect(ruleIds).toContain('rule-3');
      expect(ruleIds).not.toContain('rule-2');
    });

    it('should return empty array after clearing all history', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });

      historyManager.clear();

      expect(historyManager.getRuleIds()).toEqual([]);
    });

    it('should return new array instance each time', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });

      const ids1 = historyManager.getRuleIds();
      const ids2 = historyManager.getRuleIds();

      expect(ids1).not.toBe(ids2); // Different instances
      expect(ids1).toEqual(ids2); // Same content
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle rapid consecutive adds to multiple rules', () => {
      for (let i = 0; i < 1000; i++) {
        historyManager.add({ ruleId: `rule-${i % 10}`, index: i });
      }

      expect(historyManager.getRuleCount()).toBe(10);
      expect(historyManager.size()).toBe(1000); // No limit reached
    });

    it('should enforce per-rule limits independently with many rules', () => {
      const smallManager = new PerRuleHistoryManager(5);

      for (let i = 0; i < 100; i++) {
        smallManager.add({ ruleId: `rule-${i % 10}`, index: i });
      }

      expect(smallManager.getRuleCount()).toBe(10);
      // Each rule should have exactly 5 events (10 iterations per rule, capped at 5)
      for (let i = 0; i < 10; i++) {
        expect(smallManager.get(`rule-${i}`).length).toBe(5);
      }
      expect(smallManager.size()).toBe(50); // 10 rules * 5 events each
    });

    it('should handle events with complex data structures', () => {
      const complexEvent = {
        ruleId: 'rule-1',
        timestamp: new Date().toISOString(),
        context: {
          user: { name: 'John', roles: ['admin', 'user'] },
          metadata: { ip: '127.0.0.1', sessionId: 'abc123' },
        },
        result: { success: true, triggered: true, details: { reason: 'threshold exceeded' } },
      };

      historyManager.add(complexEvent);

      const retrieved = historyManager.get('rule-1');
      expect(retrieved[0]).toEqual(complexEvent);
    });

    it('should maintain independence across rules during mixed operations', () => {
      historyManager.add({ ruleId: 'rule-1', order: 1 });
      historyManager.add({ ruleId: 'rule-2', order: 1 });
      historyManager.clearRule('rule-1');
      historyManager.add({ ruleId: 'rule-3', order: 1 });
      historyManager.add({ ruleId: 'rule-1', order: 2 });

      expect(historyManager.getRuleCount()).toBe(3);
      expect(historyManager.get('rule-1').length).toBe(1);
      expect(historyManager.get('rule-1')[0].order).toBe(2);
      expect(historyManager.get('rule-2').length).toBe(1);
      expect(historyManager.get('rule-3').length).toBe(1);
    });

    it('should handle alternating add and clear operations', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.clear();
      expect(historyManager.size()).toBe(0);

      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      expect(historyManager.size()).toBe(1);

      historyManager.clearRule('rule-2');
      expect(historyManager.size()).toBe(0);
    });

    it('should handle maxPerRule of 0 gracefully', () => {
      const zeroManager = new PerRuleHistoryManager(0);

      zeroManager.add({ ruleId: 'rule-1', value: 'a' });

      // With maxPerRule 0, each rule's history should be empty after shift
      expect(zeroManager.get('rule-1').length).toBe(0);
      expect(zeroManager.size()).toBe(0);
    });

    it('should preserve sorting stability in getAll() with same timestamps', () => {
      const timestamp = new Date().toISOString();

      historyManager.add({ ruleId: 'rule-1', timestamp, value: 'a' });
      historyManager.add({ ruleId: 'rule-2', timestamp, value: 'b' });
      historyManager.add({ ruleId: 'rule-3', timestamp, value: 'c' });

      const result1 = historyManager.getAll();
      const result2 = historyManager.getAll();

      // Results should be consistent across calls
      expect(result1.map((e) => e.value)).toEqual(result2.map((e) => e.value));
    });

    it('should handle very long rule IDs', () => {
      const longRuleId = 'rule-' + 'x'.repeat(1000);

      historyManager.add({ ruleId: longRuleId, value: 'test' });

      expect(historyManager.has(longRuleId)).toBe(true);
      expect(historyManager.get(longRuleId).length).toBe(1);
      expect(historyManager.getRuleIds()).toContain(longRuleId);
    });

    it('should handle special characters in rule IDs', () => {
      const specialRuleIds = [
        'rule-with-dashes',
        'rule_with_underscores',
        'rule.with.dots',
        'rule:with:colons',
        'rule/with/slashes',
      ];

      specialRuleIds.forEach((ruleId) => {
        historyManager.add({ ruleId, value: 'test' });
      });

      expect(historyManager.getRuleCount()).toBe(specialRuleIds.length);
      specialRuleIds.forEach((ruleId) => {
        expect(historyManager.has(ruleId)).toBe(true);
      });
    });
  });
});
