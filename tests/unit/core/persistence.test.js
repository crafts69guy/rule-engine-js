const { createRuleEngine, StatefulRuleEngine } = require('../../../src/index.js');

describe('Phase 3: State Persistence Hooks', () => {
  let baseEngine;
  let mockStorage;

  beforeEach(() => {
    baseEngine = createRuleEngine();

    // Mock storage implementation
    mockStorage = {
      states: new Map(),
      history: [],
      onStateSave: jest.fn(async (ruleId, state) => {
        mockStorage.states.set(ruleId, JSON.parse(JSON.stringify(state)));
      }),
      onStateLoad: jest.fn(async (ruleId) => {
        return mockStorage.states.get(ruleId) || null;
      }),
      onHistorySave: jest.fn(async (eventData) => {
        mockStorage.history.push(JSON.parse(JSON.stringify(eventData)));
      }),
    };
  });

  describe('Persistence Configuration', () => {
    it('should validate persistence configuration on construction', async () => {
      expect(() => {
        new StatefulRuleEngine(baseEngine, {
          persistence: {
            enabled: true,
            autoSaveInterval: 1000,
            // Missing onStateSave - should throw
          },
        });
      }).toThrow('persistence.onStateSave is required when autoSaveInterval is enabled');
    });

    it('should validate onStateSave is a function', async () => {
      expect(() => {
        new StatefulRuleEngine(baseEngine, {
          persistence: {
            enabled: true,
            onStateSave: 'not a function',
          },
        });
      }).toThrow('persistence.onStateSave must be a function');
    });

    it('should validate onStateLoad is a function', async () => {
      expect(() => {
        new StatefulRuleEngine(baseEngine, {
          persistence: {
            enabled: true,
            onStateLoad: 123,
          },
        });
      }).toThrow('persistence.onStateLoad must be a function');
    });

    it('should validate onHistorySave is a function', async () => {
      expect(() => {
        new StatefulRuleEngine(baseEngine, {
          persistence: {
            enabled: true,
            onHistorySave: [],
          },
        });
      }).toThrow('persistence.onHistorySave must be a function');
    });

    it('should validate autoSaveInterval is a number', async () => {
      expect(() => {
        new StatefulRuleEngine(baseEngine, {
          persistence: {
            enabled: true,
            onStateSave: async () => {},
            autoSaveInterval: 'not a number',
          },
        });
      }).toThrow('persistence.autoSaveInterval must be a number');
    });

    it('should allow persistence without autoSaveInterval', async () => {
      expect(() => {
        new StatefulRuleEngine(baseEngine, {
          persistence: {
            enabled: true,
            onStateSave: async () => {},
          },
        });
      }).not.toThrow();
    });
  });

  describe('Manual State Persistence', () => {
    let statefulEngine;

    beforeEach(() => {
      statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          onStateSave: mockStorage.onStateSave,
          onStateLoad: mockStorage.onStateLoad,
        },
      });
    });

    it('should manually save state for a rule', async () => {
      const rule = { eq: ['status', 'active'] };
      const context = { status: 'active' };

      await statefulEngine.evaluate('test-rule', rule, context);

      await statefulEngine.saveState('test-rule');

      expect(mockStorage.onStateSave).toHaveBeenCalledWith(
        'test-rule',
        expect.objectContaining({
          previousContext: context,
          ruleState: expect.objectContaining({ success: true }),
          timestamp: expect.any(Number),
        })
      );
    });

    it('should throw error when saving without onStateSave hook', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        persistence: { enabled: false },
      });

      await expect(engine.saveState('test-rule')).rejects.toThrow(
        'persistence.onStateSave hook is not configured'
      );
    });

    it('should manually load state for a rule', async () => {
      const savedState = {
        previousContext: { status: 'active' },
        ruleState: { success: true },
        timestamp: Date.now(),
      };

      mockStorage.states.set('test-rule', savedState);

      const loadedState = await statefulEngine.loadState('test-rule');

      expect(mockStorage.onStateLoad).toHaveBeenCalledWith('test-rule');
      expect(loadedState).toEqual(savedState);

      // Verify state was restored to engine
      expect(statefulEngine.previousStates.get('test-rule')).toEqual(savedState.previousContext);
      expect(statefulEngine.ruleStates.get('test-rule')).toEqual(savedState.ruleState);
    });

    it('should throw error when loading without onStateLoad hook', async () => {
      const engine = new StatefulRuleEngine(baseEngine, {
        persistence: { enabled: false },
      });

      await expect(engine.loadState('test-rule')).rejects.toThrow(
        'persistence.onStateLoad hook is not configured'
      );
    });

    it('should handle loading non-existent state gracefully', async () => {
      const loadedState = await statefulEngine.loadState('non-existent');

      expect(loadedState).toBeNull();
    });
  });

  describe('Auto-Save Functionality', () => {
    it('should start persistence timer when autoSaveInterval is configured', async () => {
      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          autoSaveInterval: 5000,
          onStateSave: mockStorage.onStateSave,
        },
      });

      expect(statefulEngine.persistenceTimer).not.toBeNull();
      statefulEngine.stopPersistenceTimer();
    });

    it('should not start persistence timer when autoSaveInterval is not configured', async () => {
      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          onStateSave: mockStorage.onStateSave,
        },
      });

      expect(statefulEngine.persistenceTimer).toBeNull();
    });

    it('should flush pending saves at intervals', async () => {
      jest.useFakeTimers();

      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          autoSaveInterval: 1000,
          onStateSave: mockStorage.onStateSave,
        },
      });

      const rule = { eq: ['value', 'test'] };

      // Evaluate multiple rules
      await statefulEngine.evaluate('rule1', rule, { value: 'test' });
      await statefulEngine.evaluate('rule2', rule, { value: 'test' });

      expect(statefulEngine.pendingSaves.size).toBe(2);

      // Advance timer
      jest.advanceTimersByTime(1000);

      // Wait for async operations
      await jest.runOnlyPendingTimersAsync();

      expect(mockStorage.onStateSave).toHaveBeenCalledTimes(2);
      expect(statefulEngine.pendingSaves.size).toBe(0);

      statefulEngine.stopPersistenceTimer();
      jest.useRealTimers();
    });

    it('should retry failed saves', async () => {
      let callCount = 0;
      const failOnceSave = jest.fn(async (ruleId, state) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Save failed');
        }
        mockStorage.states.set(ruleId, state);
      });

      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          onStateSave: failOnceSave,
        },
      });

      await statefulEngine.evaluate('test-rule', { eq: ['value', 'test'] }, { value: 'test' });

      // First flush - should fail and re-add to pending
      await statefulEngine.flushPendingSaves();

      expect(failOnceSave).toHaveBeenCalledTimes(1);
      expect(statefulEngine.pendingSaves.has('test-rule')).toBe(true);

      // Second flush - should succeed
      await statefulEngine.flushPendingSaves();

      expect(failOnceSave).toHaveBeenCalledTimes(2);
      expect(statefulEngine.pendingSaves.has('test-rule')).toBe(false);
    });
  });

  describe('History Persistence', () => {
    it('should save history entries automatically', async () => {
      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
        persistence: {
          enabled: true,
          onHistorySave: mockStorage.onHistorySave,
        },
      });

      const rule = { changed: ['status'] };

      await statefulEngine.evaluate('test-rule', rule, { status: 'pending' });
      await statefulEngine.evaluate('test-rule', rule, { status: 'active' });

      // Wait for async history save to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockStorage.onHistorySave).toHaveBeenCalledTimes(2);
      expect(mockStorage.history).toHaveLength(2);
    });

    it('should handle history save errors gracefully', async () => {
      const failingSave = jest.fn(async () => {
        throw new Error('History save failed');
      });

      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
        persistence: {
          enabled: true,
          onHistorySave: failingSave,
        },
      });

      // Should not throw
      await expect(
        statefulEngine.evaluate('test-rule', { eq: ['value', 'test'] }, { value: 'test' })
      ).resolves.toBeDefined();

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify it was called even though it failed
      expect(failingSave).toHaveBeenCalled();
    });
  });

  describe('Serialization and Hydration', () => {
    let statefulEngine;

    beforeEach(() => {
      statefulEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
        triggerOnEveryChange: true,
        maxHistorySize: 50,
      });
    });

    it('should serialize complete engine state', async () => {
      const rule = { changed: ['value'] };

      await statefulEngine.evaluate('rule1', rule, { value: 1 });
      await statefulEngine.evaluate('rule2', rule, { value: 'a' });
      await statefulEngine.evaluate('rule1', rule, { value: 2 });

      const serialized = statefulEngine.serialize();

      expect(serialized).toHaveProperty('states');
      expect(serialized).toHaveProperty('history');
      expect(serialized).toHaveProperty('options');
      expect(serialized).toHaveProperty('metadata');

      expect(Object.keys(serialized.states)).toHaveLength(2);
      expect(serialized.history).toHaveLength(3);
      expect(serialized.metadata.ruleCount).toBe(2);
    });

    it('should include all state components in serialization', async () => {
      const rule = { eq: ['status', 'active'] };
      const context = { status: 'active', id: 123 };

      await statefulEngine.evaluate('test-rule', rule, context);

      const serialized = statefulEngine.serialize();

      expect(serialized.states['test-rule']).toEqual({
        previousContext: context,
        ruleState: expect.objectContaining({ success: true }),
        timestamp: expect.any(Number),
      });
    });

    it('should hydrate engine state from serialized data', async () => {
      const rule = { changed: ['value'] };

      // Create some state
      await statefulEngine.evaluate('rule1', rule, { value: 1 });
      await statefulEngine.evaluate('rule1', rule, { value: 2 });

      // Serialize
      const serialized = statefulEngine.serialize();

      // Create new engine and hydrate
      const newEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
      });

      const result = await newEngine.hydrate(serialized);

      expect(result.restoredRules).toBe(1);
      expect(result.restoredHistory).toBe(2);
      expect(result.metadata).toEqual(serialized.metadata);

      // Verify state was restored
      expect(newEngine.previousStates.get('rule1')).toEqual({ value: 2 });
      expect(newEngine.ruleStates.get('rule1')).toEqual(expect.objectContaining({ success: true }));
    });

    it('should clear existing state before hydration', async () => {
      await statefulEngine.evaluate('old-rule', { eq: ['value', 'test'] }, { value: 'test' });

      const serialized = {
        states: {
          'new-rule': {
            previousContext: { value: 'new' },
            ruleState: { success: true },
            timestamp: Date.now(),
          },
        },
        history: [],
      };

      await statefulEngine.hydrate(serialized);

      expect(statefulEngine.previousStates.has('old-rule')).toBe(false);
      expect(statefulEngine.previousStates.has('new-rule')).toBe(true);
    });

    it('should throw error for invalid hydration data', async () => {
      await expect(statefulEngine.hydrate(null)).rejects.toThrow(
        'Hydration data must be an object'
      );
      await expect(statefulEngine.hydrate('invalid')).rejects.toThrow(
        'Hydration data must be an object'
      );
    });

    it('should handle partial hydration data', async () => {
      const result = await statefulEngine.hydrate({
        states: {
          'test-rule': {
            previousContext: { value: 'test' },
          },
        },
        // Missing history
      });

      expect(result.restoredRules).toBe(1);
      expect(result.restoredHistory).toBe(0);
    });
  });

  describe('Integration with Evaluation', () => {
    it('should mark rules for save after evaluation', async () => {
      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          onStateSave: mockStorage.onStateSave,
        },
      });

      const rule = { eq: ['value', 'test'] };

      await statefulEngine.evaluate('test-rule', rule, { value: 'test' });

      expect(statefulEngine.pendingSaves.has('test-rule')).toBe(true);
    });

    it('should not mark for save when persistence is disabled', async () => {
      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: { enabled: false },
      });

      const rule = { eq: ['value', 'test'] };

      await statefulEngine.evaluate('test-rule', rule, { value: 'test' });

      expect(statefulEngine.pendingSaves.size).toBe(0);
    });
  });

  describe('Cleanup and Destroy', () => {
    it('should flush pending saves before destroy', async () => {
      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          onStateSave: mockStorage.onStateSave,
        },
      });

      await statefulEngine.evaluate('test-rule', { eq: ['value', 'test'] }, { value: 'test' });

      expect(statefulEngine.pendingSaves.size).toBe(1);

      await statefulEngine.destroy();

      expect(mockStorage.onStateSave).toHaveBeenCalledTimes(1);
      expect(statefulEngine.pendingSaves.size).toBe(0);
    });

    it('should stop persistence timer on destroy', async () => {
      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          autoSaveInterval: 5000,
          onStateSave: mockStorage.onStateSave,
        },
      });

      expect(statefulEngine.persistenceTimer).not.toBeNull();

      await statefulEngine.destroy();

      expect(statefulEngine.persistenceTimer).toBeNull();
    });
  });

  describe('Real-World Persistence Scenarios', () => {
    it('should support file-based persistence', async () => {
      const fileStorage = {
        data: {},
        save: jest.fn(async (key, value) => {
          fileStorage.data[key] = value;
        }),
        load: jest.fn(async (key) => {
          return fileStorage.data[key] || null;
        }),
      };

      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          onStateSave: async (ruleId, state) => {
            await fileStorage.save(`state:${ruleId}`, state);
          },
          onStateLoad: async (ruleId) => {
            return await fileStorage.load(`state:${ruleId}`);
          },
        },
      });

      // Evaluate and save
      await statefulEngine.evaluate(
        'user-rule',
        { eq: ['status', 'active'] },
        { status: 'active' }
      );
      await statefulEngine.saveState('user-rule');

      expect(fileStorage.data['state:user-rule']).toBeDefined();

      // Load in new engine
      const newEngine = new StatefulRuleEngine(baseEngine, {
        persistence: {
          enabled: true,
          onStateLoad: async (ruleId) => {
            return await fileStorage.load(`state:${ruleId}`);
          },
        },
      });

      const loadedState = await newEngine.loadState('user-rule');
      expect(loadedState.previousContext.status).toBe('active');
    });

    it('should support database-like persistence with transactions', async () => {
      const dbStorage = {
        states: new Map(),
        history: [],
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      const statefulEngine = new StatefulRuleEngine(baseEngine, {
        storeHistory: true,
        persistence: {
          enabled: true,
          onStateSave: async (ruleId, state) => {
            dbStorage.beginTransaction();
            try {
              dbStorage.states.set(ruleId, state);
              dbStorage.commit();
            } catch (error) {
              dbStorage.rollback();
              throw error;
            }
          },
          onHistorySave: async (eventData) => {
            dbStorage.history.push(eventData);
          },
        },
      });

      await statefulEngine.evaluate('db-rule', { changed: ['value'] }, { value: 1 });
      await statefulEngine.evaluate('db-rule', { changed: ['value'] }, { value: 2 });

      await statefulEngine.saveState('db-rule');

      expect(dbStorage.beginTransaction).toHaveBeenCalled();
      expect(dbStorage.commit).toHaveBeenCalled();
    });
  });
});
