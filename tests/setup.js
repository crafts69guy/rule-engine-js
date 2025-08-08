/**
 * Jest setup file - CommonJS version
 */

// Global test context data
global.testContext = {
  user: {
    name: 'John Doe',
    email: 'john@company.com',
    age: 28,
    role: 'admin',
    tags: ['admin', 'premium', 'beta'],
    profile: {
      bio: 'Software Engineer at Tech Corp',
      skills: ['javascript', 'python', 'go']
    }
  },
  form: {
    score: 85,
    maxScore: 100
  }
};

// Global test helper functions
global.expectRuleToPass = (engine, rule, context = global.testContext) => {
  const result = engine.evaluateExpr(rule, context);
  expect(result.success).toBe(true);
  if (!result.success) {
    console.error('Rule failed:', result.error);
    console.error('Details:', result.details);
  }
  return result;
};

global.expectRuleToFail = (engine, rule, context = global.testContext) => {
  const result = engine.evaluateExpr(rule, context);
  expect(result.success).toBe(false);
  return result;
};
