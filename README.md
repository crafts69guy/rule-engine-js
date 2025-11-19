# Rule Engine JS

[![npm version](https://img.shields.io/npm/v/rule-engine-js.svg)](https://www.npmjs.com/package/rule-engine-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/workflow/status/crafts69guy/rule-engine-js/CI)](https://github.com/crafts69guy/rule-engine-js/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/crafts69guy/rule-engine-js.svg)](https://codecov.io/gh/crafts69guy/rule-engine-js)

> A powerful, flexible JavaScript rule engine for dynamic business logic evaluation. Build complex conditional logic with simple, readable syntax.

## 🚀 Why Rule Engine JS?

**Stop hardcoding business logic.** Rule Engine JS lets you define complex conditional logic as data, making your applications more flexible, maintainable, and business-friendly.

```javascript
// Instead of this hardcoded logic...
if (user.age >= 18 && user.role === 'admin' && user.permissions.includes('write')) {
  return true;
}

// Write this declarative rule...
const rule = rules.and(
  rules.gte('age', 18),
  rules.eq('role', 'admin'),
  rules.in('write', 'permissions')
);

const result = engine.evaluateExpr(rule, user);
```

## ✨ Key Features

- **🎯 Zero Dependencies** - Lightweight with no external dependencies
- **⚡ High Performance** - Intelligent caching with LRU eviction
- **🔒 Security First** - Built-in protection against prototype pollution
- **🧩 Dynamic Field Comparison** - Compare values across different data paths
- **📈 Stateful Rule Engine** - Track state changes with event-driven architecture
- **🔄 State Change Operators** - Built-in operators for detecting value changes
- **💾 State Management** - TTL-based expiration, deep copy protection, listener management
- **⚙️ Concurrency Control** - Automatic queue management with timeout protection
- **🔁 Error Recovery** - Retry strategies, circuit breaker, and fallback mechanisms
- **📝 Type Safe** - Full TypeScript support with comprehensive type definitions
- **🔧 Extensible** - Easy custom operator registration
- **📊 Monitoring** - Built-in performance metrics and cache statistics

## 📦 Installation

```bash
npm install rule-engine-js
```

```bash
yarn add rule-engine-js
```

## 🎯 Quick Start

```javascript
import { createRuleEngine, createRuleHelpers, StatefulRuleEngine } from 'rule-engine-js';

// Create engine and helpers
const engine = createRuleEngine();
const rules = createRuleHelpers();

// Your data
const user = {
  name: 'John Doe',
  age: 28,
  role: 'admin',
  email: 'john@company.com',
  permissions: ['read', 'write', 'delete'],
};

// Simple rule
const isAdult = rules.gte('age', 18);
console.log(engine.evaluateExpr(isAdult, user).success); // true

// Complex rule
const canAccess = rules.and(
  rules.gte('age', 18),
  rules.eq('role', 'admin'),
  rules.validation.email('email'),
  rules.in('write', 'permissions')
);

console.log(engine.evaluateExpr(canAccess, user).success); // true
```

## 🏗️ Core Concepts

### Rules are Data

Rules are simple JSON objects that describe conditions:

```javascript
// This rule...
const rule = { and: [{ gte: ['age', 18] }, { eq: ['role', 'admin'] }] };

// Is equivalent to this helper syntax...
const rule = rules.and(rules.gte('age', 18), rules.eq('role', 'admin'));
```

### Dynamic Field Comparison

Compare values from different paths in your data:

```javascript
const formData = {
  password: 'secret123',
  confirmPassword: 'secret123',
  score: 85,
  maxScore: 100,
};

const rule = rules.and(
  rules.field.equals('password', 'confirmPassword'),
  rules.lt('score', 'maxScore')
);
```

### Path Resolution

Access nested data with dot notation:

```javascript
const user = {
  profile: {
    settings: {
      theme: 'dark',
      notifications: true,
    },
  },
};

const rule = rules.eq('profile.settings.theme', 'dark');
```

## 🛠️ Common Use Cases

<details>
<summary><strong>🔐 User Access Control</strong></summary>

```javascript
const accessRule = rules.and(
  // User must be active
  rules.isTrue('user.isActive'),

  // Either admin OR (department match AND has permission)
  rules.or(
    rules.eq('user.role', 'admin'),
    rules.and(
      rules.field.equals('user.department', 'resource.department'),
      rules.in('write', 'user.permissions')
    )
  )
);

const context = {
  user: {
    isActive: true,
    role: 'editor',
    department: 'engineering',
    permissions: ['read', 'write'],
  },
  resource: { department: 'engineering' },
};

const hasAccess = engine.evaluateExpr(accessRule, context);
```

</details>

<details>
<summary><strong>💰 Dynamic Pricing & Discounts</strong></summary>

```javascript
const discountRule = rules.or(
  // VIP customers with minimum order
  rules.and(rules.eq('customer.type', 'vip'), rules.gte('order.total', 100)),

  // High loyalty points
  rules.gte('customer.loyaltyPoints', 1000),

  // Large orders
  rules.gte('order.total', 200)
);

const orderData = {
  customer: { type: 'vip', loyaltyPoints: 500 },
  order: { total: 150 },
};

const eligible = engine.evaluateExpr(discountRule, orderData);
```

</details>

<details>
<summary><strong>📝 Form Validation</strong></summary>

```javascript
const validationRule = rules.and(
  rules.validation.required('firstName'),
  rules.validation.required('lastName'),
  rules.validation.email('email'),
  rules.validation.ageRange('age', 18, 120),
  rules.validation.minLength('password', 8),
  rules.validation.maxLength('username', 20),
  rules.field.equals('password', 'confirmPassword'),
  rules.isTrue('agreedToTerms')
);

const formData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 25,
  username: 'johndoe',
  password: 'secret123',
  confirmPassword: 'secret123',
  agreedToTerms: true,
};

const isValid = engine.evaluateExpr(validationRule, formData);
```

</details>

<details>
<summary><strong>🏦 Loan Approval Logic</strong></summary>

```javascript
const approvalRule = rules.and(
  rules.gte('applicant.creditScore', 650),
  rules.gte('applicant.income', 50000),
  rules.lte('applicant.debtRatio', 0.4),
  rules.gte('applicant.employmentYears', 2),
  rules.between('applicant.age', [18, 70]),
  rules.in('loan.purpose', ['home', 'car', 'education'])
);

const application = {
  applicant: {
    creditScore: 720,
    income: 75000,
    debtRatio: 0.25,
    employmentYears: 3,
    age: 32,
  },
  loan: {
    amount: 250000,
    purpose: 'home',
  },
};

const approved = engine.evaluateExpr(approvalRule, application);
```

</details>

## 📚 Available Operators

| Category         | Operators                                                                                        | Description                               |
| ---------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **Comparison**   | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`                                                            | Compare values with type coercion support |
| **Logical**      | `and`, `or`, `not`                                                                               | Combine multiple conditions               |
| **String**       | `contains`, `startsWith`, `endsWith`, `regex`                                                    | Text pattern matching                     |
| **Array**        | `in`, `notIn`                                                                                    | Check membership in arrays                |
| **Special**      | `between`, `isNull`, `isNotNull`                                                                 | Range and null checking                   |
| **State Change** | `changed`, `changedBy`, `changedFrom`, `changedTo`, `increased`, `decreased`                     | Detect state changes between evaluations  |
| **Validation**   | `email`, `required`, `ageRange`, `oneOf`, `minLength`, `maxLength`, `lengthRange`, `exactLength` | Common validation patterns                |

## 🔄 Stateful Rule Engine

The StatefulRuleEngine extends the base engine with state tracking and event-driven capabilities, perfect for monitoring data changes and triggering actions based on state transitions.

### Key Features

- **State Tracking**: Maintains previous states for comparison
- **Event System**: Listen to rule state changes with events
- **State Change Operators**: Specialized operators for detecting changes
- **History Management**: Optional evaluation history storage
- **Flexible Triggering**: Configure when rules should trigger

### Basic Usage

```javascript
import { createRuleEngine, StatefulRuleEngine } from 'rule-engine-js';

// Create base engine and wrap with StatefulRuleEngine
const baseEngine = createRuleEngine();
const statefulEngine = new StatefulRuleEngine(baseEngine, {
  triggerOnEveryChange: false, // Trigger only on false → true transitions
  storeHistory: true, // Keep evaluation history
  maxHistorySize: 100, // Limit history entries
});

// Listen for events
statefulEngine.on('triggered', (event) => {
  console.log(`Rule ${event.ruleId} was triggered!`);
});

statefulEngine.on('changed', (event) => {
  console.log(`Rule ${event.ruleId} state changed`);
});

// Define rules with state change operators
const temperatureAlert = {
  and: [
    { gte: ['temperature', 25] },
    { increased: ['temperature'] }, // Only trigger when temperature increases
  ],
};

const statusChanged = { changedFrom: ['user.status', 'pending'] };

// Evaluate rules with state tracking
let data = { temperature: 20, user: { status: 'pending' } };
statefulEngine.evaluate('temp-rule', temperatureAlert, data);

// Update data and evaluate again
data = { temperature: 26, user: { status: 'active' } };
const result = statefulEngine.evaluate('temp-rule', temperatureAlert, data);
// This will trigger since temperature increased and is now >= 25

const statusResult = statefulEngine.evaluate('status-rule', statusChanged, data);
// This will trigger since status changed from 'pending' to 'active'
```

### State Change Operators

| Operator      | Description                        | Example                                  |
| ------------- | ---------------------------------- | ---------------------------------------- |
| `changed`     | Detects any value change           | `{ changed: ['user.email'] }`            |
| `changedBy`   | Detects numeric change by amount   | `{ changedBy: ['score', 10] }`           |
| `changedFrom` | Detects change from specific value | `{ changedFrom: ['status', 'pending'] }` |
| `changedTo`   | Detects change to specific value   | `{ changedTo: ['status', 'completed'] }` |
| `increased`   | Detects numeric increase           | `{ increased: ['temperature'] }`         |
| `decreased`   | Detects numeric decrease           | `{ decreased: ['stock'] }`               |

### Event Types

- **`triggered`**: Rule transitioned from false → true
- **`untriggered`**: Rule transitioned from true → false
- **`changed`**: Rule success state changed
- **`evaluated`**: Every rule evaluation (regardless of result)

### Real-World Example: Order Processing

```javascript
const orderRules = {
  'payment-received': { changedTo: ['order.paymentStatus', 'paid'] },
  'inventory-low': {
    and: [{ decreased: ['product.stock'] }, { lte: ['product.stock', 10] }],
  },
  'price-drop': {
    and: [{ decreased: ['product.price'] }, { changedBy: ['product.price', 5] }],
  },
};

// Set up event handlers
statefulEngine.on('triggered', (event) => {
  switch (event.ruleId) {
    case 'payment-received':
      processOrder(event.context);
      break;
    case 'inventory-low':
      reorderStock(event.context.product);
      break;
    case 'price-drop':
      notifyCustomers(event.context.product);
      break;
  }
});

// Batch evaluate all rules
const orderData = {
  order: { paymentStatus: 'paid' },
  product: { stock: 8, price: 95 },
};

statefulEngine.evaluateBatch(orderRules, orderData);
```

## 🚀 Phase 3 Production Features

### State Management (Phase 3.1)

Advanced memory management and resource cleanup:

```javascript
const statefulEngine = new StatefulRuleEngine(baseEngine, {
  // State TTL and automatic cleanup
  stateExpirationMs: 3600000, // 1 hour TTL
  cleanupIntervalMs: 300000, // Cleanup every 5 minutes

  // Context protection
  enableDeepCopy: true, // Prevent mutation (handles circular refs)

  // Listener management
  maxListeners: 100, // Warn on high listener counts
});

// Monitor memory usage
const stats = statefulEngine.getStateStats();
console.log('Memory estimate:', stats.memoryEstimate);

// Manual cleanup
const result = statefulEngine.cleanupExpiredStates();
console.log('Removed:', result.removedCount, 'expired states');

// Graceful shutdown
await statefulEngine.destroy(); // Cleanup timers, listeners, state
```

### Concurrency Control (Phase 3.2)

Manage concurrent evaluations with automatic queue management:

```javascript
const statefulEngine = new StatefulRuleEngine(baseEngine, {
  concurrency: {
    maxConcurrent: 10, // Max concurrent evaluations per rule
    timeout: 30000, // 30 second timeout

    onTimeout: (ruleId) => {
      console.error(`Rule ${ruleId} timed out`);
    },

    onQueueFull: (ruleId, queueSize) => {
      console.warn(`Queue full for ${ruleId}: ${queueSize} pending`);
    },
  },
});

// All evaluation methods are now async
const result = await statefulEngine.evaluate('rule-1', rule, context);

// Monitor concurrency
const stats = statefulEngine.getConcurrencyStats();
console.log('Active evaluations:', stats);
```

### Error Recovery (Phase 3.3)

Comprehensive error handling with retry, circuit breaker, and fallback strategies:

```javascript
const statefulEngine = new StatefulRuleEngine(baseEngine, {
  errorRecovery: {
    // Retry with exponential backoff
    retry: {
      enabled: true,
      maxAttempts: 3,
      strategy: 'exponential', // 'exponential', 'fixed', 'linear'
      initialDelay: 100,
      maxDelay: 5000,

      onRetry: (attempt, error, ruleId) => {
        console.log(`Retry ${attempt}/${3} for ${ruleId}`);
      },
    },

    // Circuit breaker pattern
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5, // Open after 5 failures
      resetTimeout: 60000, // Try again after 1 minute

      onCircuitOpen: (ruleId, info) => {
        console.error(`Circuit opened for ${ruleId}`, info);
      },
    },

    // Fallback strategies
    fallback: {
      enabled: true,
      defaultValue: { success: false, fallback: true },

      onFallback: (ruleId, type, value) => {
        console.log(`Using ${type} fallback for ${ruleId}`);
      },
    },
  },
});

// Register fallback rules
statefulEngine.registerFallbackRule('primary-rule', fallbackRule);
statefulEngine.registerFallbackValue('backup-rule', { safe: true });

// Monitor error rates
const errorRate = statefulEngine.getErrorRate('rule-1');
if (errorRate && errorRate.rate > 0.1) {
  console.warn('High error rate:', errorRate);
}

// Check circuit state
const state = statefulEngine.getCircuitState('rule-1');
// Returns: 'closed', 'open', or 'half-open'

// Manual circuit reset
statefulEngine.resetCircuit('rule-1');
```

## ⚡ Performance Features

- **LRU Caching**: Expression results and path resolutions are cached
- **Regex Compilation**: Patterns are compiled once and reused
- **Metrics Tracking**: Monitor performance with built-in metrics
- **Bundle Optimization**: Multiple output formats (UMD, ESM, CommonJS)

```javascript
// Get performance metrics
const metrics = engine.getMetrics();
console.log({
  evaluations: metrics.evaluations,
  cacheHits: metrics.cacheHits,
  avgTime: metrics.avgTime,
});

// Get cache statistics
const cacheStats = engine.getCacheStats();
console.log(cacheStats);
```

## 🔒 Security Features

- **Prototype Pollution Protection**: Automatically blocks dangerous paths
- **Function Access Prevention**: Functions are blocked by default
- **Safe Path Resolution**: Only accesses own properties
- **Configurable Security**: Adjust security settings as needed

```javascript
// Secure by default
const maliciousData = { __proto__: { isAdmin: true } };
engine.resolvePath(maliciousData, '__proto__.isAdmin'); // Returns undefined

// Configure security
const engine = createRuleEngine({
  allowPrototypeAccess: false, // Always false in production
  strict: true, // Enable strict type checking
  maxDepth: 10, // Prevent deep recursion
  maxOperators: 100, // Limit complexity
});
```

## 🎨 Custom Operators

Extend the engine with your own business logic:

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

## 📖 Documentation

- **[Complete Documentation](./docs/README.md)** - Full API reference and guides
- **[Quick Start Guide](./docs/quick-start.md)** - Get up and running in minutes
- **[Operator Reference](./docs/operators.md)** - Complete operator documentation
- **[Performance Guide](./docs/performance.md)** - Optimization tips and tricks
- **[Security Guide](./docs/security.md)** - Security best practices
- **[Examples](./examples/)** - Real-world examples and patterns

## 🚀 Framework Integration

<details>
<summary><strong>Express.js Middleware</strong></summary>

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

const engine = createRuleEngine();
const rules = createRuleHelpers();

function createAccessMiddleware(accessRule) {
  return (req, res, next) => {
    const result = engine.evaluateExpr(accessRule, req.user);
    if (result.success) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  };
}

// Usage
const adminRule = rules.eq('role', 'admin');
app.get('/admin/*', createAccessMiddleware(adminRule));
```

</details>

<details>
<summary><strong>React Form Validation</strong></summary>

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

const engine = createRuleEngine();
const rules = createRuleHelpers();

function useFormValidation(validationRules) {
  const validateForm = (formData) => {
    const results = {};

    Object.entries(validationRules).forEach(([field, rule]) => {
      const result = engine.evaluateExpr(rule, formData);
      results[field] = {
        isValid: result.success,
        error: result.success ? null : result.error,
      };
    });

    return results;
  };

  return { validateForm };
}

// Usage
const validationRules = {
  email: rules.validation.email('email'),
  username: rules.validation.lengthRange('username', 3, 20),
  password: rules.and(
    rules.validation.minLength('password', 8),
    rules.regex('password', '(?=.*[0-9])(?=.*[a-zA-Z])')
  ),
};
```

</details>

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
});
```

## 📊 Benchmarks

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

## 📚 Related Projects

- [JSON Schema](https://json-schema.org/) - For data validation
- [Joi](https://joi.dev/) - Object schema validation
- [Yup](https://github.com/jquense/yup) - Schema builder for runtime value parsing

---

**[📖 Read the Full Documentation](./docs/README.md)** | **[🚀 View Examples](./examples/)** | **[💬 Get Support](https://github.com/crafts69guy/rule-engine-js/discussions)**

Made with ❤️ by [Crafts69Guy](https://github.com/crafts69guy)
