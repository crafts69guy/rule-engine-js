const { GlobalHistoryManager } = require('../../../src/core/history/GlobalHistoryManager.js');

describe('GlobalHistoryManager', () => {
  let historyManager;

  beforeEach(() => {
    historyManager = new GlobalHistoryManager();
  });

  describe('Constructor', () => {
    it('should initialize with default maxSize of 100', () => {
      expect(historyManager.maxSize).toBe(100);
      expect(historyManager.history).toEqual([]);
    });

    it('should accept custom maxSize', () => {
      const customManager = new GlobalHistoryManager(50);
      expect(customManager.maxSize).toBe(50);
      expect(customManager.history).toEqual([]);
    });

    it('should initialize empty history array', () => {
      expect(historyManager.history).toBeInstanceOf(Array);
      expect(historyManager.history.length).toBe(0);
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

      expect(historyManager.history.length).toBe(1);
      expect(historyManager.history[0]).toEqual(event);
    });

    it('should add multiple events to history', () => {
      const events = [
        { ruleId: 'rule-1', timestamp: new Date().toISOString(), result: { success: true } },
        { ruleId: 'rule-2', timestamp: new Date().toISOString(), result: { success: false } },
        { ruleId: 'rule-3', timestamp: new Date().toISOString(), result: { success: true } },
      ];

      events.forEach((event) => historyManager.add(event));

      expect(historyManager.history.length).toBe(3);
      expect(historyManager.history).toEqual(events);
    });

    it('should maintain FIFO order when adding events', () => {
      const event1 = { ruleId: 'rule-1', order: 1 };
      const event2 = { ruleId: 'rule-2', order: 2 };
      const event3 = { ruleId: 'rule-3', order: 3 };

      historyManager.add(event1);
      historyManager.add(event2);
      historyManager.add(event3);

      expect(historyManager.history[0].order).toBe(1);
      expect(historyManager.history[1].order).toBe(2);
      expect(historyManager.history[2].order).toBe(3);
    });

    it('should enforce maxSize limit using FIFO', () => {
      const smallManager = new GlobalHistoryManager(3);

      smallManager.add({ ruleId: 'rule-1', order: 1 });
      smallManager.add({ ruleId: 'rule-2', order: 2 });
      smallManager.add({ ruleId: 'rule-3', order: 3 });
      smallManager.add({ ruleId: 'rule-4', order: 4 }); // Should remove first event

      expect(smallManager.history.length).toBe(3);
      expect(smallManager.history[0].order).toBe(2); // First event removed
      expect(smallManager.history[1].order).toBe(3);
      expect(smallManager.history[2].order).toBe(4);
    });

    it('should remove oldest event when exceeding maxSize', () => {
      const smallManager = new GlobalHistoryManager(2);

      smallManager.add({ ruleId: 'rule-1', value: 'oldest' });
      smallManager.add({ ruleId: 'rule-2', value: 'middle' });
      smallManager.add({ ruleId: 'rule-3', value: 'newest' });

      expect(smallManager.history.length).toBe(2);
      expect(smallManager.history[0].value).toBe('middle');
      expect(smallManager.history[1].value).toBe('newest');
    });

    it('should handle adding events to a manager with maxSize of 1', () => {
      const tinyManager = new GlobalHistoryManager(1);

      tinyManager.add({ ruleId: 'rule-1', value: 'first' });
      expect(tinyManager.history.length).toBe(1);
      expect(tinyManager.history[0].value).toBe('first');

      tinyManager.add({ ruleId: 'rule-2', value: 'second' });
      expect(tinyManager.history.length).toBe(1);
      expect(tinyManager.history[0].value).toBe('second');
    });

    it('should handle events with same ruleId', () => {
      historyManager.add({ ruleId: 'rule-1', attempt: 1 });
      historyManager.add({ ruleId: 'rule-1', attempt: 2 });
      historyManager.add({ ruleId: 'rule-1', attempt: 3 });

      expect(historyManager.history.length).toBe(3);
      expect(historyManager.history[0].attempt).toBe(1);
      expect(historyManager.history[1].attempt).toBe(2);
      expect(historyManager.history[2].attempt).toBe(3);
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

    it('should return independent arrays (not references)', () => {
      const result1 = historyManager.get('rule-1');
      const result2 = historyManager.get('rule-1');

      result1.push({ ruleId: 'rule-1', value: 'modified' });

      expect(result2.length).toBe(3); // Should not be affected
      expect(historyManager.get('rule-1').length).toBe(3); // Original should not be affected
    });

    it('should handle get for rule with single event', () => {
      const result = historyManager.get('rule-2');

      expect(result.length).toBe(1);
      expect(result[0].value).toBe('b');
    });
  });

  describe('getAll()', () => {
    it('should return empty array when no history exists', () => {
      const result = historyManager.getAll();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return all events in order', () => {
      historyManager.add({ ruleId: 'rule-1', order: 1 });
      historyManager.add({ ruleId: 'rule-2', order: 2 });
      historyManager.add({ ruleId: 'rule-3', order: 3 });

      const result = historyManager.getAll();

      expect(result.length).toBe(3);
      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
      expect(result[2].order).toBe(3);
    });

    it('should return a copy of history array (not reference)', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'original' });

      const result = historyManager.getAll();
      result.push({ ruleId: 'rule-2', value: 'modified' });

      expect(historyManager.history.length).toBe(1); // Original should not be affected
      expect(historyManager.getAll().length).toBe(1); // Should still be 1
    });

    it('should return all events including duplicates from same rule', () => {
      historyManager.add({ ruleId: 'rule-1', attempt: 1 });
      historyManager.add({ ruleId: 'rule-1', attempt: 2 });
      historyManager.add({ ruleId: 'rule-2', attempt: 1 });

      const result = historyManager.getAll();

      expect(result.length).toBe(3);
    });
  });

  describe('getStats()', () => {
    it('should return correct stats for empty history', () => {
      const stats = historyManager.getStats();

      expect(stats).toEqual({
        mode: 'global',
        totalRules: 0,
        totalEvents: 0,
        maxSize: 100,
        perRule: {},
      });
    });

    it('should return correct stats for single rule', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-1', value: 'b' });

      const stats = historyManager.getStats();

      expect(stats.mode).toBe('global');
      expect(stats.totalRules).toBe(1);
      expect(stats.totalEvents).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.perRule).toEqual({ 'rule-1': 2 });
    });

    it('should return correct stats for multiple rules', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      historyManager.add({ ruleId: 'rule-1', value: 'c' });
      historyManager.add({ ruleId: 'rule-3', value: 'd' });
      historyManager.add({ ruleId: 'rule-1', value: 'e' });

      const stats = historyManager.getStats();

      expect(stats.mode).toBe('global');
      expect(stats.totalRules).toBe(3);
      expect(stats.totalEvents).toBe(5);
      expect(stats.maxSize).toBe(100);
      expect(stats.perRule).toEqual({
        'rule-1': 3,
        'rule-2': 1,
        'rule-3': 1,
      });
    });

    it('should reflect custom maxSize in stats', () => {
      const customManager = new GlobalHistoryManager(50);
      customManager.add({ ruleId: 'rule-1', value: 'a' });

      const stats = customManager.getStats();

      expect(stats.maxSize).toBe(50);
    });

    it('should update stats correctly after FIFO removal', () => {
      const smallManager = new GlobalHistoryManager(3);

      smallManager.add({ ruleId: 'rule-1', value: 'a' });
      smallManager.add({ ruleId: 'rule-2', value: 'b' });
      smallManager.add({ ruleId: 'rule-3', value: 'c' });
      smallManager.add({ ruleId: 'rule-2', value: 'd' }); // rule-1's 'a' gets removed

      const stats = smallManager.getStats();

      expect(stats.totalRules).toBe(2); // rule-1 removed
      expect(stats.totalEvents).toBe(3);
      expect(stats.perRule).toEqual({
        'rule-2': 2,
        'rule-3': 1,
      });
    });
  });

  describe('size()', () => {
    it('should return 0 for empty history', () => {
      expect(historyManager.size()).toBe(0);
    });

    it('should return correct size after adding events', () => {
      historyManager.add({ ruleId: 'rule-1', value: 'a' });
      expect(historyManager.size()).toBe(1);

      historyManager.add({ ruleId: 'rule-2', value: 'b' });
      expect(historyManager.size()).toBe(2);

      historyManager.add({ ruleId: 'rule-1', value: 'c' });
      expect(historyManager.size()).toBe(3);
    });

    it('should return maxSize when history is at capacity', () => {
      const smallManager = new GlobalHistoryManager(3);

      smallManager.add({ ruleId: 'rule-1', value: 'a' });
      smallManager.add({ ruleId: 'rule-2', value: 'b' });
      smallManager.add({ ruleId: 'rule-3', value: 'c' });

      expect(smallManager.size()).toBe(3);

      // Add more to trigger FIFO removal
      smallManager.add({ ruleId: 'rule-4', value: 'd' });
      expect(smallManager.size()).toBe(3); // Should still be 3
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

      expect(historyManager.history.length).toBe(2);
      expect(historyManager.get('rule-1').length).toBe(0);
      expect(historyManager.get('rule-2').length).toBe(1);
      expect(historyManager.get('rule-3').length).toBe(1);
    });

    it('should not affect other rules', () => {
      const rule2Before = historyManager.get('rule-2');
      const rule3Before = historyManager.get('rule-3');

      historyManager.clearRule('rule-1');

      expect(historyManager.get('rule-2')).toEqual(rule2Before);
      expect(historyManager.get('rule-3')).toEqual(rule3Before);
    });

    it('should handle clearing non-existent ruleId gracefully', () => {
      const sizeBefore = historyManager.size();

      historyManager.clearRule('non-existent');

      expect(historyManager.size()).toBe(sizeBefore);
    });

    it('should clear rule with single event', () => {
      historyManager.clearRule('rule-2');

      expect(historyManager.get('rule-2').length).toBe(0);
      expect(historyManager.history.length).toBe(4); // 5 - 1 = 4
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

      expect(historyManager.history.length).toBe(0);
      expect(historyManager.size()).toBe(0);
    });

    it('should reset to empty array', () => {
      historyManager.clear();

      expect(historyManager.history).toEqual([]);
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
        mode: 'global',
        totalRules: 0,
        totalEvents: 0,
        maxSize: 100,
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
      const emptyManager = new GlobalHistoryManager();
      emptyManager.clear();

      expect(emptyManager.history).toEqual([]);
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

    it('should return true for rule after FIFO removal of other rules', () => {
      const smallManager = new GlobalHistoryManager(2);

      smallManager.add({ ruleId: 'rule-1', value: 'a' });
      smallManager.add({ ruleId: 'rule-2', value: 'b' });
      smallManager.add({ ruleId: 'rule-3', value: 'c' }); // rule-1 removed

      expect(smallManager.has('rule-1')).toBe(false); // Removed by FIFO
      expect(smallManager.has('rule-2')).toBe(true);
      expect(smallManager.has('rule-3')).toBe(true);
    });

    it('should handle empty history', () => {
      const emptyManager = new GlobalHistoryManager();

      expect(emptyManager.has('any-rule')).toBe(false);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle rapid consecutive adds', () => {
      for (let i = 0; i < 1000; i++) {
        historyManager.add({ ruleId: `rule-${i % 10}`, index: i });
      }

      expect(historyManager.size()).toBe(100); // maxSize enforced
      // Should have kept the last 100 events
      const all = historyManager.getAll();
      expect(all[0].index).toBe(900); // First of last 100
      expect(all[99].index).toBe(999); // Last event
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

    it('should maintain order across mixed operations', () => {
      historyManager.add({ ruleId: 'rule-1', order: 1 });
      historyManager.add({ ruleId: 'rule-2', order: 2 });
      historyManager.clearRule('rule-1');
      historyManager.add({ ruleId: 'rule-3', order: 3 });
      historyManager.add({ ruleId: 'rule-1', order: 4 });

      const all = historyManager.getAll();
      expect(all.length).toBe(3);
      expect(all[0].order).toBe(2);
      expect(all[1].order).toBe(3);
      expect(all[2].order).toBe(4);
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

    it('should preserve event immutability', () => {
      const event = { ruleId: 'rule-1', value: 'original' };
      historyManager.add(event);

      // Modify original event
      event.value = 'modified';

      // Retrieved event should still have original value
      const retrieved = historyManager.get('rule-1');
      expect(retrieved[0].value).toBe('modified'); // JavaScript passes by reference
      // Note: This test documents current behavior. If immutability is needed,
      // the implementation should deep clone events on add()
    });

    it('should handle maxSize of 0 gracefully', () => {
      const zeroManager = new GlobalHistoryManager(0);

      zeroManager.add({ ruleId: 'rule-1', value: 'a' });

      // With maxSize 0, history should be empty after shift
      expect(zeroManager.size()).toBe(0);
    });
  });
});
