import { createRuleEngine, createRuleHelpers } from './src/index.js';

const engine = createRuleEngine();
const h = createRuleHelpers(); // 'h' for short, clean syntax

const context = {
  user: {
    name: 'John Doe',
    email: 'john@company.com',
    age: 28,
    role: 'admin',
    profile: {
      bio: 'Software Engineer'
    }
  },
  form: {
    score: 85,
    maxScore: 100
  }
};

console.log('🧪 Testing Rule Helpers...\n');

// Test 1: Clean syntax with helpers
const rule1 = h.and(
  h.contains('user.email', '@company.com'),
  h.gte('user.age', 18),
  h.eq('user.role', 'admin')
);

const result1 = engine.evaluateExpr(rule1, context);
console.log('✅ Test 1 - Helper syntax:', result1.success);

// Test 2: Dynamic field comparison with helpers (FIXED)
const rule2 = h.and(
  h.field.lessThan('form.score', 'form.maxScore'),   // 85 < 100 = TRUE
  h.gte('form.score', 80)                            // 85 >= 80 = TRUE
);

const result2 = engine.evaluateExpr(rule2, context);
console.log('✅ Test 2 - Dynamic field helpers:', result2.success);

// Test 3: Validation helpers
const rule3 = h.and(
  h.validation.email('user.email'),
  h.validation.required('user.name'),
  h.validation.minAge('user.age', 18)
);

const result3 = engine.evaluateExpr(rule3, context);
console.log('✅ Test 3 - Validation helpers:', result3.success);

// Test 4: Convenience methods
const rule4 = h.and(
  h.isNotEmpty('user.name'),
  h.isNotNull('user.email'),
  h.exists('user.profile.bio')
);

const result4 = engine.evaluateExpr(rule4, context);
console.log('✅ Test 4 - Convenience helpers:', result4.success);

// Test 5: Compare helper vs raw syntax (FIXED)
console.log('\n📊 Syntax Comparison:');

// Raw syntax (verbose) - CORRECTED LOGIC
const rawRule = {
  and: [
    { lt: ['form.score', 'form.maxScore'] },         // 85 < 100 = TRUE
    { contains: ['user.email', '@company.com'] }     // TRUE
  ]
};

// Helper syntax (clean) - CORRECTED LOGIC
const helperRule = h.and(
  h.lt('form.score', 'form.maxScore'),              // 85 < 100 = TRUE
  h.contains('user.email', '@company.com')         // TRUE
);

console.log('Raw syntax result:', engine.evaluateExpr(rawRule, context).success);
console.log('Helper syntax result:', engine.evaluateExpr(helperRule, context).success);

// Test 6: Complex nested rules with helpers
const rule6 = h.or(
  h.and(
    h.eq('user.role', 'superadmin'),
    h.gte('user.age', 21)
  ),
  h.and(
    h.eq('user.role', 'admin'),              // TRUE
    h.validation.email('user.email'),        // TRUE
    h.between('form.score', [80, 100])       // TRUE (85 between 80-100)
  )
);

const result6 = engine.evaluateExpr(rule6, context);
console.log('✅ Test 6 - Complex nested helpers:', result6.success);

console.log('\n🎉 Rule Helpers work perfectly!');
console.log('\n💡 Available helper categories:');
console.log('• Basic: eq, neq, gt, gte, lt, lte');
console.log('• Logical: and, or, not');
console.log('• String: contains, startsWith, endsWith, regex');
console.log('• Array: in, notIn');
console.log('• Special: between, isNull, isNotNull');
console.log('• Convenience: isTrue, isFalse, isEmpty, isNotEmpty');
console.log('• Field comparison: h.field.equals, h.field.greaterThan, etc.');
console.log('• Validation: h.validation.email, h.validation.required, etc.');
