const { createRuleEngine, StatefulRuleEngine } = require('../../src/index.js');

describe('Stateful Features Integration', () => {
  let baseEngine;
  let statefulEngine;

  beforeEach(() => {
    baseEngine = createRuleEngine();
    statefulEngine = new StatefulRuleEngine(baseEngine);
  });

  describe('Real-world Scenarios', () => {
    describe('E-commerce Order Status Tracking', () => {
      const orderStatusRule = {
        or: [
          { changedTo: ['order.status', 'shipped'] },
          { changedTo: ['order.status', 'delivered'] },
          { changedTo: ['order.status', 'cancelled'] },
        ],
      };

      it('should track order lifecycle events', () => {
        const order1 = { order: { id: '12345', status: 'pending', total: 99.99 } };
        const order2 = { order: { id: '12345', status: 'processing', total: 99.99 } };
        const order3 = { order: { id: '12345', status: 'shipped', total: 99.99 } };
        const order4 = { order: { id: '12345', status: 'delivered', total: 99.99 } };

        const r1 = statefulEngine.evaluate('order-notifications', orderStatusRule, order1);
        const r2 = statefulEngine.evaluate('order-notifications', orderStatusRule, order2);
        const r3 = statefulEngine.evaluate('order-notifications', orderStatusRule, order3);
        const r4 = statefulEngine.evaluate('order-notifications', orderStatusRule, order4);

        expect(r1.triggered).toBe(false); // Initial state
        expect(r2.triggered).toBe(false); // Processing - not a tracked status
        expect(r3.triggered).toBe(true); // Shipped - trigger notification
        expect(r4.triggered).toBe(false); // Delivered - already triggered, standard behavior
      });

      it('should handle order cancellations', () => {
        const order1 = { order: { id: '12345', status: 'pending' } };
        const order2 = { order: { id: '12345', status: 'cancelled' } };

        statefulEngine.evaluate('order-notifications', orderStatusRule, order1);
        const result = statefulEngine.evaluate('order-notifications', orderStatusRule, order2);

        expect(result.triggered).toBe(true);
        expect(result.stateChange).toBe('triggered');
      });
    });

    describe('IoT Temperature Monitoring', () => {
      const tempRules = {
        significantChange: { changedBy: ['temperature', 5] },
        overheating: { and: [{ gt: ['temperature', 80] }, { increased: ['temperature'] }] },
        cooling: { and: [{ lt: ['temperature', 60] }, { decreased: ['temperature'] }] },
      };

      it('should monitor temperature fluctuations', () => {
        const readings = [
          { temperature: 70, timestamp: '2023-01-01T10:00:00Z' },
          { temperature: 72, timestamp: '2023-01-01T10:05:00Z' }, // Small increase
          { temperature: 78, timestamp: '2023-01-01T10:10:00Z' }, // Significant change
          { temperature: 85, timestamp: '2023-01-01T10:15:00Z' }, // Overheating
          { temperature: 55, timestamp: '2023-01-01T10:20:00Z' }, // Rapid cooling
        ];

        const results = readings.map((reading) =>
          statefulEngine.evaluateBatch(tempRules, reading, { triggerOnEveryChange: true })
        );

        // Check significant temperature changes
        expect(results[0].significantChange.triggered).toBe(false); // Initial
        expect(results[1].significantChange.triggered).toBe(false); // Only 2° change
        expect(results[2].significantChange.triggered).toBe(true); // 6° change from 72
        expect(results[4].significantChange.triggered).toBe(true); // 30° drop

        // Check overheating detection
        expect(results[3].overheating.triggered).toBe(true); // Above 80° and increased - first trigger

        // Check cooling detection
        expect(results[4].cooling.triggered).toBe(true); // Below 60° and decreasing
      });
    });

    describe('User Activity Monitoring', () => {
      const userRules = {
        loginStreakBroken: { changedTo: ['user.loginStreak', 0] },
        privilegeEscalation: { changedTo: ['user.role', 'admin'] },
        suspiciousActivity: {
          and: [
            { increased: ['user.failedLoginAttempts'] },
            { gt: ['user.failedLoginAttempts', 3] },
          ],
        },
      };

      it('should track user behavior patterns', () => {
        const activities = [
          { user: { id: 'user123', loginStreak: 5, role: 'user', failedLoginAttempts: 0 } },
          { user: { id: 'user123', loginStreak: 0, role: 'user', failedLoginAttempts: 1 } }, // Streak broken
          { user: { id: 'user123', loginStreak: 0, role: 'admin', failedLoginAttempts: 1 } }, // Role changed
          { user: { id: 'user123', loginStreak: 0, role: 'admin', failedLoginAttempts: 4 } }, // Failed attempts
        ];

        const results = activities.map((activity) =>
          statefulEngine.evaluateBatch(userRules, activity)
        );

        expect(results[1].loginStreakBroken.triggered).toBe(true); // Streak broken
        expect(results[2].privilegeEscalation.triggered).toBe(true); // Became admin
        expect(results[3].suspiciousActivity.triggered).toBe(true); // Failed attempts increased above threshold
      });
    });

    describe('Financial Trading Alerts', () => {
      it('should detect significant price movements', () => {
        const priceAlert = {
          or: [
            { changedBy: ['stock.price', 10] }, // $10 change
            { and: [{ changed: ['stock.volume'] }, { gt: ['stock.volume', 1000000] }] },
          ],
        };

        const marketData = [
          { stock: { symbol: 'AAPL', price: 150.0, volume: 500000 } },
          { stock: { symbol: 'AAPL', price: 152.0, volume: 600000 } }, // Small change
          { stock: { symbol: 'AAPL', price: 165.0, volume: 1200000 } }, // Big change + volume
          { stock: { symbol: 'AAPL', price: 164.0, volume: 800000 } }, // Small change, low volume
        ];

        const results = marketData.map((data) =>
          statefulEngine.evaluate('price-alert', priceAlert, data)
        );

        expect(results[0].triggered).toBe(false); // Initial
        expect(results[1].triggered).toBe(false); // Small price change, normal volume
        expect(results[2].triggered).toBe(true); // Large price change AND high volume
        expect(results[3].triggered).toBe(false); // Small change, low volume
      });
    });
  });

  describe('Complex State Transitions', () => {
    it('should handle multi-step workflow states', () => {
      const workflowRule = {
        and: [
          { changedFrom: ['workflow.status', 'review'] },
          { changedTo: ['workflow.status', 'approved'] },
          { eq: ['workflow.approver', 'manager'] },
        ],
      };

      const workflows = [
        { workflow: { id: 'WF001', status: 'draft', approver: null } },
        { workflow: { id: 'WF001', status: 'review', approver: 'reviewer' } },
        { workflow: { id: 'WF001', status: 'approved', approver: 'manager' } }, // Should trigger
      ];

      let finalResult;
      workflows.forEach((wf, i) => {
        const result = statefulEngine.evaluate('workflow', workflowRule, wf);
        if (i === 2) {
          finalResult = result;
        }
      });

      expect(finalResult.triggered).toBe(true);
    });

    it('should track cascading state changes', () => {
      const parentRule = { changed: ['parent.status'] };
      const childRule = {
        and: [
          { changed: ['child.status'] },
          { eq: ['parent.status', 'active'] }, // Parent must be active
        ],
      };

      // Parent becomes active
      const state1 = { parent: { status: 'active' }, child: { status: 'pending' } };
      statefulEngine.evaluate('parent', parentRule, state1);
      statefulEngine.evaluate('child', childRule, state1);

      // Child changes while parent is active
      const state2 = { parent: { status: 'active' }, child: { status: 'processing' } };
      const parentResult = statefulEngine.evaluate('parent', parentRule, state2);
      const childResult = statefulEngine.evaluate('child', childRule, state2);

      expect(parentResult.triggered).toBe(false); // Parent didn't change
      expect(childResult.triggered).toBe(true); // Child changed and parent is active
    });
  });

  describe('Event-driven Architecture', () => {
    it('should support event sourcing patterns', () => {
      const eventEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
        maxHistorySize: 10,
      });

      const events = [];
      eventEngine.on('triggered', (data) => {
        events.push({
          type: 'RULE_TRIGGERED',
          ruleId: data.ruleId,
          timestamp: data.timestamp,
          context: data.context,
        });
      });

      const accountRule = { increased: ['account.balance'] };
      const transactions = [
        { account: { id: 'ACC001', balance: 1000 } },
        { account: { id: 'ACC001', balance: 1500 } }, // Deposit
        { account: { id: 'ACC001', balance: 2000 } }, // Another deposit
        { account: { id: 'ACC001', balance: 1800 } }, // Withdrawal (decrease)
      ];

      transactions.forEach((tx) => {
        eventEngine.evaluate('account-monitor', accountRule, tx, { triggerOnEveryChange: true });
      });

      expect(events).toHaveLength(2); // Only deposits should trigger
      expect(events[0].context.account.balance).toBe(1500);
      expect(events[1].context.account.balance).toBe(2000);
    });

    it('should handle multiple concurrent rule evaluations', () => {
      const rules = {
        userStatusChange: { changed: ['user.status'] },
        userScoreIncrease: { increased: ['user.score'] },
        userRoleChange: { changed: ['user.role'] },
      };

      const userData = [
        { user: { id: 1, status: 'active', score: 100, role: 'user' } },
        { user: { id: 1, status: 'premium', score: 150, role: 'premium' } }, // All changed
      ];

      // First evaluation - establish baseline
      statefulEngine.evaluateBatch(rules, userData[0]);

      // Second evaluation - everything changed
      const results = statefulEngine.evaluateBatch(rules, userData[1]);

      expect(results.userStatusChange.triggered).toBe(true);
      expect(results.userScoreIncrease.triggered).toBe(true);
      expect(results.userRoleChange.triggered).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency evaluations efficiently', () => {
      const rule = { changed: ['sensor.value'] };
      const startTime = Date.now();

      // Simulate 1000 sensor readings
      for (let i = 0; i < 1000; i++) {
        const context = { sensor: { id: 'SENSOR001', value: Math.random() * 100 } };
        statefulEngine.evaluate(`reading-${i}`, rule, context);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should manage memory usage with large state history', () => {
      const historyEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
        maxHistorySize: 5,
      });

      const rule = { changed: ['value'] };

      // Generate 10 evaluations
      for (let i = 0; i < 10; i++) {
        historyEngine.evaluate('test', rule, { value: i });
      }

      // Should only keep the most recent 5
      const history = historyEngine.getAllHistory();
      expect(history).toHaveLength(5);
      expect(history[0].context.value).toBe(5);
      expect(history[4].context.value).toBe(9);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed contexts gracefully', () => {
      const rule = { changed: ['user.status'] };

      const contexts = [
        null,
        undefined,
        'invalid',
        123,
        [],
        { user: null },
        { user: { status: undefined } },
      ];

      contexts.forEach((context, i) => {
        expect(() => {
          statefulEngine.evaluate(`test-${i}`, rule, context);
        }).not.toThrow();
      });
    });

    it('should handle circular references in context', () => {
      const rule = { changed: ['data.value'] };
      const context = { data: { value: 'test' } };
      context.data.circular = context; // Create circular reference

      expect(() => {
        statefulEngine.evaluate('circular-test', rule, context);
      }).not.toThrow();
    });

    it('should maintain state isolation between different rule IDs', () => {
      const rule = { changed: ['value'] };

      // Rule 1 sequence
      statefulEngine.evaluate('rule1', rule, { value: 'a' });
      statefulEngine.evaluate('rule1', rule, { value: 'b' }); // Should trigger

      // Rule 2 sequence (independent)
      statefulEngine.evaluate('rule2', rule, { value: 'x' });
      const result = statefulEngine.evaluate('rule2', rule, { value: 'y' }); // Should trigger

      expect(result.triggered).toBe(true); // Rule2 should be independent
    });

    it('should handle state clearing during active evaluations', () => {
      const rule = { changed: ['value'] };

      // Set up initial state
      statefulEngine.evaluate('test', rule, { value: 1 });

      // Clear state
      statefulEngine.clearState('test');

      // Next evaluation should behave as initial
      const result = statefulEngine.evaluate('test', rule, { value: 2 });
      expect(result.stateChange).toBe('initial');
      expect(result.triggered).toBe(false);
    });
  });

  describe('Integration with Existing Features', () => {
    it('should work with rule helpers', () => {
      const { createRuleHelpers } = require('../../src/helpers/index.js');
      const helpers = createRuleHelpers();

      // Build complex rule using helpers and state operators
      const complexRule = helpers.and(
        { changed: ['user.status'] },
        helpers.eq('user.active', true),
        helpers.in('premium', 'user.tags')
      );

      const context1 = { user: { status: 'pending', active: true, tags: ['basic'] } };
      const context2 = { user: { status: 'active', active: true, tags: ['premium'] } };

      statefulEngine.evaluate('complex', complexRule, context1);
      const result = statefulEngine.evaluate('complex', complexRule, context2);

      expect(result.triggered).toBe(true);
    });

    it('should preserve engine metrics and performance tracking', () => {
      const rule = { changed: ['value'] };

      // Perform several evaluations
      for (let i = 0; i < 5; i++) {
        statefulEngine.evaluate('test', rule, { value: i });
      }

      const metrics = statefulEngine.engine.getMetrics();
      expect(metrics.evaluations).toBeGreaterThan(0);
      expect(metrics.avgTime).toBeGreaterThan(0);
    });

    it('should work with custom operators', () => {
      // Register a custom operator
      statefulEngine.engine.registerOperator('isEven', (args, context) => {
        const value = statefulEngine.engine._internal.pathResolver.resolve(context, args[0]);
        return typeof value === 'number' && value % 2 === 0;
      });

      const mixedRule = {
        and: [{ changed: ['number'] }, { isEven: ['number'] }],
      };

      statefulEngine.evaluate('mixed', mixedRule, { number: 1 });
      const result = statefulEngine.evaluate('mixed', mixedRule, { number: 4 });

      expect(result.triggered).toBe(true); // Number changed and is even
    });
  });
});
