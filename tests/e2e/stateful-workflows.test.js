const { createRuleEngine, StatefulRuleEngine } = require('../../src/index.js');

describe('End-to-End Stateful Workflows', () => {
  describe('Customer Support Ticket System', () => {
    let ticketEngine;
    let notifications;
    let escalations;

    beforeEach(() => {
      const baseEngine = createRuleEngine();
      ticketEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
        triggerOnEveryChange: false,
      });

      notifications = [];
      escalations = [];

      // Set up event listeners
      ticketEngine.on('triggered', (data) => {
        if (data.ruleId.startsWith('notify-')) {
          notifications.push({
            type: data.ruleId.replace('notify-', ''),
            ticket: data.context.ticket,
            timestamp: data.timestamp,
          });
        }

        if (data.ruleId.startsWith('escalate-')) {
          escalations.push({
            level: data.ruleId.replace('escalate-', ''),
            ticket: data.context.ticket,
            timestamp: data.timestamp,
          });
        }
      });
    });

    it('should handle complete ticket lifecycle', async () => {
      const rules = {
        'notify-opened': { changedTo: ['ticket.status', 'open'] },
        'notify-assigned': { changedTo: ['ticket.status', 'assigned'] },
        'notify-resolved': { changedTo: ['ticket.status', 'resolved'] },
        'notify-closed': { changedTo: ['ticket.status', 'closed'] },
        'escalate-priority': {
          and: [{ changedTo: ['ticket.priority', 'high'] }, { eq: ['ticket.status', 'open'] }],
        },
        'escalate-overdue': {
          and: [
            { increased: ['ticket.daysSinceUpdate'] },
            { gt: ['ticket.daysSinceUpdate', 3] },
            { neq: ['ticket.status', 'closed'] },
          ],
        },
      };

      // Ticket lifecycle simulation
      const ticketStates = [
        {
          ticket: {
            id: 'T001',
            status: 'draft',
            priority: 'medium',
            daysSinceUpdate: 0,
            assignee: null,
          },
        },
        {
          ticket: {
            id: 'T001',
            status: 'open',
            priority: 'medium',
            daysSinceUpdate: 0,
            assignee: null,
          },
        },
        {
          ticket: {
            id: 'T001',
            status: 'open',
            priority: 'high',
            daysSinceUpdate: 0,
            assignee: null,
          },
        }, // Escalate
        {
          ticket: {
            id: 'T001',
            status: 'assigned',
            priority: 'high',
            daysSinceUpdate: 0,
            assignee: 'john.doe',
          },
        },
        {
          ticket: {
            id: 'T001',
            status: 'assigned',
            priority: 'high',
            daysSinceUpdate: 4,
            assignee: 'john.doe',
          },
        }, // Overdue
        {
          ticket: {
            id: 'T001',
            status: 'resolved',
            priority: 'high',
            daysSinceUpdate: 4,
            assignee: 'john.doe',
          },
        },
        {
          ticket: {
            id: 'T001',
            status: 'closed',
            priority: 'high',
            daysSinceUpdate: 4,
            assignee: 'john.doe',
          },
        },
      ];

      // Process each state
      for (let i = 0; i < ticketStates.length; i++) {
        await ticketEngine.evaluateBatch(rules, ticketStates[i]);
      }

      // Verify notifications were sent at correct times
      expect(notifications).toHaveLength(4);
      expect(notifications.map((n) => n.type)).toEqual([
        'opened',
        'assigned',
        'resolved',
        'closed',
      ]);

      // Verify escalations occurred
      expect(escalations).toHaveLength(2);
      expect(escalations[0].level).toBe('priority'); // Priority escalation
      expect(escalations[1].level).toBe('overdue'); // Overdue escalation

      // Verify history was captured (should have entries for each evaluation)
      const history = ticketEngine.getHistory('notify-opened');
      expect(history.length).toBeGreaterThan(0);

      // Find the triggered notification for opening
      const openedNotification = history.find(
        (h) => h.triggered && h.context.ticket.status === 'open'
      );
      expect(openedNotification).toBeDefined();
    });
  });

  describe('E-commerce Inventory Management', () => {
    let inventoryEngine;
    let alerts;
    let restockOrders;

    beforeEach(() => {
      const baseEngine = createRuleEngine();
      inventoryEngine = new StatefulRuleEngine(baseEngine);

      alerts = [];
      restockOrders = [];

      inventoryEngine.on('triggered', (data) => {
        if (data.ruleId === 'low-stock-alert') {
          alerts.push({
            product: data.context.product,
            level: 'warning',
            timestamp: data.timestamp,
          });
        }

        if (data.ruleId === 'out-of-stock-alert') {
          alerts.push({
            product: data.context.product,
            level: 'critical',
            timestamp: data.timestamp,
          });
        }

        if (data.ruleId === 'auto-restock') {
          restockOrders.push({
            product: data.context.product,
            quantity: data.context.product.reorderQuantity,
            timestamp: data.timestamp,
          });
        }
      });
    });

    it('should monitor inventory levels and trigger restocking', async () => {
      const rules = {
        'low-stock-alert': {
          and: [
            { decreased: ['product.quantity'] },
            { lte: ['product.quantity', 'product.lowStockThreshold'] },
            { gt: ['product.quantity', 0] },
          ],
        },
        'out-of-stock-alert': {
          changedTo: ['product.quantity', 0],
        },
        'auto-restock': {
          and: [{ changedTo: ['product.quantity', 0] }, { eq: ['product.autoRestock', true] }],
        },
      };

      // Product inventory changes
      const inventoryStates = [
        {
          product: {
            sku: 'WIDGET001',
            quantity: 50,
            lowStockThreshold: 10,
            autoRestock: true,
            reorderQuantity: 100,
          },
        },
        {
          product: {
            sku: 'WIDGET001',
            quantity: 25,
            lowStockThreshold: 10,
            autoRestock: true,
            reorderQuantity: 100,
          },
        },
        {
          product: {
            sku: 'WIDGET001',
            quantity: 8,
            lowStockThreshold: 10,
            autoRestock: true,
            reorderQuantity: 100,
          },
        }, // Low stock
        {
          product: {
            sku: 'WIDGET001',
            quantity: 0,
            lowStockThreshold: 10,
            autoRestock: true,
            reorderQuantity: 100,
          },
        }, // Out of stock
        {
          product: {
            sku: 'WIDGET001',
            quantity: 100,
            lowStockThreshold: 10,
            autoRestock: true,
            reorderQuantity: 100,
          },
        }, // Restocked
      ];

      // Process inventory updates
      for (let i = 0; i < inventoryStates.length; i++) {
        await inventoryEngine.evaluateBatch(rules, inventoryStates[i]);
      }

      // Should have generated low stock warning
      const lowStockAlerts = alerts.filter((a) => a.level === 'warning');
      expect(lowStockAlerts).toHaveLength(1);
      expect(lowStockAlerts[0].product.quantity).toBe(8);

      // Should have generated out of stock critical alert
      const outOfStockAlerts = alerts.filter((a) => a.level === 'critical');
      expect(outOfStockAlerts).toHaveLength(1);
      expect(outOfStockAlerts[0].product.quantity).toBe(0);

      // Should have generated automatic restock order
      expect(restockOrders).toHaveLength(1);
      expect(restockOrders[0].quantity).toBe(100);
    });
  });

  describe('IoT Smart Home Automation', () => {
    let homeEngine;
    let automationActions;

    beforeEach(() => {
      const baseEngine = createRuleEngine();
      homeEngine = new StatefulRuleEngine(baseEngine, {
        triggerOnEveryChange: true, // React to every change for home automation
      });

      automationActions = [];

      homeEngine.on('triggered', (data) => {
        automationActions.push({
          action: data.ruleId,
          device: data.context.device || data.context.room,
          conditions: data.rule,
          timestamp: data.timestamp,
        });
      });
    });

    it('should automate lighting and climate control', async () => {
      const homeRules = {
        'turn-on-lights': {
          and: [{ changedTo: ['room.occupied', true] }, { lt: ['room.lightLevel', 30] }],
        },
        'turn-off-lights': {
          and: [{ changedTo: ['room.occupied', false] }, { gt: ['room.lightLevel', 0] }],
        },
        'increase-heating': {
          and: [
            { decreased: ['device.temperature'] },
            { lt: ['device.temperature', 'device.targetTemp'] },
            { eq: ['device.type', 'thermostat'] },
          ],
        },
        'security-alert': {
          and: [
            { changedTo: ['device.motion', true] },
            { eq: ['system.securityMode', 'armed'] },
            { eq: ['room.occupied', false] },
          ],
        },
      };

      // Simulate home automation scenarios
      const scenarios = [
        // Someone enters dark living room
        { room: { name: 'living', occupied: false, lightLevel: 20 } },
        { room: { name: 'living', occupied: true, lightLevel: 20 } },

        // Temperature drops in bedroom
        {
          device: { id: 'thermostat-bedroom', type: 'thermostat', temperature: 22, targetTemp: 24 },
        },
        {
          device: { id: 'thermostat-bedroom', type: 'thermostat', temperature: 20, targetTemp: 24 },
        },

        // Security system detects motion in empty room
        {
          device: { id: 'motion-kitchen', motion: false },
          room: { name: 'kitchen', occupied: false },
          system: { securityMode: 'armed' },
        },
        {
          device: { id: 'motion-kitchen', motion: true },
          room: { name: 'kitchen', occupied: false },
          system: { securityMode: 'armed' },
        },

        // Someone leaves room with lights on
        { room: { name: 'living', occupied: true, lightLevel: 80 } },
        { room: { name: 'living', occupied: false, lightLevel: 80 } },
      ];

      // Process home automation scenarios
      for (let i = 0; i < scenarios.length; i++) {
        await homeEngine.evaluateBatch(homeRules, scenarios[i]);
      }

      // Verify automation actions were triggered
      const lightActions = automationActions.filter((a) => a.action.includes('lights'));
      const heatingActions = automationActions.filter((a) => a.action.includes('heating'));
      const securityActions = automationActions.filter((a) => a.action.includes('security'));

      expect(lightActions).toHaveLength(2); // Turn on and turn off
      expect(heatingActions).toHaveLength(1); // Increase heating
      expect(securityActions).toHaveLength(1); // Security alert

      // Verify correct devices were targeted
      expect(heatingActions[0].device.type).toBe('thermostat');
      expect(securityActions[0].device.id).toBe('motion-kitchen');
    });
  });

  describe('Trading Algorithm with Risk Management', () => {
    let tradingEngine;
    let trades;
    let riskAlerts;

    beforeEach(() => {
      const baseEngine = createRuleEngine();
      tradingEngine = new StatefulRuleEngine(baseEngine);

      trades = [];
      riskAlerts = [];

      tradingEngine.on('triggered', (data) => {
        if (data.ruleId.startsWith('buy-') || data.ruleId.startsWith('sell-')) {
          trades.push({
            action: data.ruleId.split('-')[0],
            strategy: data.ruleId.split('-')[1],
            market: data.context.market,
            timestamp: data.timestamp,
          });
        }

        if (data.ruleId.startsWith('risk-')) {
          riskAlerts.push({
            type: data.ruleId.replace('risk-', ''),
            market: data.context.market,
            timestamp: data.timestamp,
          });
        }
      });
    });

    it('should execute trading strategies with risk controls', async () => {
      const tradingRules = {
        'buy-momentum': {
          and: [
            { increased: ['market.price'] },
            { gt: ['market.volume', 1000000] },
            { changedBy: ['market.price', 5] }, // Minimum $5 increase
          ],
        },
        'sell-profit': {
          and: [
            { decreased: ['market.price'] },
            { gt: ['portfolio.unrealizedGain', 1000] }, // Take profit above $1000
          ],
        },
        'risk-volatility': {
          and: [
            { changedBy: ['market.price', 20] }, // High volatility
            { decreased: ['market.price'] },
          ],
        },
        'risk-volume': {
          and: [
            { decreased: ['market.volume'] },
            { lt: ['market.volume', 100000] }, // Low liquidity
          ],
        },
      };

      // Market data simulation
      const marketUpdates = [
        {
          market: { symbol: 'AAPL', price: 150, volume: 800000 },
          portfolio: { unrealizedGain: 500 },
        },
        {
          market: { symbol: 'AAPL', price: 156, volume: 1200000 },
          portfolio: { unrealizedGain: 800 },
        }, // Buy signal
        {
          market: { symbol: 'AAPL', price: 160, volume: 1500000 },
          portfolio: { unrealizedGain: 1200 },
        }, // Profit target
        {
          market: { symbol: 'AAPL', price: 158, volume: 1400000 },
          portfolio: { unrealizedGain: 1100 },
        }, // Take profit
        {
          market: { symbol: 'AAPL', price: 135, volume: 50000 },
          portfolio: { unrealizedGain: 600 },
        }, // High volatility + low volume
      ];

      // Process market updates
      for (let i = 0; i < marketUpdates.length; i++) {
        await tradingEngine.evaluateBatch(tradingRules, marketUpdates[i]);
      }

      // Verify trading decisions
      expect(trades).toHaveLength(2);
      expect(trades[0].action).toBe('buy');
      expect(trades[0].strategy).toBe('momentum');
      expect(trades[1].action).toBe('sell');
      expect(trades[1].strategy).toBe('profit');

      // Verify risk management
      expect(riskAlerts).toHaveLength(2);
      expect(riskAlerts.map((r) => r.type).sort()).toEqual(['volatility', 'volume']);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency real-time data processing', async () => {
      const baseEngine = createRuleEngine();
      const realtimeEngine = new StatefulRuleEngine(baseEngine);

      const rule = {
        or: [
          { changedBy: ['sensor.value', 10] },
          { and: [{ changed: ['sensor.status'] }, { eq: ['sensor.critical', true] }] },
        ],
      };

      let processedCount = 0;
      realtimeEngine.on('evaluated', () => processedCount++);

      const startTime = Date.now();
      const dataPoints = 5000;

      // Simulate high-frequency sensor data
      for (let i = 0; i < dataPoints; i++) {
        const sensorData = {
          sensor: {
            id: `sensor-${i % 10}`, // 10 different sensors
            value: Math.random() * 100,
            status: Math.random() > 0.9 ? 'error' : 'ok',
            critical: Math.random() > 0.95,
          },
          timestamp: Date.now() + i,
        };

        await realtimeEngine.evaluate(`reading-${i}`, rule, sensorData);
      }

      const processingTime = Date.now() - startTime;
      const throughput = dataPoints / (processingTime / 1000); // per second

      expect(processedCount).toBe(dataPoints);
      expect(throughput).toBeGreaterThan(1000); // Should process > 1000 evaluations/sec
      expect(processingTime).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });
});
