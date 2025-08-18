# Security Guide - Rule Engine JS

Comprehensive security best practices and guidelines for building secure rule-based applications with Rule Engine JS.

## 🔒 Table of Contents

- [Security Overview](#security-overview)
- [Built-in Security Features](#built-in-security-features)
- [Input Validation & Sanitization](#input-validation--sanitization)
- [Prototype Pollution Protection](#prototype-pollution-protection)
- [Code Injection Prevention](#code-injection-prevention)
- [Access Control & Authorization](#access-control--authorization)
- [Data Privacy & Sensitive Information](#data-privacy--sensitive-information)
- [Secure Configuration](#secure-configuration)
- [Audit Logging & Monitoring](#audit-logging--monitoring)
- [Common Security Pitfalls](#common-security-pitfalls)
- [Security Testing](#security-testing)
- [Production Security Checklist](#production-security-checklist)

<a name="security-overview"></a>

## 🛡️ Security Overview

Rule Engine JS is designed with security as a core principle. It provides multiple layers of protection against common attacks while maintaining flexibility and performance.

### Security Philosophy

1. **Secure by Default** - All security features are enabled by default
2. **Defense in Depth** - Multiple layers of protection
3. **Least Privilege** - Minimal access to sensitive operations
4. **Input Validation** - Comprehensive input sanitization
5. **Audit Trail** - Complete logging of security-relevant events

<a name="built-in-security-features"></a>

## 🔐 Built-in Security Features

### Automatic Prototype Pollution Protection

Rule Engine JS automatically protects against prototype pollution attacks:

```javascript
// ❌ Malicious input attempt
const maliciousData = {
  __proto__: { isAdmin: true },
  constructor: { prototype: { isAdmin: true } },
  'constructor.prototype.isAdmin': true,
  user: { name: 'attacker' },
};

// ✅ Safe path resolution - prototype properties are blocked
const engine = createRuleEngine();

// These return undefined (safe)
engine.resolvePath(maliciousData, '__proto__.isAdmin');
engine.resolvePath(maliciousData, 'constructor.prototype.isAdmin');
engine.resolvePath(maliciousData, 'constructor.prototype');

// This works (safe)
engine.resolvePath(maliciousData, 'user.name'); // Returns "attacker"

// Rules using malicious paths fail safely
const maliciousRule = { eq: ['__proto__.isAdmin', true] };
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
      return eval('process.env'); // Potentially dangerous
    },
  },
};

// ✅ Function access is blocked
engine.resolvePath(dataWithFunctions, 'user.getName'); // undefined
engine.resolvePath(dataWithFunctions, 'user.dangerousFunction'); // undefined

// ✅ Safe data access works
engine.resolvePath(dataWithFunctions, 'user.name'); // "John"
```

### Secure Default Configuration

```javascript
// ✅ Production-ready secure configuration
const secureEngine = createRuleEngine({
  allowPrototypeAccess: false, // Never allow prototype access
  strict: true, // Enable strict type checking
  maxDepth: 10, // Prevent deep recursion attacks
  maxOperators: 100, // Limit rule complexity
  enableDebug: false, // Disable debug info in production
  maxCacheSize: 1000, // Reasonable cache limits
});

// ❌ Insecure configuration (avoid in production)
const insecureEngine = createRuleEngine({
  allowPrototypeAccess: true, // Dangerous!
  strict: false, // More permissive
  maxDepth: 1000, // Too deep
  maxOperators: 10000, // Too many operators
  enableDebug: true, // Exposes internal info
});
```

<a name="input-validation--sanitization"></a>

## 🔍 Input Validation & Sanitization

### Rule Structure Validation

Always validate rule structures before evaluation:

```javascript
function validateRuleStructure(rule) {
  const errors = [];

  // Basic structure validation
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    errors.push('Rule must be a non-null object');
    return { valid: false, errors };
  }

  // Check for empty rules
  const operators = Object.keys(rule);
  if (operators.length === 0) {
    errors.push('Rule must contain at least one operator');
    return { valid: false, errors };
  }

  // Validate operator names (whitelist approach)
  const allowedOperators = [
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'and',
    'or',
    'not',
    'in',
    'notIn',
    'contains',
    'startsWith',
    'endsWith',
    'regex',
    'between',
    'isNull',
    'isNotNull',
  ];

  const invalidOperators = operators.filter((op) => !allowedOperators.includes(op));
  if (invalidOperators.length > 0) {
    errors.push(`Invalid operators: ${invalidOperators.join(', ')}`);
  }

  // Validate rule depth
  const depth = calculateRuleDepth(rule);
  if (depth > 10) {
    errors.push(`Rule depth ${depth} exceeds maximum of 10`);
  }

  // Validate operator count
  const operatorCount = countOperators(rule);
  if (operatorCount > 100) {
    errors.push(`Rule has ${operatorCount} operators, maximum is 100`);
  }

  return { valid: errors.length === 0, errors };
}

function calculateRuleDepth(rule, currentDepth = 0) {
  if (typeof rule !== 'object' || rule === null) {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  Object.values(rule).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          maxDepth = Math.max(maxDepth, calculateRuleDepth(item, currentDepth + 1));
        }
      });
    }
  });

  return maxDepth;
}

function countOperators(rule) {
  if (typeof rule !== 'object' || rule === null) {
    return 0;
  }

  let count = Object.keys(rule).length;

  Object.values(rule).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          count += countOperators(item);
        }
      });
    }
  });

  return count;
}

// Usage
function safeEvaluateRule(rule, context) {
  const validation = validateRuleStructure(rule);

  if (!validation.valid) {
    return {
      success: false,
      error: 'Invalid rule structure',
      details: { validationErrors: validation.errors },
    };
  }

  try {
    return engine.evaluateExpr(rule, context);
  } catch (error) {
    return {
      success: false,
      error: 'Rule evaluation failed',
      details: { originalError: error.message },
    };
  }
}
```

### Context Data Sanitization

Sanitize context data before evaluation:

```javascript
function sanitizeContext(context, options = {}) {
  const {
    maxDepth = 10,
    maxStringLength = 1000,
    maxArrayLength = 1000,
    allowedTypes = ['string', 'number', 'boolean', 'object'],
    removeFunctions = true,
    removePrototypeProps = true,
  } = options;

  return sanitizeValue(context, 0, {
    maxDepth,
    maxStringLength,
    maxArrayLength,
    allowedTypes,
    removeFunctions,
    removePrototypeProps,
  });
}

function sanitizeValue(value, currentDepth, options) {
  // Prevent deep recursion
  if (currentDepth > options.maxDepth) {
    return '[TRUNCATED: Max depth exceeded]';
  }

  // Handle null and undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle primitives
  if (typeof value === 'string') {
    if (value.length > options.maxStringLength) {
      return value.substring(0, options.maxStringLength) + '[TRUNCATED]';
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Remove functions
  if (typeof value === 'function') {
    return options.removeFunctions ? undefined : '[FUNCTION]';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (!options.allowedTypes.includes('object')) {
      return '[ARRAY: Not allowed]';
    }

    const sanitizedArray = value
      .slice(0, options.maxArrayLength)
      .map((item) => sanitizeValue(item, currentDepth + 1, options))
      .filter((item) => item !== undefined);

    return sanitizedArray;
  }

  // Handle objects
  if (typeof value === 'object') {
    if (!options.allowedTypes.includes('object')) {
      return '[OBJECT: Not allowed]';
    }

    const sanitizedObject = {};

    for (const [key, val] of Object.entries(value)) {
      // Remove prototype-related properties
      if (options.removePrototypeProps && ['__proto__', 'constructor', 'prototype'].includes(key)) {
        continue;
      }

      // Sanitize key
      const sanitizedKey =
        typeof key === 'string' ? key.substring(0, 100) : String(key).substring(0, 100);

      // Sanitize value
      const sanitizedVal = sanitizeValue(val, currentDepth + 1, options);

      if (sanitizedVal !== undefined) {
        sanitizedObject[sanitizedKey] = sanitizedVal;
      }
    }

    return sanitizedObject;
  }

  // Unknown type - convert to string safely
  return String(value).substring(0, 100);
}

// Usage
function secureEvaluateRule(rule, rawContext) {
  // Validate rule first
  const ruleValidation = validateRuleStructure(rule);
  if (!ruleValidation.valid) {
    throw new Error(`Invalid rule: ${ruleValidation.errors.join(', ')}`);
  }

  // Sanitize context
  const safeContext = sanitizeContext(rawContext, {
    maxDepth: 5,
    maxStringLength: 500,
    maxArrayLength: 100,
  });

  return engine.evaluateExpr(rule, safeContext);
}
```

<a name="prototype-pollution-protection"></a>

## 🚫 Prototype Pollution Protection

### Understanding the Threat

Prototype pollution occurs when attackers modify object prototypes:

```javascript
// ❌ Dangerous: Direct prototype manipulation
const maliciousInput = {
  __proto__: { isAdmin: true },
  'constructor.prototype.isAdmin': true,
};

// ❌ What attackers try to achieve
Object.prototype.isAdmin = true;
const normalUser = {};
console.log(normalUser.isAdmin); // true - all objects now have isAdmin!
```

### Rule Engine Protection

Rule Engine JS automatically prevents prototype pollution:

```javascript
// ✅ Safe: Built-in protection
const engine = createRuleEngine();

const maliciousContext = {
  __proto__: { isAdmin: true },
  constructor: { prototype: { isAdmin: true } },
  user: { name: 'attacker' },
};

// These return undefined (protected)
engine.resolvePath(maliciousContext, '__proto__.isAdmin');
engine.resolvePath(maliciousContext, 'constructor.prototype.isAdmin');

// Safe access still works
engine.resolvePath(maliciousContext, 'user.name'); // "attacker"

// Rules fail safely with malicious paths
const rule = { eq: ['__proto__.isAdmin', true] };
const result = engine.evaluateExpr(rule, maliciousContext);
console.log(result.success); // false
```

### Additional Protection Layers

```javascript
// Enhanced context sanitization
function protectAgainstPrototypePollution(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Deep clone to avoid reference pollution
  const cleaned = JSON.parse(JSON.stringify(obj));

  // Recursively remove dangerous properties
  function cleanObject(target) {
    if (!target || typeof target !== 'object') {
      return target;
    }

    // Remove prototype-related properties
    delete target.__proto__;
    delete target.constructor;
    delete target.prototype;

    // Remove properties that could affect prototypes
    const dangerousKeys = [
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toString',
      'valueOf',
    ];

    dangerousKeys.forEach((key) => {
      if (target.hasOwnProperty(key)) {
        delete target[key];
      }
    });

    // Recursively clean nested objects
    Object.keys(target).forEach((key) => {
      if (typeof target[key] === 'object' && target[key] !== null) {
        cleanObject(target[key]);
      }
    });

    return target;
  }

  return cleanObject(cleaned);
}

// Usage
function extraSecureEvaluation(rule, context) {
  const protectedContext = protectAgainstPrototypePollution(context);
  return engine.evaluateExpr(rule, protectedContext);
}
```

<a name="code-injection-prevention"></a>

## 💉 Code Injection Prevention

### Regex Pattern Security

Validate regex patterns to prevent ReDoS (Regular Expression Denial of Service):

```javascript
function validateRegexPattern(pattern, flags = '') {
  const errors = [];

  // Check for dangerous patterns that could cause ReDoS
  const dangerousPatterns = [
    /\(\?\=.*\)\+/, // Positive lookahead with quantifier
    /\(\?\!.*\)\+/, // Negative lookahead with quantifier
    /\(\?\<=.*\)\+/, // Positive lookbehind with quantifier
    /\(\?\<!.*\)\+/, // Negative lookbehind with quantifier
    /\(\w\+\)\+/, // Nested quantifiers
    /\(\w\*\)\+/, // Nested quantifiers
    /\(\.\+\)\+/, // Nested quantifiers with .+
    /\(\.\*\)\+/, // Nested quantifiers with .*
  ];

  dangerousPatterns.forEach((dangerous, index) => {
    if (dangerous.test(pattern)) {
      errors.push(`Pattern contains potentially dangerous construct #${index + 1}`);
    }
  });

  // Check pattern length
  if (pattern.length > 1000) {
    errors.push('Pattern too long (max 1000 characters)');
  }

  // Validate flags
  const validFlags = ['g', 'i', 'm', 's', 'u', 'y'];
  const flagChars = flags.split('');
  const invalidFlags = flagChars.filter((f) => !validFlags.includes(f));

  if (invalidFlags.length > 0) {
    errors.push(`Invalid regex flags: ${invalidFlags.join(', ')}`);
  }

  // Test compilation
  try {
    new RegExp(pattern, flags);
  } catch (error) {
    errors.push(`Invalid regex pattern: ${error.message}`);
  }

  return { valid: errors.length === 0, errors };
}

// Safe regex operator wrapper
function createSecureRegexRule(field, pattern, options = {}) {
  const validation = validateRegexPattern(pattern, options.flags);

  if (!validation.valid) {
    throw new Error(`Invalid regex pattern: ${validation.errors.join(', ')}`);
  }

  return { regex: [field, pattern, options] };
}

// Usage
try {
  const safeRule = createSecureRegexRule('email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$');
  const result = engine.evaluateExpr(safeRule, { email: 'user@example.com' });
} catch (error) {
  console.error('Regex validation failed:', error.message);
}
```

### Dynamic Rule Generation Security

When generating rules dynamically, always validate inputs:

```javascript
class SecureRuleBuilder {
  constructor() {
    this.allowedOperators = new Set([
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'and',
      'or',
      'not',
      'in',
      'notIn',
      'contains',
      'startsWith',
      'endsWith',
      'between',
      'isNull',
      'isNotNull',
    ]);

    this.allowedFields = new Set();
    this.maxRuleDepth = 5;
    this.maxOperators = 20;
  }

  setAllowedFields(fields) {
    this.allowedFields = new Set(fields);
    return this;
  }

  validateFieldAccess(field) {
    if (typeof field !== 'string') {
      throw new Error('Field must be a string');
    }

    // Check field whitelist
    if (this.allowedFields.size > 0 && !this.allowedFields.has(field)) {
      throw new Error(`Field '${field}' not in allowed fields list`);
    }

    // Check for dangerous patterns
    if (
      field.includes('__proto__') ||
      field.includes('constructor') ||
      field.includes('prototype')
    ) {
      throw new Error(`Field '${field}' contains dangerous patterns`);
    }

    // Validate field format
    if (!/^[a-zA-Z][a-zA-Z0-9_.]*$/.test(field)) {
      throw new Error(`Field '${field}' has invalid format`);
    }

    return true;
  }

  validateOperator(operator) {
    if (!this.allowedOperators.has(operator)) {
      throw new Error(`Operator '${operator}' not allowed`);
    }
    return true;
  }

  validateValue(value) {
    // Prevent dangerous values
    if (typeof value === 'function') {
      throw new Error('Function values not allowed');
    }

    if (typeof value === 'object' && value !== null) {
      // Check for prototype pollution attempts
      if (
        value.hasOwnProperty('__proto__') ||
        value.hasOwnProperty('constructor') ||
        value.hasOwnProperty('prototype')
      ) {
        throw new Error('Object contains dangerous properties');
      }
    }

    return true;
  }

  createRule(operator, ...args) {
    this.validateOperator(operator);

    // Validate field arguments
    if (
      ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith'].includes(
        operator
      )
    ) {
      if (args.length < 2) {
        throw new Error(`Operator '${operator}' requires at least 2 arguments`);
      }

      this.validateFieldAccess(args[0]);
      this.validateValue(args[1]);
    }

    if (['in', 'notIn'].includes(operator)) {
      if (args.length < 2) {
        throw new Error(`Operator '${operator}' requires at least 2 arguments`);
      }

      this.validateFieldAccess(args[0]);

      if (!Array.isArray(args[1])) {
        throw new Error(`Operator '${operator}' requires array as second argument`);
      }

      args[1].forEach((value) => this.validateValue(value));
    }

    if (operator === 'between') {
      if (args.length < 2) {
        throw new Error('Between operator requires at least 2 arguments');
      }

      this.validateFieldAccess(args[0]);

      if (!Array.isArray(args[1]) || args[1].length !== 2) {
        throw new Error('Between operator requires array of 2 values');
      }

      args[1].forEach((value) => this.validateValue(value));
    }

    return { [operator]: args };
  }

  and(...conditions) {
    if (conditions.length === 0) {
      throw new Error('AND operator requires at least one condition');
    }

    return { and: conditions };
  }

  or(...conditions) {
    if (conditions.length === 0) {
      throw new Error('OR operator requires at least one condition');
    }

    return { or: conditions };
  }

  not(condition) {
    if (!condition) {
      throw new Error('NOT operator requires a condition');
    }

    return { not: [condition] };
  }
}

// Usage
const secureBuilder = new SecureRuleBuilder().setAllowedFields([
  'user.name',
  'user.email',
  'user.age',
  'user.role',
]);

try {
  const rule = secureBuilder.and(
    secureBuilder.createRule('eq', 'user.role', 'admin'),
    secureBuilder.createRule('gte', 'user.age', 18)
  );

  const result = engine.evaluateExpr(rule, context);
} catch (error) {
  console.error('Secure rule building failed:', error.message);
}
```

<a name="access-control--authorization"></a>

## 🔐 Access Control & Authorization

### Role-Based Rule Access

Implement role-based access control for rule evaluation:

```javascript
class SecureRuleEngine {
  constructor(baseEngine, options = {}) {
    this.baseEngine = baseEngine;
    this.rolePermissions = new Map();
    this.auditLog = [];
    this.options = {
      enableAudit: options.enableAudit !== false,
      maxAuditEntries: options.maxAuditEntries || 1000,
      ...options,
    };
  }

  defineRole(roleName, permissions) {
    this.rolePermissions.set(roleName, {
      ...permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  hasPermission(userRole, permission) {
    const rolePerms = this.rolePermissions.get(userRole);
    if (!rolePerms) return false;

    return rolePerms[permission] === true;
  }

  evaluateExpr(rule, context, userInfo = {}) {
    const { userId, role, sessionId } = userInfo;

    // Log access attempt
    this.auditLog.push({
      timestamp: new Date(),
      userId,
      role,
      sessionId,
      action: 'rule_evaluation',
      ruleHash: this.hashRule(rule),
      contextKeys: Object.keys(context),
    });

    // Check basic rule evaluation permission
    if (!this.hasPermission(role, 'evaluateRules')) {
      const error = new Error('Insufficient permissions to evaluate rules');
      this.auditLog.push({
        timestamp: new Date(),
        userId,
        role,
        action: 'access_denied',
        reason: 'missing_evaluate_permission',
      });
      throw error;
    }

    // Check for sensitive field access
    const sensitiveFields = this.extractSensitiveFields(rule);
    if (sensitiveFields.length > 0 && !this.hasPermission(role, 'accessSensitiveFields')) {
      const error = new Error('Insufficient permissions to access sensitive fields');
      this.auditLog.push({
        timestamp: new Date(),
        userId,
        role,
        action: 'access_denied',
        reason: 'sensitive_field_access',
        sensitiveFields,
      });
      throw error;
    }

    try {
      const result = this.baseEngine.evaluateExpr(rule, context);

      // Log successful evaluation
      this.auditLog.push({
        timestamp: new Date(),
        userId,
        role,
        action: 'rule_evaluation_success',
        ruleHash: this.hashRule(rule),
        result: result.success,
      });

      // Trim audit log if needed
      if (this.auditLog.length > this.options.maxAuditEntries) {
        this.auditLog = this.auditLog.slice(-this.options.maxAuditEntries);
      }

      return result;
    } catch (error) {
      // Log evaluation error
      this.auditLog.push({
        timestamp: new Date(),
        userId,
        role,
        action: 'rule_evaluation_error',
        error: error.message,
      });
      throw error;
    }
  }

  extractSensitiveFields(rule) {
    const sensitivePatterns = [
      /password/i,
      /ssn/i,
      /social.*security/i,
      /credit.*card/i,
      /bank.*account/i,
      /api.*key/i,
      /secret/i,
      /token/i,
    ];

    const fields = this.extractAllFields(rule);
    return fields.filter((field) => sensitivePatterns.some((pattern) => pattern.test(field)));
  }

  extractAllFields(rule, fields = new Set()) {
    if (typeof rule !== 'object' || rule === null) {
      return Array.from(fields);
    }

    Object.entries(rule).forEach(([operator, args]) => {
      if (Array.isArray(args)) {
        args.forEach((arg) => {
          if (typeof arg === 'string' && arg.includes('.')) {
            fields.add(arg);
          } else if (typeof arg === 'object') {
            this.extractAllFields(arg, fields);
          }
        });
      }
    });

    return Array.from(fields);
  }

  hashRule(rule) {
    // Simple hash for audit purposes
    return JSON.stringify(rule).substring(0, 100) + '...';
  }

  getAuditLog(filters = {}) {
    let filtered = this.auditLog;

    if (filters.userId) {
      filtered = filtered.filter((entry) => entry.userId === filters.userId);
    }

    if (filters.action) {
      filtered = filtered.filter((entry) => entry.action === filters.action);
    }

    if (filters.since) {
      const since = new Date(filters.since);
      filtered = filtered.filter((entry) => entry.timestamp >= since);
    }

    return filtered;
  }
}

// Setup roles and permissions
const secureEngine = new SecureRuleEngine(engine);

secureEngine.defineRole('admin', {
  evaluateRules: true,
  accessSensitiveFields: true,
  manageRules: true,
});

secureEngine.defineRole('user', {
  evaluateRules: true,
  accessSensitiveFields: false,
  manageRules: false,
});

secureEngine.defineRole('readonly', {
  evaluateRules: true,
  accessSensitiveFields: false,
  manageRules: false,
});

// Usage with user context
const userInfo = {
  userId: 'user123',
  role: 'user',
  sessionId: 'session456',
};

try {
  const result = secureEngine.evaluateExpr(rule, context, userInfo);
} catch (error) {
  console.error('Access denied:', error.message);
}
```

### Field-Level Security

Implement field-level access controls:

```javascript
class FieldSecurityManager {
  constructor() {
    this.fieldPermissions = new Map();
    this.fieldClassifications = new Map();
  }

  classifyField(fieldPath, classification, options = {}) {
    this.fieldClassifications.set(fieldPath, {
      classification, // 'public', 'internal', 'confidential', 'restricted'
      description: options.description,
      dataType: options.dataType,
      retention: options.retention,
      createdAt: new Date(),
    });
  }

  setFieldPermission(role, fieldPath, permissions) {
    const key = `${role}:${fieldPath}`;
    this.fieldPermissions.set(key, {
      read: permissions.read !== false,
      write: permissions.write === true,
      ...permissions,
      updatedAt: new Date(),
    });
  }

  canAccessField(role, fieldPath, operation = 'read') {
    const key = `${role}:${fieldPath}`;
    const permission = this.fieldPermissions.get(key);

    if (!permission) {
      // Check by classification
      const classification = this.fieldClassifications.get(fieldPath);
      if (classification) {
        return this.getDefaultPermissionByClassification(
          role,
          classification.classification,
          operation
        );
      }

      // Default to deny
      return false;
    }

    return permission[operation] === true;
  }

  getDefaultPermissionByClassification(role, classification, operation) {
    const defaultPermissions = {
      admin: {
        public: { read: true, write: true },
        internal: { read: true, write: true },
        confidential: { read: true, write: true },
        restricted: { read: true, write: false },
      },
      user: {
        public: { read: true, write: false },
        internal: { read: true, write: false },
        confidential: { read: false, write: false },
        restricted: { read: false, write: false },
      },
      readonly: {
        public: { read: true, write: false },
        internal: { read: false, write: false },
        confidential: { read: false, write: false },
        restricted: { read: false, write: false },
      },
    };

    return defaultPermissions[role]?.[classification]?.[operation] === true;
  }

  filterContextByPermissions(context, role) {
    const filtered = {};

    const filterObject = (obj, path = '') => {
      const result = {};

      Object.entries(obj).forEach(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key;

        if (this.canAccessField(role, fullPath, 'read')) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = filterObject(value, fullPath);
          } else {
            result[key] = value;
          }
        }
      });

      return result;
    };

    return filterObject(context);
  }
}

// Setup field security
const fieldSecurity = new FieldSecurityManager();

// Classify fields
fieldSecurity.classifyField('user.email', 'internal');
fieldSecurity.classifyField('user.ssn', 'restricted');
fieldSecurity.classifyField('user.name', 'public');
fieldSecurity.classifyField('user.salary', 'confidential');

// Set specific permissions
fieldSecurity.setFieldPermission('hr', 'user.salary', { read: true, write: true });
fieldSecurity.setFieldPermission('manager', 'user.salary', { read: true, write: false });

// Filter context before rule evaluation
function secureEvaluateWithFieldSecurity(rule, context, userRole) {
  const filteredContext = fieldSecurity.filterContextByPermissions(context, userRole);
  return engine.evaluateExpr(rule, filteredContext);
}
```

<a name="data-privacy--sensitive-information"></a>

## 🔒 Data Privacy & Sensitive Information

### Data Masking and Redaction

Implement automatic data masking for sensitive fields:

```javascript
class DataMaskingService {
  constructor() {
    this.maskingRules = new Map();
    this.sensitivePatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'ssn' },
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, type: 'credit_card' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'email' },
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, type: 'phone' },
    ];
  }

  defineMaskingRule(fieldPath, maskingType, options = {}) {
    this.maskingRules.set(fieldPath, {
      type: maskingType,
      maskChar: options.maskChar || '*',
      preserveLength: options.preserveLength !== false,
      preserveFormat: options.preserveFormat === true,
      showLast: options.showLast || 0,
      showFirst: options.showFirst || 0,
      ...options,
    });
  }

  maskValue(value, maskingRule) {
    if (typeof value !== 'string') {
      return value;
    }

    switch (maskingRule.type) {
      case 'full':
        return maskingRule.maskChar.repeat(value.length);

      case 'partial':
        const showFirst = maskingRule.showFirst;
        const showLast = maskingRule.showLast;
        const maskLength = Math.max(0, value.length - showFirst - showLast);

        return (
          value.substring(0, showFirst) +
          maskingRule.maskChar.repeat(maskLength) +
          value.substring(value.length - showLast)
        );

      case 'format_preserving':
        return this.formatPreservingMask(value, maskingRule);

      case 'hash':
        return this.hashValue(value);

      case 'remove':
        return '[REDACTED]';

      default:
        return value;
    }
  }

  formatPreservingMask(value, rule) {
    return value.replace(/[A-Za-z0-9]/g, rule.maskChar);
  }

  hashValue(value) {
    // Simple hash for demonstration - use crypto.createHash in production
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `[HASH:${Math.abs(hash).toString(16)}]`;
  }

  maskContext(context, userRole) {
    const masked = JSON.parse(JSON.stringify(context));

    const maskObject = (obj, path = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key;
        const maskingRule = this.maskingRules.get(fullPath);

        if (maskingRule && !this.userCanSeeUnmasked(userRole, fullPath)) {
          obj[key] = this.maskValue(value, maskingRule);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          maskObject(value, fullPath);
        } else if (typeof value === 'string') {
          // Auto-detect and mask sensitive patterns
          obj[key] = this.autoMaskSensitiveData(value, userRole);
        }
      });
    };

    maskObject(masked);
    return masked;
  }

  userCanSeeUnmasked(userRole, fieldPath) {
    // Define roles that can see unmasked data for specific fields
    const unmaskingPermissions = {
      admin: ['*'], // Admin can see all
      hr: ['user.ssn', 'user.salary', 'user.email'],
      finance: ['user.salary', 'user.bankAccount'],
      manager: ['user.email', 'user.phone'],
    };

    const permissions = unmaskingPermissions[userRole] || [];
    return permissions.includes('*') || permissions.includes(fieldPath);
  }

  autoMaskSensitiveData(text, userRole) {
    if (this.userCanSeeUnmasked(userRole, '*')) {
      return text;
    }

    let maskedText = text;

    this.sensitivePatterns.forEach(({ pattern, type }) => {
      maskedText = maskedText.replace(pattern, (match) => {
        switch (type) {
          case 'ssn':
            return 'XXX-XX-' + match.slice(-4);
          case 'credit_card':
            return '**** **** **** ' + match.slice(-4);
          case 'email':
            const [user, domain] = match.split('@');
            return user.charAt(0) + '***@' + domain;
          case 'phone':
            return '***-***-' + match.slice(-4);
          default:
            return '[MASKED]';
        }
      });
    });

    return maskedText;
  }
}

// Setup data masking
const dataMasking = new DataMaskingService();

// Define masking rules
dataMasking.defineMaskingRule('user.ssn', 'partial', {
  showLast: 4,
  maskChar: 'X',
});

dataMasking.defineMaskingRule('user.creditCard', 'partial', {
  showLast: 4,
  preserveFormat: true,
});

dataMasking.defineMaskingRule('user.password', 'full');

dataMasking.defineMaskingRule('user.apiKey', 'hash');

// Usage
function secureEvaluateWithMasking(rule, context, userRole) {
  const maskedContext = dataMasking.maskContext(context, userRole);
  return engine.evaluateExpr(rule, maskedContext);
}
```

<a name="secure-configuration"></a>

## ⚙️ Secure Configuration

### Production Security Configuration

```javascript
// ✅ Secure production configuration
const productionEngine = createRuleEngine({
  // Security settings
  allowPrototypeAccess: false, // Never allow prototype access
  strict: true, // Strict type checking
  enableDebug: false, // Disable debug info

  // Resource limits
  maxDepth: 10, // Reasonable nesting limit
  maxOperators: 100, // Prevent resource exhaustion
  maxCacheSize: 1000, // Controlled memory usage

  // Performance settings
  enableCache: true, // Enable for performance
});

// Environment-specific configuration
function createSecureEngine(environment) {
  const baseConfig = {
    allowPrototypeAccess: false,
    strict: true,
    enableCache: true,
  };

  switch (environment) {
    case 'production':
      return createRuleEngine({
        ...baseConfig,
        enableDebug: false,
        maxDepth: 10,
        maxOperators: 100,
        maxCacheSize: 1000,
      });

    case 'staging':
      return createRuleEngine({
        ...baseConfig,
        enableDebug: false,
        maxDepth: 15,
        maxOperators: 200,
        maxCacheSize: 2000,
      });

    case 'development':
      return createRuleEngine({
        ...baseConfig,
        enableDebug: true,
        maxDepth: 20,
        maxOperators: 500,
        maxCacheSize: 500,
      });

    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

// Configuration validation
function validateEngineConfig(config) {
  const errors = [];

  if (config.allowPrototypeAccess === true) {
    errors.push('allowPrototypeAccess should be false in production');
  }

  if (config.enableDebug === true && process.env.NODE_ENV === 'production') {
    errors.push('Debug mode should be disabled in production');
  }

  if (config.maxDepth > 20) {
    errors.push('maxDepth should not exceed 20 to prevent deep recursion');
  }

  if (config.maxOperators > 1000) {
    errors.push('maxOperators should not exceed 1000 to prevent resource exhaustion');
  }

  if (config.maxCacheSize > 10000) {
    errors.push('maxCacheSize should not exceed 10000 to prevent memory issues');
  }

  return { valid: errors.length === 0, errors };
}
```

<a name="audit-logging--monitoring"></a>

## 📊 Audit Logging & Monitoring

### Comprehensive Audit System

```javascript
class SecurityAuditSystem {
  constructor(options = {}) {
    this.auditLog = [];
    this.securityEvents = [];
    this.options = {
      maxLogEntries: options.maxLogEntries || 10000,
      enableRealTimeAlerts: options.enableRealTimeAlerts !== false,
      alertThresholds: {
        failedEvaluations: options.failedEvaluations || 10,
        suspiciousPatterns: options.suspiciousPatterns || 5,
        timeWindow: options.timeWindow || 300000, // 5 minutes
      },
      ...options,
    };

    this.alertHandlers = [];
  }

  logSecurityEvent(event) {
    const auditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level: event.level || 'info',
      category: event.category,
      action: event.action,
      userId: event.userId,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details || {},
      ruleHash: event.ruleHash,
      success: event.success,
      error: event.error,
    };

    this.auditLog.push(auditEntry);

    if (auditEntry.level === 'warning' || auditEntry.level === 'error') {
      this.securityEvents.push(auditEntry);
    }

    // Check for suspicious patterns
    this.detectSuspiciousActivity(auditEntry);

    // Trim logs if needed
    if (this.auditLog.length > this.options.maxLogEntries) {
      this.auditLog = this.auditLog.slice(-this.options.maxLogEntries);
    }

    return auditEntry.id;
  }

  detectSuspiciousActivity(currentEvent) {
    const timeWindow = this.options.alertThresholds.timeWindow;
    const cutoffTime = new Date(Date.now() - timeWindow);

    // Recent events from same user/IP
    const recentEvents = this.auditLog.filter(
      (event) =>
        event.timestamp >= cutoffTime &&
        (event.userId === currentEvent.userId || event.ipAddress === currentEvent.ipAddress)
    );

    // Check for multiple failed evaluations
    const failedEvaluations = recentEvents.filter(
      (event) => event.success === false && event.category === 'rule_evaluation'
    );

    if (failedEvaluations.length >= this.options.alertThresholds.failedEvaluations) {
      this.triggerAlert({
        type: 'multiple_failed_evaluations',
        severity: 'high',
        userId: currentEvent.userId,
        ipAddress: currentEvent.ipAddress,
        count: failedEvaluations.length,
        timeWindow: timeWindow,
      });
    }

    // Check for suspicious rule patterns
    const suspiciousPatterns = [
      '__proto__',
      'constructor',
      'prototype',
      'eval',
      'Function',
      'script',
    ];

    if (currentEvent.ruleHash) {
      const hasSuspiciousPattern = suspiciousPatterns.some((pattern) =>
        currentEvent.ruleHash.toLowerCase().includes(pattern)
      );

      if (hasSuspiciousPattern) {
        this.triggerAlert({
          type: 'suspicious_rule_pattern',
          severity: 'high',
          userId: currentEvent.userId,
          ruleHash: currentEvent.ruleHash,
          patterns: suspiciousPatterns.filter((p) =>
            currentEvent.ruleHash.toLowerCase().includes(p)
          ),
        });
      }
    }

    // Check for rapid successive requests
    const rapidRequests = recentEvents.filter(
      (event) => event.timestamp >= new Date(Date.now() - 60000) // Last minute
    );

    if (rapidRequests.length > 100) {
      this.triggerAlert({
        type: 'potential_dos_attack',
        severity: 'critical',
        userId: currentEvent.userId,
        ipAddress: currentEvent.ipAddress,
        requestCount: rapidRequests.length,
      });
    }
  }

  triggerAlert(alert) {
    const alertEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: alert.type,
      severity: alert.severity,
      ...alert,
    };

    console.warn('SECURITY ALERT:', alertEvent);

    // Notify registered alert handlers
    this.alertHandlers.forEach((handler) => {
      try {
        handler(alertEvent);
      } catch (error) {
        console.error('Alert handler failed:', error);
      }
    });
  }

  onAlert(handler) {
    this.alertHandlers.push(handler);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getSecurityReport(timeRange = 3600000) {
    // Default: last hour
    const cutoffTime = new Date(Date.now() - timeRange);
    const recentEvents = this.auditLog.filter((event) => event.timestamp >= cutoffTime);

    const report = {
      timeRange: timeRange,
      totalEvents: recentEvents.length,
      successfulEvaluations: recentEvents.filter((e) => e.success === true).length,
      failedEvaluations: recentEvents.filter((e) => e.success === false).length,
      uniqueUsers: new Set(recentEvents.map((e) => e.userId)).size,
      uniqueIPs: new Set(recentEvents.map((e) => e.ipAddress)).size,
      securityEvents: this.securityEvents.filter((e) => e.timestamp >= cutoffTime),
      topErrors: this.getTopErrors(recentEvents),
      suspiciousActivity: this.getSuspiciousActivity(recentEvents),
    };

    return report;
  }

  getTopErrors(events) {
    const errorCounts = {};
    events
      .filter((e) => e.error)
      .forEach((event) => {
        errorCounts[event.error] = (errorCounts[event.error] || 0) + 1;
      });

    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));
  }

  getSuspiciousActivity(events) {
    return events.filter(
      (event) =>
        event.level === 'warning' ||
        event.level === 'error' ||
        event.category === 'security_violation'
    );
  }
}

// Setup audit system
const auditSystem = new SecurityAuditSystem({
  maxLogEntries: 50000,
  alertThresholds: {
    failedEvaluations: 5,
    suspiciousPatterns: 3,
    timeWindow: 300000, // 5 minutes
  },
});

// Setup alert handlers
auditSystem.onAlert((alert) => {
  // Send to security team
  console.error('SECURITY ALERT:', alert);

  // Could integrate with external systems:
  // - Send email/SMS notifications
  // - Log to SIEM system
  // - Block IP addresses
  // - Disable user accounts
});

// Wrapper for secure evaluation with auditing
function auditedEvaluateExpr(rule, context, userInfo = {}) {
  const startTime = Date.now();

  try {
    auditSystem.logSecurityEvent({
      category: 'rule_evaluation',
      action: 'started',
      userId: userInfo.userId,
      sessionId: userInfo.sessionId,
      ipAddress: userInfo.ipAddress,
      userAgent: userInfo.userAgent,
      ruleHash: JSON.stringify(rule).substring(0, 200),
    });

    const result = engine.evaluateExpr(rule, context);

    auditSystem.logSecurityEvent({
      category: 'rule_evaluation',
      action: 'completed',
      userId: userInfo.userId,
      sessionId: userInfo.sessionId,
      ipAddress: userInfo.ipAddress,
      success: result.success,
      duration: Date.now() - startTime,
      details: {
        operatorCount: JSON.stringify(rule).split('"').length,
        contextSize: JSON.stringify(context).length,
      },
    });

    return result;
  } catch (error) {
    auditSystem.logSecurityEvent({
      level: 'error',
      category: 'rule_evaluation',
      action: 'failed',
      userId: userInfo.userId,
      sessionId: userInfo.sessionId,
      ipAddress: userInfo.ipAddress,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    });

    throw error;
  }
}
```

<a name="common-security-pitfalls"></a>

## ⚠️ Common Security Pitfalls

### 1. Accepting Untrusted Rule Definitions

```javascript
// ❌ Dangerous: Accepting rules directly from user input
app.post('/evaluate-rule', (req, res) => {
  const rule = req.body.rule; // Untrusted input!
  const result = engine.evaluateExpr(rule, userData);
  res.json(result);
});

// ✅ Safe: Validate and sanitize rules
app.post('/evaluate-rule', (req, res) => {
  try {
    const validation = validateRuleStructure(req.body.rule);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid rule', details: validation.errors });
    }

    const sanitizedContext = sanitizeContext(userData);
    const result = secureEngine.evaluateExpr(req.body.rule, sanitizedContext, req.user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Evaluation failed' });
  }
});
```

### 2. Exposing Sensitive Data in Context

```javascript
// ❌ Dangerous: Including sensitive data in context
const context = {
  user: {
    id: user.id,
    email: user.email,
    password: user.hashedPassword, // Sensitive!
    ssn: user.ssn, // Sensitive!
    creditCard: user.creditCard, // Sensitive!
    apiKey: user.apiKey, // Sensitive!
  },
};

// ✅ Safe: Filter context to only necessary data
const context = {
  user: {
    id: user.id,
    email: user.email.split('@')[1], // Only domain for rules
    role: user.role,
    isActive: user.isActive,
    // No sensitive data included
  },
};
```

### 3. Insufficient Input Validation

```javascript
// ❌ Dangerous: No validation on regex patterns
const userRule = {
  regex: [userField, userPattern], // Could be malicious ReDoS pattern
};

// ✅ Safe: Validate regex patterns
function createSafeRegexRule(field, pattern, flags) {
  const validation = validateRegexPattern(pattern, flags);
  if (!validation.valid) {
    throw new Error(`Invalid pattern: ${validation.errors.join(', ')}`);
  }

  return { regex: [field, pattern, { flags }] };
}
```

### 4. Ignoring Rate Limiting

```javascript
// ❌ Dangerous: No rate limiting on rule evaluation
app.post('/evaluate', (req, res) => {
  const result = engine.evaluateExpr(req.body.rule, context);
  res.json(result);
});

// ✅ Safe: Implement rate limiting
const rateLimit = require('express-rate-limit');

const evaluationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many evaluation requests, please try again later.',
});

app.post('/evaluate', evaluationLimiter, (req, res) => {
  // Evaluation logic with rate limiting
});
```

### 5. Missing Error Information Disclosure

```javascript
// ❌ Dangerous: Exposing internal error details
app.post('/evaluate', (req, res) => {
  try {
    const result = engine.evaluateExpr(rule, context);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message, // Might expose internals
      stack: error.stack, // Definitely exposes internals
      context: context, // Exposes data
    });
  }
});

// ✅ Safe: Generic error responses
app.post('/evaluate', (req, res) => {
  try {
    const result = engine.evaluateExpr(rule, context);
    res.json(result);
  } catch (error) {
    // Log detailed error internally
    logger.error('Rule evaluation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    // Return generic error to client
    res.status(500).json({
      error: 'Evaluation failed',
      requestId: generateRequestId(),
    });
  }
});
```

<a name="security-testing"></a>

## 🧪 Security Testing

### Security Test Suite

```javascript
const assert = require('assert');

describe('Security Tests', () => {
  let engine;

  beforeEach(() => {
    engine = createRuleEngine({
      allowPrototypeAccess: false,
      strict: true,
      maxDepth: 10,
      maxOperators: 100,
    });
  });

  describe('Prototype Pollution Protection', () => {
    it('should block __proto__ access', () => {
      const maliciousContext = {
        __proto__: { isAdmin: true },
        user: { name: 'test' },
      };

      const rule = { eq: ['__proto__.isAdmin', true] };
      const result = engine.evaluateExpr(rule, maliciousContext);

      assert.strictEqual(result.success, false);
    });

    it('should block constructor.prototype access', () => {
      const maliciousContext = {
        constructor: { prototype: { isAdmin: true } },
        user: { name: 'test' },
      };

      const rule = { eq: ['constructor.prototype.isAdmin', true] };
      const result = engine.evaluateExpr(rule, maliciousContext);

      assert.strictEqual(result.success, false);
    });

    it('should allow safe property access', () => {
      const safeContext = {
        user: { name: 'John', role: 'user' },
      };

      const rule = { eq: ['user.name', 'John'] };
      const result = engine.evaluateExpr(rule, safeContext);

      assert.strictEqual(result.success, true);
    });
  });

  describe('Function Access Prevention', () => {
    it('should block function property access', () => {
      const contextWithFunctions = {
        user: {
          name: 'John',
          getName: function () {
            return this.name;
          },
          dangerousFunc: function () {
            return eval('process.env');
          },
        },
      };

      const rule1 = { eq: ['user.getName', 'something'] };
      const result1 = engine.evaluateExpr(rule1, contextWithFunctions);
      assert.strictEqual(result1.success, false);

      const rule2 = { eq: ['user.dangerousFunc', 'something'] };
      const result2 = engine.evaluateExpr(rule2, contextWithFunctions);
      assert.strictEqual(result2.success, false);
    });
  });

  describe('Input Validation', () => {
    it('should reject rules exceeding max depth', () => {
      // Create deeply nested rule
      let deepRule = { eq: ['value', 1] };
      for (let i = 0; i < 15; i++) {
        deepRule = { and: [deepRule, { eq: ['other', 2] }] };
      }

      assert.throws(() => {
        engine.evaluateExpr(deepRule, { value: 1, other: 2 });
      }, /exceeds maximum depth/);
    });

    it('should reject rules with too many operators', () => {
      // Create rule with many operators
      const conditions = [];
      for (let i = 0; i < 150; i++) {
        conditions.push({ eq: [`field${i}`, i] });
      }
      const bigRule = { and: conditions };

      assert.throws(() => {
        engine.evaluateExpr(bigRule, {});
      }, /exceeds maximum operators/);
    });
  });

  describe('Regex Security', () => {
    it('should handle potentially dangerous regex patterns safely', () => {
      const dangerousPatterns = [
        '(a+)+', // Catastrophic backtracking
        '(a|a)*', // Catastrophic backtracking
        'a{10000000}', // Resource exhaustion
        '(?=.*a)(?=.*b)(?=.*c)(?=.*d)(?=.*e).*', // Many lookaheads
      ];

      dangerousPatterns.forEach((pattern) => {
        const rule = { regex: ['text', pattern] };
        const context = { text: 'aaaaaaaaaaaaaaaaaaaaX' };

        // Should either work quickly or fail safely
        const startTime = Date.now();
        try {
          engine.evaluateExpr(rule, context);
        } catch (error) {
          // Acceptable to fail with invalid pattern
        }
        const endTime = Date.now();

        // Should not take more than 1 second
        assert(endTime - startTime < 1000, `Pattern took too long: ${pattern}`);
      });
    });
  });

  describe('Memory Safety', () => {
    it('should handle large contexts safely', () => {
      const largeContext = {
        largeArray: new Array(10000).fill('data'),
        largeString: 'x'.repeat(100000),
        user: { name: 'test' },
      };

      const rule = { eq: ['user.name', 'test'] };

      // Should not crash or consume excessive memory
      const result = engine.evaluateExpr(rule, largeContext);
      assert.strictEqual(result.success, true);
    });

    it('should handle circular references gracefully', () => {
      const circularContext = { name: 'test' };
      circularContext.self = circularContext;

      const rule = { eq: ['name', 'test'] };

      // Should handle circular reference without crashing
      const result = engine.evaluateExpr(rule, circularContext);
      assert.strictEqual(result.success, true);
    });
  });
});

// Penetration testing helpers
function generateMaliciousPayloads() {
  return [
    // Prototype pollution attempts
    { __proto__: { isAdmin: true } },
    { 'constructor.prototype.isAdmin': true },
    { 'prototype.polluted': true },

    // Code injection attempts
    { eval: 'process.env' },
    { Function: 'return process' },
    { script: "<script>alert('xss')</script>" },

    // Path traversal attempts
    { '../../../etc/passwd': 'content' },
    { '..\\..\\..\\windows\\system32': 'content' },

    // Buffer overflow attempts
    { longString: 'A'.repeat(1000000) },
    { deepNesting: createDeeplyNested(100) },

    // SQL injection style (even though not SQL)
    { "'; DROP TABLE users; --": 'malicious' },
    { "1' OR '1'='1": 'malicious' },
  ];
}

function createDeeplyNested(depth) {
  let obj = { value: 'end' };
  for (let i = 0; i < depth; i++) {
    obj = { level: i, nested: obj };
  }
  return obj;
}

// Security regression tests
describe('Security Regression Tests', () => {
  const maliciousPayloads = generateMaliciousPayloads();

  maliciousPayloads.forEach((payload, index) => {
    it(`should handle malicious payload ${index + 1} safely`, () => {
      const rule = { eq: ['test', 'value'] };

      assert.doesNotThrow(() => {
        const result = engine.evaluateExpr(rule, payload);
        // Result can be true or false, but should not throw or crash
      });
    });
  });
});
```

### Automated Security Scanning

```javascript
class SecurityScanner {
  constructor(engine) {
    this.engine = engine;
    this.vulnerabilities = [];
  }

  scanRule(rule) {
    const issues = [];

    // Check for suspicious patterns
    const ruleStr = JSON.stringify(rule);
    const suspiciousPatterns = [
      /__proto__/,
      /constructor\.prototype/,
      /eval\(/,
      /Function\(/,
      /process\./,
      /require\(/,
      /import\(/,
    ];

    suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(ruleStr)) {
        issues.push({
          type: 'suspicious_pattern',
          severity: 'high',
          pattern: pattern.source,
          location: ruleStr.indexOf(pattern.source),
        });
      }
    });

    // Check rule complexity
    const complexity = this.calculateComplexity(rule);
    if (complexity.depth > 10) {
      issues.push({
        type: 'excessive_depth',
        severity: 'medium',
        depth: complexity.depth,
        maxRecommended: 10,
      });
    }

    if (complexity.operators > 100) {
      issues.push({
        type: 'excessive_operators',
        severity: 'medium',
        operators: complexity.operators,
        maxRecommended: 100,
      });
    }

    // Check for regex patterns
    const regexPatterns = this.extractRegexPatterns(rule);
    regexPatterns.forEach((pattern) => {
      const regexIssues = this.analyzeRegexPattern(pattern);
      issues.push(...regexIssues);
    });

    return issues;
  }

  scanContext(context) {
    const issues = [];

    // Check for sensitive data exposure
    const sensitiveFields = this.findSensitiveFields(context);
    if (sensitiveFields.length > 0) {
      issues.push({
        type: 'sensitive_data_exposure',
        severity: 'high',
        fields: sensitiveFields,
      });
    }

    // Check context size
    const contextSize = JSON.stringify(context).length;
    if (contextSize > 1000000) {
      // 1MB
      issues.push({
        type: 'large_context',
        severity: 'medium',
        size: contextSize,
        maxRecommended: 1000000,
      });
    }

    return issues;
  }

  calculateComplexity(rule, depth = 0) {
    if (typeof rule !== 'object' || rule === null) {
      return { depth, operators: 0 };
    }

    let maxDepth = depth;
    let totalOperators = Object.keys(rule).length;

    Object.values(rule).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            const childComplexity = this.calculateComplexity(item, depth + 1);
            maxDepth = Math.max(maxDepth, childComplexity.depth);
            totalOperators += childComplexity.operators;
          }
        });
      }
    });

    return { depth: maxDepth, operators: totalOperators };
  }

  extractRegexPatterns(rule) {
    const patterns = [];

    const extract = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;

      Object.entries(obj).forEach(([key, value]) => {
        if (key === 'regex' && Array.isArray(value) && value.length >= 2) {
          patterns.push(value[1]);
        } else if (typeof value === 'object') {
          extract(value);
        } else if (Array.isArray(value)) {
          value.forEach((item) => extract(item));
        }
      });
    };

    extract(rule);
    return patterns;
  }

  analyzeRegexPattern(pattern) {
    const issues = [];

    // Check for ReDoS vulnerabilities
    const redosPatterns = [
      /\(\w\+\)\+/, // (a+)+
      /\(\w\*\)\+/, // (a*)+
      /\(\w\+\)\*/, // (a+)*
      /\(\.\+\)\+/, // (.+)+
      /\(\.\*\)\+/, // (.*)+
    ];

    redosPatterns.forEach((redos) => {
      if (redos.test(pattern)) {
        issues.push({
          type: 'regex_redos_vulnerability',
          severity: 'critical',
          pattern: pattern,
          vulnerability: redos.source,
        });
      }
    });

    // Check pattern length
    if (pattern.length > 500) {
      issues.push({
        type: 'regex_too_long',
        severity: 'medium',
        pattern: pattern,
        length: pattern.length,
      });
    }

    return issues;
  }

  findSensitiveFields(obj, path = '', sensitiveFields = []) {
    if (typeof obj !== 'object' || obj === null) return sensitiveFields;

    const sensitivePatterns = [
      /password/i,
      /passwd/i,
      /secret/i,
      /key/i,
      /token/i,
      /ssn/i,
      /social.?security/i,
      /credit.?card/i,
      /api.?key/i,
      /private/i,
    ];

    Object.entries(obj).forEach(([key, value]) => {
      const fullPath = path ? `${path}.${key}` : key;

      // Check if field name matches sensitive patterns
      if (sensitivePatterns.some((pattern) => pattern.test(key))) {
        sensitiveFields.push({
          path: fullPath,
          field: key,
          type: typeof value,
        });
      }

      // Recursively check nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.findSensitiveFields(value, fullPath, sensitiveFields);
      }
    });

    return sensitiveFields;
  }

  generateSecurityReport() {
    return {
      timestamp: new Date(),
      vulnerabilities: this.vulnerabilities,
      summary: {
        total: this.vulnerabilities.length,
        critical: this.vulnerabilities.filter((v) => v.severity === 'critical').length,
        high: this.vulnerabilities.filter((v) => v.severity === 'high').length,
        medium: this.vulnerabilities.filter((v) => v.severity === 'medium').length,
        low: this.vulnerabilities.filter((v) => v.severity === 'low').length,
      },
    };
  }
}

// Usage
const scanner = new SecurityScanner(engine);

function secureEvaluateWithScanning(rule, context) {
  // Scan rule for security issues
  const ruleIssues = scanner.scanRule(rule);
  if (ruleIssues.some((issue) => issue.severity === 'critical')) {
    throw new Error('Rule contains critical security vulnerabilities');
  }

  // Scan context for sensitive data
  const contextIssues = scanner.scanContext(context);
  if (contextIssues.some((issue) => issue.severity === 'high')) {
    console.warn('Context contains sensitive data:', contextIssues);
  }

  return engine.evaluateExpr(rule, context);
}
```

<a name="production-security-checklist"></a>

## ✅ Production Security Checklist

### Pre-Deployment Security Checklist

- [ ] **Engine Configuration**
  - [ ] `allowPrototypeAccess` set to `false`
  - [ ] `strict` mode enabled for production
  - [ ] `enableDebug` disabled in production
  - [ ] Resource limits properly configured (`maxDepth`, `maxOperators`)
  - [ ] Cache size limits appropriate for environment

- [ ] **Input Validation**
  - [ ] Rule structure validation implemented
  - [ ] Context data sanitization in place
  - [ ] Regex pattern validation for user inputs
  - [ ] Field access whitelist defined
  - [ ] Input size limits enforced

- [ ] **Access Controls**
  - [ ] Role-based permissions implemented
  - [ ] Field-level access controls configured
  - [ ] Session management properly implemented
  - [ ] Authentication required for rule evaluation

- [ ] **Data Protection**
  - [ ] Sensitive data masking implemented
  - [ ] Data classification system in place
  - [ ] Encryption for data at rest and in transit
  - [ ] Secure handling of PII and sensitive information

- [ ] **Monitoring & Auditing**
  - [ ] Comprehensive audit logging implemented
  - [ ] Security event monitoring configured
  - [ ] Alert system for suspicious activities
  - [ ] Performance monitoring for DoS detection

- [ ] **Testing**
  - [ ] Security test suite implemented and passing
  - [ ] Penetration testing completed
  - [ ] Vulnerability scanning performed
  - [ ] Load testing with security scenarios

### Ongoing Security Practices

- [ ] **Regular Reviews**
  - [ ] Monthly security audit log reviews
  - [ ] Quarterly access permission reviews
  - [ ] Annual security architecture review
  - [ ] Regular dependency vulnerability scans

- [ ] **Incident Response**
  - [ ] Security incident response plan documented
  - [ ] Contact information for security team
  - [ ] Procedures for rule evaluation suspension
  - [ ] Data breach notification procedures

- [ ] **Updates & Maintenance**
  - [ ] Regular Rule Engine JS updates
  - [ ] Security patch management process
  - [ ] Regular backup and recovery testing
  - [ ] Documentation kept current

### Security Monitoring Dashboard

```javascript
class SecurityDashboard {
  constructor(auditSystem) {
    this.auditSystem = auditSystem;
  }

  generateDashboard() {
    const report = this.auditSystem.getSecurityReport(86400000); // Last 24 hours

    return {
      summary: {
        timestamp: new Date(),
        totalEvents: report.totalEvents,
        securityAlerts: report.securityEvents.length,
        failureRate: ((report.failedEvaluations / report.totalEvents) * 100).toFixed(2) + '%',
        uniqueUsers: report.uniqueUsers,
        uniqueIPs: report.uniqueIPs,
      },

      alerts: {
        critical: report.securityEvents.filter((e) => e.severity === 'critical'),
        high: report.securityEvents.filter((e) => e.severity === 'high'),
        medium: report.securityEvents.filter((e) => e.severity === 'medium'),
      },

      topThreats: {
        suspiciousIPs: this.getTopSuspiciousIPs(report),
        failedAttempts: this.getTopFailedAttempts(report),
        errorPatterns: report.topErrors,
      },

      recommendations: this.generateRecommendations(report),
    };
  }

  getTopSuspiciousIPs(report) {
    const ipCounts = {};

    report.securityEvents.forEach((event) => {
      if (event.ipAddress) {
        ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1;
      }
    });

    return Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, alertCount: count }));
  }

  getTopFailedAttempts(report) {
    const userCounts = {};

    report.securityEvents
      .filter((e) => e.action === 'access_denied' || e.action === 'rule_evaluation_error')
      .forEach((event) => {
        if (event.userId) {
          userCounts[event.userId] = (userCounts[event.userId] || 0) + 1;
        }
      });

    return Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, failureCount: count }));
  }

  generateRecommendations(report) {
    const recommendations = [];

    if (report.failedEvaluations / report.totalEvents > 0.1) {
      recommendations.push({
        type: 'high_failure_rate',
        message: 'High failure rate detected. Review rule validation logic.',
        priority: 'high',
      });
    }

    if (report.securityEvents.length > 50) {
      recommendations.push({
        type: 'many_security_events',
        message: 'High number of security events. Consider tightening access controls.',
        priority: 'medium',
      });
    }

    return recommendations;
  }
}

// Usage
const dashboard = new SecurityDashboard(auditSystem);
const securityOverview = dashboard.generateDashboard();
console.log('Security Dashboard:', securityOverview);
```

## 🎯 Security Best Practices Summary

### Top 10 Security Rules

1. **Never allow prototype access** - Always set `allowPrototypeAccess: false`
2. **Validate all inputs** - Rule structures, context data, and user inputs
3. **Implement comprehensive logging** - Track all security-relevant events
4. **Use role-based access control** - Restrict rule evaluation based on user roles
5. **Sanitize context data** - Remove sensitive information and dangerous properties
6. **Validate regex patterns** - Prevent ReDoS attacks from malicious patterns
7. **Implement rate limiting** - Prevent abuse and DoS attacks
8. **Monitor for suspicious activity** - Detect and alert on security threats
9. **Mask sensitive data** - Protect PII and confidential information
10. **Keep dependencies updated** - Regular updates and security patches

### Security Layers

Rule Engine JS implements multiple security layers:

1. **Input Layer** - Validation and sanitization of rules and context
2. **Engine Layer** - Built-in protections against common attacks
3. **Access Layer** - Role-based permissions and field-level security
4. **Audit Layer** - Comprehensive logging and monitoring
5. **Response Layer** - Incident detection and response

Remember: **Security is not optional**. Always implement these practices in production environments to protect your application and users' data.
