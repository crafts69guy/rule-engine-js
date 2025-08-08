import { createRuleEngine } from './src/index.js';

// Create engine
const engine = createRuleEngine();

// Test data
const context = {
  form: { a: 15, b: 8 },
  user: { name: 'John', age: 25 }
};

console.log('🧪 Testing Basic Operators...\n');

// Test 1: Your original use case - Dynamic field comparison
const rule1 = {
  and: [
    { gte: ['form.a', 'form.b'] },  // 15 >= 8 = true
    { lt: ['form.b', 10] }           // 8 < 10 = true
  ]
};

const result1 = engine.evaluateExpr(rule1, context);
console.log('✅ Test 1 - Dynamic comparison:', result1.success); // Should be true

// Test 2: Mixed path and literal
const rule2 = {
  and: [
    { eq: ['user.name', 'John'] },   // path == literal
    { gte: ['user.age', 18] }        // path >= literal
  ]
};

const result2 = engine.evaluateExpr(rule2, context);
console.log('✅ Test 2 - Mixed comparison:', result2.success); // Should be true

// Test 3: OR logic
const rule3 = {
  or: [
    { eq: ['user.name', 'Jane'] },   // false
    { gt: ['user.age', 20] }         // true (25 > 20)
  ]
};

const result3 = engine.evaluateExpr(rule3, context);
console.log('✅ Test 3 - OR logic:', result3.success); // Should be true

// Test 4: NOT operation
const rule4 = {
  not: [
    { eq: ['user.name', 'Jane'] }    // NOT false = true
  ]
};

const result4 = engine.evaluateExpr(rule4, context);
console.log('✅ Test 4 - NOT logic:', result4.success); // Should be true

// Show available operators
console.log('\n📋 Available operators:', engine.getOperators());

// Show metrics
console.log('\n📊 Performance metrics:', engine.getMetrics());
