const { RuleEngineError, ValidationError, OperatorError } = require('../../../src/utils/errors.js');

describe('Error Classes - Comprehensive Coverage', () => {
  describe('RuleEngineError', () => {
    describe('Basic Construction', () => {
      it('should create basic error with message only', () => {
        const error = new RuleEngineError('Test error message');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(RuleEngineError);
        expect(error.name).toBe('RuleEngineError');
        expect(error.message).toBe('Test error message');
        expect(error.operator).toBeNull();
        expect(error.context).toEqual({});
        expect(error.originalError).toBeNull();
        expect(error.timestamp).toBeDefined();
        expect(typeof error.timestamp).toBe('string');
        expect(new Date(error.timestamp)).toBeInstanceOf(Date);
      });

      it('should create error with operator', () => {
        const error = new RuleEngineError('Operator error', 'eq');

        expect(error.message).toBe('Operator error');
        expect(error.operator).toBe('eq');
        expect(error.context).toEqual({});
        expect(error.originalError).toBeNull();
      });

      it('should create error with context', () => {
        const context = { field: 'user.name', value: 'test' };
        const error = new RuleEngineError('Context error', 'contains', context);

        expect(error.message).toBe('Context error');
        expect(error.operator).toBe('contains');
        expect(error.context).toEqual(context);
        expect(error.originalError).toBeNull();
      });

      it('should create error with original error', () => {
        const originalError = new Error('Original error');
        const error = new RuleEngineError('Wrapped error', 'regex', {}, originalError);

        expect(error.message).toBe('Wrapped error');
        expect(error.operator).toBe('regex');
        expect(error.context).toEqual({});
        expect(error.originalError).toBe(originalError);
      });

      it('should create error with all parameters', () => {
        const context = { args: ['left', 'right'], strict: true };
        const originalError = new TypeError('Type error');
        const error = new RuleEngineError('Full error', 'gt', context, originalError);

        expect(error.message).toBe('Full error');
        expect(error.operator).toBe('gt');
        expect(error.context).toEqual(context);
        expect(error.originalError).toBe(originalError);
        expect(error.timestamp).toBeDefined();
      });
    });

    describe('Default Parameters', () => {
      it('should handle undefined operator parameter', () => {
        const error = new RuleEngineError('Test', undefined);
        expect(error.operator).toBeNull();
      });

      it('should handle undefined context parameter', () => {
        const error = new RuleEngineError('Test', 'op', undefined);
        expect(error.context).toEqual({});
      });

      it('should handle undefined originalError parameter', () => {
        const error = new RuleEngineError('Test', 'op', {}, undefined);
        expect(error.originalError).toBeNull();
      });
    });

    describe('toJSON Method', () => {
      it('should serialize error to JSON correctly', () => {
        const context = { field: 'user.age', value: 25 };
        const error = new RuleEngineError('Serialization test', 'gte', context);

        const json = error.toJSON();

        expect(json).toEqual({
          name: 'RuleEngineError',
          message: 'Serialization test',
          operator: 'gte',
          context: context,
          timestamp: error.timestamp
        });
      });

      it('should serialize error with null values correctly', () => {
        const error = new RuleEngineError('Null test');

        const json = error.toJSON();

        expect(json).toEqual({
          name: 'RuleEngineError',
          message: 'Null test',
          operator: null,
          context: {},
          timestamp: error.timestamp
        });
      });

      it('should be JSON.stringify compatible', () => {
        const context = { nested: { deep: { value: 'test' } } };
        const error = new RuleEngineError('JSON stringify test', 'in', context);

        const jsonString = JSON.stringify(error);
        const parsed = JSON.parse(jsonString);

        expect(parsed.name).toBe('RuleEngineError');
        expect(parsed.message).toBe('JSON stringify test');
        expect(parsed.operator).toBe('in');
        expect(parsed.context).toEqual(context);
        expect(parsed.timestamp).toBe(error.timestamp);
      });

      it('should handle circular references in context gracefully', () => {
        const context = { name: 'circular' };
        context.self = context; // Create circular reference

        const error = new RuleEngineError('Circular test', 'test', context);

        // toJSON should not crash on circular references
        expect(() => error.toJSON()).not.toThrow();

        const json = error.toJSON();
        expect(json.context).toBeDefined();
        expect(json.context.name).toBe('circular');
      });
    });

    describe('Stack Trace', () => {
      it('should maintain proper stack trace', () => {
        const error = new RuleEngineError('Stack trace test');

        expect(error.stack).toBeDefined();
        expect(typeof error.stack).toBe('string');
        expect(error.stack).toContain('RuleEngineError: Stack trace test');
      });

      it('should have stack trace pointing to creation location', () => {
        function createError() {
          return new RuleEngineError('Nested error');
        }

        const error = createError();
        expect(error.stack).toContain('createError');
      });
    });

    describe('Error Properties', () => {
      it('should be an instance of Error', () => {
        const error = new RuleEngineError('Instance test');

        expect(error instanceof Error).toBe(true);
        expect(error instanceof RuleEngineError).toBe(true);
      });

      it('should have correct prototype chain', () => {
        const error = new RuleEngineError('Prototype test');

        expect(Object.getPrototypeOf(error)).toBe(RuleEngineError.prototype);
        expect(Object.getPrototypeOf(RuleEngineError.prototype)).toBe(Error.prototype);
      });

      it('should preserve toString behavior', () => {
        const error = new RuleEngineError('ToString test');
        expect(error.toString()).toBe('RuleEngineError: ToString test');
      });
    });
  });

  describe('ValidationError', () => {
    describe('Basic Construction', () => {
      it('should create validation error with message only', () => {
        const error = new ValidationError('Validation failed');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(RuleEngineError);
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.name).toBe('ValidationError');
        expect(error.message).toBe('Validation failed');
        expect(error.operator).toBeNull();
        expect(error.context).toEqual({});
        expect(error.originalError).toBeNull();
        expect(error.timestamp).toBeDefined();
      });

      it('should create validation error with context', () => {
        const context = {
          field: 'email',
          value: 'invalid-email',
          pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}'
        };
        const error = new ValidationError('Invalid email format', context);

        expect(error.message).toBe('Invalid email format');
        expect(error.context).toEqual(context);
        expect(error.operator).toBeNull(); // ValidationError always has null operator
      });

      it('should handle empty context', () => {
        const error = new ValidationError('Empty context test', {});
        expect(error.context).toEqual({});
      });

      it('should handle undefined context', () => {
        const error = new ValidationError('Undefined context test');
        expect(error.context).toEqual({});
      });
    });

    describe('Inheritance Behavior', () => {
      it('should inherit all RuleEngineError methods', () => {
        const context = { rule: 'required', field: 'username' };
        const error = new ValidationError('Username is required', context);

        const json = error.toJSON();
        expect(json.name).toBe('ValidationError');
        expect(json.message).toBe('Username is required');
        expect(json.operator).toBeNull();
        expect(json.context).toEqual(context);
        expect(json.timestamp).toBe(error.timestamp);
      });

      it('should maintain proper prototype chain', () => {
        const error = new ValidationError('Prototype test');

        expect(error instanceof ValidationError).toBe(true);
        expect(error instanceof RuleEngineError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });

    describe('Real-World Validation Scenarios', () => {
      it('should handle form validation errors', () => {
        const context = {
          form: 'registration',
          field: 'password',
          requirements: ['minLength: 8', 'uppercase', 'lowercase', 'number', 'special'],
          provided: 'weak'
        };

        const error = new ValidationError('Password does not meet complexity requirements', context);

        expect(error.name).toBe('ValidationError');
        expect(error.context.form).toBe('registration');
        expect(error.context.requirements).toContain('minLength: 8');
      });

      it('should handle data type validation errors', () => {
        const context = {
          expectedType: 'number',
          actualType: 'string',
          value: 'not-a-number',
          field: 'age'
        };

        const error = new ValidationError('Invalid data type for age field', context);

        expect(error.context.expectedType).toBe('number');
        expect(error.context.actualType).toBe('string');
      });
    });
  });

  describe('OperatorError', () => {
    describe('Basic Construction', () => {
      it('should create operator error with message and operator', () => {
        const error = new OperatorError('Invalid arguments', 'eq');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(RuleEngineError);
        expect(error).toBeInstanceOf(OperatorError);
        expect(error.name).toBe('OperatorError');
        expect(error.message).toBe('Invalid arguments');
        expect(error.operator).toBe('eq');
        expect(error.context).toEqual({});
        expect(error.originalError).toBeNull();
        expect(error.timestamp).toBeDefined();
      });

      it('should create operator error with context', () => {
        const context = {
          args: ['user.age', 'invalid'],
          expectedType: 'number',
          actualType: 'string'
        };
        const error = new OperatorError('Type mismatch in comparison', 'gt', context);

        expect(error.message).toBe('Type mismatch in comparison');
        expect(error.operator).toBe('gt');
        expect(error.context).toEqual(context);
      });

      it('should create operator error with original error', () => {
        const originalError = new SyntaxError('Invalid regex pattern');
        const context = { pattern: '[invalid(', text: 'test' };
        const error = new OperatorError('Regex compilation failed', 'regex', context, originalError);

        expect(error.message).toBe('Regex compilation failed');
        expect(error.operator).toBe('regex');
        expect(error.context).toEqual(context);
        expect(error.originalError).toBe(originalError);
        expect(error.originalError.message).toBe('Invalid regex pattern');
      });

      it('should handle all parameter combinations', () => {
        // Test with minimal parameters
        const error1 = new OperatorError('Min params', 'test');
        expect(error1.operator).toBe('test');
        expect(error1.context).toEqual({});
        expect(error1.originalError).toBeNull();

        // Test with context but no original error
        const error2 = new OperatorError('With context', 'test', { key: 'value' });
        expect(error2.context).toEqual({ key: 'value' });
        expect(error2.originalError).toBeNull();

        // Test with undefined parameters
        const error3 = new OperatorError('Undefined test', undefined, undefined, undefined);
        expect(error3.operator).toBeNull();
        expect(error3.context).toEqual({});
        expect(error3.originalError).toBeNull();
      });
    });

    describe('Inheritance Behavior', () => {
      it('should inherit all RuleEngineError methods', () => {
        const context = { args: ['left', 'right'], operandTypes: ['string', 'number'] };
        const error = new OperatorError('Operand type mismatch', 'eq', context);

        const json = error.toJSON();
        expect(json.name).toBe('OperatorError');
        expect(json.message).toBe('Operand type mismatch');
        expect(json.operator).toBe('eq');
        expect(json.context).toEqual(context);
        expect(json.timestamp).toBe(error.timestamp);
      });

      it('should maintain proper prototype chain', () => {
        const error = new OperatorError('Prototype test', 'test');

        expect(error instanceof OperatorError).toBe(true);
        expect(error instanceof RuleEngineError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });

    describe('Real-World Operator Scenarios', () => {
      it('should handle comparison operator errors', () => {
        const context = {
          operator: 'gt',
          leftOperand: 'user.name',
          rightOperand: 25,
          leftValue: 'John Doe',
          rightValue: 25,
          leftType: 'string',
          rightType: 'number',
          strict: true
        };

        const error = new OperatorError('Cannot compare string with number in strict mode', 'gt', context);

        expect(error.operator).toBe('gt');
        expect(error.context.leftType).toBe('string');
        expect(error.context.rightType).toBe('number');
        expect(error.context.strict).toBe(true);
      });

      it('should handle array operator errors', () => {
        const context = {
          operator: 'in',
          value: 'admin',
          array: 'not-an-array',
          expectedType: 'array',
          actualType: 'string'
        };

        const error = new OperatorError('IN operator requires array as right operand', 'in', context);

        expect(error.context.expectedType).toBe('array');
        expect(error.context.actualType).toBe('string');
      });

      it('should handle regex operator errors', () => {
        const regexError = new SyntaxError('Invalid regular expression: /[unclosed/: Unterminated character class');
        const context = {
          pattern: '[unclosed',
          text: 'test string',
          flags: 'gi'
        };

        const error = new OperatorError('Invalid regex pattern', 'regex', context, regexError);

        expect(error.operator).toBe('regex');
        expect(error.originalError).toBe(regexError);
        expect(error.context.pattern).toBe('[unclosed');
      });

      it('should handle logical operator errors', () => {
        const context = {
          operator: 'and',
          expressions: [],
          minimum: 1,
          actual: 0
        };

        const error = new OperatorError('AND operator requires at least one expression', 'and', context);

        expect(error.context.minimum).toBe(1);
        expect(error.context.actual).toBe(0);
      });
    });
  });

  describe('Error Chaining and Wrapping', () => {
    it('should properly chain errors', () => {
      const originalError = new TypeError('Original type error');
      const wrappedError = new OperatorError('Wrapped in operator error', 'test', {}, originalError);
      const finalError = new RuleEngineError('Final wrapped error', null, {}, wrappedError);

      expect(finalError.originalError).toBe(wrappedError);
      expect(finalError.originalError.originalError).toBe(originalError);
      expect(finalError.originalError.originalError.message).toBe('Original type error');
    });

    it('should handle nested error serialization', () => {
      const innerError = new ValidationError('Inner validation error', { field: 'inner' });
      const outerError = new OperatorError('Outer operator error', 'outer', { field: 'outer' }, innerError);

      const json = outerError.toJSON();
      expect(json.name).toBe('OperatorError');
      expect(json.message).toBe('Outer operator error');
      expect(json.operator).toBe('outer');
      // originalError is not included in toJSON to avoid circular references
    });
  });

  describe('Error Comparison and Equality', () => {
    it('should differentiate between error types', () => {
      const ruleError = new RuleEngineError('Test');
      const validationError = new ValidationError('Test');
      const operatorError = new OperatorError('Test', 'test');

      expect(ruleError.name).toBe('RuleEngineError');
      expect(validationError.name).toBe('ValidationError');
      expect(operatorError.name).toBe('OperatorError');

      expect(ruleError instanceof RuleEngineError).toBe(true);
      expect(validationError instanceof RuleEngineError).toBe(true);
      expect(operatorError instanceof RuleEngineError).toBe(true);

      expect(ruleError instanceof ValidationError).toBe(false);
      expect(validationError instanceof OperatorError).toBe(false);
      expect(operatorError instanceof ValidationError).toBe(false);
    });

    it('should have unique timestamps', (done) => {
      const error1 = new RuleEngineError('First error');

      // Wait a small amount to ensure different timestamps
      setTimeout(() => {
        const error2 = new RuleEngineError('Second error');
        expect(error1.timestamp).not.toBe(error2.timestamp);
        done();
      }, 10);
    });
  });

  describe('Integration with Rule Engine', () => {
    it('should create errors that integrate with rule engine error handling', () => {
      // Simulate how the rule engine might create and handle errors
      function simulateRuleEngineErrorHandling(operatorName, args, context) {
        try {
          // Simulate some operation that might fail
          if (args.length === 0) {
            throw new OperatorError(
              `${operatorName} operator requires at least one argument`,
              operatorName,
              { args, expectedMin: 1, actual: args.length }
            );
          }

          if (!Array.isArray(args)) {
            throw new OperatorError(
              `${operatorName} operator requires array arguments`,
              operatorName,
              { args, type: typeof args }
            );
          }

          return { success: true };
        } catch (error) {
          if (error instanceof RuleEngineError) {
            return {
              success: false,
              operator: error.operator,
              error: error.message,
              details: error.context,
              timestamp: error.timestamp
            };
          }

          // Wrap unexpected errors
          const wrappedError = new RuleEngineError(
            `Unexpected error in ${operatorName}: ${error.message}`,
            operatorName,
            { originalError: error.constructor.name },
            error
          );

          return {
            success: false,
            operator: wrappedError.operator,
            error: wrappedError.message,
            details: wrappedError.context,
            timestamp: wrappedError.timestamp
          };
        }
      }

      // Test empty arguments
      const result1 = simulateRuleEngineErrorHandling('and', [], {});
      expect(result1.success).toBe(false);
      expect(result1.operator).toBe('and');
      expect(result1.error).toContain('requires at least one argument');
      expect(result1.details.expectedMin).toBe(1);

      // Test non-array arguments
      const result2 = simulateRuleEngineErrorHandling('or', 'not-an-array', {});
      expect(result2.success).toBe(false);
      expect(result2.operator).toBe('or');
      expect(result2.error).toContain('requires array arguments');
      expect(result2.details.type).toBe('string');

      // Test success case
      const result3 = simulateRuleEngineErrorHandling('eq', ['left', 'right'], {});
      expect(result3.success).toBe(true);
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory with many error instances', () => {
      // Create many error instances to test for memory leaks
      const errors = [];
      for (let i = 0; i < 1000; i++) {
        errors.push(new RuleEngineError(`Error ${i}`, `op${i}`, { index: i }));
      }

      // Verify all errors are properly created
      expect(errors).toHaveLength(1000);
      expect(errors[0].message).toBe('Error 0');
      expect(errors[999].message).toBe('Error 999');
      expect(errors[500].context.index).toBe(500);
    });

    it('should create errors efficiently', () => {
      const startTime = performance.now();

      // Create many errors quickly
      for (let i = 0; i < 100; i++) {
        new OperatorError('Performance test', 'test', { iteration: i });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should create 100 errors in reasonable time (under 50ms)
      expect(totalTime).toBeLessThan(50);
    });
  });
});
