import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

console.log('🧪 Testing Rule Engine JS in Node.js CLI\n');

// Test data
const userData = {
  name: 'Alice Johnson',
  age: 32,
  email: 'alice@company.com',
  role: 'admin',
  department: 'engineering',
  permissions: ['read', 'write', 'delete'],
  lastLogin: '2024-01-15'
};

// Create engine and helpers
const engine = createRuleEngine();
const rules = createRuleHelpers();

// Test 1: User access control
console.log('📋 Test 1: User Access Control');
const accessRule = rules.and(
  rules.eq('role', 'admin'),
  rules.gte('age', 18),
  rules.validation.email('email')
);

const accessResult = engine.evaluateExpr(accessRule, userData);
console.log(`✅ Access granted: ${accessResult.success}\n`);

// Test 2: Complex business logic
console.log('📋 Test 2: Complex Business Logic');
const businessRule = rules.or(
  rules.and(
    rules.eq('role', 'admin'),
    rules.in('write', 'permissions')
  ),
  rules.and(
    rules.eq('department', 'engineering'),
    rules.gte('age', 25)
  )
);

const businessResult = engine.evaluateExpr(businessRule, userData);
console.log(`✅ Business rule satisfied: ${businessResult.success}\n`);

// Test 3: Performance with many evaluations
console.log('📋 Test 3: Performance Test');
const startTime = performance.now();

for (let i = 0; i < 1000; i++) {
  engine.evaluateExpr(accessRule, userData);
}

const endTime = performance.now();
console.log(`✅ 1000 evaluations completed in ${(endTime - startTime).toFixed(2)}ms\n`);

// Test 4: Error handling
console.log('📋 Test 4: Error Handling');
const invalidRule = { invalidOperator: ['test', 'value'] };
const errorResult = engine.evaluateExpr(invalidRule, userData);
console.log(`✅ Error handled gracefully: ${!errorResult.success}`);
console.log(`📝 Error message: ${errorResult.error}\n`);

// Show metrics
console.log('📊 Engine Metrics:');
console.log(engine.getMetrics());

console.log('\n🎉 All tests completed successfully!');
