const { TypeUtils } = require('../../../src/utils/TypeUtils.js');

describe('TypeUtils - Comprehensive Coverage', () => {
  describe('coerceToNumber', () => {
    describe('Strict Mode', () => {
      it('should accept valid numbers in strict mode', () => {
        expect(TypeUtils.coerceToNumber(42, true)).toBe(42);
        expect(TypeUtils.coerceToNumber(0, true)).toBe(0);
        expect(TypeUtils.coerceToNumber(-123, true)).toBe(-123);
        expect(TypeUtils.coerceToNumber(3.14159, true)).toBe(3.14159);
        expect(TypeUtils.coerceToNumber(Infinity, true)).toBe(Infinity);
        expect(TypeUtils.coerceToNumber(-Infinity, true)).toBe(-Infinity);
      });

      it('should reject NaN in strict mode', () => {
        expect(TypeUtils.coerceToNumber(NaN, true)).toBeNull();
      });

      it('should reject non-numbers in strict mode', () => {
        expect(TypeUtils.coerceToNumber('42', true)).toBeNull();
        expect(TypeUtils.coerceToNumber('3.14', true)).toBeNull();
        expect(TypeUtils.coerceToNumber('0', true)).toBeNull();
        expect(TypeUtils.coerceToNumber(true, true)).toBeNull();
        expect(TypeUtils.coerceToNumber(false, true)).toBeNull();
        expect(TypeUtils.coerceToNumber([], true)).toBeNull();
        expect(TypeUtils.coerceToNumber({}, true)).toBeNull();
        expect(TypeUtils.coerceToNumber(null, true)).toBeNull();
        expect(TypeUtils.coerceToNumber(undefined, true)).toBeNull();
      });
    });

    describe('Loose Mode (Default)', () => {
      it('should accept valid numbers in loose mode', () => {
        expect(TypeUtils.coerceToNumber(42)).toBe(42);
        expect(TypeUtils.coerceToNumber(0)).toBe(0);
        expect(TypeUtils.coerceToNumber(-123)).toBe(-123);
        expect(TypeUtils.coerceToNumber(3.14159)).toBe(3.14159);
      });

      it('should coerce valid numeric strings', () => {
        expect(TypeUtils.coerceToNumber('42')).toBe(42);
        expect(TypeUtils.coerceToNumber('0')).toBe(0);
        expect(TypeUtils.coerceToNumber('-123')).toBe(-123);
        expect(TypeUtils.coerceToNumber('3.14159')).toBe(3.14159);
        expect(TypeUtils.coerceToNumber('1.5e2')).toBe(150); // Scientific notation
        expect(TypeUtils.coerceToNumber('1.5E-2')).toBe(0.015);
        expect(TypeUtils.coerceToNumber('+42')).toBe(42); // Plus sign
        expect(TypeUtils.coerceToNumber('  42  ')).toBe(42); // Whitespace
      });

      it('should handle special string values', () => {
        expect(TypeUtils.coerceToNumber('Infinity')).toBe(Infinity);
        expect(TypeUtils.coerceToNumber('-Infinity')).toBe(-Infinity);
        expect(TypeUtils.coerceToNumber('NaN')).toBeNull(); // NaN is rejected
      });

      it('should return null for null, undefined, and empty string', () => {
        expect(TypeUtils.coerceToNumber(null)).toBeNull();
        expect(TypeUtils.coerceToNumber(undefined)).toBeNull();
        expect(TypeUtils.coerceToNumber('')).toBeNull();
        expect(TypeUtils.coerceToNumber('   ')).toBeNull(); // Whitespace only
      });

      it('should return null for invalid numeric strings', () => {
        expect(TypeUtils.coerceToNumber('abc')).toBeNull();
        expect(TypeUtils.coerceToNumber('abc123')).toBeNull(); // Starts with non-numeric
        expect(TypeUtils.coerceToNumber('12.34.56')).toBe(12.34); // parseFloat stops at second dot
        expect(TypeUtils.coerceToNumber('12-34')).toBe(12); // parseFloat stops at dash
        expect(TypeUtils.coerceToNumber('$12.34')).toBeNull(); // Starts with non-numeric
        expect(TypeUtils.coerceToNumber('not a number')).toBeNull();
      });

      it('should return null for non-string, non-number types', () => {
        expect(TypeUtils.coerceToNumber(true)).toBeNull();
        expect(TypeUtils.coerceToNumber(false)).toBeNull();
        expect(TypeUtils.coerceToNumber([])).toBeNull();
        expect(TypeUtils.coerceToNumber({})).toBeNull();
        expect(TypeUtils.coerceToNumber(() => {})).toBeNull();
        expect(TypeUtils.coerceToNumber(new Date())).toBeNull();
      });

      it('should handle edge cases with parseFloat', () => {
        expect(TypeUtils.coerceToNumber('42.0')).toBe(42);
        expect(TypeUtils.coerceToNumber('0.0')).toBe(0);
        expect(TypeUtils.coerceToNumber('.5')).toBe(0.5);
        expect(TypeUtils.coerceToNumber('5.')).toBe(5);
      });
    });
  });

  describe('coerceToString', () => {
    describe('Strict Mode', () => {
      it('should accept valid strings in strict mode', () => {
        expect(TypeUtils.coerceToString('hello', true)).toBe('hello');
        expect(TypeUtils.coerceToString('', true)).toBe('');
        expect(TypeUtils.coerceToString('123', true)).toBe('123');
        expect(TypeUtils.coerceToString('true', true)).toBe('true');
        expect(TypeUtils.coerceToString('  spaces  ', true)).toBe('  spaces  ');
      });

      it('should reject non-strings in strict mode', () => {
        expect(TypeUtils.coerceToString(123, true)).toBeNull();
        expect(TypeUtils.coerceToString(0, true)).toBeNull();
        expect(TypeUtils.coerceToString(true, true)).toBeNull();
        expect(TypeUtils.coerceToString(false, true)).toBeNull();
        expect(TypeUtils.coerceToString([], true)).toBeNull();
        expect(TypeUtils.coerceToString({}, true)).toBeNull();
        expect(TypeUtils.coerceToString(null, true)).toBeNull();
        expect(TypeUtils.coerceToString(undefined, true)).toBeNull();
      });
    });

    describe('Loose Mode (Default)', () => {
      it('should accept valid strings in loose mode', () => {
        expect(TypeUtils.coerceToString('hello')).toBe('hello');
        expect(TypeUtils.coerceToString('')).toBe('');
        expect(TypeUtils.coerceToString('123')).toBe('123');
      });

      it('should coerce numbers to strings', () => {
        expect(TypeUtils.coerceToString(123)).toBe('123');
        expect(TypeUtils.coerceToString(0)).toBe('0');
        expect(TypeUtils.coerceToString(-456)).toBe('-456');
        expect(TypeUtils.coerceToString(3.14159)).toBe('3.14159');
        expect(TypeUtils.coerceToString(Infinity)).toBe('Infinity');
        expect(TypeUtils.coerceToString(-Infinity)).toBe('-Infinity');
        expect(TypeUtils.coerceToString(NaN)).toBe('NaN');
      });

      it('should coerce booleans to strings', () => {
        expect(TypeUtils.coerceToString(true)).toBe('true');
        expect(TypeUtils.coerceToString(false)).toBe('false');
      });

      it('should coerce objects with toString method', () => {
        const customObj = {
          toString: () => 'custom string',
        };
        expect(TypeUtils.coerceToString(customObj)).toBe('custom string');

        const date = new Date('2023-01-01');
        expect(TypeUtils.coerceToString(date)).toBe(date.toString());
      });

      it('should coerce arrays to strings', () => {
        expect(TypeUtils.coerceToString([1, 2, 3])).toBe('1,2,3');
        expect(TypeUtils.coerceToString([])).toBe('');
        expect(TypeUtils.coerceToString(['a', 'b', 'c'])).toBe('a,b,c');
      });

      it('should coerce functions to strings', () => {
        const func = function test() {
          return 42;
        };
        expect(TypeUtils.coerceToString(func)).toBe(func.toString());
      });

      it('should return null for null and undefined', () => {
        expect(TypeUtils.coerceToString(null)).toBeNull();
        expect(TypeUtils.coerceToString(undefined)).toBeNull();
      });
    });
  });

  describe('coerceToBoolean', () => {
    describe('Strict Mode', () => {
      it('should accept valid booleans in strict mode', () => {
        expect(TypeUtils.coerceToBoolean(true, true)).toBe(true);
        expect(TypeUtils.coerceToBoolean(false, true)).toBe(false);
      });

      it('should reject non-booleans in strict mode', () => {
        expect(TypeUtils.coerceToBoolean(1, true)).toBeNull();
        expect(TypeUtils.coerceToBoolean(0, true)).toBeNull();
        expect(TypeUtils.coerceToBoolean('true', true)).toBeNull();
        expect(TypeUtils.coerceToBoolean('false', true)).toBeNull();
        expect(TypeUtils.coerceToBoolean([], true)).toBeNull();
        expect(TypeUtils.coerceToBoolean({}, true)).toBeNull();
        expect(TypeUtils.coerceToBoolean(null, true)).toBeNull();
        expect(TypeUtils.coerceToBoolean(undefined, true)).toBeNull();
      });
    });

    describe('Loose Mode (Default)', () => {
      it('should accept valid booleans in loose mode', () => {
        expect(TypeUtils.coerceToBoolean(true)).toBe(true);
        expect(TypeUtils.coerceToBoolean(false)).toBe(false);
      });

      it('should coerce truthy values to true', () => {
        expect(TypeUtils.coerceToBoolean(1)).toBe(true);
        expect(TypeUtils.coerceToBoolean(42)).toBe(true);
        expect(TypeUtils.coerceToBoolean(-1)).toBe(true);
        expect(TypeUtils.coerceToBoolean('hello')).toBe(true);
        expect(TypeUtils.coerceToBoolean('false')).toBe(true); // Non-empty string is truthy
        expect(TypeUtils.coerceToBoolean([])).toBe(true); // Empty array is truthy
        expect(TypeUtils.coerceToBoolean({})).toBe(true); // Empty object is truthy
        expect(TypeUtils.coerceToBoolean(() => {})).toBe(true);
      });

      it('should coerce falsy values to false', () => {
        expect(TypeUtils.coerceToBoolean(0)).toBe(false);
        expect(TypeUtils.coerceToBoolean('')).toBe(false);
        expect(TypeUtils.coerceToBoolean(null)).toBe(false);
        expect(TypeUtils.coerceToBoolean(undefined)).toBe(false);
        expect(TypeUtils.coerceToBoolean(NaN)).toBe(false);
      });
    });
  });

  describe('isEqual', () => {
    describe('Strict Mode', () => {
      it('should use strict equality (===) in strict mode', () => {
        // Same type and value
        expect(TypeUtils.isEqual(42, 42, true)).toBe(true);
        expect(TypeUtils.isEqual('hello', 'hello', true)).toBe(true);
        expect(TypeUtils.isEqual(true, true, true)).toBe(true);
        expect(TypeUtils.isEqual(null, null, true)).toBe(true);
        expect(TypeUtils.isEqual(undefined, undefined, true)).toBe(true);

        // Different types should be false
        expect(TypeUtils.isEqual(42, '42', true)).toBe(false);
        expect(TypeUtils.isEqual(0, false, true)).toBe(false);
        expect(TypeUtils.isEqual(1, true, true)).toBe(false);
        expect(TypeUtils.isEqual('', false, true)).toBe(false);
        expect(TypeUtils.isEqual(null, undefined, true)).toBe(false);
        expect(TypeUtils.isEqual(0, null, true)).toBe(false);
        expect(TypeUtils.isEqual('0', 0, true)).toBe(false);
      });

      it('should handle object reference equality in strict mode', () => {
        const obj1 = { a: 1 };
        const obj2 = { a: 1 };
        const obj3 = obj1;

        expect(TypeUtils.isEqual(obj1, obj2, true)).toBe(false); // Different objects
        expect(TypeUtils.isEqual(obj1, obj3, true)).toBe(true); // Same reference
      });
    });

    describe('Loose Mode (Default)', () => {
      it('should use loose equality (==) in loose mode', () => {
        // Same type and value
        expect(TypeUtils.isEqual(42, 42)).toBe(true);
        expect(TypeUtils.isEqual('hello', 'hello')).toBe(true);
        expect(TypeUtils.isEqual(true, true)).toBe(true);

        // Type coercion cases
        expect(TypeUtils.isEqual(42, '42')).toBe(true);
        expect(TypeUtils.isEqual(0, false)).toBe(true);
        expect(TypeUtils.isEqual(1, true)).toBe(true);
        expect(TypeUtils.isEqual('', false)).toBe(true);
        expect(TypeUtils.isEqual(null, undefined)).toBe(true);
        expect(TypeUtils.isEqual('0', 0)).toBe(true);
        expect(TypeUtils.isEqual(' \t\n', 0)).toBe(true); // Whitespace coerces to 0
      });

      it('should handle special numeric cases in loose mode', () => {
        expect(TypeUtils.isEqual(NaN, NaN)).toBe(false); // NaN != NaN even in loose mode
        expect(TypeUtils.isEqual(Infinity, Infinity)).toBe(true);
        expect(TypeUtils.isEqual(-Infinity, -Infinity)).toBe(true);
        expect(TypeUtils.isEqual(+0, -0)).toBe(true);
      });
    });
  });

  describe('Type Checking Utilities', () => {
    describe('isArray', () => {
      it('should correctly identify arrays', () => {
        expect(TypeUtils.isArray([])).toBe(true);
        expect(TypeUtils.isArray([1, 2, 3])).toBe(true);
        expect(TypeUtils.isArray(new Array())).toBe(true);
        expect(TypeUtils.isArray(Array.from([1, 2, 3]))).toBe(true);
      });

      it('should reject non-arrays', () => {
        expect(TypeUtils.isArray({})).toBe(false);
        expect(TypeUtils.isArray('array')).toBe(false);
        expect(TypeUtils.isArray(123)).toBe(false);
        expect(TypeUtils.isArray(null)).toBe(false);
        expect(TypeUtils.isArray(undefined)).toBe(false);
        expect(TypeUtils.isArray(arguments)).toBe(false); // arguments object
      });
    });

    describe('isObject', () => {
      it('should correctly identify plain objects', () => {
        expect(TypeUtils.isObject({})).toBe(true);
        expect(TypeUtils.isObject({ a: 1, b: 2 })).toBe(true);
        expect(TypeUtils.isObject(new Object())).toBe(true);
        expect(TypeUtils.isObject(Object.create(null))).toBe(true);
      });

      it('should reject non-objects', () => {
        expect(TypeUtils.isObject([])).toBe(false); // Arrays are not objects for this function
        expect(TypeUtils.isObject(null)).toBe(false); // null is not an object for our purposes
        expect(TypeUtils.isObject('object')).toBe(false);
        expect(TypeUtils.isObject(123)).toBe(false);
        expect(TypeUtils.isObject(true)).toBe(false);
        expect(TypeUtils.isObject(undefined)).toBe(false);
        expect(TypeUtils.isObject(() => {})).toBe(false); // Functions are not objects for this function
      });
    });

    describe('isString', () => {
      it('should correctly identify strings', () => {
        expect(TypeUtils.isString('')).toBe(true);
        expect(TypeUtils.isString('hello')).toBe(true);
        expect(TypeUtils.isString('123')).toBe(true);
        expect(TypeUtils.isString(String('test'))).toBe(true);
        expect(TypeUtils.isString(new String('test').valueOf())).toBe(true);
      });

      it('should reject non-strings', () => {
        expect(TypeUtils.isString(123)).toBe(false);
        expect(TypeUtils.isString(true)).toBe(false);
        expect(TypeUtils.isString([])).toBe(false);
        expect(TypeUtils.isString({})).toBe(false);
        expect(TypeUtils.isString(null)).toBe(false);
        expect(TypeUtils.isString(undefined)).toBe(false);
        expect(TypeUtils.isString(new String('test'))).toBe(false); // String object vs primitive
      });
    });

    describe('isNumber', () => {
      it('should correctly identify valid numbers', () => {
        expect(TypeUtils.isNumber(0)).toBe(true);
        expect(TypeUtils.isNumber(42)).toBe(true);
        expect(TypeUtils.isNumber(-123)).toBe(true);
        expect(TypeUtils.isNumber(3.14159)).toBe(true);
        expect(TypeUtils.isNumber(Infinity)).toBe(true);
        expect(TypeUtils.isNumber(-Infinity)).toBe(true);
        expect(TypeUtils.isNumber(Number.MAX_VALUE)).toBe(true);
        expect(TypeUtils.isNumber(Number.MIN_VALUE)).toBe(true);
      });

      it('should reject NaN and non-numbers', () => {
        expect(TypeUtils.isNumber(NaN)).toBe(false); // NaN is not a valid number
        expect(TypeUtils.isNumber('123')).toBe(false);
        expect(TypeUtils.isNumber(true)).toBe(false);
        expect(TypeUtils.isNumber([])).toBe(false);
        expect(TypeUtils.isNumber({})).toBe(false);
        expect(TypeUtils.isNumber(null)).toBe(false);
        expect(TypeUtils.isNumber(undefined)).toBe(false);
        expect(TypeUtils.isNumber(new Number(42))).toBe(false); // Number object vs primitive
      });
    });

    describe('isBoolean', () => {
      it('should correctly identify booleans', () => {
        expect(TypeUtils.isBoolean(true)).toBe(true);
        expect(TypeUtils.isBoolean(false)).toBe(true);
        expect(TypeUtils.isBoolean(Boolean(1))).toBe(true);
        expect(TypeUtils.isBoolean(Boolean(0))).toBe(true);
      });

      it('should reject non-booleans', () => {
        expect(TypeUtils.isBoolean(1)).toBe(false);
        expect(TypeUtils.isBoolean(0)).toBe(false);
        expect(TypeUtils.isBoolean('true')).toBe(false);
        expect(TypeUtils.isBoolean('false')).toBe(false);
        expect(TypeUtils.isBoolean([])).toBe(false);
        expect(TypeUtils.isBoolean({})).toBe(false);
        expect(TypeUtils.isBoolean(null)).toBe(false);
        expect(TypeUtils.isBoolean(undefined)).toBe(false);
        expect(TypeUtils.isBoolean(new Boolean(true))).toBe(false); // Boolean object vs primitive
      });
    });

    describe('isNull', () => {
      it('should correctly identify null and undefined', () => {
        expect(TypeUtils.isNull(null)).toBe(true);
        expect(TypeUtils.isNull(undefined)).toBe(true);
      });

      it('should reject non-null values', () => {
        expect(TypeUtils.isNull(0)).toBe(false);
        expect(TypeUtils.isNull(false)).toBe(false);
        expect(TypeUtils.isNull('')).toBe(false);
        expect(TypeUtils.isNull([])).toBe(false);
        expect(TypeUtils.isNull({})).toBe(false);
        expect(TypeUtils.isNull('null')).toBe(false);
        expect(TypeUtils.isNull(NaN)).toBe(false);
      });
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle mixed type operations consistently', () => {
      // Test that all utilities work together consistently
      const testValue = '42';

      expect(TypeUtils.isString(testValue)).toBe(true);
      expect(TypeUtils.isNumber(testValue)).toBe(false);
      expect(TypeUtils.coerceToNumber(testValue)).toBe(42);
      expect(TypeUtils.coerceToString(testValue)).toBe('42');
      expect(TypeUtils.coerceToBoolean(testValue)).toBe(true);
    });

    it('should handle circular references in objects', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2', ref: obj1 };
      obj1.ref = obj2; // Create circular reference

      // Object methods should not crash on circular references
      expect(TypeUtils.isObject(obj1)).toBe(true);
      expect(TypeUtils.isObject(obj2)).toBe(true);
      expect(TypeUtils.coerceToString(obj1)).toContain('[object Object]');
    });

    it('should handle prototype chain objects', () => {
      function CustomConstructor() {
        this.value = 42;
      }
      const instance = new CustomConstructor();

      expect(TypeUtils.isObject(instance)).toBe(true);
      expect(TypeUtils.coerceToString(instance)).toContain('[object Object]');
    });
  });
});
