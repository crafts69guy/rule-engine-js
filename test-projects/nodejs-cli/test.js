import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';
import assert from 'assert';

console.log('🧪 Running automated tests...\n');

const engine = createRuleEngine();
const rules = createRuleHelpers();

const testData = { user: { age: 25, name: 'Test User' } };

// Test basic functionality
const basicRule = rules.eq('user.name', 'Test User');
const result1 = engine.evaluateExpr(basicRule, testData);
assert(result1.success, 'Basic equality test failed');
console.log('✅ Basic equality test passed');

// Test logical operations
const logicalRule = rules.and(
  rules.gte('user.age', 18),
  rules.eq('user.name', 'Test User')
);
const result2 = engine.evaluateExpr(logicalRule, testData);
assert(result2.success, 'Logical AND test failed');
console.log('✅ Logical AND test passed');

// Test error handling
const invalidRule = { nonexistent: ['test'] };
const result3 = engine.evaluateExpr(invalidRule, testData);
assert(!result3.success, 'Error handling test failed');
console.log('✅ Error handling test passed');

console.log('\n🎉 All automated tests passed!');
