# Rule Engine JS - Complete Documentation

A comprehensive guide to building powerful, flexible rule-based applications with Rule Engine JS.

## 📑 Table of Contents

- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Operators Guide](#operators-guide)
- [Rule Helpers](#rule-helpers)
- [Performance & Caching](#performance--caching)
- [Security](#security)
- [Real-World Examples](#real-world-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Installation

```bash
npm install rule-engine-js
```

### Basic Usage

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

// Initialize
const engine = createRuleEngine();
const rules = createRuleHelpers();

// Create a rule
const rule = rules.and(rules.gte('age', 18), rules.eq('status', 'active'));

// Evaluate
const result = engine.evaluateExpr(rule, { age: 25, status: 'active' });
console.log(result.success); // true
```

### Configuration

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

## 🧩 Core Concepts

### 1. Rules as Data

Rules are JSON-serializable objects that describe logical conditions:

```javascript
// Raw rule format
const rawRule = {
  and: [{ gte: ['age', 18] }, { eq: ['role', 'admin'] }, { in: ['permission', ['read', 'write']] }],
};

// Helper format (more readable)
const helperRule = rules.and(
  rules.gte('age', 18),
  rules.eq('role', 'admin'),
  rules.in('permission', ['read', 'write'])
);

// Both produce the same result
```

### 2. Path Resolution

Access nested data using dot notation:

```javascript
const userData = {
  profile: {
    personal: {
      name: 'John Doe',
      age: 28,
    },
    settings: {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
      },
    },
  },
  permissions: ['read', 'write'],
};

// Access nested values
const nameRule = rules.eq('profile.personal.name', 'John Doe');
const themeRule = rules.eq('profile.settings.theme', 'dark');
const emailRule = rules.isTrue('profile.settings.notifications.email');
```

### 3. Dynamic Field Comparison

Compare values from different paths within the same data structure:

```javascript
const formData = {
  user: {
    currentScore: 85,
    targetScore: 90,
    minRequiredScore: 70,
  },
  validation: {
    passwordStrength: 8,
    minPasswordLength: 8,
  },
};

// Compare dynamic fields
const scoreRule = rules.and(
  rules.field.greaterThan('user.currentScore', 'user.minRequiredScore'),
  rules.field.lessThan('user.currentScore', 'user.targetScore')
);

const passwordRule = rules.field.greaterThanOrEqual(
  'validation.passwordStrength',
  'validation.minPasswordLength'
);
```

### 4. Type Coercion

The engine supports both strict and loose type comparison:

```javascript
const data = {
  stringNumber: '25',
  actualNumber: 25,
  booleanString: 'true',
  actualBoolean: true,
};

// Loose mode (default) - allows type coercion
const looseRule = rules.eq('stringNumber', 25); // '25' == 25 → true

// Strict mode - exact type matching
const strictRule = rules.eq('stringNumber', 25, { strict: true }); // '25' === 25 → false

// Configure globally
const strictEngine = createRuleEngine({ strict: true });
```

## 📚 API Reference

### createRuleEngine(config?)

Creates a new rule engine instance.

```javascript
const engine = createRuleEngine({
  maxDepth: 10, // Max rule nesting depth
  maxOperators: 100, // Max operators per rule
  maxCacheSize: 1000, // Cache size
  enableCache: true, // Enable caching
  enableDebug: false, // Debug logging
  strict: true, // Strict type checking
  allowPrototypeAccess: false, // Security setting
});
```

#### Core Methods

##### evaluateExpr(rule, context)

Evaluates a rule against the provided context.

```javascript
const result = engine.evaluateExpr(rule, userData);

// Success result
{
  success: true
}

// Failure result
{
  success: false,
  operator: 'gt',
  error: 'GT operator requires numeric operands',
  details: { /* error context */ },
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

##### registerOperator(name, handler, options?)

Register custom operators.

```javascript
engine.registerOperator('customEquals', (args, context) => {
  const [left, right] = args;
  const leftValue = engine.resolvePath(context, left);
  const rightValue = engine.resolvePath(context, right);

  // Custom equality logic
  return leftValue?.toLowerCase() === rightValue?.toLowerCase();
});

// Usage
const rule = { customEquals: ['user.name', 'john doe'] };
```

##### resolvePath(context, path, defaultValue?)

Safely resolve dot-notation paths.

```javascript
const value = engine.resolvePath(userData, 'profile.settings.theme', 'light');
console.log(value); // 'dark' or 'light' if path doesn't exist
```

##### resolveValue(context, value, defaultValue?)

Smart value resolution - handles both paths and literals.

```javascript
// Resolves as path if it exists, otherwise returns as literal
const resolved1 = engine.resolveValue(context, 'user.name'); // → "John Doe"
const resolved2 = engine.resolveValue(context, 'literal_string'); // → "literal_string"
const resolved3 = engine.resolveValue(context, 42); // → 42
```

#### Utility Methods

```javascript
// Get all available operators
const operators = engine.getOperators();

// Get performance metrics
const metrics = engine.getMetrics();
console.log({
  evaluations: metrics.evaluations,
  cacheHits: metrics.cacheHits,
  errors: metrics.errors,
  avgTime: metrics.avgTime,
});

// Get cache statistics
const stats = engine.getCacheStats();
console.log({
  expressionCacheSize: stats.expression.size,
  pathCacheSize: stats.path.size,
});

// Clear all caches
engine.clearCache();

// Get current configuration
const config = engine.getConfig();
```

### createRuleHelpers()

Creates helper methods for building rules with a more readable syntax.

```javascript
const rules = createRuleHelpers();

// All operators available as methods
const rule = rules.and(
  rules.eq('status', 'active'),
  rules.gte('age', 18),
  rules.validation.email('email')
);
```

## 🔧 Operators Guide

### Comparison Operators

#### eq / neq - Equality

```javascript
// Basic equality
rules.eq('role', 'admin');
{ "eq": ["role", "admin"] }

// With type options
rules.eq('age', '25', { strict: false }); // Allows coercion
rules.eq('age', 25, { strict: true });    // Exact type match

// Not equal
rules.neq('status', 'deleted');
{ "neq": ["status", "deleted"] }
```

#### gt / gte / lt / lte - Numeric Comparison

```javascript
// Greater than
rules.gt('score', 80);
{ "gt": ["score", 80] }

// Greater than or equal
rules.gte('age', 18);
{ "gte": ["age", 18] }

// Less than
rules.lt('price', 100);
{ "lt": ["price", 100] }

// Less than or equal
rules.lte('quantity', 50);
{ "lte": ["quantity", 50] }

// Dynamic comparison
rules.gt('currentValue', 'minimumValue');
{ "gt": ["currentValue", "minimumValue"] }
```

### Logical Operators

#### and - All conditions must be true

```javascript
rules.and(
  rules.eq('status', 'active'),
  rules.gte('age', 18),
  rules.isTrue('verified')
);

{
  "and": [
    { "eq": ["status", "active"] },
    { "gte": ["age", 18] },
    { "eq": ["verified", true] }
  ]
}
```

#### or - At least one condition must be true

```javascript
rules.or(
  rules.eq('role', 'admin'),
  rules.eq('role', 'moderator'),
  rules.and(rules.eq('role', 'user'), rules.gte('experience', 5))
);
```

#### not - Negates the condition

```javascript
rules.not(
  rules.in('status', ['banned', 'suspended'])
);

{ "not": [{ "in": ["status", ["banned", "suspended"]] }] }
```

### String Operators

#### contains - String contains substring

```javascript
rules.contains('description', 'important');
{ "contains": ["description", "important"] }

// Case-sensitive by default
rules.contains('title', 'JavaScript'); // matches "JavaScript Tutorial"
rules.contains('title', 'javascript'); // doesn't match "JavaScript Tutorial"
```

#### startsWith / endsWith

```javascript
rules.startsWith('filename', 'report_');
{ "startsWith": ["filename", "report_"] }

rules.endsWith('filename', '.pdf');
{ "endsWith": ["filename", ".pdf"] }
```

#### regex - Regular expression matching

```javascript
// Email validation
rules.regex('email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$');

// Phone number validation
rules.regex('phone', '^\\+?[1-9]\\d{1,14}$');

// With flags
rules.regex('text', 'pattern', { flags: 'gi' });
{
  "regex": ["text", "pattern", { "flags": "gi" }]
}
```

### Array Operators

#### in / notIn - Array membership

```javascript
// Value in array
rules.in('role', ['admin', 'moderator', 'user']);
{ "in": ["role", ["admin", "moderator", "user"]] }

// Dynamic arrays
rules.in('permission', 'user.allowedPermissions');
{ "in": ["permission", "user.allowedPermissions"] }

// Not in array
rules.notIn('status', ['banned', 'deleted']);
{ "notIn": ["status", ["banned", "deleted"]] }
```

### Special Operators

#### between - Range checking

```javascript
// Age range
rules.between('age', [18, 65]);
{ "between": ["age", [18, 65]] }

// Score range with dynamic bounds
rules.between('score', 'scoreRange');
// where context.scoreRange = [70, 100]

// Price range
rules.between('price', [10.99, 99.99]);
```

#### isNull / isNotNull - Null checking

```javascript
// Check for null/undefined
rules.isNull('deletedAt');
{ "isNull": ["deletedAt"] }

// Check for non-null
rules.isNotNull('createdAt');
{ "isNotNull": ["createdAt"] }

// Works with non-existent paths
rules.isNull('nonexistent.path'); // true
rules.isNotNull('existing.path');  // true if path exists and has value
```

## 🎯 Rule Helpers

### Convenience Methods

```javascript
const rules = createRuleHelpers();

// Boolean checks
rules.isTrue('active'); // field === true
rules.isFalse('deleted'); // field === false
rules.isEmpty('description'); // field === ''
rules.isNotEmpty('name'); // field !== ''

// Existence check
rules.exists('profile'); // not null, not empty, not false

// Combines: isNotNull AND isNotEmpty AND not false
rules.exists('field'); // equivalent to:
rules.and(rules.isNotNull('field'), rules.neq('field', ''), rules.neq('field', false));
```

### Field Comparison Helpers

Dynamic field-to-field comparison within the same data context:

```javascript
// Compare two fields directly
rules.field.equals('password', 'confirmPassword');
rules.field.greaterThan('currentScore', 'minimumScore');
rules.field.lessThan('price', 'budget');
rules.field.greaterThanOrEqual('quantity', 'minimumOrder');
rules.field.lessThanOrEqual('discount', 'maxDiscount');

// Example usage
const orderValidation = rules.and(
  rules.field.lessThanOrEqual('order.total', 'user.creditLimit'),
  rules.field.greaterThan('order.quantity', 'product.minimumOrder'),
  rules.field.equals('order.currency', 'user.preferredCurrency')
);
```

### Validation Patterns

Pre-built validation rules for common scenarios:

```javascript
// Email validation
rules.validation.email('emailField');
// Uses regex: ^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$

// Required field (not null and not empty)
rules.validation.required('name');
// Equivalent to: and(isNotNull('name'), neq('name', ''))

// Age validation
rules.validation.minAge('age', 18); // age >= 18
rules.validation.maxAge('age', 65); // age <= 65
rules.validation.ageRange('age', 18, 65); // 18 <= age <= 65

// Choice validation
rules.validation.oneOf('status', ['active', 'inactive', 'pending']);
// Equivalent to: in('status', ['active', 'inactive', 'pending'])
```

#### Creating Custom Validation Patterns

```javascript
const rules = createRuleHelpers();

// Add custom validation patterns
rules.validation.strongPassword = (field) => {
  return rules.and(
    rules.gte(`${field}.length`, 8),
    rules.regex(field, '(?=.*[0-9])'), // Contains number
    rules.regex(field, '(?=.*[a-z])'), // Contains lowercase
    rules.regex(field, '(?=.*[A-Z])'), // Contains uppercase
    rules.regex(field, '(?=.*[!@#$%^&*])') // Contains special char
  );
};

rules.validation.businessEmail = (field) => {
  return rules.and(
    rules.validation.email(field),
    rules.not(rules.regex(field, '@(gmail|yahoo|hotmail)\\.'))
  );
};

// Usage
const registrationRule = rules.and(
  rules.validation.required('username'),
  rules.validation.strongPassword('password'),
  rules.validation.businessEmail('email')
);
```

## ⚡ Performance & Caching

### Automatic Caching System

Rule Engine JS implements multiple layers of caching for optimal performance:

#### 1. Expression Caching

Complete rule evaluation results are cached with LRU eviction:

```javascript
const rule = rules.and(rules.eq('role', 'admin'), rules.gte('age', 18));

// First evaluation - computes and caches result
const result1 = engine.evaluateExpr(rule, userData); // ~2ms

// Second evaluation - uses cached result
const result2 = engine.evaluateExpr(rule, userData); // ~0.1ms
```

#### 2. Path Resolution Caching

Dot-notation path lookups are cached to avoid repeated traversal:

```javascript
// First access - traverses object tree
const value1 = engine.resolvePath(data, 'user.profile.settings.theme'); // ~0.5ms

// Subsequent access - uses cached path
const value2 = engine.resolvePath(data, 'user.profile.settings.theme'); // ~0.05ms
```

#### 3. Regex Pattern Caching

Compiled regex patterns are cached for reuse:

```javascript
// Pattern compiled once and cached
const emailRule = rules.regex('email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,});

// Multiple evaluations use same compiled pattern
engine.evaluateExpr(emailRule, user1); // Compiles pattern
engine.evaluateExpr(emailRule, user2); // Reuses compiled pattern
engine.evaluateExpr(emailRule, user3); // Reuses compiled pattern
```

### Performance Monitoring

```javascript
// Get detailed performance metrics
const metrics = engine.getMetrics();
console.log({
  totalEvaluations: metrics.evaluations,
  cacheHitRate: metrics.cacheHits / metrics.evaluations,
  averageTime: metrics.avgTime + 'ms',
  totalTime: metrics.totalTime + 'ms',
  errorCount: metrics.errors,
});

// Get cache statistics
const cacheStats = engine.getCacheStats();
console.log({
  expressionCache: {
    size: cacheStats.expression.size,
    maxSize: cacheStats.expression.maxSize,
    utilization: (cacheStats.expression.size / cacheStats.expression.maxSize) * 100 + '%',
  },
  pathCache: {
    size: cacheStats.path.size,
    maxSize: cacheStats.path.maxSize,
  },
});
```

### Performance Optimization Tips

#### 1. Order Operations by Speed

Place faster operations before slower ones in logical operators:

```javascript
// Optimized: Fast checks first
const optimizedRule = rules.and(
  rules.eq('active', true), // Fastest: boolean equality
  rules.gte('age', 18), // Fast: numeric comparison
  rules.contains('email', '@company'), // Medium: string operation
  rules.regex('email', complexPattern) // Slowest: regex evaluation
);

// Less optimal: Expensive operation first
const unoptimizedRule = rules.and(
  rules.regex('email', complexPattern), // Expensive operation runs first
  rules.eq('active', true) // Simple check runs last
);
```

#### 2. Reuse Engine Instances

Create one engine instance and reuse it to benefit from caching:

```javascript
// Good: Reuse engine instance
const engine = createRuleEngine();

function validateUser(user) {
  return engine.evaluateExpr(userRule, user);
}

function validateOrder(order) {
  return engine.evaluateExpr(orderRule, order);
}

// Avoid: Creating new engines
function validateUser(user) {
  const engine = createRuleEngine(); // Creates new instance each time
  return engine.evaluateExpr(userRule, user);
}
```

#### 3. Configure Cache Size Appropriately

```javascript
// For high-volume applications
const highVolumeEngine = createRuleEngine({
  maxCacheSize: 5000, // Larger cache
  enableCache: true,
});

// For memory-constrained environments
const lightweightEngine = createRuleEngine({
  maxCacheSize: 100, // Smaller cache
  enableCache: true,
});

// For real-time applications where consistency > speed
const realTimeEngine = createRuleEngine({
  enableCache: false, // Disable caching for fresh results
});
```

### Benchmarking Your Rules

```javascript
function benchmarkRule(rule, data, iterations = 1000) {
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    engine.evaluateExpr(rule, data);
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  const metrics = engine.getMetrics();

  return {
    totalTime: totalTime + 'ms',
    averageTime: totalTime / iterations + 'ms',
    cacheHitRate: (metrics.cacheHits / metrics.evaluations) * 100 + '%',
  };
}

// Usage
const complexRule = rules.and(
  rules.validation.email('email'),
  rules.regex('phone', phonePattern),
  rules.between('age', [18, 65])
);

const benchmark = benchmarkRule(complexRule, userData, 1000);
console.log(benchmark);
```

## 🔒 Security

### Prototype Pollution Protection

Rule Engine JS automatically protects against prototype pollution attacks:

```javascript
// Malicious input
const maliciousData = {
  __proto__: { isAdmin: true },
  constructor: { prototype: { isAdmin: true } },
  user: { name: 'attacker' },
};

// Safe path resolution - prototype properties are blocked
engine.resolvePath(maliciousData, '__proto__.isAdmin'); // Returns undefined
engine.resolvePath(maliciousData, 'constructor.prototype'); // Returns undefined
engine.resolvePath(maliciousData, 'user.name'); // Returns "attacker" (safe)

// Rules using malicious paths fail safely
const maliciousRule = rules.eq('__proto__.isAdmin', true);
const result = engine.evaluateExpr(maliciousRule, maliciousData);
console.log(result.success); // false - path resolves to undefined
```

### Function Access Prevention

Functions in data objects are blocked by default to prevent code execution:

```javascript
const dataWithFunctions = {
  user: {
    name: 'John',
    getName: function () {
      return this.name;
    },
    dangerousFunction: function () {
      // Potentially dangerous code
      return eval('process.env');
    },
  },
};

// Function access is blocked
engine.resolvePath(dataWithFunctions, 'user.getName'); // Returns undefined
engine.resolvePath(dataWithFunctions, 'user.dangerousFunction'); // Returns undefined
engine.resolvePath(dataWithFunctions, 'user.name'); // Returns "John" (safe)
```

### Safe Configuration

Configure the engine with security-first settings:

```javascript
// Production-ready secure configuration
const secureEngine = createRuleEngine({
  allowPrototypeAccess: false, // Never allow prototype access
  strict: true, // Enable strict type checking
  maxDepth: 10, // Prevent deep recursion attacks
  maxOperators: 100, // Limit rule complexity
  enableDebug: false, // Disable debug info in production
});

// Development configuration (more permissive)
const devEngine = createRuleEngine({
  allowPrototypeAccess: false, // Still secure in development
  strict: false, // Allow type coercion for flexibility
  maxDepth: 20, // Higher limits for complex rules
  maxOperators: 200,
  enableDebug: true, // Enable debugging
});
```

### Input Validation

Always validate rule inputs in production environments:

```javascript
function validateRuleStructure(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error('Rule must be an object');
  }

  if (Array.isArray(rule)) {
    throw new Error('Rule cannot be an array');
  }

  const operators = Object.keys(rule);
  if (operators.length === 0) {
    throw new Error('Rule must contain at least one operator');
  }

  return true;
}

function safeEvaluateRule(rule, context) {
  try {
    validateRuleStructure(rule);
    return engine.evaluateExpr(rule, context);
  } catch (error) {
    return {
      success: false,
      error: 'Invalid rule structure',
      details: { originalError: error.message },
    };
  }
}
```

### Sandboxing Context Data

Sanitize context data before evaluation:

```javascript
function sanitizeContext(context) {
  // Remove potentially dangerous properties
  const sanitized = JSON.parse(JSON.stringify(context)); // Deep clone

  function removeUnsafeProps(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    // Remove prototype-related properties
    delete obj.__proto__;
    delete obj.constructor;
    delete obj.prototype;

    // Remove functions
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'function') {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        removeUnsafeProps(obj[key]);
      }
    });

    return obj;
  }

  return removeUnsafeProps(sanitized);
}

// Usage
function evaluateWithSanitization(rule, rawContext) {
  const safeContext = sanitizeContext(rawContext);
  return engine.evaluateExpr(rule, safeContext);
}
```

## 🌍 Real-World Examples

### Enterprise User Access Control

```javascript
// Complex enterprise access control system
const enterpriseAccessRule = rules.and(
  // User must be active and verified
  rules.isTrue('user.isActive'),
  rules.isTrue('user.isVerified'),

  // Check role-based access
  rules.or(
    // Global admin access
    rules.eq('user.role', 'globalAdmin'),

    // Department admin access
    rules.and(
      rules.eq('user.role', 'departmentAdmin'),
      rules.field.equals('user.department', 'resource.department')
    ),

    // Regular user access with permissions
    rules.and(
      rules.eq('user.role', 'user'),
      rules.field.equals('user.department', 'resource.department'),
      rules.in('resource.requiredPermission', 'user.permissions'),

      // Additional security checks
      rules.or(
        rules.eq('resource.sensitivity', 'low'),
        rules.and(rules.eq('resource.sensitivity', 'medium'), rules.gte('user.clearanceLevel', 2)),
        rules.and(
          rules.eq('resource.sensitivity', 'high'),
          rules.gte('user.clearanceLevel', 4),
          rules.lte('user.lastLogin', 'security.maxIdleTime')
        )
      )
    )
  ),

  // Time-based restrictions
  rules.or(
    rules.eq('resource.alwaysAccessible', true),
    rules.and(
      rules.gte('currentTime', 'security.businessHours.start'),
      rules.lte('currentTime', 'security.businessHours.end')
    )
  )
);

// Usage context
const accessContext = {
  user: {
    id: 'user123',
    role: 'user',
    department: 'engineering',
    permissions: ['read', 'write', 'execute'],
    clearanceLevel: 3,
    isActive: true,
    isVerified: true,
    lastLogin: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  },
  resource: {
    id: 'resource456',
    type: 'database',
    department: 'engineering',
    sensitivity: 'medium',
    requiredPermission: 'read',
    alwaysAccessible: false,
  },
  security: {
    maxIdleTime: Date.now() - 4 * 60 * 60 * 1000, // 4 hours
    businessHours: {
      start: 9, // 9 AM
      end: 17, // 5 PM
    },
  },
  currentTime: new Date().getHours(),
};

const hasAccess = engine.evaluateExpr(enterpriseAccessRule, accessContext);
```

### E-commerce Dynamic Pricing

```javascript
// Sophisticated e-commerce pricing engine
const pricingRule = rules.and(
  // Base eligibility
  rules.isTrue('customer.isActive'),
  rules.gte('order.items.length', 1),

  // Dynamic discount calculation
  rules.or(
    // VIP customer benefits
    rules.and(
      rules.eq('customer.tier', 'vip'),
      rules.or(rules.gte('order.subtotal', 100), rules.gte('customer.loyaltyPoints', 500))
    ),

    // Bulk order discounts
    rules.and(rules.gte('order.totalQuantity', 10), rules.lte('order.totalQuantity', 100)),

    // Category-specific promotions
    rules.and(
      rules.in('electronics', 'order.categories'),
      rules.gte('order.subtotal', 200),
      rules.between('currentDate', 'promotion.validPeriod')
    ),

    // First-time customer incentive
    rules.and(rules.isTrue('customer.isFirstTime'), rules.gte('order.subtotal', 50)),

    // Seasonal promotions
    rules.and(
      rules.in('currentSeason', 'promotion.activeSeasons'),
      rules.gte('order.subtotal', 'promotion.minimumOrder')
    )
  ),

  // Geographic restrictions
  rules.in('customer.country', 'promotion.eligibleCountries'),

  // Stock availability
  rules.isTrue('inventory.allItemsAvailable')
);

const pricingContext = {
  customer: {
    id: 'cust789',
    tier: 'premium',
    isActive: true,
    isFirstTime: false,
    loyaltyPoints: 750,
    country: 'US',
  },
  order: {
    subtotal: 150,
    totalQuantity: 3,
    categories: ['electronics', 'accessories'],
    items: [
      { id: 'item1', category: 'electronics', price: 100, quantity: 1 },
      { id: 'item2', category: 'accessories', price: 25, quantity: 2 },
    ],
  },
  promotion: {
    validPeriod: [Date.now() - 86400000, Date.now() + 86400000], // Yesterday to tomorrow
    activeSeasons: ['winter', 'spring'],
    minimumOrder: 75,
    eligibleCountries: ['US', 'CA', 'UK'],
  },
  inventory: {
    allItemsAvailable: true,
  },
  currentDate: Date.now(),
  currentSeason: 'winter',
};

const eligibleForDiscount = engine.evaluateExpr(pricingRule, pricingContext);
```

### Healthcare Patient Eligibility

```javascript
// Healthcare treatment eligibility system
const treatmentEligibilityRule = rules.and(
  // Basic patient validation
  rules.validation.required('patient.id'),
  rules.isTrue('patient.isActive'),
  rules.isNotNull('patient.dateOfBirth'),

  // Age requirements for treatment
  rules.between('patient.age', 'treatment.ageRange'),

  // Medical prerequisites
  rules.or(
    rules.eq('treatment.requiresPriorAuth', false),
    rules.and(
      rules.eq('treatment.requiresPriorAuth', true),
      rules.isTrue('patient.hasPriorAuthorization'),
      rules.gte('patient.authorizationExpiry', 'currentDate')
    )
  ),

  // Insurance coverage
  rules.and(
    rules.isTrue('patient.hasInsurance'),
    rules.in('treatment.code', 'insurance.coveredTreatments'),
    rules.or(
      rules.eq('insurance.copayRequired', false),
      rules.lte('treatment.estimatedCost', 'insurance.maxCoverage')
    )
  ),

  // Medical contraindications
  rules.not(
    rules.or(
      rules.in('treatment.contraindications', 'patient.allergies'),
      rules.in('treatment.contraindications', 'patient.currentMedications'),
      rules.in('treatment.exclusions', 'patient.medicalHistory')
    )
  ),

  // Provider qualifications
  rules.and(
    rules.in('treatment.requiredCertification', 'provider.certifications'),
    rules.isTrue('provider.isLicensed'),
    rules.gte('provider.licenseExpiry', 'currentDate')
  ),

  // Facility requirements
  rules.and(
    rules.in('treatment.requiredEquipment', 'facility.availableEquipment'),
    rules.gte('facility.capacity', 'treatment.requiredCapacity')
  )
);

const healthcareContext = {
  patient: {
    id: 'P12345',
    age: 45,
    dateOfBirth: '1978-03-15',
    isActive: true,
    hasInsurance: true,
    hasPriorAuthorization: true,
    authorizationExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    allergies: ['penicillin', 'latex'],
    currentMedications: ['metformin', 'lisinopril'],
    medicalHistory: ['diabetes', 'hypertension'],
  },
  treatment: {
    code: 'T001',
    name: 'Advanced Imaging',
    ageRange: [18, 80],
    requiresPriorAuth: true,
    estimatedCost: 1500,
    contraindications: ['shellfish', 'iodine'],
    exclusions: ['kidney_disease'],
    requiredCertification: 'radiology',
    requiredEquipment: ['mri_machine'],
    requiredCapacity: 1,
  },
  insurance: {
    provider: 'HealthCorp',
    coveredTreatments: ['T001', 'T002', 'T003'],
    maxCoverage: 2000,
    copayRequired: true,
  },
  provider: {
    id: 'DR123',
    certifications: ['radiology', 'nuclear_medicine'],
    isLicensed: true,
    licenseExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
  },
  facility: {
    id: 'FAC456',
    availableEquipment: ['mri_machine', 'ct_scanner', 'ultrasound'],
    capacity: 5,
  },
  currentDate: Date.now(),
};

const isEligible = engine.evaluateExpr(treatmentEligibilityRule, healthcareContext);
```

### Financial Risk Assessment

```javascript
// Comprehensive financial risk assessment
const riskAssessmentRule = rules.and(
  // Basic applicant validation
  rules.validation.required('applicant.ssn'),
  rules.validation.ageRange('applicant.age', 18, 75),
  rules.gte('applicant.employmentMonths', 6),

  // Credit score evaluation
  rules.or(
    // Excellent credit
    rules.and(
      rules.gte('applicant.creditScore', 750),
      rules.lte('loan.amount', 'applicant.annualIncome * 5')
    ),

    // Good credit with additional checks
    rules.and(
      rules.between('applicant.creditScore', [650, 749]),
      rules.lte('loan.amount', 'applicant.annualIncome * 3'),
      rules.lte('applicant.debtToIncomeRatio', 0.4)
    ),

    // Fair credit with strict requirements
    rules.and(
      rules.between('applicant.creditScore', [550, 649]),
      rules.lte('loan.amount', 'applicant.annualIncome * 2'),
      rules.lte('applicant.debtToIncomeRatio', 0.3),
      rules.gte('loan.downPaymentPercent', 20)
    )
  ),

  // Employment stability
  rules.or(
    rules.eq('applicant.employmentType', 'permanent'),
    rules.and(
      rules.eq('applicant.employmentType', 'contract'),
      rules.gte('applicant.contractMonthsRemaining', 12)
    ),
    rules.and(
      rules.eq('applicant.employmentType', 'self_employed'),
      rules.gte('applicant.businessYears', 2),
      rules.isTrue('applicant.hasBusinessTaxReturns')
    )
  ),

  // Asset verification
  rules.and(
    rules.gte('applicant.liquidAssets', 'loan.amount * 0.1'),
    rules.gte('applicant.totalAssets', 'applicant.totalLiabilities * 1.2')
  ),

  // Risk factors assessment
  rules.not(
    rules.or(
      rules.isTrue('applicant.hasBankruptcy'),
      rules.isTrue('applicant.hasForeclosure'),
      rules.gte('applicant.latePayments', 3),
      rules.in('applicant.industry', 'risk.highRiskIndustries')
    )
  ),

  // Loan-specific validations
  rules.and(
    rules.between('loan.termMonths', [12, 360]),
    rules.lte('loan.amount', 'risk.maxLoanAmount'),
    rules.in('loan.purpose', 'risk.approvedPurposes')
  )
);

const riskContext = {
  applicant: {
    ssn: '123-45-6789',
    age: 32,
    employmentMonths: 24,
    creditScore: 720,
    annualIncome: 75000,
    debtToIncomeRatio: 0.28,
    employmentType: 'permanent',
    liquidAssets: 50000,
    totalAssets: 200000,
    totalLiabilities: 150000,
    hasBankruptcy: false,
    hasForeclosure: false,
    latePayments: 1,
    industry: 'technology',
  },
  loan: {
    amount: 250000,
    termMonths: 360,
    purpose: 'home_purchase',
    downPaymentPercent: 15,
  },
  risk: {
    maxLoanAmount: 500000,
    highRiskIndustries: ['gambling', 'cryptocurrency', 'adult_entertainment'],
    approvedPurposes: ['home_purchase', 'home_refinance', 'home_improvement', 'debt_consolidation'],
  },
};

const riskAssessment = engine.evaluateExpr(riskAssessmentRule, riskContext);
```

## 🎯 Best Practices

### 1. Rule Organization and Maintainability

#### Modular Rule Design

Break complex rules into smaller, reusable components:

```javascript
// Instead of one monolithic rule
const monolithicRule = rules.and(
  rules.eq('user.status', 'active'),
  rules.gte('user.age', 18),
  rules.validation.email('user.email'),
  rules.eq('order.status', 'pending'),
  rules.gte('order.total', 100),
  rules.in('order.country', ['US', 'CA'])
);

// Use modular approach
const userRules = {
  isActive: rules.eq('user.status', 'active'),
  isAdult: rules.gte('user.age', 18),
  hasValidEmail: rules.validation.email('user.email'),
  isEligible: rules.and(
    rules.eq('user.status', 'active'),
    rules.gte('user.age', 18),
    rules.validation.email('user.email')
  ),
};

const orderRules = {
  isPending: rules.eq('order.status', 'pending'),
  meetsMinimum: rules.gte('order.total', 100),
  isEligibleRegion: rules.in('order.country', ['US', 'CA']),
  isValid: rules.and(
    rules.eq('order.status', 'pending'),
    rules.gte('order.total', 100),
    rules.in('order.country', ['US', 'CA'])
  ),
};

// Combine modular rules
const eligibilityRule = rules.and(userRules.isEligible, orderRules.isValid);
```

#### Rule Documentation and Naming

```javascript
// Document complex rules with comments
const advancedEligibilityRule = rules.and(
  // User must be verified and active
  userRules.isVerifiedAndActive,

  // Order must meet business requirements
  orderRules.meetsBusinessCriteria,

  // Geographic and compliance checks
  complianceRules.meetsRegionalRequirements,

  // Risk assessment
  riskRules.isLowRisk
);

// Use descriptive names for rule functions
function createSubscriptionEligibilityRule(tierRequirements) {
  return rules.and(
    rules.gte('user.accountAge', tierRequirements.minimumAccountAge),
    rules.lte('user.violations', tierRequirements.maximumViolations),
    rules.gte('user.engagement.score', tierRequirements.minimumEngagement)
  );
}

// Create rule factories for similar patterns
function createAgeRestrictionRule(minimumAge, maximumAge = 120) {
  return rules.and(
    rules.validation.required('dateOfBirth'),
    rules.between('age', [minimumAge, maximumAge])
  );
}

const alcoholPurchaseRule = createAgeRestrictionRule(21);
const seniorDiscountRule = createAgeRestrictionRule(65);
```

### 2. Performance Optimization Strategies

#### Smart Rule Ordering

```javascript
// Order operations from fastest to slowest
const optimizedRule = rules.and(
  // 1. Simple equality checks (fastest)
  rules.eq('user.active', true),
  rules.eq('feature.enabled', true),

  // 2. Numeric comparisons (fast)
  rules.gte('user.age', 18),
  rules.lte('order.total', 1000),

  // 3. Array operations (medium)
  rules.in('user.role', ['admin', 'moderator']),
  rules.notIn('user.status', ['banned', 'suspended']),

  // 4. String operations (slower)
  rules.contains('user.email', '@company.com'),
  rules.startsWith('order.id', 'ORD-'),

  // 5. Complex validation and regex (slowest)
  rules.validation.email('user.email'),
  rules.regex('phone', phoneNumberPattern)
);
```

#### Caching Strategy

```javascript
// Create dedicated engines for different use cases
const userValidationEngine = createRuleEngine({
  maxCacheSize: 2000, // Large cache for frequent user validations
  enableCache: true,
});

const orderProcessingEngine = createRuleEngine({
  maxCacheSize: 500, // Smaller cache for less frequent order rules
  enableCache: true,
});

// Monitor and adjust cache performance
function monitorCachePerformance(engine, engineName) {
  const metrics = engine.getMetrics();
  const cacheStats = engine.getCacheStats();

  const hitRate = metrics.cacheHits / metrics.evaluations;

  if (hitRate < 0.7) {
    // Less than 70% hit rate
    console.warn(`${engineName} cache hit rate is low: ${hitRate * 100}%`);
    console.log('Consider increasing cache size or reviewing rule patterns');
  }

  return { hitRate, metrics, cacheStats };
}
```

### 3. Error Handling and Debugging

#### Comprehensive Error Handling

```javascript
function safeRuleEvaluation(rule, context, options = {}) {
  const { fallbackResult = false, logErrors = true, throwOnInvalidRule = false } = options;

  try {
    // Validate rule structure
    if (!rule || typeof rule !== 'object') {
      const error = new Error('Invalid rule: must be an object');
      if (throwOnInvalidRule) throw error;
      if (logErrors) console.warn('Rule validation failed:', error.message);
      return { success: fallbackResult, error: error.message };
    }

    // Evaluate rule
    const result = engine.evaluateExpr(rule, context);

    if (!result.success && logErrors) {
      console.warn('Rule evaluation failed:', {
        operator: result.operator,
        error: result.error,
        context: result.details,
      });
    }

    return result;
  } catch (error) {
    if (logErrors) {
      console.error('Unexpected error during rule evaluation:', {
        error: error.message,
        stack: error.stack,
        rule: JSON.stringify(rule),
        contextKeys: Object.keys(context || {}),
      });
    }

    return {
      success: fallbackResult,
      error: 'Evaluation failed',
      details: { originalError: error.message },
    };
  }
}

// Usage
const result = safeRuleEvaluation(complexRule, userData, {
  fallbackResult: false,
  logErrors: true,
  throwOnInvalidRule: false,
});
```

#### Rule Testing Framework

```javascript
// Create a testing framework for rules
class RuleTester {
  constructor(engine) {
    this.engine = engine;
    this.testResults = [];
  }

  test(description, rule, testCases) {
    console.log(`Testing: ${description}`);

    testCases.forEach((testCase, index) => {
      const { context, expected, description: caseDesc } = testCase;
      const result = this.engine.evaluateExpr(rule, context);

      const passed = result.success === expected;

      this.testResults.push({
        description,
        caseDescription: caseDesc || `Case ${index + 1}`,
        passed,
        expected,
        actual: result.success,
        context,
        result,
      });

      if (passed) {
        console.log(`  ✅ ${caseDesc || `Case ${index + 1}`}: PASSED`);
      } else {
        console.log(`  ❌ ${caseDesc || `Case ${index + 1}`}: FAILED`);
        console.log(`     Expected: ${expected}, Got: ${result.success}`);
        if (!result.success) {
          console.log(`     Error: ${result.error}`);
        }
      }
    });
  }

  getSummary() {
    const total = this.testResults.length;
    const passed = this.testResults.filter((r) => r.passed).length;
    const failed = total - passed;

    return {
      total,
      passed,
      failed,
      passRate: ((passed / total) * 100).toFixed(1) + '%',
    };
  }
}

// Usage
const tester = new RuleTester(engine);

const adminRule = rules.eq('role', 'admin');

tester.test('Admin Access Rule', adminRule, [
  {
    context: { role: 'admin' },
    expected: true,
    description: 'Admin user should have access',
  },
  {
    context: { role: 'user' },
    expected: false,
    description: 'Regular user should not have admin access',
  },
  {
    context: { role: null },
    expected: false,
    description: 'Null role should not have access',
  },
  {
    context: {},
    expected: false,
    description: 'Missing role should not have access',
  },
]);

console.log(tester.getSummary());
```

### 4. Type Safety and Validation

#### Input Validation

```javascript
// Validate context structure before rule evaluation
function validateContext(context, requiredFields = []) {
  const errors = [];

  if (!context || typeof context !== 'object') {
    errors.push('Context must be an object');
    return { valid: false, errors };
  }

  // Check required fields
  requiredFields.forEach((field) => {
    const value = engine.resolvePath(context, field);
    if (value === undefined || value === null) {
      errors.push(`Required field missing: ${field}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// Type validation helpers
const typeValidators = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && !isNaN(value),
  boolean: (value) => typeof value === 'boolean',
  array: (value) => Array.isArray(value),
  object: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
  email: (value) => typeof value === 'string' && /^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(value),
};

function validateFieldTypes(context, fieldTypes) {
  const errors = [];

  Object.entries(fieldTypes).forEach(([field, expectedType]) => {
    const value = engine.resolvePath(context, field);

    if (value !== undefined && value !== null) {
      const validator = typeValidators[expectedType];
      if (validator && !validator(value)) {
        errors.push(`Field '${field}' should be of type '${expectedType}', got '${typeof value}'`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

// Usage
const contextValidation = validateContext(userData, ['user.id', 'user.email', 'user.role']);
const typeValidation = validateFieldTypes(userData, {
  'user.age': 'number',
  'user.email': 'email',
  'user.isActive': 'boolean',
  'user.permissions': 'array',
});

if (!contextValidation.valid) {
  console.error('Context validation failed:', contextValidation.errors);
}

if (!typeValidation.valid) {
  console.error('Type validation failed:', typeValidation.errors);
}
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Issue 1: Path Resolution Problems

**Problem**: Rules fail when accessing nested properties that don't exist.

```javascript
// ❌ This will fail if user.profile doesn't exist
const problematicRule = rules.eq('user.profile.name', 'John');

const userData = { user: { id: 123 } }; // Missing profile
const result = engine.evaluateExpr(problematicRule, userData);
// Result: { success: false, error: "Cannot read property 'name' of undefined" }
```

**Solutions**:

```javascript
// ✅ Solution 1: Use null checks
const safeRule = rules.and(rules.isNotNull('user.profile'), rules.eq('user.profile.name', 'John'));

// ✅ Solution 2: Use default values in path resolution
const nameWithDefault = engine.resolvePath(userData, 'user.profile.name', 'Unknown');
const defaultRule = rules.eq(nameWithDefault, 'John');

// ✅ Solution 3: Defensive rule structure
const defensiveRule = rules.or(rules.isNull('user.profile'), rules.eq('user.profile.name', 'John'));
```

#### Issue 2: Type Coercion Confusion

**Problem**: Unexpected results due to type coercion in non-strict mode.

```javascript
// ❌ Unexpected behavior
const userData = { age: '25', score: '0', active: 'true' };

const rule1 = rules.gt('age', 20); // '25' > 20 → true (string coerced to number)
const rule2 = rules.gt('score', 0); // '0' > 0 → false (both coerced to numbers)
const rule3 = rules.eq('active', true); // 'true' == true → false (string ≠ boolean)
```

**Solutions**:

```javascript
// ✅ Solution 1: Use strict mode globally
const strictEngine = createRuleEngine({ strict: true });

// ✅ Solution 2: Use strict mode per operation
const strictRule = rules.eq('active', true, { strict: true });

// ✅ Solution 3: Explicit type conversion in data preparation
function prepareData(rawData) {
  return {
    age: Number(rawData.age),
    score: Number(rawData.score),
    active: rawData.active === 'true' || rawData.active === true
  };
}

// ✅ Solution 4: Use type-aware validation
const typeAwareRule = rules.and(
  rules.regex('age', '^\\d+),  // Ensure it's numeric string
  rules.gt('age', 20)
);
```

#### Issue 3: Performance Degradation

**Problem**: Rules become slow with complex nested structures or large datasets.

```javascript
// ❌ Performance problems
const slowRule = rules.and(
  rules.regex('email', 'very-complex-regex-pattern-here'), // Expensive regex first
  rules.contains('bio', 'keyword'), // String search
  rules.eq('active', true) // Simple check last
);

// Large context with unnecessary data
const bloatedContext = {
  user: userData,
  largeArray: new Array(10000).fill({}).map((_, i) => ({ id: i, data: 'lots of data' })),
  complexObject: {
    /* deeply nested structure */
  },
};
```

**Solutions**:

```javascript
// ✅ Solution 1: Optimize rule order
const optimizedRule = rules.and(
  rules.eq('active', true), // Fast check first
  rules.contains('bio', 'keyword'), // Medium speed
  rules.regex('email', 'very-complex-regex-pattern-here') // Expensive check last
);

// ✅ Solution 2: Prepare minimal context
function createMinimalContext(fullData) {
  return {
    user: {
      id: fullData.user.id,
      email: fullData.user.email,
      active: fullData.user.active,
      bio: fullData.user.bio,
    },
    // Only include fields needed for rules
  };
}

// ✅ Solution 3: Cache frequently used rules
const ruleCache = new Map();

function getCachedRule(ruleName, ruleFactory) {
  if (!ruleCache.has(ruleName)) {
    ruleCache.set(ruleName, ruleFactory());
  }
  return ruleCache.get(ruleName);
}

// ✅ Solution 4: Monitor performance
function measureRulePerformance(rule, context, iterations = 100) {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    engine.evaluateExpr(rule, context);
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`Average execution time: ${avgTime.toFixed(2)}ms`);
  return avgTime;
}
```

#### Issue 4: Memory Leaks with Large Rule Sets

**Problem**: Memory usage grows over time with many rule evaluations.

```javascript
// ❌ Potential memory issues
function processLargeDataset(dataItems) {
  dataItems.forEach((item) => {
    // Creating new engine for each item
    const engine = createRuleEngine();
    const result = engine.evaluateExpr(complexRule, item);
    // Engine and its caches aren't reused
  });
}
```

**Solutions**:

```javascript
// ✅ Solution 1: Reuse engine instances
const sharedEngine = createRuleEngine({ maxCacheSize: 1000 });

function processLargeDataset(dataItems) {
  return dataItems.map((item) => {
    return sharedEngine.evaluateExpr(complexRule, item);
  });
}

// ✅ Solution 2: Periodic cache cleanup
let evaluationCount = 0;
const CACHE_CLEANUP_INTERVAL = 1000;

function evaluateWithCleanup(rule, context) {
  const result = sharedEngine.evaluateExpr(rule, context);

  evaluationCount++;
  if (evaluationCount % CACHE_CLEANUP_INTERVAL === 0) {
    sharedEngine.clearCache();
    console.log(`Cache cleared after ${evaluationCount} evaluations`);
  }

  return result;
}

// ✅ Solution 3: Monitor memory usage
function monitorMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    console.log({
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      cacheStats: sharedEngine.getCacheStats(),
    });
  }
}
```

### Debug Mode and Logging

#### Enable Debug Mode

```javascript
// Create engine with debug enabled
const debugEngine = createRuleEngine({
  enableDebug: true,
  maxDepth: 20,
  maxOperators: 200,
});

// Debug output will show:
// - Rule evaluation steps
// - Cache hits/misses
// - Performance metrics
// - Error details

const result = debugEngine.evaluateExpr(complexRule, userData);
// Console output:
// [DEBUG] Evaluating rule: {"and":[{"eq":["role","admin"]},{"gte":["age",18]}]}
// [DEBUG] Cache miss for expression key: ...
// [DEBUG] Operator 'and' evaluation started
// [DEBUG] Operator 'eq' result: true
// [DEBUG] Operator 'gte' result: true
// [DEBUG] Operator 'and' result: true
// [DEBUG] Evaluation completed in 1.23ms
```

#### Custom Logging

```javascript
// Create custom logging wrapper
function createLoggingEngine(baseEngine, logger = console) {
  return {
    ...baseEngine,
    evaluateExpr: (rule, context) => {
      const start = performance.now();

      logger.log('Rule evaluation started', {
        rule: JSON.stringify(rule),
        contextKeys: Object.keys(context),
      });

      try {
        const result = baseEngine.evaluateExpr(rule, context);
        const duration = performance.now() - start;

        logger.log('Rule evaluation completed', {
          success: result.success,
          duration: `${duration.toFixed(2)}ms`,
          operator: result.operator,
          error: result.error,
        });

        return result;
      } catch (error) {
        const duration = performance.now() - start;

        logger.error('Rule evaluation failed', {
          error: error.message,
          duration: `${duration.toFixed(2)}ms`,
          stack: error.stack,
        });

        throw error;
      }
    },
  };
}

// Usage
const loggingEngine = createLoggingEngine(engine);
const result = loggingEngine.evaluateExpr(rule, context);
```

### Validation Tools

#### Rule Structure Validator

```javascript
function validateRuleStructure(rule, maxDepth = 10, currentDepth = 0) {
  const errors = [];

  if (currentDepth > maxDepth) {
    errors.push(`Rule exceeds maximum depth of ${maxDepth}`);
    return errors;
  }

  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    errors.push('Rule must be a non-null object');
    return errors;
  }

  const operators = Object.keys(rule);
  if (operators.length === 0) {
    errors.push('Rule must contain at least one operator');
    return errors;
  }

  if (operators.length > 1) {
    errors.push('Rule should contain only one operator at root level');
  }

  operators.forEach((operator) => {
    const args = rule[operator];

    if (!Array.isArray(args)) {
      errors.push(`Operator '${operator}' arguments must be an array`);
      return;
    }

    // Validate logical operators recursively
    if (['and', 'or'].includes(operator)) {
      args.forEach((subRule, index) => {
        if (typeof subRule === 'object' && !Array.isArray(subRule)) {
          const subErrors = validateRuleStructure(subRule, maxDepth, currentDepth + 1);
          subErrors.forEach((error) => {
            errors.push(`In ${operator}[${index}]: ${error}`);
          });
        }
      });
    }

    if (operator === 'not') {
      if (args.length !== 1) {
        errors.push('NOT operator must have exactly one argument');
      } else if (typeof args[0] === 'object' && !Array.isArray(args[0])) {
        const subErrors = validateRuleStructure(args[0], maxDepth, currentDepth + 1);
        subErrors.forEach((error) => {
          errors.push(`In not: ${error}`);
        });
      }
    }
  });

  return errors;
}

// Usage
const validationErrors = validateRuleStructure(complexRule);
if (validationErrors.length > 0) {
  console.error('Rule validation failed:', validationErrors);
} else {
  console.log('Rule structure is valid');
}
```

## 🚀 Advanced Topics

### Custom Operator Development

#### Creating Business-Specific Operators

```javascript
// Example: Time-based operators for business rules
engine.registerOperator('isBusinessDay', (args, context) => {
  const [timezone = 'UTC'] = args;
  const date = new Date();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
});

engine.registerOperator('isWithinBusinessHours', (args, context) => {
  const [startHour = 9, endHour = 17, timezone = 'UTC'] = args;
  const now = new Date();
  const hour = now.getHours();
  return hour >= startHour && hour < endHour;
});

engine.registerOperator('hasBeenActiveDays', (args, context) => {
  const [pathToDate, requiredDays] = args;
  const dateValue = engine.resolvePath(context, pathToDate);

  if (!dateValue) return false;

  const activeSince = new Date(dateValue);
  const now = new Date();
  const diffTime = Math.abs(now - activeSince);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= requiredDays;
});

// Geolocation-based operator
engine.registerOperator('isWithinRadius', (args, context) => {
  const [userLatPath, userLonPath, centerLat, centerLon, radiusKm] = args;

  const userLat = engine.resolvePath(context, userLatPath);
  const userLon = engine.resolvePath(context, userLonPath);

  if (!userLat || !userLon) return false;

  // Haversine formula for distance calculation
  const R = 6371; // Earth's radius in km
  const dLat = ((centerLat - userLat) * Math.PI) / 180;
  const dLon = ((centerLon - userLon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((centerLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= radiusKm;
});

// Usage of custom operators
const businessRule = rules.and(
  { isBusinessDay: [] },
  { isWithinBusinessHours: [9, 18] },
  { hasBeenActiveDays: ['user.registrationDate', 30] },
  { isWithinRadius: ['user.lat', 'user.lon', 40.7128, -74.006, 50] } // Within 50km of NYC
);
```

#### Async Operator Support (Advanced)

```javascript
// Note: The current engine doesn't support async operators natively,
// but here's a pattern for handling async operations:

class AsyncRuleEngine {
  constructor(baseEngine) {
    this.baseEngine = baseEngine;
    this.asyncOperators = new Map();
  }

  registerAsyncOperator(name, handler) {
    this.asyncOperators.set(name, handler);
  }

  async evaluateExprAsync(rule, context) {
    // Pre-process async operators
    const processedRule = await this.preprocessAsyncOperators(rule, context);

    // Evaluate with regular engine
    return this.baseEngine.evaluateExpr(processedRule, context);
  }

  async preprocessAsyncOperators(rule, context, processed = new Set()) {
    if (typeof rule !== 'object' || !rule) return rule;

    const processedRule = {};

    for (const [operator, args] of Object.entries(rule)) {
      if (this.asyncOperators.has(operator)) {
        const handler = this.asyncOperators.get(operator);
        const result = await handler(args, context);
        // Replace async operator with simple boolean result
        processedRule.eq = [result, true];
      } else if (['and', 'or', 'not'].includes(operator)) {
        // Recursively process logical operators
        const processedArgs = await Promise.all(
          args.map((arg) => this.preprocessAsyncOperators(arg, context, processed))
        );
        processedRule[operator] = processedArgs;
      } else {
        processedRule[operator] = args;
      }
    }

    return processedRule;
  }
}

// Usage
const asyncEngine = new AsyncRuleEngine(engine);

asyncEngine.registerAsyncOperator('hasValidApiKey', async (args, context) => {
  const [apiKeyPath] = args;
  const apiKey = engine.resolvePath(context, apiKeyPath);

  // Simulate API call to validate key
  const response = await fetch(`/api/validate-key/${apiKey}`);
  return response.ok;
});

asyncEngine.registerAsyncOperator('creditCheckPassed', async (args, context) => {
  const [ssnPath] = args;
  const ssn = engine.resolvePath(context, ssnPath);

  // Simulate credit check API call
  const creditScore = await getCreditScore(ssn);
  return creditScore >= 650;
});

// Async rule evaluation
const asyncRule = {
  and: [
    { hasValidApiKey: ['user.apiKey'] },
    { creditCheckPassed: ['user.ssn'] },
    { gte: ['user.age', 18] },
  ],
};

const result = await asyncEngine.evaluateExprAsync(asyncRule, userData);
```

### Integration Patterns

#### Express.js Middleware

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

// Create shared engine instance
const accessEngine = createRuleEngine({ maxCacheSize: 2000 });
const rules = createRuleHelpers();

// Rule definitions
const accessRules = {
  adminOnly: rules.eq('role', 'admin'),

  userOrAdmin: rules.in('role', ['user', 'admin']),

  departmentAccess: (department) =>
    rules.and(
      rules.in('role', ['user', 'admin']),
      rules.or(rules.eq('role', 'admin'), rules.eq('department', department))
    ),

  resourceOwner: rules.or(
    rules.eq('role', 'admin'),
    rules.field.equals('userId', 'resource.ownerId')
  ),
};

// Middleware factory
function createAccessMiddleware(rule, options = {}) {
  const {
    getUserContext = (req) => req.user,
    getResourceContext = (req) => req.resource,
    onAccessDenied = (req, res) => res.status(403).json({ error: 'Access denied' }),
    onError = (req, res, error) => res.status(500).json({ error: 'Authorization error' }),
  } = options;

  return async (req, res, next) => {
    try {
      const userContext = getUserContext(req);
      const resourceContext = getResourceContext(req);

      const context = {
        ...userContext,
        resource: resourceContext,
        request: {
          method: req.method,
          path: req.path,
          ip: req.ip,
        },
      };

      const result = accessEngine.evaluateExpr(rule, context);

      if (result.success) {
        next();
      } else {
        onAccessDenied(req, res);
      }
    } catch (error) {
      console.error('Access control error:', error);
      onError(req, res, error);
    }
  };
}

// Usage in Express routes
app.get('/admin/*', createAccessMiddleware(accessRules.adminOnly));

app.get(
  '/department/:dept/reports',
  createAccessMiddleware(accessRules.departmentAccess((req) => req.params.dept))
);

app.delete(
  '/resource/:id',
  async (req, res, next) => {
    // Load resource context
    req.resource = await Resource.findById(req.params.id);
    next();
  },
  createAccessMiddleware(accessRules.resourceOwner)
);
```

#### React Hook for Form Validation

```javascript
import { useState, useMemo, useCallback } from 'react';
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

// Custom hook for rule-based form validation
function useFormValidation(validationRules, options = {}) {
  const { validateOnChange = true, validateOnBlur = true, showErrorsImmediately = false } = options;

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Create engine and rules (memoized for performance)
  const { engine, rules } = useMemo(
    () => ({
      engine: createRuleEngine(),
      rules: createRuleHelpers(),
    }),
    []
  );

  // Validate single field
  const validateField = useCallback(
    (fieldName, value, allFormData = formData) => {
      const fieldRule = validationRules[fieldName];
      if (!fieldRule) return null;

      const testData = { ...allFormData, [fieldName]: value };
      const result = engine.evaluateExpr(fieldRule, testData);

      return result.success ? null : result.error || `${fieldName} is invalid`;
    },
    [engine, validationRules, formData]
  );

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, formData[fieldName], formData);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return { isValid, errors: newErrors };
  }, [validateField, validationRules, formData]);

  // Handle field change
  const handleChange = useCallback(
    (fieldName, value) => {
      const newFormData = { ...formData, [fieldName]: value };
      setFormData(newFormData);

      if (validateOnChange && (touched[fieldName] || showErrorsImmediately)) {
        const error = validateField(fieldName, value, newFormData);
        setErrors((prev) => ({ ...prev, [fieldName]: error }));
      }
    },
    [formData, validateOnChange, touched, showErrorsImmediately, validateField]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (fieldName) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }));

      if (validateOnBlur) {
        const error = validateField(fieldName, formData[fieldName]);
        setErrors((prev) => ({ ...prev, [fieldName]: error }));
      }
    },
    [validateOnBlur, validateField, formData]
  );

  // Get field props for easy integration
  const getFieldProps = useCallback(
    (fieldName) => ({
      value: formData[fieldName] || '',
      onChange: (e) => handleChange(fieldName, e.target.value),
      onBlur: () => handleBlur(fieldName),
      error: errors[fieldName],
      hasError: Boolean(errors[fieldName]),
    }),
    [formData, errors, handleChange, handleBlur]
  );

  return {
    formData,
    errors,
    touched,
    setFormData,
    handleChange,
    handleBlur,
    validateField,
    validateForm,
    getFieldProps,
    isValid: Object.keys(errors).length === 0,
  };
}

// Usage in React component
function RegistrationForm() {
  const rules = createRuleHelpers();

  const validationRules = {
    email: rules.validation.email('email'),
    password: rules.and(
      rules.gte('password.length', 8),
      rules.regex('password', '(?=.*[0-9])(?=.*[a-zA-Z])')
    ),
    confirmPassword: rules.field.equals('password', 'confirmPassword'),
    age: rules.validation.ageRange('age', 18, 120),
    terms: rules.isTrue('terms'),
  };

  const { formData, errors, validateForm, getFieldProps, isValid } =
    useFormValidation(validationRules);

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateForm();

    if (validation.isValid) {
      console.log('Form submitted:', formData);
    } else {
      console.log('Validation errors:', validation.errors);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input type="email" {...getFieldProps('email')} className={errors.email ? 'error' : ''} />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          {...getFieldProps('password')}
          className={errors.password ? 'error' : ''}
        />
        {errors.password && <span className="error-text">{errors.password}</span>}
      </div>

      <div>
        <label>Confirm Password:</label>
        <input
          type="password"
          {...getFieldProps('confirmPassword')}
          className={errors.confirmPassword ? 'error' : ''}
        />
        {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
      </div>

      <div>
        <label>Age:</label>
        <input type="number" {...getFieldProps('age')} className={errors.age ? 'error' : ''} />
        {errors.age && <span className="error-text">{errors.age}</span>}
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.terms || false}
            onChange={(e) =>
              getFieldProps('terms').onChange({ target: { value: e.target.checked } })
            }
          />
          I agree to the terms and conditions
        </label>
        {errors.terms && <span className="error-text">{errors.terms}</span>}
      </div>

      <button type="submit" disabled={!isValid}>
        Register
      </button>
    </form>
  );
}
```

---

This comprehensive documentation covers all aspects of Rule Engine JS from basic usage to advanced patterns. The modular structure makes it easy for developers to find exactly what they need, whether they're just getting started or building complex enterprise applications.

The documentation includes:

- Clear explanations of core concepts
- Comprehensive API reference
- Real-world examples
- Performance optimization guides
- Security best practices
- Troubleshooting guides
- Advanced integration patterns

Each section builds upon the previous ones, providing a complete learning path for developers of all skill levels.
