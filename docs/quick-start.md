# Quick Start Guide

Get up and running with Rule Engine JS in under 5 minutes! 🚀

## 📑 Table of contents

- [Installation](#installation)
- [Your First Rule](#your-first-rule)
- [Building Complex Rules](#building-complex-rules)
- [Dynamic Field Comparison](#dynamic-field-comparison)
- [Common Patterns](#common-patterns)
- [Working with Different Data Types](#working-with-different-data-types)
- [Configuration Options](#configuration-options)
- [Best Practices for Beginners](#best-practices-for-beginners)
- [Debugging Your Rules](#debugging-your-rules)
- [Next Steps](#next-steps)
- [Common Questions](#common-questions)

<a name="installation"></a>

## 📦 Installation

```bash
npm install rule-engine-js
```

<a name="your-first-rule"></a>

## 🎯 Your First Rule

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

// 1. Create engine and helpers
const engine = createRuleEngine();
const rules = createRuleHelpers();

// 2. Define your data
const user = {
  name: 'John Doe',
  age: 25,
  role: 'admin',
  email: 'john@company.com',
};

// 3. Create a simple rule
const isAdult = rules.gte('age', 18);

// 4. Evaluate the rule
const result = engine.evaluateExpr(isAdult, user);

console.log(result.success); // true
```

🎉 **Congratulations!** You just created and evaluated your first rule.

<a name="building-complex-rules"></a>

## 🧩 Building Complex Rules

### Combining Multiple Conditions

```javascript
// Check if user can access admin panel
const canAccessAdmin = rules.and(
  rules.gte('age', 18), // Must be adult
  rules.eq('role', 'admin'), // Must be admin
  rules.validation.email('email') // Must have valid email
);

const result = engine.evaluateExpr(canAccessAdmin, user);
console.log(result.success); // true
```

### Working with Arrays

```javascript
const userData = {
  name: 'Jane Smith',
  permissions: ['read', 'write', 'delete'],
  tags: ['premium', 'verified'],
};

// Check if user has write permission
const hasWriteAccess = rules.in('write', 'permissions');

// Check if user is premium
const isPremium = rules.in('premium', 'tags');

// Combine them
const premiumWriteAccess = rules.and(hasWriteAccess, isPremium);

console.log(engine.evaluateExpr(premiumWriteAccess, userData).success); // true
```

<a name="dynamic-field-comparison"></a>

## 🔗 Dynamic Field Comparison

Compare values from different parts of your data:

```javascript
const orderData = {
  order: {
    total: 150,
    subtotal: 130,
    tax: 20,
  },
  user: {
    creditLimit: 1000,
    currentBalance: 50,
  },
};

// Verify order calculations and user limits
const orderValidation = rules.and(
  // Total should equal subtotal + tax
  rules.field.equals('order.total', 'order.subtotal + order.tax'), // Note: Use calculated field

  // User has enough credit
  rules.field.lessThan('order.total', 'user.creditLimit'),

  // Order is within remaining balance
  rules.lte('order.total', 100) // For simplicity, using fixed value
);

// Better approach for calculated fields:
const enhancedOrderData = {
  ...orderData,
  calculated: {
    expectedTotal: orderData.order.subtotal + orderData.order.tax,
    availableCredit: orderData.user.creditLimit - orderData.user.currentBalance,
  },
};

const betterValidation = rules.and(
  rules.field.equals('order.total', 'calculated.expectedTotal'),
  rules.field.lessThan('order.total', 'calculated.availableCredit')
);

console.log(engine.evaluateExpr(betterValidation, enhancedOrderData).success);
```

<a name="common-patterns"></a>

## 📝 Common Patterns

### 1. Form Validation

```javascript
const formData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 25,
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  terms: true,
};

const formValidation = rules.and(
  // Required fields
  rules.validation.required('firstName'),
  rules.validation.required('lastName'),

  // Email format
  rules.validation.email('email'),

  // Age range
  rules.validation.ageRange('age', 18, 120),

  // Password strength
  rules.and(rules.gte('password.length', 8), rules.regex('password', '(?=.*[0-9])(?=.*[a-zA-Z])')),

  // Password confirmation
  rules.field.equals('password', 'confirmPassword'),

  // Terms acceptance
  rules.isTrue('terms')
);

const isFormValid = engine.evaluateExpr(formValidation, formData);
console.log('Form is valid:', isFormValid.success);
```

### 2. User Access Control

```javascript
const accessContext = {
  user: {
    role: 'editor',
    department: 'marketing',
    permissions: ['read', 'write'],
    isActive: true,
  },
  resource: {
    type: 'document',
    department: 'marketing',
    classification: 'internal',
  },
};

const accessRule = rules.and(
  // User must be active
  rules.isTrue('user.isActive'),

  // Role-based access
  rules.or(
    rules.eq('user.role', 'admin'), // Admins can access everything
    rules.and(
      // Non-admins need department match and permissions
      rules.field.equals('user.department', 'resource.department'),
      rules.in('write', 'user.permissions'),
      rules.in('resource.classification', ['public', 'internal'])
    )
  )
);

const hasAccess = engine.evaluateExpr(accessRule, accessContext);
console.log('Has access:', hasAccess.success);
```

### 3. E-commerce Pricing

```javascript
const customerData = {
  customer: {
    type: 'vip',
    loyaltyPoints: 1200,
    isFirstTime: false,
  },
  order: {
    subtotal: 150,
    items: 3,
    category: 'electronics',
  },
};

const discountEligibility = rules.or(
  // VIP customers with minimum order
  rules.and(rules.eq('customer.type', 'vip'), rules.gte('order.subtotal', 100)),

  // High loyalty points
  rules.gte('customer.loyaltyPoints', 1000),

  // Large orders
  rules.gte('order.subtotal', 200),

  // First-time customer bonus
  rules.and(rules.isTrue('customer.isFirstTime'), rules.gte('order.subtotal', 50))
);

const qualifiesForDiscount = engine.evaluateExpr(discountEligibility, customerData);
console.log('Qualifies for discount:', qualifiesForDiscount.success);
```

<a name="working-with-different-data-types"></a>

## 🛠️ Working with Different Data Types

### Strings

```javascript
const textData = {
  title: 'JavaScript Tutorial',
  description: 'Learn JavaScript programming',
  filename: 'tutorial.pdf',
  email: 'user@example.com',
};

const stringRules = rules.and(
  rules.contains('title', 'JavaScript'),
  rules.startsWith('filename', 'tutorial'),
  rules.endsWith('filename', '.pdf'),
  rules.validation.email('email')
);
```

### Numbers

```javascript
const numericData = {
  price: 99.99,
  discount: 10,
  quantity: 5,
  rating: 4.5,
};

const numericRules = rules.and(
  rules.between('price', [10, 200]),
  rules.lte('discount', 20),
  rules.gte('quantity', 1),
  rules.gt('rating', 4.0)
);
```

### Arrays

```javascript
const arrayData = {
  skills: ['javascript', 'python', 'react'],
  roles: ['developer', 'team-lead'],
  scores: [85, 92, 78],
};

const arrayRules = rules.and(
  rules.in('javascript', 'skills'),
  rules.notIn('admin', 'roles'),
  rules.gte('scores.length', 3) // Note: Use calculated field for array length
);
```

### Nested Objects

```javascript
const nestedData = {
  user: {
    profile: {
      name: 'John Doe',
      settings: {
        theme: 'dark',
        notifications: true,
      },
    },
    account: {
      status: 'active',
      plan: 'premium',
    },
  },
};

const nestedRules = rules.and(
  rules.eq('user.profile.name', 'John Doe'),
  rules.eq('user.profile.settings.theme', 'dark'),
  rules.isTrue('user.profile.settings.notifications'),
  rules.eq('user.account.status', 'active')
);
```

<a name="configuration-options"></a>

## ⚙️ Configuration Options

### Basic Configuration

```javascript
const engine = createRuleEngine({
  strict: true, // Enforce strict type checking
  maxDepth: 10, // Maximum rule nesting depth
  enableCache: true, // Enable performance caching
  maxCacheSize: 1000, // Cache size limit
});
```

### Per-Rule Options

```javascript
// Strict type checking for specific operations
const strictRule = rules.eq('age', 25, { strict: true });

// Case-insensitive string matching (if supported by custom operators)
const caseInsensitiveRule = rules.contains('name', 'john', { ignoreCase: true });

// Regex with flags
const regexRule = rules.regex('text', 'pattern', { flags: 'gi' });
```

<a name="best-practices-for-beginners"></a>

## 🎯 Best Practices for Beginners

### 1. Start Simple, Build Complex

```javascript
// ✅ Good: Start with simple rules
const isActive = rules.eq('status', 'active');
const isAdult = rules.gte('age', 18);

// Then combine them
const eligibleUser = rules.and(isActive, isAdult);

// ❌ Avoid: Complex rules from the start
const complexRule = rules.and(
  rules.or(/* lots of nested conditions */),
  rules.not(/* more complexity */)
  // ... becomes hard to debug
);
```

### 2. Use Descriptive Variable Names

```javascript
// ✅ Good: Clear intent
const canPurchaseAlcohol = rules.gte('age', 21);
const hasValidPayment = rules.validation.required('creditCard');
const alcoholPurchaseRule = rules.and(canPurchaseAlcohol, hasValidPayment);

// ❌ Avoid: Unclear names
const rule1 = rules.gte('age', 21);
const rule2 = rules.validation.required('creditCard');
const finalRule = rules.and(rule1, rule2);
```

### 3. Test Your Rules

```javascript
// Always test with different data scenarios
const testData = [
  { age: 25, status: 'active' }, // Should pass
  { age: 16, status: 'active' }, // Should fail (too young)
  { age: 25, status: 'inactive' }, // Should fail (not active)
  { age: 16, status: 'inactive' }, // Should fail (both conditions)
];

const adultActiveRule = rules.and(rules.gte('age', 18), rules.eq('status', 'active'));

testData.forEach((data, index) => {
  const result = engine.evaluateExpr(adultActiveRule, data);
  console.log(`Test ${index + 1}:`, result.success, data);
});
```

### 4. Handle Missing Data Gracefully

```javascript
// ✅ Good: Check for existence first
const safeRule = rules.and(
  rules.isNotNull('user.profile'),
  rules.eq('user.profile.status', 'verified')
);

// ✅ Or use validation helpers
const requirementRule = rules.and(
  rules.validation.required('user.email'),
  rules.validation.email('user.email')
);

// ❌ Avoid: Assuming data exists
const unsafeRule = rules.eq('user.profile.status', 'verified'); // Fails if profile is null
```

<a name="debugging-your-rules"></a>

## 🔍 Debugging Your Rules

### Understanding Results

```javascript
const debugRule = rules.and(rules.eq('role', 'admin'), rules.gte('age', 18));

const result = engine.evaluateExpr(debugRule, { role: 'user', age: 25 });

if (!result.success) {
  console.log('Rule failed!');
  console.log('Failed operator:', result.operator);
  console.log('Error message:', result.error);
  console.log('Context:', result.details);
}
```

### Testing Individual Conditions

```javascript
const userData = { role: 'user', age: 16 };

// Test each condition separately
const isAdmin = engine.evaluateExpr(rules.eq('role', 'admin'), userData);
console.log('Is admin:', isAdmin.success); // false

const isAdult = engine.evaluateExpr(rules.gte('age', 18), userData);
console.log('Is adult:', isAdult.success); // false

// Now test combined
const combined = engine.evaluateExpr(
  rules.and(rules.eq('role', 'admin'), rules.gte('age', 18)),
  userData
);
console.log('Combined result:', combined.success); // false
```

<a name="next-steps"></a>

## 🚀 Next Steps

Now that you've mastered the basics, explore these advanced topics:

1. **[Complete Documentation](./README.md)** - Dive deeper into all features
2. **[Operator Reference](./operators.md)** - Learn about all available operators
3. **[Performance Guide](./performance.md)** - Optimize your rules for speed
4. **[Security Guide](./security.md)** - Keep your rules secure
5. **[Real-World Examples](../examples/)** - See complex patterns in action

<a name="common-questions"></a>

## 💡 Common Questions

### Q: Can I save rules to a database?

**A:** Yes! Rules are JSON objects that can be easily stored and retrieved:

```javascript
// Save to database
const rule = rules.and(rules.eq('role', 'admin'), rules.gte('age', 18));
await db.rules.save({ name: 'admin-access', rule: rule });

// Load from database
const savedRule = await db.rules.findByName('admin-access');
const result = engine.evaluateExpr(savedRule.rule, userData);
```

### Q: How do I handle user input safely?

**A:** Always validate user input before using it in rules:

```javascript
function validateUserInput(input) {
  // Sanitize and validate input
  return {
    age: parseInt(input.age) || 0,
    role: String(input.role).toLowerCase(),
    email: String(input.email).trim(),
  };
}

const safeUserData = validateUserInput(userInput);
const result = engine.evaluateExpr(rule, safeUserData);
```

### Q: Can I use rules in React components?

**A:** Absolutely! Rules work great for dynamic UI logic:

```javascript
function UserProfile({ user }) {
  const canEditProfile = engine.evaluateExpr(
    rules.or(rules.eq('id', user.id), rules.eq('role', 'admin')),
    { ...user, id: currentUser.id }
  );

  return (
    <div>
      <h1>{user.name}</h1>
      {canEditProfile.success && <button>Edit Profile</button>}
    </div>
  );
}
```

### Q: How do I optimize performance?

**A:** Follow these key practices:

```javascript
// 1. Reuse engine instances
const globalEngine = createRuleEngine();

// 2. Order rules by speed (fastest first)
const optimizedRule = rules.and(
  rules.eq('active', true), // Fast boolean check
  rules.gte('age', 18), // Fast numeric check
  rules.validation.email('email') // Slower regex check
);

// 3. Use caching effectively
const cachedEngine = createRuleEngine({ maxCacheSize: 2000 });
```

---

🎉 **You're ready to build amazing rule-based applications!**

Start with simple rules and gradually build more complex logic as you become comfortable with the patterns. Remember: rules should make your code more readable and maintainable, not more complex.

**Happy coding!** 🚀
