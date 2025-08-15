# Operators Reference

Complete reference for all built-in operators in Rule Engine JS.

## 📋 Operator Categories

- [Comparison Operators](#comparison-operators) - Compare values
- [Logical Operators](#logical-operators) - Combine conditions
- [String Operators](#string-operators) - Text manipulation
- [Array Operators](#array-operators) - Array membership
- [Special Operators](#special-operators) - Range and null checks
- [Validation Helpers](#validation-helpers) - Common patterns

## 🔍 Comparison Operators

### `eq` - Equal

Checks if two values are equal.

**Syntax:**

```javascript
{ "eq": [leftValue, rightValue, options?] }
rules.eq(leftValue, rightValue, options?)
```

**Parameters:**

- `leftValue`: First value to compare (can be path or literal)
- `rightValue`: Second value to compare (can be path or literal)
- `options`: Optional configuration object

**Options:**

- `strict`: Boolean - Use strict equality (`===`) vs loose (`==`)

**Examples:**

```javascript
// Basic equality
rules.eq('user.role', 'admin')
{ "eq": ["user.role", "admin"] }

// Dynamic field comparison
rules.eq('order.currency', 'user.preferredCurrency')
{ "eq": ["order.currency", "user.preferredCurrency"] }

// Strict mode
rules.eq('user.age', '25', { strict: true })  // false - string vs number
rules.eq('user.age', 25, { strict: true })    // true - both numbers

// Loose mode (default)
rules.eq('user.age', '25')  // true - '25' == 25
```

**Type Coercion:**

```javascript
const data = { stringNumber: '42', actualNumber: 42 };

// Loose mode allows coercion
rules.eq('stringNumber', 42); // true ('42' == 42)

// Strict mode prevents coercion
rules.eq('stringNumber', 42, { strict: true }); // false ('42' !== 42)
```

---

### `neq` - Not Equal

Checks if two values are not equal.

**Syntax:**

```javascript
{ "neq": [leftValue, rightValue, options?] }
rules.neq(leftValue, rightValue, options?)
```

**Examples:**

```javascript
// Basic inequality
rules.neq('user.status', 'deleted')
{ "neq": ["user.status", "deleted"] }

// Ensure fields are different
rules.neq('user.email', 'user.recoveryEmail')

// With strict mode
rules.neq('count', '0', { strict: true })  // true if count is number 0
```

---

### `gt` - Greater Than

Checks if left value is greater than right value.

**Syntax:**

```javascript
{ "gt": [leftValue, rightValue, options?] }
rules.gt(leftValue, rightValue, options?)
```

**Examples:**

```javascript
// Age validation
rules.gt('user.age', 17)  // Must be 18 or older
{ "gt": ["user.age", 17] }

// Dynamic comparison
rules.gt('order.total', 'user.budget')

// Decimal numbers
rules.gt('product.rating', 4.5)

// Date comparison (using timestamps)
rules.gt('user.lastLogin', Date.now() - 86400000)  // Active in last 24h
```

**Type Handling:**

```javascript
const data = {
  stringAge: '25',
  numericAge: 25,
  price: 99.99,
};

// Automatic coercion in loose mode
rules.gt('stringAge', 20); // true ('25' converted to 25)
rules.gt('price', 99); // true (99.99 > 99)

// Strict mode requires same types
rules.gt('stringAge', 20, { strict: true }); // Error - string vs number
```

---

### `gte` - Greater Than or Equal

Checks if left value is greater than or equal to right value.

**Syntax:**

```javascript
{ "gte": [leftValue, rightValue, options?] }
rules.gte(leftValue, rightValue, options?)
```

**Examples:**

```javascript
// Minimum age requirement
rules.gte('user.age', 18)
{ "gte": ["user.age", 18] }

// Minimum score requirement
rules.gte('exam.score', 'exam.passingScore')

// Inventory check
rules.gte('product.stock', 'order.quantity')

// Boundary conditions
rules.gte('user.credits', 0)  // Non-negative credits
```

---

### `lt` - Less Than

Checks if left value is less than right value.

**Syntax:**

```javascript
{ "lt": [leftValue, rightValue, options?] }
rules.lt(leftValue, rightValue, options?)
```

**Examples:**

```javascript
// Maximum limit check
rules.lt('order.total', 1000)
{ "lt": ["order.total", 1000] }

// Age limit
rules.lt('user.age', 65)

// Performance threshold
rules.lt('response.time', 'sla.maxResponseTime')

// Percentage validation
rules.lt('discount.percentage', 1.0)  // Less than 100%
```

---

### `lte` - Less Than or Equal

Checks if left value is less than or equal to right value.

**Syntax:**

```javascript
{ "lte": [leftValue, rightValue, options?] }
rules.lte(leftValue, rightValue, options?)
```

**Examples:**

```javascript
// Budget constraint
rules.lte('project.cost', 'project.budget')
{ "lte": ["project.cost", "project.budget"] }

// Capacity check
rules.lte('event.attendees', 'venue.capacity')

// Rating validation
rules.lte('review.rating', 5)

// Time limit
rules.lte('task.duration', 'task.estimatedTime')
```

## 🧠 Logical Operators

### `and` - Logical AND

All conditions must be true for the rule to pass.

**Syntax:**

```javascript
{ "and": [condition1, condition2, ...] }
rules.and(condition1, condition2, ...)
```

**Examples:**

```javascript
// User eligibility
rules.and(
  rules.gte('user.age', 18),
  rules.eq('user.status', 'active'),
  rules.isTrue('user.verified')
)

{
  "and": [
    { "gte": ["user.age", 18] },
    { "eq": ["user.status", "active"] },
    { "eq": ["user.verified", true] }
  ]
}

// Complex business logic
rules.and(
  // Basic user validation
  rules.validation.required('user.email'),
  rules.validation.email('user.email'),

  // Account status
  rules.eq('user.accountStatus', 'active'),

  // Permission check
  rules.or(
    rules.eq('user.role', 'admin'),
    rules.in('write', 'user.permissions')
  ),

  // Rate limiting
  rules.lt('user.requestsToday', 'limits.dailyMax')
)
```

**Short-Circuit Evaluation:**
The `and` operator stops at the first `false` condition, improving performance:

```javascript
// If user.active is false, remaining conditions aren't evaluated
rules.and(
  rules.isTrue('user.active'), // Checked first
  rules.validation.email('email'), // Skipped if user not active
  rules.regex('phone', pattern) // Skipped if user not active
);
```

---

### `or` - Logical OR

At least one condition must be true for the rule to pass.

**Syntax:**

```javascript
{ "or": [condition1, condition2, ...] }
rules.or(condition1, condition2, ...)
```

**Examples:**

```javascript
// Multiple access methods
rules.or(
  rules.eq('user.role', 'admin'),
  rules.eq('user.role', 'moderator'),
  rules.and(rules.eq('user.role', 'user'), rules.in('premium', 'user.subscriptions'))
);

// Alternative validation methods
rules.or(
  rules.validation.email('contact.email'),
  rules.validation.required('contact.phone'),
  rules.validation.required('contact.address')
);

// Flexible discount eligibility
rules.or(
  rules.gte('order.total', 100), // Large order
  rules.eq('customer.type', 'vip'), // VIP customer
  rules.gte('customer.loyaltyPoints', 500), // Loyal customer
  rules.isTrue('customer.firstTime') // First-time customer
);
```

**Early Success:**
The `or` operator stops at the first `true` condition:

```javascript
// If user is admin, other conditions aren't checked
rules.or(
  rules.eq('user.role', 'admin'), // If true, stop here
  rules.complexValidation('user'), // Skipped if admin
  rules.expensiveApiCall('user') // Skipped if admin
);
```

---

### `not` - Logical NOT

Negates the result of a condition.

**Syntax:**

```javascript
{ "not": [condition] }
rules.not(condition)
```

**Examples:**

```javascript
// User is not banned
rules.not(rules.eq('user.status', 'banned'))
{ "not": [{ "eq": ["user.status", "banned"] }] }

// Account is not expired
rules.not(rules.lt('account.expiryDate', Date.now()))

// Complex negation
rules.not(
  rules.or(
    rules.eq('user.status', 'banned'),
    rules.eq('user.status', 'suspended'),
    rules.eq('user.status', 'deleted')
  )
)

// Equivalent positive form (often more readable)
rules.in('user.status', ['active', 'pending', 'verified'])
```

**Double Negation:**

```javascript
// Avoid double negation - it's confusing
rules.not(rules.not(rules.eq('user.active', true))); // ❌ Confusing

// Better: Use positive logic
rules.eq('user.active', true); // ✅ Clear
```

## 📝 String Operators

### `contains` - String Contains

Checks if a string contains a substring.

**Syntax:**

```javascript
{ "contains": [string, substring, options?] }
rules.contains(string, substring, options?)
```

**Examples:**

```javascript
// Basic substring search
rules.contains('user.bio', 'engineer')
{ "contains": ["user.bio", "engineer"] }

// Email domain check
rules.contains('user.email', '@company.com')

// Search in dynamic fields
rules.contains('product.description', 'search.keyword')

// Multiple keywords (using OR)
rules.or(
  rules.contains('content', 'javascript'),
  rules.contains('content', 'typescript'),
  rules.contains('content', 'react')
)
```

**Case Sensitivity:**

```javascript
const data = { title: 'JavaScript Tutorial' };

rules.contains('title', 'JavaScript'); // true
rules.contains('title', 'javascript'); // false - case sensitive
rules.contains('title', 'SCRIPT'); // false - case sensitive

// For case-insensitive search, use regex:
rules.regex('title', 'javascript', { flags: 'i' }); // true
```

**Special Characters:**

```javascript
// Searching for special characters
rules.contains('text', '@'); // Find @ symbol
rules.contains('filename', '.pdf'); // Find file extension
rules.contains('code', 'function()'); // Find function calls
```

---

### `startsWith` - String Starts With

Checks if a string starts with a specific substring.

**Syntax:**

```javascript
{ "startsWith": [string, prefix, options?] }
rules.startsWith(string, prefix, options?)
```

**Examples:**

```javascript
// URL protocol check
rules.startsWith('website.url', 'https://')
{ "startsWith": ["website.url", "https://"] }

// File type validation
rules.startsWith('upload.filename', 'IMG_')

// Naming conventions
rules.startsWith('api.endpoint', '/api/v1/')

// Dynamic prefix
rules.startsWith('document.id', 'user.departmentCode')

// Phone number format
rules.startsWith('contact.phone', '+1')  // US numbers
```

**Empty String Edge Case:**

```javascript
const data = { value: 'hello', empty: '' };

rules.startsWith('value', ''); // true - every string starts with empty string
rules.startsWith('empty', ''); // true
rules.startsWith('empty', 'test'); // false
```

---

### `endsWith` - String Ends With

Checks if a string ends with a specific substring.

**Syntax:**

```javascript
{ "endsWith": [string, suffix, options?] }
rules.endsWith(string, suffix, options?)
```

**Examples:**

```javascript
// File extension validation
rules.endsWith('file.name', '.pdf')
{ "endsWith": ["file.name", ".pdf"] }

// Email domain validation
rules.endsWith('user.email', '.edu')

// URL validation
rules.endsWith('api.callback', '/webhook')

// Multiple valid extensions
rules.or(
  rules.endsWith('upload.file', '.jpg'),
  rules.endsWith('upload.file', '.png'),
  rules.endsWith('upload.file', '.gif')
)

// Dynamic suffix
rules.endsWith('report.filename', 'report.expectedSuffix')
```

---

### `regex` - Regular Expression

Matches a string against a regular expression pattern.

**Syntax:**

```javascript
{ "regex": [string, pattern, options?] }
rules.regex(string, pattern, options?)
```

**Options:**

- `flags`: String - Regex flags (`'g'`, `'i'`, `'m'`, `'s'`, `'u'`, `'y'`)

**Common Patterns:**

```javascript
// Email validation
rules.regex('email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$')

// Phone number validation (US format)
rules.regex('phone', '^\\+?1?[2-9]\\d{2}[2-9]\\d{2}\\d{4}$')

// Password strength (8+ chars, letter + number)
rules.regex('password', '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$')

// Credit card number (basic format)
rules.regex('creditCard', '^\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}$')

// URL validation
rules.regex('url', '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b')

// IP address validation
rules.regex('ip', '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))
```

**Flags Usage:**

```javascript
// Case-insensitive matching
rules.regex('name', 'john', { flags: 'i' }); // Matches 'John', 'JOHN', 'john'

// Global matching (for validation, usually not needed)
rules.regex('text', 'pattern', { flags: 'g' });

// Multiline matching
rules.regex('content', '^Important:', { flags: 'm' }); // Match at start of any line

// Combined flags
rules.regex('text', 'pattern', { flags: 'gi' }); // Global + case-insensitive
```

**Dynamic Patterns:**

```javascript
// Pattern from context
rules.regex('user.input', 'validation.pattern')

// Building patterns
const phonePatterns = {
  US: '^\\+?1[2-9]\\d{2}[2-9]\\d{2}\\d{4},
  UK: '^\\+?44[1-9]\\d{8,9},
  FR: '^\\+?33[1-9]\\d{8}
};

rules.regex('phone', phonePatterns.US)
```

**Common Validation Patterns:**

```javascript
// Social Security Number
rules.regex('ssn', '^\\d{3}-\\d{2}-\\d{4})

// ZIP Code (US)
rules.regex('zipCode', '^\\d{5}(-\\d{4})?)

// Date (YYYY-MM-DD)
rules.regex('date', '^\\d{4}-\\d{2}-\\d{2})

// Time (HH:MM or HH:MM:SS)
rules.regex('time', '^\\d{2}:\\d{2}(:\\d{2})?)

// Hexadecimal color
rules.regex('color', '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}))

// Username (alphanumeric + underscore, 3-20 chars)
rules.regex('username', '^[a-zA-Z0-9_]{3,20})
```

## 📚 Array Operators

### `in` - Value in Array

Checks if a value exists in an array.

**Syntax:**

```javascript
{ "in": [value, array, options?] }
rules.in(value, array, options?)
```

**Examples:**

```javascript
// Static array membership
rules.in('user.role', ['admin', 'moderator', 'user'])
{ "in": ["user.role", ["admin", "moderator", "user"]] }

// Dynamic array from context
rules.in('permission', 'user.permissions')

// Check if value is in user's tags
rules.in('premium', 'user.tags')

// Multiple value checks
rules.and(
  rules.in('read', 'user.permissions'),
  rules.in('write', 'user.permissions')
)

// Complex array structures
const data = {
  user: { skills: ['javascript', 'python', 'react'] },
  job: { requiredSkills: ['javascript', 'react'] }
};

rules.in('javascript', 'user.skills')  // true
```

**Type Coercion:**

```javascript
const data = {
  numbers: [1, 2, 3],
  strings: ['1', '2', '3'],
  mixed: [1, '2', 3],
};

// Loose mode (default) - allows coercion
rules.in('1', 'numbers'); // true ('1' == 1)
rules.in(2, 'strings'); // true (2 == '2')

// Strict mode - no coercion
rules.in('1', 'numbers', { strict: true }); // false ('1' !== 1)
rules.in(2, 'strings', { strict: true }); // false (2 !== '2')
```

**Complex Data Structures:**

```javascript
const data = {
  users: [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
  ],
  userIds: [1, 2, 3, 4],
};

// Simple array membership
rules.in(1, 'userIds'); // true

// For object arrays, you'd need to extract IDs first
// or use custom operators for complex object matching
```

---

### `notIn` - Value Not in Array

Checks if a value does NOT exist in an array.

**Syntax:**

```javascript
{ "notIn": [value, array, options?] }
rules.notIn(value, array, options?)
```

**Examples:**

```javascript
// Exclude banned users
rules.notIn('user.status', ['banned', 'suspended', 'deleted'])
{ "notIn": ["user.status", ["banned", "suspended", "deleted"]] }

// Permission restrictions
rules.notIn('admin', 'user.permissions')

// Content filtering
rules.notIn('adult', 'content.categories')

// Geographic restrictions
rules.notIn('user.country', 'restrictions.blockedCountries')

// Combined with positive checks
rules.and(
  rules.in('user.role', ['user', 'premium', 'admin']),      // Must have valid role
  rules.notIn('user.status', ['banned', 'suspended'])       // Must not be restricted
)
```

**Whitelist vs Blacklist Pattern:**

```javascript
// Whitelist approach (more secure)
rules.in('user.role', ['user', 'admin', 'moderator']);

// Blacklist approach (less secure, easy to miss cases)
rules.notIn('user.role', ['banned', 'guest']);

// Combined approach (most robust)
rules.and(
  rules.in('user.role', ['user', 'admin', 'moderator']), // Whitelist valid roles
  rules.notIn('user.status', ['banned', 'suspended']) // Blacklist bad statuses
);
```

## 🔧 Special Operators

### `between` - Range Check

Checks if a value falls within a specified range (inclusive).

**Syntax:**

```javascript
{ "between": [value, [min, max], options?] }
rules.between(value, [min, max], options?)
```

**Examples:**

```javascript
// Age range
rules.between('user.age', [18, 65])
{ "between": ["user.age", [18, 65]] }

// Price range
rules.between('product.price', [10.99, 99.99])

// Score validation
rules.between('exam.score', [0, 100])

// Dynamic range from context
rules.between('user.score', 'game.scoreRange')
// where context.game.scoreRange = [100, 1000]

// Date range (using timestamps)
const lastWeek = Date.now() - (7 * 24 * 60 * 60 * 1000);
const now = Date.now();
rules.between('event.timestamp', [lastWeek, now])
```

**Dynamic Range Boundaries:**

```javascript
const context = {
  user: { age: 25, income: 50000 },
  loan: { amount: 100000 },
  criteria: {
    minAge: 18,
    maxAge: 70,
    minIncomeMultiplier: 2, // loan amount can't exceed 2x income
    maxIncomeMultiplier: 5, // loan amount can't exceed 5x income
  },
};

// Age range with dynamic boundaries
rules.between('user.age', ['criteria.minAge', 'criteria.maxAge']);

// Complex calculated range
const enhancedContext = {
  ...context,
  calculated: {
    minLoanAmount: context.user.income * context.criteria.minIncomeMultiplier,
    maxLoanAmount: context.user.income * context.criteria.maxIncomeMultiplier,
  },
};

rules.between('loan.amount', ['calculated.minLoanAmount', 'calculated.maxLoanAmount']);
```

**Edge Cases:**

```javascript
// Single value range (equality check)
rules.between('status.code', [200, 200]); // Equivalent to eq(200)

// Boundary values (inclusive)
rules.between('rating', [1, 5]); // 1 and 5 are valid

// Decimal ranges
rules.between('percentage', [0.0, 1.0]);
rules.between('rating', [1.0, 5.0]);
```

---

### `isNull` - Null Check

Checks if a value is null, undefined, or path doesn't exist.

**Syntax:**

```javascript
{ "isNull": [path] }
rules.isNull(path)
```

**Examples:**

```javascript
// Check if field is null
rules.isNull('user.deletedAt')
{ "isNull": ["user.deletedAt"] }

// Optional field validation
rules.isNull('user.middleName')

// Check for missing nested properties
rules.isNull('user.profile.avatar')

// Conditional logic based on null values
rules.or(
  rules.isNull('user.preferences'),
  rules.eq('user.preferences.theme', 'default')
)
```

**What Counts as Null:**

```javascript
const testData = [
  { value: null }, // isNull = true
  { value: undefined }, // isNull = true
  {}, // isNull = true (missing property)
  { value: '' }, // isNull = false (empty string is not null)
  { value: 0 }, // isNull = false (zero is not null)
  { value: false }, // isNull = false (false is not null)
  { value: [] }, // isNull = false (empty array is not null)
  { value: {} }, // isNull = false (empty object is not null)
];

testData.forEach((data, index) => {
  const result = engine.evaluateExpr(rules.isNull('value'), data);
  console.log(`Test ${index}: ${result.success}`);
});
```

**Nested Path Handling:**

```javascript
const data = {
  user: {
    profile: null,
    settings: {
      theme: 'dark',
    },
  },
};

rules.isNull('user.profile'); // true
rules.isNull('user.profile.name'); // true (profile is null)
rules.isNull('user.settings'); // false
rules.isNull('user.settings.theme'); // false
rules.isNull('user.settings.missing'); // true (property doesn't exist)
rules.isNull('user.nonexistent.path'); // true (path doesn't exist)
```

---

### `isNotNull` - Not Null Check

Checks if a value is not null, not undefined, and path exists.

**Syntax:**

```javascript
{ "isNotNull": [path] }
rules.isNotNull(path)
```

**Examples:**

```javascript
// Ensure required field exists
rules.isNotNull('user.email')
{ "isNotNull": ["user.email"] }

// Check if optional field is provided
rules.isNotNull('order.specialInstructions')

// Validate nested object exists
rules.isNotNull('user.profile.address')

// Combined validation
rules.and(
  rules.isNotNull('user.email'),
  rules.validation.email('user.email')
)
```

**Practical Usage Patterns:**

```javascript
// Safe navigation pattern
rules.and(rules.isNotNull('user.profile'), rules.eq('user.profile.status', 'verified'));

// Optional field processing
rules.or(
  rules.isNull('user.preferences'), // No preferences set
  rules.and(rules.isNotNull('user.preferences'), rules.eq('user.preferences.notifications', true))
);

// Required vs optional validation
const userValidation = rules.and(
  // Required fields
  rules.isNotNull('user.email'),
  rules.isNotNull('user.firstName'),
  rules.isNotNull('user.lastName'),

  // Optional fields (only validate if present)
  rules.or(rules.isNull('user.phone'), rules.regex('user.phone', phonePattern)),

  rules.or(rules.isNull('user.website'), rules.regex('user.website', urlPattern))
);
```

## ✅ Validation Helpers

The validation helpers are pre-built rule combinations for common validation scenarios.

### `validation.email` - Email Validation

Validates email address format using regex pattern.

**Syntax:**

```javascript
rules.validation.email(fieldPath);
```

**Examples:**

```javascript
// Basic email validation
rules.validation.email('user.email');

// Multiple email validation
rules.and(
  rules.validation.email('user.primaryEmail'),
  rules.validation.email('user.recoveryEmail')
);

// Optional email validation
rules.or(rules.isNull('user.email'), rules.validation.email('user.email'));
```

**Pattern Used:**

```javascript
// Internal pattern (equivalent to):
rules.regex('email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,})
```

---

### `validation.required` - Required Field

Ensures field is not null, undefined, or empty string.

**Syntax:**

```javascript
rules.validation.required(fieldPath);
```

**Examples:**

```javascript
// Required field validation
rules.validation.required('user.name');

// Multiple required fields
rules.and(
  rules.validation.required('firstName'),
  rules.validation.required('lastName'),
  rules.validation.required('email')
);
```

**Equivalent Logic:**

```javascript
// Internal implementation (equivalent to):
rules.and(rules.isNotNull('fieldPath'), rules.neq('fieldPath', ''));
```

**What's Considered Empty:**

```javascript
const testData = [
  { name: 'John' }, // required = true
  { name: '' }, // required = false (empty string)
  { name: null }, // required = false (null)
  { name: undefined }, // required = false (undefined)
  {}, // required = false (missing)
  { name: 0 }, // required = true (zero is valid)
  { name: false }, // required = true (false is valid)
  { name: [] }, // required = true (empty array is valid)
];
```

---

### `validation.minAge` / `validation.maxAge` - Age Validation

Validates minimum or maximum age requirements.

**Syntax:**

```javascript
rules.validation.minAge(fieldPath, minimumAge);
rules.validation.maxAge(fieldPath, maximumAge);
```

**Examples:**

```javascript
// Minimum age requirement
rules.validation.minAge('user.age', 18);

// Maximum age limit
rules.validation.maxAge('user.age', 65);

// Combined age validation
rules.and(rules.validation.minAge('user.age', 18), rules.validation.maxAge('user.age', 120));
```

**Equivalent Logic:**

```javascript
// Internal implementation:
rules.validation.minAge = (path, minAge) => rules.gte(path, minAge);
rules.validation.maxAge = (path, maxAge) => rules.lte(path, maxAge);
```

---

### `validation.ageRange` - Age Range Validation

Validates age within a specific range.

**Syntax:**

```javascript
rules.validation.ageRange(fieldPath, minimumAge, maximumAge);
```

**Examples:**

```javascript
// Working age range
rules.validation.ageRange('user.age', 18, 65);

// School age range
rules.validation.ageRange('student.age', 5, 18);

// Senior citizen range
rules.validation.ageRange('user.age', 65, 120);
```

**Equivalent Logic:**

```javascript
// Internal implementation:
rules.validation.ageRange = (path, minAge, maxAge) => rules.between(path, [minAge, maxAge]);
```

---

### `validation.oneOf` - Choice Validation

Validates that a value is one of the allowed options.

**Syntax:**

```javascript
rules.validation.oneOf(fieldPath, allowedValues);
```

**Examples:**

```javascript
// Status validation
rules.validation.oneOf('user.status', ['active', 'inactive', 'pending']);

// Role validation
rules.validation.oneOf('user.role', ['user', 'admin', 'moderator']);

// Country validation
rules.validation.oneOf('user.country', ['US', 'CA', 'UK', 'DE', 'FR']);

// Gender validation (optional)
rules.or(
  rules.isNull('user.gender'),
  rules.validation.oneOf('user.gender', ['male', 'female', 'other', 'prefer-not-to-say'])
);
```

**Equivalent Logic:**

```javascript
// Internal implementation:
rules.validation.oneOf = (path, values) => rules.in(path, values);
```

## 🎯 Operator Combinations

### Common Patterns

**User Eligibility:**

```javascript
const userEligibility = rules.and(
  rules.validation.required('user.email'),
  rules.validation.email('user.email'),
  rules.validation.ageRange('user.age', 18, 65),
  rules.validation.oneOf('user.status', ['active', 'verified']),
  rules.notIn('user.role', ['banned', 'suspended'])
);
```

**Form Validation:**

```javascript
const formValidation = rules.and(
  // Required fields
  rules.validation.required('firstName'),
  rules.validation.required('lastName'),
  rules.validation.required('email'),

  // Format validation
  rules.validation.email('email'),
  rules.regex('phone', phonePattern),

  // Password requirements
  rules.and(
    rules.gte('password.length', 8),
    rules.regex('password', '(?=.*[A-Za-z])'), // Letter
    rules.regex('password', '(?=.*\\d)'), // Number
    rules.regex('password', '(?=.*[@$!%*?&])') // Special char
  ),

  // Confirmation
  rules.field.equals('password', 'confirmPassword'),
  rules.isTrue('agreedToTerms')
);
```

**Business Rules:**

```javascript
const discountEligibility = rules.or(
  // VIP customers
  rules.and(rules.eq('customer.tier', 'vip'), rules.gte('order.total', 100)),

  // High loyalty points
  rules.gte('customer.loyaltyPoints', 1000),

  // Bulk orders
  rules.and(rules.gte('order.quantity', 10), rules.in('order.category', ['electronics', 'books'])),

  // First-time customers
  rules.and(rules.isTrue('customer.firstTime'), rules.gte('order.total', 50)),

  // Seasonal promotion
  rules.and(
    rules.between('currentDate', 'promotion.dateRange'),
    rules.in('order.category', 'promotion.categories')
  )
);
```

## 🔍 Performance Considerations

### Operator Speed Ranking (Fastest to Slowest)

1. **Boolean operators**: `eq` with boolean values
2. **Null checks**: `isNull`, `isNotNull`
3. **Numeric comparisons**: `gt`, `gte`, `lt`, `lte`, `between`
4. **Array membership**: `in`, `notIn` (depends on array size)
5. **String operations**: `contains`, `startsWith`, `endsWith`
6. **Regular expressions**: `regex` (depends on pattern complexity)
7. **Logical operators**: `and`, `or`, `not` (depends on sub-expressions)

### Optimization Tips

**Order Operations by Speed:**

```javascript
// ✅ Optimized: Fast checks first
const optimizedRule = rules.and(
  rules.eq('user.active', true), // Fastest
  rules.gte('user.age', 18), // Fast
  rules.in('user.role', ['user', 'admin']), // Medium
  rules.contains('user.email', '@company'), // Slower
  rules.validation.email('user.email') // Slowest (regex)
);

// ❌ Unoptimized: Slow checks first
const unoptimizedRule = rules.and(
  rules.validation.email('user.email'), // Slowest first
  rules.contains('user.email', '@company'), // Slower
  rules.in('user.role', ['user', 'admin']), // Medium
  rules.gte('user.age', 18), // Fast
  rules.eq('user.active', true) // Fastest last
);
```

**Use Specific Operators:**

```javascript
// ✅ Faster: Direct equality
rules.eq('status', 'active')

// ❌ Slower: Regex for simple equality
rules.regex('status', '^active)

// ✅ Faster: Array membership
rules.in('role', ['admin', 'user'])

// ❌ Slower: Multiple OR conditions
rules.or(
  rules.eq('role', 'admin'),
  rules.eq('role', 'user')
)
```

---

This comprehensive operator reference provides everything you need to build powerful, efficient rules with Rule Engine JS. Each operator is designed to handle common use cases while roviding the flexibility to build complex business logic.
