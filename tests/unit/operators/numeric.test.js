const { createRuleEngine, createRuleHelpers } = require('../../../src/index.js');

describe('Numeric Operators - Coverage', () => {
  let engine;
  let strictEngine;
  let looseEngine;
  let h;

  beforeEach(() => {
    engine = createRuleEngine();
    strictEngine = createRuleEngine({ strict: true });
    looseEngine = createRuleEngine({ strict: false });
    h = createRuleHelpers();
  });

  describe('GT (Greater Than) Operator', () => {
    describe('Basic Functionality', () => {
      it('should handle integer comparisons', () => {
        expectRuleToPass(engine, { gt: ['user.age', 25] });
        expectRuleToFail(engine, { gt: ['user.age', 30] });
        expectRuleToFail(engine, { gt: ['user.age', 28] }); // Equal case
      });

      it('should handle decimal comparisons', () => {
        const context = { product: { price: 99.99, rating: 4.5 } };
        expectRuleToPass(engine, { gt: ['product.price', 50.0] }, context);
        expectRuleToPass(engine, { gt: ['product.rating', 4.0] }, context);
        expectRuleToFail(engine, { gt: ['product.rating', 5.0] }, context);
      });

      it('should handle negative numbers', () => {
        const context = { temperature: { celsius: -5, fahrenheit: 23 } };
        expectRuleToPass(
          engine,
          { gt: ['temperature.fahrenheit', 'temperature.celsius'] },
          context
        );
        expectRuleToPass(engine, { gt: ['temperature.celsius', -10] }, context);
        expectRuleToFail(engine, { gt: ['temperature.celsius', 0] }, context);
      });

      it('should handle zero comparisons', () => {
        const context = { balance: { checking: 0, savings: 100 } };
        expectRuleToPass(engine, { gt: ['balance.savings', 'balance.checking'] }, context);
        expectRuleToPass(engine, { gt: ['balance.checking', -1] }, context);
        expectRuleToFail(engine, { gt: ['balance.checking', 0] }, context);
      });
    });

    describe('Dynamic Field Comparison', () => {
      it('should compare dynamic fields successfully', () => {
        const context = {
          exam: { studentScore: 85, passingScore: 70, maxScore: 100 },
          performance: { current: 95.5, previous: 88.2, target: 90.0 },
        };

        expectRuleToPass(engine, { gt: ['exam.studentScore', 'exam.passingScore'] }, context);
        expectRuleToPass(engine, { gt: ['performance.current', 'performance.previous'] }, context);
        expectRuleToPass(engine, { gt: ['performance.current', 'performance.target'] }, context);
        expectRuleToFail(engine, { gt: ['exam.studentScore', 'exam.maxScore'] }, context);
      });

      it('should handle complex nested field comparisons', () => {
        const context = {
          company: {
            sales: { q1: 150000, q2: 175000, q3: 165000, q4: 180000 },
            targets: { q1: 140000, q2: 160000, q3: 170000, q4: 175000 },
            costs: { q1: 120000, q2: 135000, q3: 140000, q4: 150000 },
          },
        };

        expectRuleToPass(engine, { gt: ['company.sales.q2', 'company.sales.q1'] }, context);
        expectRuleToPass(engine, { gt: ['company.sales.q4', 'company.targets.q4'] }, context);
        expectRuleToFail(engine, { gt: ['company.sales.q3', 'company.targets.q3'] }, context);
      });
    });

    describe('Real-World Scenarios', () => {
      it('should handle financial calculations', () => {
        const context = {
          portfolio: {
            currentValue: 125000.5,
            initialInvestment: 100000.0,
            targetValue: 150000.0,
            riskTolerance: 0.15,
          },
          market: {
            gainThreshold: 0.2,
            currentGain: 0.255,
          },
        };

        expectRuleToPass(
          engine,
          { gt: ['portfolio.currentValue', 'portfolio.initialInvestment'] },
          context
        );
        expectRuleToFail(
          engine,
          { gt: ['portfolio.currentValue', 'portfolio.targetValue'] },
          context
        );
        expectRuleToPass(engine, { gt: ['market.currentGain', 'market.gainThreshold'] }, context);
      });

      it('should handle performance metrics', () => {
        const context = {
          server: {
            cpuUsage: 65.8,
            memoryUsage: 78.2,
            diskUsage: 45.1,
            thresholds: {
              cpuWarning: 70.0,
              memoryWarning: 80.0,
              diskWarning: 85.0,
            },
          },
        };

        expectRuleToFail(
          engine,
          { gt: ['server.cpuUsage', 'server.thresholds.cpuWarning'] },
          context
        );
        expectRuleToFail(
          engine,
          { gt: ['server.memoryUsage', 'server.thresholds.memoryWarning'] },
          context
        );
        expectRuleToFail(
          engine,
          { gt: ['server.diskUsage', 'server.thresholds.diskWarning'] },
          context
        );
      });
    });
  });

  describe('GTE (Greater Than or Equal) Operator', () => {
    describe('Basic Functionality', () => {
      it('should handle equal values', () => {
        expectRuleToPass(engine, { gte: ['user.age', 28] }); // Equal case
        expectRuleToPass(engine, { gte: ['user.age', 25] });
        expectRuleToFail(engine, { gte: ['user.age', 30] });
      });

      it('should handle boundary conditions', () => {
        const context = {
          limits: { min: 0, max: 100, current: 100 },
        };

        expectRuleToPass(engine, { gte: ['limits.current', 'limits.max'] }, context);
        expectRuleToPass(engine, { gte: ['limits.current', 'limits.min'] }, context);
        expectRuleToPass(engine, { gte: ['limits.max', 'limits.min'] }, context);
      });
    });

    describe('Real-World Scenarios', () => {
      it('should handle age verification', () => {
        const context = {
          users: [
            { name: 'Alice', age: 25, requiredAge: 21 },
            { name: 'Bob', age: 18, requiredAge: 18 },
            { name: 'Charlie', age: 16, requiredAge: 18 },
          ],
          currentUser: { age: 22, requiredAge: 21 },
        };

        expectRuleToPass(engine, { gte: ['currentUser.age', 'currentUser.requiredAge'] }, context);
        expectRuleToPass(engine, { gte: ['currentUser.age', 18] }, context);
        expectRuleToPass(engine, { gte: ['currentUser.age', 21] }, context);
      });

      it('should handle credit scoring', () => {
        const context = {
          creditCheck: {
            score: 720,
            minimumRequired: 650,
            excellentThreshold: 750,
            income: 75000,
            minimumIncome: 50000,
            debtRatio: 0.25,
            maxDebtRatio: 0.4,
          },
        };

        expectRuleToPass(
          engine,
          { gte: ['creditCheck.score', 'creditCheck.minimumRequired'] },
          context
        );
        expectRuleToPass(
          engine,
          { gte: ['creditCheck.income', 'creditCheck.minimumIncome'] },
          context
        );
        expectRuleToPass(
          engine,
          { gte: ['creditCheck.maxDebtRatio', 'creditCheck.debtRatio'] },
          context
        );
        expectRuleToFail(
          engine,
          { gte: ['creditCheck.score', 'creditCheck.excellentThreshold'] },
          context
        );
      });
    });
  });

  describe('LT (Less Than) Operator', () => {
    describe('Basic Functionality', () => {
      it('should handle basic less than comparisons', () => {
        expectRuleToPass(engine, { lt: ['user.age', 30] });
        expectRuleToFail(engine, { lt: ['user.age', 25] });
        expectRuleToFail(engine, { lt: ['user.age', 28] }); // Equal case
      });
    });

    describe('Real-World Scenarios', () => {
      it('should handle resource limits', () => {
        const context = {
          api: {
            requestsPerMinute: 45,
            maxRequestsPerMinute: 60,
            responseTime: 250,
            maxResponseTime: 500,
            errorRate: 0.02,
            maxErrorRate: 0.05,
          },
        };

        expectRuleToPass(
          engine,
          { lt: ['api.requestsPerMinute', 'api.maxRequestsPerMinute'] },
          context
        );
        expectRuleToPass(engine, { lt: ['api.responseTime', 'api.maxResponseTime'] }, context);
        expectRuleToPass(engine, { lt: ['api.errorRate', 'api.maxErrorRate'] }, context);
      });

      it('should handle inventory management', () => {
        const context = {
          warehouse: {
            currentStock: 150,
            reorderPoint: 200,
            maxCapacity: 1000,
            reservedItems: 75,
            availableSpace: 850,
          },
        };

        expectRuleToPass(
          engine,
          { lt: ['warehouse.currentStock', 'warehouse.reorderPoint'] },
          context
        );
        expectRuleToPass(
          engine,
          { lt: ['warehouse.availableSpace', 'warehouse.maxCapacity'] },
          context
        );
        expectRuleToPass(
          engine,
          { lt: ['warehouse.reservedItems', 'warehouse.currentStock'] },
          context
        );
      });
    });
  });

  describe('LTE (Less Than or Equal) Operator', () => {
    describe('Basic Functionality', () => {
      it('should handle equal values', () => {
        expectRuleToPass(engine, { lte: ['user.age', 28] }); // Equal case
        expectRuleToPass(engine, { lte: ['user.age', 30] });
        expectRuleToFail(engine, { lte: ['user.age', 25] });
      });
    });

    describe('Real-World Scenarios', () => {
      it('should handle budget constraints', () => {
        const context = {
          project: {
            actualCost: 45000,
            budgetLimit: 50000,
            timeSpent: 120,
            timeLimit: 160,
            teamSize: 5,
            maxTeamSize: 8,
          },
        };

        expectRuleToPass(engine, { lte: ['project.actualCost', 'project.budgetLimit'] }, context);
        expectRuleToPass(engine, { lte: ['project.timeSpent', 'project.timeLimit'] }, context);
        expectRuleToPass(engine, { lte: ['project.teamSize', 'project.maxTeamSize'] }, context);
      });

      it('should handle capacity planning', () => {
        const context = {
          datacenter: {
            currentLoad: 75.5,
            maxLoad: 80.0,
            powerConsumption: 450.2,
            powerLimit: 500.0,
            storageUsed: 850,
            storageCapacity: 1000,
          },
        };

        expectRuleToPass(
          engine,
          { lte: ['datacenter.currentLoad', 'datacenter.maxLoad'] },
          context
        );
        expectRuleToPass(
          engine,
          { lte: ['datacenter.powerConsumption', 'datacenter.powerLimit'] },
          context
        );
        expectRuleToPass(
          engine,
          { lte: ['datacenter.storageUsed', 'datacenter.storageCapacity'] },
          context
        );
      });
    });
  });

  describe('Type Coercion and Strict Mode', () => {
    describe('String to Number Coercion', () => {
      it('should handle string numbers in loose mode', () => {
        const context = {
          form: {
            stringAge: '28',
            stringScore: '95.5',
            numberTarget: 30,
            floatTarget: 90.0
          }
        };

        expectRuleToPass(looseEngine, { gt: ['form.stringAge', 25] }, context); // '28' > 25 = true
        expectRuleToPass(looseEngine, { lt: ['form.stringAge', 'form.numberTarget'] }, context); // '28' < 30 = true
        expectRuleToPass(looseEngine, { gte: ['form.stringScore', 'form.floatTarget'] }, context); // '95.5' >= 90.0 = true
      });

      it('should reject string numbers in strict mode', () => {
        const context = {
          form: { stringAge: '28', numberTarget: 30 },
        };

        const result = strictEngine.evaluateExpr({ gt: ['form.stringAge', 25] }, context);
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires numeric operands');
      });

      it('should handle edge cases in coercion', () => {
        const context = {
          data: {
            emptyString: '',
            nullValue: null,
            undefinedValue: undefined,
            booleanTrue: true,
            booleanFalse: false,
            scientificNotation: '1.5e2',
            hexNumber: '0x10',
            infinity: Infinity,
            negativeInfinity: -Infinity,
          },
        };

        // Loose mode should handle most coercions
        expectRuleToFail(looseEngine, { gt: ['data.emptyString', 0] }, context);
        expectRuleToFail(looseEngine, { gt: ['data.nullValue', 0] }, context);
        expectRuleToPass(looseEngine, { gt: ['data.scientificNotation', 100] }, context); // 150 > 100

        // Strict mode should reject non-numbers
        const strictResult = strictEngine.evaluateExpr({ gt: ['data.booleanTrue', 0] }, context);
        expect(strictResult.success).toBe(false);
      });
    });

    describe('Options Parameter', () => {
      it('should respect explicit strict option', () => {
        const context = { value: '25' };

        // Explicit strict=true should override engine default
        const strictResult = engine.evaluateExpr({ gt: ['value', 20, { strict: true }] }, context);
        expect(strictResult.success).toBe(false);

        // Explicit strict=false should allow coercion
        expectRuleToPass(engine, { gt: ['value', 20, { strict: false }] }, context);
      });

      it('should handle missing options gracefully', () => {
        const context = { value: 25 };

        // Two arguments - should work
        expectRuleToPass(engine, { gt: ['value', 20] }, context);

        // Three arguments with undefined options - should work
        expectRuleToPass(engine, { gt: ['value', 20, undefined] }, context);

        // Three arguments with empty options - should work
        expectRuleToPass(engine, { gt: ['value', 20, {}] }, context);
      });
    });
  });

  describe('Error Handling', () => {
    describe('Invalid Arguments', () => {
      it('should handle insufficient arguments', () => {
        const result = engine.evaluateExpr({ gt: ['user.age'] }, global.testContext);
        expect(result.success).toBe(false);
        expect(result.error).toContain('GT operator requires 2-3 arguments');
      });

      it('should handle too many arguments', () => {
        const result = engine.evaluateExpr(
          { gt: ['user.age', 25, {}, 'extra'] },
          global.testContext
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('GT operator requires 2-3 arguments');
      });

      it('should handle non-array arguments', () => {
        const result = engine.evaluateExpr(
          { gt: 'not_an_array' },
          global.testContext
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid arguments for operator gt');
      });
    });

    describe('Non-Numeric Values', () => {
      it('should handle non-numeric strings', () => {
        const context = { data: { text: 'hello', number: 42 } };

        const result = engine.evaluateExpr({ gt: ['data.text', 'data.number'] }, context);
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires numeric operands');
      });

      it('should handle objects and arrays', () => {
        const context = {
          data: {
            object: { nested: 'value' },
            array: [1, 2, 3],
            number: 42,
          },
        };

        const objectResult = engine.evaluateExpr({ gt: ['data.object', 'data.number'] }, context);
        expect(objectResult.success).toBe(false);
        expect(objectResult.error).toContain('requires numeric operands');

        const arrayResult = engine.evaluateExpr({ gt: ['data.array', 'data.number'] }, context);
        expect(arrayResult.success).toBe(false);
        expect(arrayResult.error).toContain('requires numeric operands');
      });

      it('should provide detailed error context', () => {
        const context = { data: { text: 'not_a_number' } };

        const result = engine.evaluateExpr({ gte: ['data.text', 50] }, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('GTE operator requires numeric operands');
        expect(result.details).toBeDefined();
        expect(result.details.args[0]).toBe('data.text');
        expect(result.details.args[1]).toBe(50);
        expect(result.details.context).toBeDefined();
        expect(result.details.context.data.text).toBe('not_a_number');
      });
    });

    describe('Path Resolution Errors', () => {
      it('should handle non-existent paths gracefully', () => {
        const result = engine.evaluateExpr({ gt: ['nonexistent.path', 42] }, global.testContext);
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires numeric operands');
      });

      it('should handle nested path resolution errors', () => {
        const context = { level1: null };

        const result = engine.evaluateExpr({ lt: ['level1.level2.value', 100] }, context);
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires numeric operands');
      });
    });
  });

  describe('Integration with Rule Helpers', () => {
    it('should work seamlessly with rule helpers', () => {
      const context = {
        performance: {
          cpu: 65.5,
          memory: 78.2,
          disk: 45.1,
          limits: {
            cpu: 80.0,
            memory: 85.0,
            disk: 90.0,
          },
        },
      };

      const systemHealthRule = h.and(
        h.lt('performance.cpu', 'performance.limits.cpu'),
        h.lt('performance.memory', 'performance.limits.memory'),
        h.lt('performance.disk', 'performance.limits.disk'),
        h.gte('performance.cpu', 0),
        h.gte('performance.memory', 0),
        h.gte('performance.disk', 0)
      );

      expectRuleToPass(engine, systemHealthRule, context);
    });

    it('should handle complex business logic', () => {
      const context = {
        loan: {
          requestedAmount: 250000,
          applicantIncome: 75000,
          creditScore: 720,
          debtToIncomeRatio: 0.28,
          downPayment: 50000,
        },
        criteria: {
          maxLoanAmount: 400000,
          minIncome: 50000,
          minCreditScore: 650,
          maxDebtRatio: 0.43,
          minDownPayment: 40000,
        },
      };

      const loanApprovalRule = h.and(
        h.lte('loan.requestedAmount', 'criteria.maxLoanAmount'),
        h.gte('loan.applicantIncome', 'criteria.minIncome'),
        h.gte('loan.creditScore', 'criteria.minCreditScore'),
        h.lte('loan.debtToIncomeRatio', 'criteria.maxDebtRatio'),
        h.gte('loan.downPayment', 'criteria.minDownPayment'),
        // Additional business rules
        h.lt('loan.requestedAmount', h.gt('loan.applicantIncome', 0) ? 400000 : 0), // Income multiple check
        h.gt('loan.creditScore', 600) // Basic credit check
      );

      expectRuleToPass(engine, loanApprovalRule, context);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very large numbers', () => {
      const context = {
        bigNumbers: {
          value1: Number.MAX_SAFE_INTEGER,
          value2: Number.MAX_SAFE_INTEGER - 1,
          scientificLarge: 1.23e308,
          scientificSmall: 1.23e-308,
        },
      };

      expectRuleToPass(engine, { gt: ['bigNumbers.value1', 'bigNumbers.value2'] }, context);
      expectRuleToPass(
        engine,
        { gt: ['bigNumbers.scientificLarge', 'bigNumbers.scientificSmall'] },
        context
      );
    });

    it('should handle special numeric values', () => {
      const context = {
        special: {
          infinity: Infinity,
          negativeInfinity: -Infinity,
          notANumber: NaN,
          zero: 0,
          negativeZero: -0,
          regularNumber: 42,
        },
      };

      expectRuleToPass(engine, { gt: ['special.infinity', 'special.regularNumber'] }, context);
      expectRuleToPass(
        engine,
        { lt: ['special.negativeInfinity', 'special.regularNumber'] },
        context
      );

      // NaN comparisons should fail (NaN is not greater than anything)
      const nanResult = engine.evaluateExpr(
        { gt: ['special.notANumber', 'special.regularNumber'] },
        context
      );
      expect(nanResult.success).toBe(false);
    });

    it('should maintain precision with floating point numbers', () => {
      const context = {
        precision: {
          value1: 0.1 + 0.2, // 0.30000000000000004
          value2: 0.3,
          currency1: 99.99,
          currency2: 100.0,
        },
      };

      // Note: This test shows floating point precision issues
      // In real applications, you might want to handle this differently
      expectRuleToPass(engine, { gt: ['precision.value1', 'precision.value2'] }, context);
      expectRuleToPass(engine, { lt: ['precision.currency1', 'precision.currency2'] }, context);
    });
  });

  describe('Multi-Operator Combinations', () => {
    it('should work correctly in complex logical combinations', () => {
      const context = {
        trading: {
          currentPrice: 145.5,
          buyPrice: 140.0,
          stopLoss: 130.0,
          targetPrice: 160.0,
          volume: 1500,
          minVolume: 1000,
          maxRisk: 0.1,
          currentRisk: 0.08,
        },
      };

      const tradingRule = h.and(
        h.gt('trading.currentPrice', 'trading.buyPrice'),
        h.gt('trading.currentPrice', 'trading.stopLoss'),
        h.lt('trading.currentPrice', 'trading.targetPrice'),
        h.gte('trading.volume', 'trading.minVolume'),
        h.lte('trading.currentRisk', 'trading.maxRisk'),
        h.or(
          h.gt('trading.currentPrice', 145.0),
          h.and(h.gte('trading.volume', 2000), h.lte('trading.currentRisk', 0.05))
        )
      );

      expectRuleToPass(engine, tradingRule, context);
    });
  });
});
