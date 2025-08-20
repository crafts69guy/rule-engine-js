const { createRuleEngine } = require('../../../src/index.js');

describe('String Operators', () => {
  let engine;

  beforeEach(() => {
    engine = createRuleEngine();
  });

  describe('CONTAINS Operator', () => {
    it('should check if string contains substring', () => {
      expectRuleToPass(engine, { contains: ['user.email', '@company.com'] });
      expectRuleToFail(engine, { contains: ['user.email', '@gmail.com'] });
    });

    it('should handle dynamic field contains', () => {
      const context = {
        message: { text: 'Hello World', searchTerm: 'Hello' },
      };
      expectRuleToPass(engine, { contains: ['message.text', 'message.searchTerm'] }, context);
    });

    it('should be case sensitive', () => {
      expectRuleToPass(engine, { contains: ['user.profile.bio', 'Software'] });
      expectRuleToFail(engine, { contains: ['user.profile.bio', 'software'] });
    });
  });

  describe('STARTS_WITH Operator', () => {
    it('should check if string starts with prefix', () => {
      expectRuleToPass(engine, { startsWith: ['user.name', 'John'] });
      expectRuleToFail(engine, { startsWith: ['user.name', 'Jane'] });
    });

    it('should handle dynamic field starts with', () => {
      const context = {
        url: { full: 'https://example.com', protocol: 'https' },
      };
      expectRuleToPass(engine, { startsWith: ['url.full', 'url.protocol'] }, context);
    });
  });

  describe('ENDS_WITH Operator', () => {
    it('should check if string ends with suffix', () => {
      expectRuleToPass(engine, { endsWith: ['user.email', '.com'] });
      expectRuleToFail(engine, { endsWith: ['user.email', '.org'] });
    });

    it('should handle dynamic field ends with', () => {
      const context = {
        file: { name: 'document.pdf', extension: '.pdf' },
      };
      expectRuleToPass(engine, { endsWith: ['file.name', 'file.extension'] }, context);
    });
  });

  describe('REGEX Operator', () => {
    it('should validate email format', () => {
      expectRuleToPass(engine, {
        regex: ['user.email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$'],
      });
    });

    it('should handle invalid regex gracefully', () => {
      const result = engine.evaluateExpr(
        {
          regex: ['user.email', '[invalid('],
        },
        global.testContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid regex pattern');
    });

    it('should handle dynamic regex patterns', () => {
      const context = {
        data: { text: 'Hello123', pattern: '\\d+' },
      };
      expectRuleToPass(engine, { regex: ['data.text', 'data.pattern'] }, context);
    });

    it('should support regex flags', () => {
      // Note: This test assumes flags support in options
      expectRuleToPass(engine, {
        regex: ['user.profile.bio', 'software', { flags: 'i' }],
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-string values in string operators', () => {
      const result = engine.evaluateExpr(
        {
          contains: ['user.age', 'test'],
        },
        global.testContext
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('requires string operands');
    });

    it('should handle missing arguments in string operators', () => {
      const operators = ['contains', 'startsWith', 'endsWith', 'regex'];

      operators.forEach((operator) => {
        const result = engine.evaluateExpr(
          { [operator]: ['user.name'] }, // Missing second argument
          global.testContext
        );
        expect(result.success).toBe(false);
      });
    });

    it('should handle non-existent fields gracefully', () => {
      const rule = { contains: ['user.nonexistent.field', 'test'] };
      const result = expectRuleToFail(engine, rule);
      expect(result.success).toBe(false);
    });
  });

  describe('Type Coercion and Options', () => {
    it('should handle type coercion in loose mode', () => {
      const context = { data: { number: '12345', search: '123' } };
      expectRuleToPass(engine, { contains: ['data.number', 'data.search'] }, context);
    });

    it('should handle strict mode when configured', () => {
      const context = { data: { number: 12345, search: '123' } };
      const result = engine.evaluateExpr(
        { contains: ['data.number', 'data.search', { strict: true }] },
        context
      );
      expect(result.success).toBe(false);
    });

    it('should handle empty strings appropriately', () => {
      const context = { data: { text: 'Hello World', empty: '' } };

      expectRuleToPass(engine, { contains: ['data.text', 'data.empty'] }, context);

      expectRuleToPass(engine, { startsWith: ['data.text', 'data.empty'] }, context);

      expectRuleToPass(engine, { endsWith: ['data.text', 'data.empty'] }, context);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long strings efficiently', () => {
      const longString = 'A'.repeat(10000) + 'NEEDLE' + 'B'.repeat(10000);
      const context = { data: { haystack: longString } };

      const startTime = Date.now();
      expectRuleToPass(engine, { contains: ['data.haystack', 'NEEDLE'] }, context);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle unicode and special characters', () => {
      const context = {
        unicode: {
          text: 'Hello 🌍 World! ñáéíóú',
          emoji: '🌍',
          accents: 'ñáéíóú',
        },
      };

      expectRuleToPass(engine, { contains: ['unicode.text', 'unicode.emoji'] }, context);

      expectRuleToPass(engine, { contains: ['unicode.text', 'unicode.accents'] }, context);
    });

    it('should handle case-insensitive regex patterns', () => {
      expectRuleToPass(engine, {
        regex: ['user.profile.bio', 'SOFTWARE', { flags: 'i' }],
      });
    });

    it('should handle multiline regex patterns', () => {
      const context = {
        multiline: {
          text: 'First line\nSecond line\nThird line',
        },
      };

      expectRuleToPass(
        engine,
        {
          regex: ['multiline.text', '^Second', { flags: 'm' }],
        },
        context
      );
    });
  });

  describe('Real-World Use Cases', () => {
    it('should validate email domains', () => {
      // user.email is 'john@company.com', so only @company.com should pass
      expectRuleToPass(engine, {
        endsWith: ['user.email', '@company.com'],
      });

      expectRuleToFail(engine, {
        endsWith: ['user.email', '@partner.org'],
      });
    });

    it('should validate URL protocols', () => {
      const context = {
        urls: {
          secure: 'https://example.com',
          insecure: 'http://example.com',
          ftp: 'ftp://files.example.com',
        },
      };

      expectRuleToPass(engine, { startsWith: ['urls.secure', 'https://'] }, context);

      expectRuleToFail(engine, { startsWith: ['urls.insecure', 'https://'] }, context);
    });

    it('should validate file extensions', () => {
      const context = {
        files: {
          document: 'report.pdf',
          image: 'photo.jpg',
          text: 'notes.txt',
        },
      };

      expectRuleToPass(engine, { endsWith: ['files.document', '.pdf'] }, context);

      expectRuleToFail(engine, { endsWith: ['files.image', '.pdf'] }, context);
    });

    it('should handle search and filtering scenarios', () => {
      const context = {
        products: {
          name: 'iPhone 15 Pro Max',
          description: 'Latest smartphone with advanced camera',
          category: 'Electronics',
        },
        search: {
          term: 'iPhone',
          category: 'Electronics',
        },
      };

      expectRuleToPass(
        engine,
        {
          and: [
            { contains: ['products.name', 'search.term'] },
            { eq: ['products.category', 'search.category'] },
          ],
        },
        context
      );
    });
  });
});
