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
  });
});
