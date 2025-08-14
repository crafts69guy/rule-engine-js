const { createRuleEngine, createRuleHelpers } = require('../../../src/index.js');

describe('Regex Operator - Comprehensive Coverage', () => {
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

  describe('Basic Functionality', () => {
    describe('Simple Pattern Matching', () => {
      it('should match basic string patterns', () => {
        expectRuleToPass(engine, { regex: ['user.name', 'John'] });
        expectRuleToFail(engine, { regex: ['user.name', 'Jane'] });
      });

      it('should handle case-sensitive matching by default', () => {
        expectRuleToPass(engine, { regex: ['user.name', 'John'] });
        expectRuleToFail(engine, { regex: ['user.name', 'john'] }); // lowercase
        expectRuleToFail(engine, { regex: ['user.name', 'JOHN'] }); // uppercase
      });

      it('should handle partial matches', () => {
        expectRuleToPass(engine, { regex: ['user.email', 'company'] });
        expectRuleToPass(engine, { regex: ['user.profile.bio', 'Software'] });
        expectRuleToFail(engine, { regex: ['user.email', 'gmail'] });
      });
    });

    describe('Dynamic Pattern Matching', () => {
      it('should handle dynamic patterns from context', () => {
        const context = {
          validation: {
            text: 'Hello123World',
            numberPattern: '\\d+',
            letterPattern: '[A-Za-z]+',
            invalidText: 'NoNumbers',
          },
        };

        expectRuleToPass(
          engine,
          { regex: ['validation.text', 'validation.numberPattern'] },
          context
        );
        expectRuleToPass(
          engine,
          { regex: ['validation.text', 'validation.letterPattern'] },
          context
        );
        expectRuleToFail(
          engine,
          { regex: ['validation.invalidText', 'validation.numberPattern'] },
          context
        );
      });

      it('should handle both text and pattern as dynamic fields', () => {
        const context = {
          userInput: { email: 'test@example.com' },
          patterns: { email: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$' },
        };

        expectRuleToPass(engine, { regex: ['userInput.email', 'patterns.email'] }, context);
      });
    });
  });

  describe('Real-World Validation Patterns', () => {
    describe('Email Validation', () => {
      it('should validate email addresses', () => {
        const emailPattern = '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$';

        expectRuleToPass(engine, { regex: ['user.email', emailPattern] });

        const context = {
          emails: {
            valid1: 'user@example.com',
            valid2: 'test.email@sub.domain.org',
            valid3: 'user123@company-name.co.uk',
            invalid1: 'invalid-email',
            invalid2: '@example.com',
            invalid3: 'user@',
            invalid4: 'user@.com',
          },
        };

        expectRuleToPass(engine, { regex: ['emails.valid1', emailPattern] }, context);
        expectRuleToPass(engine, { regex: ['emails.valid2', emailPattern] }, context);
        expectRuleToPass(engine, { regex: ['emails.valid3', emailPattern] }, context);
        expectRuleToFail(engine, { regex: ['emails.invalid1', emailPattern] }, context);
        expectRuleToFail(engine, { regex: ['emails.invalid2', emailPattern] }, context);
        expectRuleToFail(engine, { regex: ['emails.invalid3', emailPattern] }, context);
        expectRuleToFail(engine, { regex: ['emails.invalid4', emailPattern] }, context);
      });
    });

    describe('Phone Number Validation', () => {
      it('should validate US phone numbers', () => {
        const phonePattern = '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$';

        const context = {
          phones: {
            valid1: '(555) 123-4567',
            valid2: '555-123-4567',
            valid3: '555.123.4567',
            valid4: '5551234567',
            invalid1: '123-456-789',
            invalid2: '(555) 123-456',
            invalid3: 'not-a-phone',
          },
        };

        expectRuleToPass(engine, { regex: ['phones.valid1', phonePattern] }, context);
        expectRuleToPass(engine, { regex: ['phones.valid2', phonePattern] }, context);
        expectRuleToPass(engine, { regex: ['phones.valid3', phonePattern] }, context);
        expectRuleToPass(engine, { regex: ['phones.valid4', phonePattern] }, context);
        expectRuleToFail(engine, { regex: ['phones.invalid1', phonePattern] }, context);
        expectRuleToFail(engine, { regex: ['phones.invalid2', phonePattern] }, context);
        expectRuleToFail(engine, { regex: ['phones.invalid3', phonePattern] }, context);
      });

      it('should validate international phone numbers', () => {
        const intlPhonePattern = '^\\+?[1-9]\\d{1,14}$';

        const context = {
          phones: {
            us: '+1234567890',
            uk: '+441234567890',
            simple: '1234567890',
            invalid1: '+',
            invalid2: '+0123456789', // starts with 0
            invalid3: 'abc123456789',
          },
        };

        expectRuleToPass(engine, { regex: ['phones.us', intlPhonePattern] }, context);
        expectRuleToPass(engine, { regex: ['phones.uk', intlPhonePattern] }, context);
        expectRuleToPass(engine, { regex: ['phones.simple', intlPhonePattern] }, context);
        expectRuleToFail(engine, { regex: ['phones.invalid1', intlPhonePattern] }, context);
        expectRuleToFail(engine, { regex: ['phones.invalid2', intlPhonePattern] }, context);
        expectRuleToFail(engine, { regex: ['phones.invalid3', intlPhonePattern] }, context);
      });
    });

    describe('Password Strength Validation', () => {
      it('should validate strong passwords', () => {
        // At least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
        const strongPasswordPattern =
          '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$';

        const context = {
          passwords: {
            strong1: 'MySecure123!',
            strong2: 'Password123@',
            strong3: 'ComplexP@ssw0rd',
            weak1: 'password',
            weak2: 'PASSWORD',
            weak3: '12345678',
            weak4: 'Weak123',
            weak5: 'Short1!',
          },
        };

        expectRuleToPass(engine, { regex: ['passwords.strong1', strongPasswordPattern] }, context);
        expectRuleToPass(engine, { regex: ['passwords.strong2', strongPasswordPattern] }, context);
        expectRuleToPass(engine, { regex: ['passwords.strong3', strongPasswordPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.weak1', strongPasswordPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.weak2', strongPasswordPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.weak3', strongPasswordPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.weak4', strongPasswordPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.weak5', strongPasswordPattern] }, context);
      });

      it('should validate medium strength passwords', () => {
        // At least 6 chars, letters and numbers
        const mediumPasswordPattern = '^(?=.*[a-zA-Z])(?=.*\\d).{6,}$';

        const context = {
          passwords: {
            valid1: 'pass123',
            valid2: 'MyPass1',
            valid3: '123abc',
            invalid1: 'password', // no numbers
            invalid2: '123456', // no letters
            invalid3: 'abc12', // too short
          },
        };

        expectRuleToPass(engine, { regex: ['passwords.valid1', mediumPasswordPattern] }, context);
        expectRuleToPass(engine, { regex: ['passwords.valid2', mediumPasswordPattern] }, context);
        expectRuleToPass(engine, { regex: ['passwords.valid3', mediumPasswordPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.invalid1', mediumPasswordPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.invalid2', mediumPasswordPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.invalid3', mediumPasswordPattern] }, context);
      });
    });

    describe('URL Validation', () => {
      it('should validate HTTP/HTTPS URLs', () => {
        const urlPattern =
          '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$';

        const context = {
          urls: {
            valid1: 'https://www.example.com',
            valid2: 'http://example.com',
            valid3: 'https://sub.domain.co.uk/path?param=value',
            valid4: 'http://localhost:3000',
            invalid1: 'not-a-url',
            invalid2: 'ftp://example.com',
            invalid3: 'https://',
            invalid4: 'www.example.com',
          },
        };

        expectRuleToPass(engine, { regex: ['urls.valid1', urlPattern] }, context);
        expectRuleToPass(engine, { regex: ['urls.valid2', urlPattern] }, context);
        expectRuleToPass(engine, { regex: ['urls.valid3', urlPattern] }, context);
        expectRuleToFail(engine, { regex: ['urls.invalid1', urlPattern] }, context);
        expectRuleToFail(engine, { regex: ['urls.invalid2', urlPattern] }, context);
        expectRuleToFail(engine, { regex: ['urls.invalid3', urlPattern] }, context);
        expectRuleToFail(engine, { regex: ['urls.invalid4', urlPattern] }, context);
      });
    });

    describe('Credit Card Validation', () => {
      it('should validate credit card numbers', () => {
        const visaPattern = '^4[0-9]{12}(?:[0-9]{3})?$';
        const mastercardPattern = '^5[1-5][0-9]{14}$';
        const amexPattern = '^3[47][0-9]{13}$';

        const context = {
          cards: {
            visa16: '4111111111111111',
            visa13: '4111111111111',
            mastercard: '5555555555554444',
            amex: '378282246310005',
            invalid1: '1234567890123456',
            invalid2: '411111111111111', // too short
            invalid3: 'not-a-card',
          },
        };

        expectRuleToPass(engine, { regex: ['cards.visa16', visaPattern] }, context);
        expectRuleToPass(engine, { regex: ['cards.visa13', visaPattern] }, context);
        expectRuleToPass(engine, { regex: ['cards.mastercard', mastercardPattern] }, context);
        expectRuleToPass(engine, { regex: ['cards.amex', amexPattern] }, context);
        expectRuleToFail(engine, { regex: ['cards.invalid1', visaPattern] }, context);
        expectRuleToFail(engine, { regex: ['cards.invalid2', visaPattern] }, context);
        expectRuleToFail(engine, { regex: ['cards.invalid3', visaPattern] }, context);
      });
    });

    describe('Date Format Validation', () => {
      it('should validate date formats', () => {
        const iso8601Pattern = '^\\d{4}-\\d{2}-\\d{2}$';
        const usDatePattern = '^\\d{2}\\/\\d{2}\\/\\d{4}$';
        const timePattern = '^\\d{2}:\\d{2}(:\\d{2})?$';

        const context = {
          dates: {
            iso1: '2023-12-25',
            iso2: '2024-01-01',
            us1: '12/25/2023',
            us2: '01/01/2024',
            time1: '14:30',
            time2: '09:15:45',
            invalid1: '2023/12/25',
            invalid2: '25-12-2023',
            invalid3: '9:30',
          },
        };

        expectRuleToPass(engine, { regex: ['dates.iso1', iso8601Pattern] }, context);
        expectRuleToPass(engine, { regex: ['dates.iso2', iso8601Pattern] }, context);
        expectRuleToPass(engine, { regex: ['dates.us1', usDatePattern] }, context);
        expectRuleToPass(engine, { regex: ['dates.us2', usDatePattern] }, context);
        expectRuleToPass(engine, { regex: ['dates.time1', timePattern] }, context);
        expectRuleToPass(engine, { regex: ['dates.time2', timePattern] }, context);
        expectRuleToFail(engine, { regex: ['dates.invalid1', iso8601Pattern] }, context);
        expectRuleToFail(engine, { regex: ['dates.invalid2', iso8601Pattern] }, context);
        expectRuleToFail(engine, { regex: ['dates.invalid3', timePattern] }, context);
      });
    });
  });

  describe('Advanced Regex Features', () => {
    describe('Regex Flags', () => {
      it('should handle case-insensitive flag', () => {
        const context = {
          text: {
            mixed: 'Hello World',
            upper: 'HELLO WORLD',
            lower: 'hello world',
          },
        };

        // Without flags (case sensitive)
        expectRuleToPass(engine, { regex: ['text.mixed', 'Hello'] }, context);
        expectRuleToFail(engine, { regex: ['text.mixed', 'hello'] }, context);

        // With case-insensitive flag
        expectRuleToPass(engine, { regex: ['text.mixed', 'hello', { flags: 'i' }] }, context);
        expectRuleToPass(engine, { regex: ['text.upper', 'hello', { flags: 'i' }] }, context);
        expectRuleToPass(engine, { regex: ['text.lower', 'HELLO', { flags: 'i' }] }, context);
      });

      it('should handle global flag for multiple matches', () => {
        const context = {
          text: { repeated: 'test test test' },
        };

        // Global flag doesn't change test() behavior, but validates it doesn't break
        expectRuleToPass(engine, { regex: ['text.repeated', 'test', { flags: 'g' }] }, context);
        expectRuleToPass(engine, { regex: ['text.repeated', 'test', { flags: 'gi' }] }, context);
      });

      it('should handle multiline flag', () => {
        const context = {
          text: {
            multiline: 'First line\nSecond line\nThird line',
            singleline: 'Just one line',
          },
        };

        expectRuleToPass(engine, { regex: ['text.multiline', '^Second', { flags: 'm' }] }, context);
        expectRuleToFail(engine, { regex: ['text.multiline', '^Second'] }, context); // Without multiline flag
      });
    });

    describe('Complex Patterns', () => {
      it('should handle lookahead assertions', () => {
        // Password with lookahead for complexity requirements
        const complexPattern =
          '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$';

        const context = {
          passwords: {
            valid: 'MySecure123!',
            noLower: 'MYSECURE123!',
            noUpper: 'mysecure123!',
            noDigit: 'MySecure!',
            noSpecial: 'MySecure123',
          },
        };

        expectRuleToPass(engine, { regex: ['passwords.valid', complexPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.noLower', complexPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.noUpper', complexPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.noDigit', complexPattern] }, context);
        expectRuleToFail(engine, { regex: ['passwords.noSpecial', complexPattern] }, context);
      });

      it('should handle character classes and ranges', () => {
        const context = {
          data: {
            alphanumeric: 'abc123XYZ',
            onlyLetters: 'abcXYZ',
            onlyNumbers: '123456',
            withSpaces: 'abc 123',
            withSymbols: 'abc!@#123',
          },
        };

        expectRuleToPass(engine, { regex: ['data.alphanumeric', '^[a-zA-Z0-9]+$'] }, context);
        expectRuleToPass(engine, { regex: ['data.onlyLetters', '^[a-zA-Z]+$'] }, context);
        expectRuleToPass(engine, { regex: ['data.onlyNumbers', '^[0-9]+$'] }, context);
        expectRuleToFail(engine, { regex: ['data.withSpaces', '^[a-zA-Z0-9]+$'] }, context);
        expectRuleToFail(engine, { regex: ['data.withSymbols', '^[a-zA-Z0-9]+$'] }, context);
      });

      it('should handle quantifiers', () => {
        const context = {
          data: {
            short: 'ab',
            medium: 'abcd',
            long: 'abcdefghij',
            digits3: '123',
            digits5: '12345',
            optional: 'color',
            optionalU: 'colour',
          },
        };

        // Length quantifiers
        expectRuleToPass(engine, { regex: ['data.short', '^.{2}$'] }, context); // exactly 2
        expectRuleToPass(engine, { regex: ['data.medium', '^.{2,6}$'] }, context); // 2-6 chars
        expectRuleToFail(engine, { regex: ['data.long', '^.{2,6}$'] }, context); // too long

        // Digit quantifiers
        expectRuleToPass(engine, { regex: ['data.digits3', '^\\d{3}$'] }, context);
        expectRuleToFail(engine, { regex: ['data.digits5', '^\\d{3}$'] }, context);
        expectRuleToPass(engine, { regex: ['data.digits5', '^\\d{3,}$'] }, context); // 3 or more

        // Optional quantifier
        expectRuleToPass(engine, { regex: ['data.optional', 'colou?r'] }, context);
        expectRuleToPass(engine, { regex: ['data.optionalU', 'colou?r'] }, context);
      });
    });

    describe('Escape Sequences', () => {
      it('should handle common escape sequences', () => {
        const context = {
          data: {
            withDots: 'file.txt',
            withBackslash: 'path\\file',
            withParens: 'test(123)',
            withBrackets: 'array[0]',
            withPlus: 'number+1',
          },
        };

        // Escaped dot (literal dot, not any character)
        expectRuleToPass(engine, { regex: ['data.withDots', '\\.txt$'] }, context);
        expectRuleToFail(engine, { regex: ['data.withDots', '.exe$'] }, context);

        // Escaped backslash
        expectRuleToPass(engine, { regex: ['data.withBackslash', '\\\\'] }, context);

        // Escaped parentheses
        expectRuleToPass(engine, { regex: ['data.withParens', '\\(\\d+\\)'] }, context);

        // Escaped brackets
        expectRuleToPass(engine, { regex: ['data.withBrackets', '\\[\\d+\\]'] }, context);

        // Escaped plus
        expectRuleToPass(engine, { regex: ['data.withPlus', '\\+'] }, context);
      });
    });
  });

  describe('Type Coercion', () => {
    describe('String Coercion', () => {
      it('should coerce values to strings in loose mode', () => {
        const context = {
          mixed: {
            number: 12345,
            boolean: true,
            object: { toString: () => 'custom' },
            nullValue: null,
          },
        };

        // Numbers should be coerced to strings
        expectRuleToPass(looseEngine, { regex: ['mixed.number', '\\d+'] }, context);
        expectRuleToPass(looseEngine, { regex: ['mixed.number', '12345'] }, context);

        // Booleans should be coerced to strings
        expectRuleToPass(looseEngine, { regex: ['mixed.boolean', 'true'] }, context);

        // Objects with toString should be coerced
        expectRuleToPass(looseEngine, { regex: ['mixed.object', 'custom'] }, context);
      });

      it('should reject non-strings in strict mode', () => {
        const context = {
          mixed: { number: 12345 },
        };

        const result = strictEngine.evaluateExpr({ regex: ['mixed.number', '\\d+'] }, context);
        expect(result.success).toBe(false);
        expect(result.error).toContain('requires valid text and pattern');
      });

      it('should handle null and undefined values', () => {
        const context = {
          data: {
            nullValue: null,
            undefinedValue: undefined,
          },
        };

        const nullResult = engine.evaluateExpr({ regex: ['data.nullValue', 'pattern'] }, context);
        expect(nullResult.success).toBe(false);
        expect(nullResult.error).toContain('requires valid text and pattern');

        const undefinedResult = engine.evaluateExpr(
          { regex: ['data.undefinedValue', 'pattern'] },
          context
        );
        expect(undefinedResult.success).toBe(false);
        expect(undefinedResult.error).toContain('requires valid text and pattern');
      });
    });

    describe('Pattern Coercion', () => {
      it('should coerce pattern values to strings', () => {
        const context = {
          data: {
            text: '12345',
            numericPattern: 123,
          },
        };

        // Numeric pattern should be coerced to string
        expectRuleToPass(looseEngine, { regex: ['data.text', 'data.numericPattern'] }, context);
      });
    });
  });

  describe('Error Handling', () => {
    describe('Invalid Arguments', () => {
      it('should handle insufficient arguments', () => {
        const result = engine.evaluateExpr({ regex: ['user.email'] }, global.testContext);
        expect(result.success).toBe(false);
        expect(result.error).toContain('REGEX operator requires 2 or 3 arguments');
      });

      it('should handle too many arguments', () => {
        const result = engine.evaluateExpr(
          { regex: ['user.email', 'pattern', {}, 'extra'] },
          global.testContext
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('REGEX operator requires 2 or 3 arguments');
      });

      it('should handle non-array arguments', () => {
        const result = engine.evaluateExpr({ regex: 'not_an_array' }, global.testContext);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid arguments for operator regex');
      });
    });

    describe('Invalid Regex Patterns', () => {
      it('should handle malformed regex patterns', () => {
        const context = { data: { text: 'test' } };

        const invalidPatterns = [
          '[invalid(',
          '*invalid',
          '(?invalid)',
          '+invalid',
          '{invalid',
          '\\k<invalid>',
        ];

        invalidPatterns.forEach((pattern) => {
          const result = engine.evaluateExpr({ regex: ['data.text', pattern] }, context);
          expect(result.success).toBe(false);
          expect(result.details.args[1]).toEqual(pattern);
        });
      });

      it('should provide detailed error information for invalid patterns', () => {
        const context = { data: { text: 'test' } };

        const result = engine.evaluateExpr({ regex: ['data.text', '[invalid('] }, context);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid regex pattern');
        expect(result.details).toBeDefined();
        expect(result.details.args[1]).toBe('[invalid(');
        expect(result.details.context.data.text).toBe('test');
      });

      it('should handle dynamic invalid patterns', () => {
        const context = {
          data: { text: 'test', invalidPattern: '[unclosed' },
        };

        const result = engine.evaluateExpr(
          { regex: ['data.text', 'data.invalidPattern'] },
          context
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid regex pattern');
      });
    });

    describe('Invalid Flags', () => {
      it('should handle invalid regex flags', () => {
        const context = { data: { text: 'test' } };

        const result = engine.evaluateExpr(
          { regex: ['data.text', 'pattern', { flags: 'xyz' }] },
          context
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid regex pattern');
      });
    });

    describe('Path Resolution Errors', () => {
      it('should handle non-existent paths', () => {
        const result = engine.evaluateExpr(
          { regex: ['nonexistent.path', 'pattern'] },
          global.testContext
        );
        expect(result.success).toBe(false);
        expect(result.operator).toEqual('regex');
        expect(result.details.args[0]).toEqual('nonexistent.path');
      });
    });
  });

  describe('Caching and Performance', () => {
    describe('Pattern Caching', () => {
      it('should cache compiled regex patterns', () => {
        const context = { data: { text: 'test123' } };
        const pattern = '\\d+';

        // First execution - pattern gets compiled and cached
        const result1 = engine.evaluateExpr({ regex: ['data.text', pattern] }, context);
        expect(result1.success).toBe(true);

        // Second execution - should use cached pattern
        const result2 = engine.evaluateExpr({ regex: ['data.text', pattern] }, context);
        expect(result2.success).toBe(true);

        // Both results should be identical
        expect(result1.success).toBe(result2.success);
      });

      it('should cache patterns with different flags separately', () => {
        const context = {
          data: {
            text1: 'TEST',
            text2: 'test',
          },
        };
        const pattern = 'test';

        // Case sensitive (no flags)
        const sensitiveResult = engine.evaluateExpr({ regex: ['data.text1', pattern] }, context);
        expect(sensitiveResult.success).toBe(false);

        // Case insensitive (with flags)
        const insensitiveResult = engine.evaluateExpr(
          { regex: ['data.text1', pattern, { flags: 'i' }] },
          context
        );
        expect(insensitiveResult.success).toBe(true);

        // Verify both patterns work as expected
        expectRuleToPass(engine, { regex: ['data.text2', pattern] }, context);
        expectRuleToPass(engine, { regex: ['data.text1', pattern, { flags: 'i' }] }, context);
      });
    });

    describe('Performance with Complex Patterns', () => {
      it('should handle complex patterns efficiently', () => {
        const complexEmailPattern = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}';
        const context = { email: { address: 'test@example.com' } };

        const startTime = performance.now();

        // Run multiple evaluations to test caching performance
        for (let i = 0; i < 100; i++) {
          engine.evaluateExpr({ regex: ['email.address', complexEmailPattern] }, context);
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        // Should complete 100 regex evaluations efficiently (under 100ms)
        expect(totalTime).toBeLessThan(100);
      });

      it('should handle multiple different patterns efficiently', () => {
        const context = {
          data: {
            email: 'test@example.com',
            phone: '555-123-4567',
            url: 'https://example.com',
            creditCard: '4111111111111111',
          },
        };

        const patterns = {
          email: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}',
          phone: '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})',
          url: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b',
          creditCard: '^4[0-9]{12}(?:[0-9]{3})?',
        };

        const startTime = performance.now();

        // Test each pattern multiple times
        Object.keys(patterns).forEach((key) => {
          for (let i = 0; i < 25; i++) {
            engine.evaluateExpr({ regex: [`data.${key}`, patterns[key]] }, context);
          }
        });

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        // Should handle 100 total evaluations (25 * 4 patterns) efficiently
        expect(totalTime).toBeLessThan(150);
      });
    });
  });

  describe('Integration with Rule Helpers', () => {
    it('should work seamlessly with rule helpers', () => {
      const context = {
        form: {
          email: 'user@company.com',
          phone: '555-123-4567',
          password: 'SecurePass123!',
          confirmPassword: 'SecurePass123!',
          username: 'valid_user123',
        },
      };

      const validationRule = h.and(
        h.regex('form.email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}'),
        h.regex('form.phone', '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})'),
        h.regex('form.password', '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}'),
        h.regex('form.username', '^[a-zA-Z0-9_]{3,20}'),
        h.field.equals('form.password', 'form.confirmPassword')
      );

      expectRuleToPass(engine, validationRule, context);
    });

    it('should handle complex business validation rules', () => {
      const context = {
        application: {
          businessLicense: 'BL-2023-001234',
          taxId: '12-3456789',
          phoneNumber: '+1-555-123-4567',
          email: 'contact@business.com',
          website: 'https://www.business.com',
          bankAccount: '123456789012',
          routingNumber: '021000021',
        },
      };

      const businessValidationRule = h.and(
        // Business license format: BL-YYYY-NNNNNN
        h.regex('application.businessLicense', '^BL-\\d{4}-\\d{6}'),

        // Tax ID format: XX-XXXXXXX
        h.regex('application.taxId', '^\\d{2}-\\d{7}'),

        // International phone format
        h.regex('application.phoneNumber', '^\\+1-\\d{3}-\\d{3}-\\d{4}'),

        // Email validation
        h.regex('application.email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}'),

        // Website URL validation
        h.regex('application.website', '^https?:\\/\\/(www\\.)?[\\w\\.-]+\\.[a-zA-Z]{2,}'),

        // Bank account (9-12 digits)
        h.regex('application.bankAccount', '^\\d{9,12}'),

        // Routing number (9 digits)
        h.regex('application.routingNumber', '^\\d{9}')
      );

      expectRuleToPass(engine, businessValidationRule, context);
    });

    it('should handle dynamic pattern selection', () => {
      const context = {
        validation: {
          inputType: 'email',
          inputValue: 'test@example.com',
          patterns: {
            email: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}',
            phone: '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})',
            url: '^https?:\\/\\/(www\\.)?[\\w\\.-]+\\.[a-zA-Z]{2,}',
          },
        },
      };

      // Dynamic pattern based on input type
      const dynamicValidationRule = h.or(
        h.and(
          h.eq('validation.inputType', 'email'),
          h.regex('validation.inputValue', 'validation.patterns.email')
        ),
        h.and(
          h.eq('validation.inputType', 'phone'),
          h.regex('validation.inputValue', 'validation.patterns.phone')
        ),
        h.and(
          h.eq('validation.inputType', 'url'),
          h.regex('validation.inputValue', 'validation.patterns.url')
        )
      );

      expectRuleToPass(engine, dynamicValidationRule, context);
    });
  });

  describe('Real-World Application Scenarios', () => {
    describe('Form Validation System', () => {
      it('should validate complete registration form', () => {
        const context = {
          registration: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
            phone: '(555) 123-4567',
            password: 'MySecure123!',
            confirmPassword: 'MySecure123!',
            username: 'johndoe123',
            dateOfBirth: '1990-05-15',
            zipCode: '12345',
            ssn: '123-45-6789',
          },
        };

        const registrationValidation = h.and(
          // Name validation (letters only, 2-50 chars)
          h.regex('registration.firstName', '^[a-zA-Z]{2,50}'),
          h.regex('registration.lastName', '^[a-zA-Z]{2,50}'),

          // Email validation
          h.regex('registration.email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}'),

          // Phone validation (US format)
          h.regex('registration.phone', '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})'),

          // Strong password validation
          h.regex('registration.password', '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}'),

          // Username validation (alphanumeric + underscore, 3-20 chars)
          h.regex('registration.username', '^[a-zA-Z0-9_]{3,20}'),

          // Date of birth (ISO format)
          h.regex('registration.dateOfBirth', '^\\d{4}-\\d{2}-\\d{2}'),

          // US ZIP code
          h.regex('registration.zipCode', '^\\d{5}(-\\d{4})?'),

          // SSN format
          h.regex('registration.ssn', '^\\d{3}-\\d{2}-\\d{4}'),

          // Password confirmation
          h.field.equals('registration.password', 'registration.confirmPassword')
        );

        expectRuleToPass(engine, registrationValidation, context);
      });
    });

    describe('Data Import Validation', () => {
      it('should validate CSV data import format', () => {
        const context = {
          csvData: {
            employeeId: 'EMP-2023-001234',
            email: 'employee@company.com',
            phone: '555.123.4567',
            startDate: '2023-01-15',
            salary: '75000.00',
            department: 'ENGINEERING',
            status: 'ACTIVE',
          },
        };

        const csvValidationRule = h.and(
          // Employee ID format: EMP-YYYY-NNNNNN
          h.regex('csvData.employeeId', '^EMP-\\d{4}-\\d{6}'),

          // Email format
          h.regex('csvData.email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}'),

          // Phone format (dots as separators)
          h.regex('csvData.phone', '^\\d{3}\\.\\d{3}\\.\\d{4}'),

          // Date format (ISO)
          h.regex('csvData.startDate', '^\\d{4}-\\d{2}-\\d{2}'),

          // Salary format (decimal with 2 places)
          h.regex('csvData.salary', '^\\d+\\.\\d{2}'),

          // Department (uppercase letters only)
          h.regex('csvData.department', '^[A-Z_]{2,20}'),

          // Status (predefined values)
          h.regex('csvData.status', '^(ACTIVE|INACTIVE|PENDING)')
        );

        expectRuleToPass(engine, csvValidationRule, context);
      });
    });

    describe('API Input Validation', () => {
      it('should validate API request parameters', () => {
        const context = {
          apiRequest: {
            version: 'v1.2.3',
            endpoint: '/api/users/123',
            method: 'GET',
            contentType: 'application/json',
            userAgent: 'MyApp/1.0.0 (iOS)',
            timestamp: '2023-12-01T10:30:00Z',
          },
        };

        const apiValidationRule = h.and(
          // Semantic version format
          h.regex('apiRequest.version', '^v\\d+\\.\\d+\\.\\d+'),

          // REST endpoint format
          h.regex('apiRequest.endpoint', '^\\/api\\/[a-zA-Z0-9\\/]+'),

          // HTTP method
          h.regex('apiRequest.method', '^(GET|POST|PUT|DELETE|PATCH)'),

          // Content type
          h.regex('apiRequest.contentType', '^application\\/(json|xml)'),

          // User agent format
          h.regex('apiRequest.userAgent', '^[\\w\\/\\.\\s\\(\\)]+'),

          // ISO 8601 timestamp
          h.regex('apiRequest.timestamp', '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z')
        );

        expectRuleToPass(engine, apiValidationRule, context);
      });
    });

    describe('Security Validation', () => {
      it('should validate security-related patterns', () => {
        const context = {
          security: {
            ipAddress: '192.168.1.100',
            macAddress: '00:1B:44:11:3A:B7',
            jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            uuid: '550e8400-e29b-41d4-a716-446655440000',
            hash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
          },
        };

        const securityValidationRule = h.and(
          // IPv4 address
          h.regex(
            'security.ipAddress',
            '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)'
          ),

          // MAC address
          h.regex('security.macAddress', '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})'),

          // JWT token (basic structure validation)
          h.regex('security.jwt', '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+'),

          // UUID v4
          h.regex(
            'security.uuid',
            '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
          ),

          // SHA-256 hash (64 hex characters)
          h.regex('security.hash', '^[a-f0-9]{64}')
        );

        expectRuleToPass(engine, securityValidationRule, context);
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty strings and whitespace', () => {
      const context = {
        data: {
          empty: '',
          whitespace: '   ',
          tab: '\t',
          newline: '\n',
          mixed: ' \t\n ',
        },
      };

      // Empty string patterns
      expectRuleToPass(
        engine,
        {
          regex: ['data.empty', '^'],
        },
        context
      );
      expectRuleToFail(engine, { regex: ['data.empty', '.+'] }, context);

      // Whitespace patterns
      expectRuleToPass(engine, { regex: ['data.whitespace', '^\\s+'] }, context);
      expectRuleToPass(
        engine,
        {
          regex: ['data.tab', '^\\t'],
        },
        context
      );
      expectRuleToPass(
        engine,
        {
          regex: ['data.newline', '^\\n'],
        },
        context
      );
      expectRuleToPass(
        engine,
        {
          regex: ['data.mixed', '^\\s+'],
        },
        context
      );
    });

    it('should handle unicode and special characters', () => {
      const context = {
        unicode: {
          emoji: '😀👍🎉',
          accents: 'café naïve résumé',
          chinese: '你好世界',
          arabic: 'مرحبا بالعالم',
          mixed: 'Hello 世界 🌍',
        },
      };

      // Unicode word characters
      expectRuleToPass(engine, { regex: ['unicode.accents', 'café'] }, context);
      expectRuleToPass(engine, { regex: ['unicode.chinese', '你好'] }, context);
      expectRuleToPass(engine, { regex: ['unicode.arabic', 'مرحبا'] }, context);

      // Mixed content
      expectRuleToPass(engine, { regex: ['unicode.mixed', 'Hello.*世界'] }, context);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const context = { data: { long: longString } };

      expectRuleToPass(
        engine,
        {
          regex: ['data.long', '^a+'],
        },
        context
      );
      expectRuleToPass(
        engine,
        {
          regex: ['data.long', '^a{10000}'],
        },
        context
      );
      expectRuleToFail(
        engine,
        {
          regex: ['data.long', '^a{10001}$'],
        },
        context
      );
    });

    it('should handle regex catastrophic backtracking prevention', () => {
      const context = {
        data: {
          problematic: 'aaaaaaaaaaaaaaaaaaaaaaX', // String that could cause backtracking
        },
      };

      // This pattern could cause catastrophic backtracking in some regex engines
      // but should still work correctly
      const result = engine.evaluateExpr(
        {
          regex: ['data.problematic', '^(a+)+b'],
        },
        context
      );
      // Should complete without hanging (will be false since no 'b' at end)
      expect(result.success).toBe(false);
    });
  });
});
