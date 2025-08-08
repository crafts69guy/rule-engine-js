import { createRuleEngine } from './src/index.js';

// Create engine with all operators
const engine = createRuleEngine();

// Rich test data
const context = {
  user: {
    name: 'John Doe',
    email: 'john@company.com',
    age: 28,
    tags: ['admin', 'premium', 'beta'],
    role: 'admin',  // Add single role for easier testing
    profile: {
      bio: 'Software Engineer at Tech Corp',
      skills: ['javascript', 'python', 'go']
    }
  },
  product: {
    price: 99.99,
    category: 'software',
    rating: 4.8,
    priceRange: [50, 150],
    features: ['api', 'dashboard', 'analytics']
  },
  form: {
    score: 85,
    maxScore: 100,
    answers: ['A', 'B', 'C']
  }
};

console.log('🧪 Testing ALL Operators...\n');

// Test 1: Basic + String operators
const rule1 = {
  and: [
    { contains: ['user.email', '@company.com'] },   // String operation
    { startsWith: ['user.name', 'John'] },         // String operation  
    { gte: ['user.age', 18] }                      // Numeric operation
  ]
};

const result1 = engine.evaluateExpr(rule1, context);
console.log('✅ Test 1 - String operators:', result1.success); // Should be true

// Test 2: Array operators (FIXED)
const rule2 = {
  and: [
    { in: ['user.role', ['admin', 'user', 'guest']] },           // Single role in allowed roles
    { in: ['javascript', 'user.profile.skills'] },              // Value in dynamic array
    { notIn: ['user.role', ['banned', 'suspended']] }           // Role not in banned list
  ]
};

const result2 = engine.evaluateExpr(rule2, context);
console.log('✅ Test 2 - Array operators:', result2.success); // Should be true

// Test 2b: Additional array tests for completeness
const rule2b = {
  and: [
    { in: ['admin', 'user.tags'] },                             // Check if 'admin' is in user's tags
    { in: ['premium', 'user.tags'] },                           // Check if 'premium' is in user's tags
    { notIn: ['banned', 'user.tags'] }                          // Check 'banned' is not in user's tags
  ]
};

const result2b = engine.evaluateExpr(rule2b, context);
console.log('✅ Test 2b - More array operators:', result2b.success); // Should be true

// Test 3: BETWEEN with dynamic range
const rule3 = {
  between: ['product.price', 'product.priceRange']  // Dynamic range from context
};

const result3 = engine.evaluateExpr(rule3, context);
console.log('✅ Test 3 - Dynamic BETWEEN:', result3.success); // Should be true (99.99 between 50-150)

// Test 4: Regex operator
const rule4 = {
  regex: ['user.email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$']  // Email validation
};

const result4 = engine.evaluateExpr(rule4, context);
console.log('✅ Test 4 - Regex validation:', result4.success); // Should be true

// Test 5: Null checks
const rule5 = {
  and: [
    { isNotNull: ['user.name'] },        // Field exists
    { isNull: ['user.middleName'] }      // Field doesn't exist
  ]
};

const result5 = engine.evaluateExpr(rule5, context);
console.log('✅ Test 5 - Null checks:', result5.success); // Should be true

// Test 6: Complex nested rule with multiple operator types
const rule6 = {
  or: [
    {
      and: [
        { eq: ['user.role', 'superadmin'] },               // This will be false
        { gte: ['product.rating', 4.5] }
      ]
    },
    {
      and: [
        { in: ['admin', 'user.tags'] },                    // This will be true
        { contains: ['user.profile.bio', 'Engineer'] },   // This will be true
        { between: ['form.score', [80, 90]] }             // This will be true (85 between 80-90)
      ]
    }
  ]
};

const result6 = engine.evaluateExpr(rule6, context);
console.log('✅ Test 6 - Complex nested rule:', result6.success); // Should be true

// Test 7: Dynamic field comparison (your original use case)
const rule7 = {
  and: [
    { lt: ['form.score', 'form.maxScore'] },    // 85 < 100 = true
    { gte: ['form.score', 80] }                 // 85 >= 80 = true
  ]
};

const result7 = engine.evaluateExpr(rule7, context);
console.log('✅ Test 7 - Dynamic field comparison:', result7.success); // Should be true

// Show all available operators
console.log('\n📋 All available operators:', engine.getOperators().sort());

// Show performance metrics
console.log('\n📊 Performance metrics:', engine.getMetrics());

// Test error handling
console.log('\n🚨 Testing error handling...');
const invalidRule = { invalidOp: ['test'] };
const errorResult = engine.evaluateExpr(invalidRule, context);
console.log('✅ Error handling works:', !errorResult.success, '- Error:', errorResult.error);

console.log('\n🎉 All tests completed!');
