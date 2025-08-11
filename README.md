# Rule Engine JS

[![npm version](https://img.shields.io/npm/v/rule-engine-js.svg)](https://www.npmjs.com/package/rule-engine-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/workflow/status/crafts69guy/rule-engine-js/CI)](https://github.com/crafts69guy/rule-engine-js/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/crafts69guy/rule-engine-js.svg)](https://codecov.io/gh/crafts69guy/rule-engine-js)

A powerful, flexible JavaScript rule engine for dynamic business logic evaluation. Build complex conditional logic with simple, readable syntax. Perfect for user permissions, pricing rules, content filtering, form validation, and any scenario requiring dynamic decision-making.

## ✨ Features

- **🚀 Simple & Intuitive** - Write rules in natural, readable syntax
- **🔒 Security First** - Built-in protection against prototype pollution and injection attacks
- **⚡ High Performance** - Intelligent caching with LRU eviction for optimal speed
- **🎯 Type Safe** - Flexible type coercion with strict mode support
- **🔧 Extensible** - Easy custom operator registration
- **📊 Monitoring** - Built-in performance metrics and cache statistics
- **🌊 Zero Dependencies** - Lightweight with no external dependencies

## 📦 Installation

```bash
npm install rule-engine-js
```

```bash
yarn add rule-engine-js
```

## 🚀 Quick Start

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

const engine = createRuleEngine();
const rules = createRuleHelpers();

// User data
const user = {
  age: 25,
  email: 'john@example.com',
  subscription: 'premium',
  preferences: { notifications: true },
};

// Simple rule
const canAccess = rules.and(
  rules.gte('age', 18),
  rules.in('subscription', ['premium', 'enterprise']),
  rules.validation.email('email')
);

const result = engine.evaluateExpr(canAccess, user);
console.log(result.success); // true
```

## 🎯 Common Use Cases

### User Permissions & Access Control

```javascript
const user = { role: 'editor', department: 'marketing', verified: true };
const resource = { type: 'article', department: 'marketing', status: 'draft' };

const accessRule = rules.or(
  rules.eq('user.role', 'admin'),
  rules.and(
    rules.in('user.role', ['editor', 'author']),
    rules.eq('user.department', 'resource.department'),
    rules.isTrue('user.verified')
  )
);

const hasAccess = engine.evaluateExpr(accessRule, { user, resource });
```

### Dynamic Pricing & Discounts

```javascript
const order = {
  subtotal: 150,
  customer: { type: 'vip', loyaltyPoints: 1200 },
  items: [{ category: 'electronics' }],
};

const discountEligible = rules.or(
  rules.and(rules.eq('customer.type', 'vip'), rules.gte('subtotal', 100)),
  rules.gte('customer.loyaltyPoints', 1000),
  rules.gte('subtotal', 200)
);

if (engine.evaluateExpr(discountEligible, order).success) {
  // Apply 15% discount
}
```

### Form Validation

```javascript
const formData = {
  email: 'user@example.com',
  age: 25,
  password: 'SecurePass123!',
  terms: true,
};

const validationRule = rules.and(
  rules.validation.email('email'),
  rules.validation.ageRange('age', 18, 120),
  rules.and(
    rules.gte('password.length', 8),
    rules.regex('password', '(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^&*])')
  ),
  rules.isTrue('terms')
);

const isValid = engine.evaluateExpr(validationRule, formData);
```

### Content Filtering & Recommendations

```javascript
const content = { category: 'tech', difficulty: 'intermediate', premium: false };
const userProfile = { interests: ['tech', 'science'], level: 'intermediate', plan: 'free' };

const showContent = rules.and(
  rules.in('content.category', 'userProfile.interests'),
  rules.eq('content.difficulty', 'userProfile.level'),
  rules.or(rules.isFalse('content.premium'), rules.neq('userProfile.plan', 'free'))
);
```

## 📖 Core Concepts

### Rule Structure

Rules are simple JSON objects that describe conditions:

```javascript
// Basic structure
{
  "operator": [leftOperand, rightOperand, options]
}

// Example
{
  "gt": ["age", 18],
  "eq": ["status", "active"]
}
```

### Path Resolution

Access nested data using dot notation:

```javascript
const data = {
  user: {
    profile: { name: 'John' },
    settings: { theme: 'dark' },
  },
};

rules.eq('user.profile.name', 'John');
rules.eq('user.settings.theme', 'dark');
```

### Helper Methods

Build rules easily with the helper library:

```javascript
const rules = createRuleHelpers();

// Instead of: { "and": [{ "gt": ["age", 18] }, { "eq": ["active", true] }] }
rules.and(rules.gt('age', 18), rules.isTrue('active'));
```

## 🔧 API Reference

### createRuleEngine(config?)

```javascript
const engine = createRuleEngine({
  maxDepth: 10, // Maximum rule nesting
  maxOperators: 100, // Maximum operators per rule
  maxCacheSize: 1000, // Cache size for performance
  enableCache: true, // Enable result caching
  strict: true, // Strict type checking
  allowPrototypeAccess: false, // Security setting
});
```

### Core Methods

```javascript
// Evaluate a rule
engine.evaluateExpr(rule, context);

// Register custom operator
engine.registerOperator(name, handler);

// Path resolution
engine.resolvePath(context, 'path.to.value', defaultValue);

// Utility methods
engine.getOperators(); // List all operators
engine.getMetrics(); // Performance metrics
engine.clearCache(); // Clear all caches
```

## 🛠️ Available Operators

### Comparison

- `eq` / `neq` - Equal / Not equal
- `gt` / `gte` - Greater than / Greater than or equal
- `lt` / `lte` - Less than / Less than or equal

### Logical

- `and` - All conditions must be true
- `or` - At least one condition must be true
- `not` - Negate condition

### String

- `contains` - String contains substring
- `startsWith` / `endsWith` - String starts/ends with
- `regex` - Regular expression matching

### Array

- `in` / `notIn` - Value in/not in array

### Special

- `between` - Value within range
- `isNull` / `isNotNull` - Null checking

### Validation Helpers

- `validation.email()` - Email format
- `validation.required()` - Not null/empty
- `validation.ageRange()` - Age within range
- `validation.oneOf()` - Value in allowed list

## 🔐 Security Features

**Prototype Pollution Protection**

```javascript
// Automatically blocks dangerous paths
const maliciousData = { __proto__: { isAdmin: true } };
engine.resolvePath(maliciousData, '__proto__.isAdmin'); // Returns undefined
```

**Function Access Prevention**

```javascript
// Functions are blocked by default
const data = { user: { getName: () => 'sensitive' } };
engine.resolvePath(data, 'user.getName'); // Returns undefined
```

**Safe Configuration**

```javascript
const engine = createRuleEngine({
  allowPrototypeAccess: false, // Always false in production
  strict: true, // Enable strict type checking
  maxDepth: 10, // Prevent deep recursion
  maxOperators: 100, // Limit complexity
});
```

## ⚡ Performance

### Automatic Caching

- Expression results are cached with LRU eviction
- Path resolutions are cached for repeated access
- Regex patterns are compiled once and cached

### Monitoring

```javascript
// Get performance metrics
const metrics = engine.getMetrics();
console.log({
  evaluations: metrics.evaluations,
  cacheHits: metrics.cacheHits,
  avgTime: metrics.avgTime,
});

// Cache statistics
const stats = engine.getCacheStats();
console.log(stats.expression.size); // Current cache size
```

### Optimization Tips

1. **Order operations by speed** - Put simple checks first
2. **Reuse engine instances** - Benefit from caching
3. **Use specific operators** - `eq` is faster than `regex`
4. **Monitor metrics** - Track performance in production

## 🎨 Custom Operators

```javascript
// Register business-specific logic
engine.registerOperator('isBusinessHours', (args, context) => {
  const [timezone = 'UTC'] = args;
  const now = new Date();
  const hour = now.getUTCHours();
  return hour >= 9 && hour < 17; // 9 AM to 5 PM UTC
});

// Usage
const rule = rules.and(
  { isBusinessHours: ['America/New_York'] },
  rules.isTrue('support.available')
);
```

## 🧪 Testing

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

describe('User Access Rules', () => {
  const engine = createRuleEngine();
  const rules = createRuleHelpers();

  test('admin has full access', () => {
    const user = { role: 'admin' };
    const rule = rules.eq('role', 'admin');

    const result = engine.evaluateExpr(rule, user);
    expect(result.success).toBe(true);
  });

  test('handles missing data gracefully', () => {
    const user = {}; // No role property
    const rule = rules.eq('role', 'admin');

    const result = engine.evaluateExpr(rule, user);
    expect(result.success).toBe(false);
  });
});
```

## 🚀 Real-World Examples

### E-commerce Platform

```javascript
// Product recommendation engine
const recommendProduct = rules.and(
  rules.in('product.category', 'user.interests'),
  rules.gte('product.rating', 4.0),
  rules.lte('product.price', 'user.budget'),
  rules.or(rules.isFalse('product.premium'), rules.eq('user.plan', 'premium'))
);

// Dynamic pricing
const applyDiscount = rules.or(
  rules.eq('user.type', 'vip'),
  rules.gte('user.loyaltyPoints', 1000),
  rules.and(rules.gte('cart.total', 100), rules.eq('user.firstTime', false))
);
```

### Content Management System

```javascript
// Publishing workflow
const canPublish = rules.and(
  rules.in('user.role', ['editor', 'admin']),
  rules.eq('content.status', 'reviewed'),
  rules.isNotNull('content.publishDate'),
  rules.or(rules.eq('user.department', 'content.department'), rules.eq('user.role', 'admin'))
);

// Content visibility
const isVisible = rules.and(
  rules.eq('content.published', true),
  rules.or(
    rules.eq('content.visibility', 'public'),
    rules.and(rules.eq('content.visibility', 'members'), rules.isTrue('user.authenticated'))
  )
);
```

## 📊 Performance Benchmarks

| Operation            | Speed   | Cache Hit Rate |
| -------------------- | ------- | -------------- |
| Simple equality      | ~0.1ms  | 95%            |
| Complex nested rules | ~2ms    | 85%            |
| Regex operations     | ~0.5ms  | 90%            |
| Path resolution      | ~0.05ms | 98%            |

_Benchmarks run on Node.js 18, Intel i7, with 1000 rule evaluations_

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by business rule engines and decision tables
- Built for modern JavaScript applications
- Designed with security and performance in mind

## 📚 Documentation

- [Complete Documentation](./docs/README.md)
- [API Reference](./docs/api.md)
- [Examples](./examples/)
- [Migration Guide](./docs/migration.md)

## 💬 Support

- [GitHub Issues](https://github.com/crafts69guy/rule-engine-js/issues)
- [Discussions](https://github.com/crafts69guy/rule-engine-js/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/rule-engine-js)

---

Made with ❤️ by [Crafts69Guy](https://github.com/crafts69guy)
