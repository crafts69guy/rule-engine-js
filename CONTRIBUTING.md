# Contributing Guide - Rule Engine JS

Welcome to Rule Engine JS! We're excited that you're interested in contributing. This guide will help you get started and ensure your contributions align with our project standards.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Types](#contribution-types)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Security Contributions](#security-contributions)
- [Performance Contributions](#performance-contributions)
- [Release Process](#release-process)
- [Community Guidelines](#community-guidelines)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18+ installed
- **npm** 8+ or **yarn** 1.22+
- **Git** for version control
- A **GitHub account**
- Basic knowledge of JavaScript/ES6+
- Familiarity with testing frameworks (Jest)

### First-Time Contributors

If you're new to contributing to open source:

1. **Start small** - Look for issues labeled `good first issue` or `help wanted`
2. **Read the documentation** - Familiarize yourself with the project
3. **Join discussions** - Participate in GitHub Discussions or issues
4. **Ask questions** - Don't hesitate to ask for clarification

### Finding Ways to Contribute

- **Browse open issues** - Look for bugs, feature requests, or improvements
- **Check the roadmap** - See planned features that need implementation
- **Review documentation** - Help improve clarity and completeness
- **Test the library** - Report bugs or edge cases you discover
- **Share use cases** - Contribute real-world examples

## 🛠️ Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/rule-engine-js.git
cd rule-engine-js

# Add the original repository as upstream
git remote add upstream https://github.com/ORIGINAL_OWNER/rule-engine-js.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Or using yarn
yarn install
```

### 3. Verify Setup

```bash
# Run all tests to ensure everything works
npm test

# Run linting
npm run lint

# Build the project
npm run build
```

### 4. Development Scripts

```bash
# Development mode with watch
npm run dev

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- operators.test.js

# Generate coverage report
npm run test:coverage

# Lint and fix code
npm run lint:fix

# Format code
npm run format

# Type checking (if using TypeScript)
npm run type-check
```

### Project Structure

```
rule-engine-js/
├── src/                          # Source code
│   ├── core/                     # Core engine logic
│   │   ├── RuleEngine.js        # Main engine class
│   │   └── PathResolver.js      # Path resolution logic
│   ├── operators/               # Operator implementations
│   │   ├── index.js            # Operator registry
│   │   ├── comparison.js       # Comparison operators
│   │   ├── logical.js          # Logical operators
│   │   └── ...                 # Other operator types
│   ├── helpers/                # Rule building helpers
│   ├── utils/                  # Utility functions
│   └── index.js               # Main entry point
├── tests/                      # Test files
│   ├── unit/                  # Unit tests
│   ├── integration/          # Integration tests
│   └── performance/         # Performance tests
├── docs/                     # Documentation
├── examples/                # Usage examples
├── benchmarks/             # Performance benchmarks
└── tools/                 # Development tools
```

## 🎯 Contribution Types

### 🐛 Bug Fixes

**Before submitting a bug fix:**

1. **Search existing issues** - Check if the bug is already reported
2. **Create a test case** - Reproduce the bug with a minimal example
3. **Identify the root cause** - Understand why the bug occurs
4. **Propose a solution** - Consider the impact on existing functionality

**Bug fix process:**

```bash
# Create a feature branch
git checkout -b fix/issue-description

# Write a failing test that reproduces the bug
# Fix the bug
# Ensure all tests pass
# Update documentation if needed
```

### ✨ New Features

**Before implementing a new feature:**

1. **Discuss the feature** - Open an issue or discussion first
2. **Review the API design** - Ensure consistency with existing patterns
3. **Consider backward compatibility** - Avoid breaking changes
4. **Plan the implementation** - Break down into smaller tasks

**Feature development process:**

```bash
# Create a feature branch
git checkout -b feature/feature-name

# Implement the feature incrementally
# Add comprehensive tests
# Update documentation
# Add examples
```

### 📚 Documentation

**Documentation improvements:**

- **Fix typos and grammar**
- **Improve code examples**
- **Add missing documentation**
- **Clarify confusing sections**
- **Update outdated information**

### 🔧 Operators

**Adding new operators:**

```javascript
// Example: Adding a new operator
// src/operators/custom.js

import { BaseOperator } from './base/BaseOperator.js';
import { OPERATOR_NAMES } from '../constants/operators.js';

export class CustomOperators extends BaseOperator {
  register(engine) {
    engine.registerOperator('customOp', this.createCustomOperator().bind(this));
  }

  createCustomOperator() {
    return (args, context) => {
      // Validate arguments
      this.validateArgs(args, 2, 'customOp');

      // Implementation logic
      const [left, right] = args;
      const { left: resolvedLeft, right: resolvedRight } = this.resolveOperands(
        context,
        left,
        right,
        'literal'
      );

      // Your custom logic here
      return resolvedLeft === resolvedRight;
    };
  }
}
```

**Operator requirements:**

- **Extend BaseOperator** - Use the base class for consistency
- **Validate inputs** - Always validate arguments and types
- **Handle edge cases** - Consider null, undefined, and invalid inputs
- **Support dynamic fields** - Allow field-to-field comparisons
- **Add comprehensive tests** - Cover all scenarios
- **Document thoroughly** - Include examples and use cases

## 🔄 Development Workflow

### Branch Strategy

We use **GitHub Flow** with these branch naming conventions:

```bash
# Feature branches
feature/operator-between
feature/performance-monitoring
feature/security-audit

# Bug fix branches
fix/null-handling
fix/cache-memory-leak
fix/regex-vulnerability

# Documentation branches
docs/contributing-guide
docs/api-reference
docs/performance-guide

# Hotfix branches (for critical production issues)
hotfix/security-patch
hotfix/critical-bug
```

### Commit Message Format

We follow the **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks, dependencies, etc.
- `security`: Security-related changes

**Examples:**

```bash
feat(operators): add between operator for range checking

Implements the between operator that checks if a value falls
within a specified range (inclusive).

Closes #123

fix(core): resolve memory leak in path cache

The path cache was not properly cleaning up old entries,
causing memory usage to grow over time.

docs(security): add security best practices guide

perf(cache): optimize expression cache hit rate

test(operators): add comprehensive regex operator tests

security(core): prevent prototype pollution in path resolution
```

### Development Process

1. **Sync with upstream**:

   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

2. **Create feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes incrementally**:
   - Write tests first (TDD approach recommended)
   - Implement the feature/fix
   - Ensure all tests pass
   - Update documentation

4. **Commit frequently** with descriptive messages

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

## 📝 Code Standards

### JavaScript Style Guide

We follow **ESLint** and **Prettier** configurations:

```javascript
// ✅ Good Examples

// Use descriptive variable names
const userValidationRule = rules.and(
  rules.validation.required('user.email'),
  rules.validation.email('user.email')
);

// Prefer const/let over var
const engine = createRuleEngine();
let result = null;

// Use template literals for string interpolation
const errorMessage = `Operator '${operatorName}' failed validation`;

// Use destructuring when appropriate
const { success, error, details } = result;

// Use arrow functions for short functions
const isValid = (rule) => rule && typeof rule === 'object';

// Use meaningful function names
function validateRuleStructure(rule) {
  // Implementation
}

// Add JSDoc comments for public APIs
/**
 * Creates a new rule engine instance
 * @param {Object} config - Configuration options
 * @param {boolean} config.strict - Enable strict mode
 * @param {number} config.maxDepth - Maximum rule nesting depth
 * @returns {RuleEngine} Configured rule engine instance
 */
function createRuleEngine(config = {}) {
  // Implementation
}
```

```javascript
// ❌ Avoid These Patterns

// Don't use var
var engine = createRuleEngine(); // Use const/let

// Don't use unclear variable names
const r = rules.eq('n', 'John'); // Be descriptive

// Don't concatenate strings when template literals work better
const msg = 'Error in ' + operatorName + ' operator'; // Use template literals

// Don't create overly complex nested structures
const complexRule = rules.and(rules.or(rules.and(...), rules.not(...)), ...); // Break it down

// Don't ignore error handling
const result = riskyOperation(); // Always handle potential errors

// Don't write functions without documentation (for public APIs)
function importantFunction(param) { // Add JSDoc comments
  // Implementation
}
```

### Error Handling

```javascript
// ✅ Proper error handling

// Use specific error types
throw new OperatorError('Invalid arguments for GT operator', 'gt', {
  args,
  expectedCount: 2,
  actualCount: args.length,
});

// Validate inputs early
function evaluateRule(rule, context) {
  if (!rule || typeof rule !== 'object') {
    throw new ValidationError('Rule must be a non-null object');
  }

  if (!context) {
    throw new ValidationError('Context is required');
  }

  // Proceed with evaluation
}

// Provide helpful error messages
function validateOperatorArguments(operator, args) {
  if (!Array.isArray(args)) {
    throw new OperatorError(
      `${operator} operator requires array arguments, got ${typeof args}`,
      operator,
      { args, type: typeof args }
    );
  }
}

// Handle async operations properly
async function performAsyncValidation(data) {
  try {
    const result = await externalValidationService(data);
    return result;
  } catch (error) {
    throw new ValidationError(`External validation failed: ${error.message}`, {
      originalError: error,
    });
  }
}
```

### Performance Considerations

```javascript
// ✅ Performance best practices

// Cache expensive computations
const compiledPatterns = new Map();

function getCompiledRegex(pattern, flags) {
  const key = `${pattern}:::${flags}`;

  if (!compiledPatterns.has(key)) {
    compiledPatterns.set(key, new RegExp(pattern, flags));
  }

  return compiledPatterns.get(key);
}

// Use efficient data structures
const allowedOperators = new Set(['eq', 'neq', 'gt', 'gte']); // O(1) lookup
const operatorPermissions = new Map(); // O(1) lookup

// Avoid unnecessary work in loops
function processRules(rules) {
  const validRules = [];

  // Pre-filter once instead of checking in multiple places
  for (const rule of rules) {
    if (isValidRule(rule)) {
      validRules.push(rule);
    }
  }

  return validRules;
}

// Use early returns to avoid nested conditions
function validateInput(input) {
  if (!input) {
    return { valid: false, error: 'Input required' };
  }

  if (typeof input !== 'object') {
    return { valid: false, error: 'Input must be object' };
  }

  // Main validation logic
  return { valid: true };
}
```

## 🧪 Testing Guidelines

### Test Structure

We use **Jest** for testing with the following patterns:

```javascript
// tests/unit/operators/comparison.test.js

describe('Comparison Operators', () => {
  let engine;

  beforeEach(() => {
    engine = createRuleEngine();
  });

  describe('EQ Operator', () => {
    it('should handle exact equality', () => {
      const rule = { eq: ['user.name', 'John Doe'] };
      const context = { user: { name: 'John Doe' } };

      const result = engine.evaluateExpr(rule, context);

      expect(result.success).toBe(true);
    });

    it('should handle type coercion in loose mode', () => {
      const looseEngine = createRuleEngine({ strict: false });
      const rule = { eq: ['user.age', '25'] };
      const context = { user: { age: 25 } };

      const result = looseEngine.evaluateExpr(rule, context);

      expect(result.success).toBe(true);
    });

    it('should reject type coercion in strict mode', () => {
      const strictEngine = createRuleEngine({ strict: true });
      const rule = { eq: ['user.age', '25'] };
      const context = { user: { age: 25 } };

      const result = strictEngine.evaluateExpr(rule, context);

      expect(result.success).toBe(false);
    });

    it('should handle missing fields gracefully', () => {
      const rule = { eq: ['user.nonexistent', 'value'] };
      const context = { user: { name: 'John' } };

      const result = engine.evaluateExpr(rule, context);

      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information', () => {
      const rule = { eq: ['user.age', 'user.name'] }; // Type mismatch
      const context = { user: { age: 25, name: 'John' } };

      const result = engine.evaluateExpr(rule, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('operands');
      expect(result.details).toBeDefined();
    });
  });
});
```

### Test Categories

1. **Unit Tests** - Test individual functions and classes
2. **Integration Tests** - Test component interactions
3. **Performance Tests** - Measure and validate performance
4. **Security Tests** - Validate security protections
5. **End-to-End Tests** - Test complete workflows

### Test Requirements

- **100% code coverage** for new features
- **Test edge cases** - null, undefined, empty values
- **Test error conditions** - invalid inputs, malformed data
- **Test performance** - ensure no regressions
- **Test security** - validate protections work

### Writing Good Tests

```javascript
// ✅ Good test practices

describe('Feature Name', () => {
  // Use descriptive test names
  it('should handle valid input and return expected result', () => {
    // Arrange - Set up test data
    const input = {
      /* test data */
    };
    const expected = {
      /* expected result */
    };

    // Act - Execute the function
    const result = functionUnderTest(input);

    // Assert - Verify the result
    expect(result).toEqual(expected);
  });

  // Test edge cases
  it('should handle null input gracefully', () => {
    expect(() => functionUnderTest(null)).not.toThrow();
  });

  // Test error conditions
  it('should throw descriptive error for invalid input', () => {
    expect(() => functionUnderTest('invalid')).toThrow('Expected error message');
  });

  // Use test helpers for complex setup
  function createTestContext(overrides = {}) {
    return {
      user: { name: 'Test User', age: 25 },
      ...overrides,
    };
  }
});
```

### Performance Testing

```javascript
// tests/performance/engine.performance.test.js

describe('Engine Performance', () => {
  it('should evaluate simple rules quickly', () => {
    const engine = createRuleEngine();
    const rule = { eq: ['user.active', true] };
    const context = { user: { active: true } };

    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine.evaluateExpr(rule, context);
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;

    expect(avgTime).toBeLessThan(1); // Less than 1ms per evaluation
  });

  it('should maintain performance with cache enabled', () => {
    const engine = createRuleEngine({ enableCache: true });
    const rule = { eq: ['user.name', 'John'] };
    const context = { user: { name: 'John' } };

    // First run - populate cache
    for (let i = 0; i < 100; i++) {
      engine.evaluateExpr(rule, context);
    }

    // Measure cached performance
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      engine.evaluateExpr(rule, context);
    }
    const endTime = performance.now();

    const avgTime = (endTime - startTime) / 1000;
    expect(avgTime).toBeLessThan(0.1); // Should be much faster with cache
  });
});
```

## 📚 Documentation

### Documentation Standards

All public APIs must include:

1. **JSDoc comments** with parameter and return types
2. **Usage examples** showing common patterns
3. **Error conditions** documenting when errors occur
4. **Performance notes** for expensive operations

### JSDoc Format

```javascript
/**
 * Evaluates a rule expression against a context object
 *
 * @param {Object} rule - The rule expression to evaluate
 * @param {Object} rule.eq - Equality operator with [left, right] operands
 * @param {Object} rule.and - Logical AND with array of sub-expressions
 * @param {Object} context - The data context for evaluation
 * @param {number} [depth=0] - Current recursion depth (internal use)
 *
 * @returns {Object} Evaluation result
 * @returns {boolean} returns.success - Whether the rule evaluation succeeded
 * @returns {string} [returns.error] - Error message if evaluation failed
 * @returns {Object} [returns.details] - Additional error context
 *
 * @throws {RuleEngineError} When rule structure is invalid
 * @throws {ValidationError} When context is missing
 *
 * @example
 * // Simple equality check
 * const rule = { eq: ['user.role', 'admin'] };
 * const context = { user: { role: 'admin' } };
 * const result = engine.evaluateExpr(rule, context);
 * console.log(result.success); // true
 *
 * @example
 * // Complex logical rule
 * const rule = {
 *   and: [
 *     { eq: ['user.active', true] },
 *     { gte: ['user.age', 18] }
 *   ]
 * };
 *
 * @since 1.0.0
 */
function evaluateExpr(rule, context, depth = 0) {
  // Implementation
}
```

### Documentation Types

1. **API Reference** - Complete function documentation
2. **Guides** - Step-by-step tutorials
3. **Examples** - Real-world use cases
4. **Migration Guides** - For breaking changes
5. **FAQ** - Common questions and solutions

### Documentation Updates

When contributing code that affects documentation:

- **Update relevant docs** in the same PR
- **Add examples** for new features
- **Update migration guides** for breaking changes
- **Check for broken links** and outdated information

## 🔄 Pull Request Process

### Before Creating a PR

1. **Ensure tests pass**:

   ```bash
   npm test
   npm run lint
   npm run build
   ```

2. **Update documentation** if needed

3. **Add changelog entry** (if significant change)

4. **Rebase on latest main**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### PR Template

When creating a PR, include:

```markdown
## Description

Brief description of changes and motivation.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security fix

## Testing

- [ ] Added tests for new functionality
- [ ] All existing tests pass
- [ ] Performance tests pass (if applicable)
- [ ] Security tests pass (if applicable)

## Documentation

- [ ] Updated API documentation
- [ ] Added usage examples
- [ ] Updated migration guide (if breaking change)

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Changes generate no new warnings
- [ ] Tests prove fix is effective or feature works
- [ ] Documentation is updated

## Related Issues

Closes #123
Related to #456

## Screenshots (if applicable)

## Additional Notes

Any additional information or context.
```

### PR Review Process

1. **Automated checks** must pass (CI, tests, linting)
2. **Code review** by maintainers
3. **Security review** for security-related changes
4. **Performance review** for performance-critical changes
5. **Documentation review** for public API changes

### Review Criteria

**Code Quality:**

- [ ] Follows project coding standards
- [ ] Includes appropriate error handling
- [ ] Has adequate test coverage
- [ ] Is well-documented

**Functionality:**

- [ ] Solves the stated problem
- [ ] Doesn't break existing functionality
- [ ] Handles edge cases appropriately
- [ ] Performance is acceptable

**Security:**

- [ ] Doesn't introduce security vulnerabilities
- [ ] Follows security best practices
- [ ] Input validation is adequate
- [ ] No sensitive data exposure

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** - Avoid duplicates
2. **Check documentation** - Ensure it's not covered
3. **Test with latest version** - Verify issue exists
4. **Create minimal reproduction** - Simplest case that shows the problem

### Bug Report Template

````markdown
**Describe the bug**
Clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Create rule '...'
2. Evaluate with context '...'
3. See error

**Expected behavior**
Clear description of what you expected to happen.

**Actual behavior**
What actually happened.

**Minimal reproduction**

```javascript
const engine = createRuleEngine();
const rule = {
  /* minimal rule that causes issue */
};
const context = {
  /* minimal context */
};
const result = engine.evaluateExpr(rule, context);
console.log(result); // Shows the problem
```
````

**Environment:**

- Rule Engine JS version: [e.g. 1.2.3]
- Node.js version: [e.g. 18.15.0]
- OS: [e.g. Ubuntu 20.04]
- Browser (if applicable): [e.g. Chrome 110]

**Additional context**
Any other context about the problem.

````

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
Clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Use case**
Describe your specific use case and how this feature would help.

**Example API**
```javascript
// How would you like to use this feature?
const rule = rules.newOperator('field', 'value');
````

**Additional context**
Any other context, screenshots, or examples.

````

### Issue Labels

We use these labels to categorize issues:

**Type:**
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to docs
- `performance` - Performance improvements
- `security` - Security-related issues

**Priority:**
- `critical` - Severe bugs or security issues
- `high` - Important bugs or highly requested features
- `medium` - Standard bugs or features
- `low` - Minor improvements or nice-to-have features

**Status:**
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `blocked` - Waiting on dependencies
- `wontfix` - Not planned to be fixed

**Areas:**
- `core` - Core engine functionality
- `operators` - Operator implementations
- `performance` - Performance-related
- `security` - Security-related
- `tooling` - Development tools and build

## 🔒 Security Contributions

### Security-Related Changes

Security contributions require extra attention:

1. **Review security implications** thoroughly
2. **Test against common attacks** (XSS, injection, etc.)
3. **Update security documentation**
4. **Consider backward compatibility** carefully

### Security Testing

```javascript
// Example security test
describe('Security Features', () => {
  it('should prevent prototype pollution attacks', () => {
    const maliciousContext = {
      "__proto__": { isAdmin: true },
      user: { name: "attacker" }
    };

    const rule = { eq: ['__proto__.isAdmin', true] };
    const result = engine.evaluateExpr(rule, maliciousContext);

    expect(result.success).toBe(false);
    expect(Object.prototype.isAdmin).toBeUndefined();
  });

  it('should validate regex patterns against ReDoS', () => {
    const dangerousPattern = '(a+)+';

    expect(() => {
      createSecureRegexRule('text', dangerousPattern);
    }).toThrow('potentially dangerous');
  });
});
````

### Reporting Security Vulnerabilities

**Do not** open public issues for security vulnerabilities. Instead:

1. **Email crafts69guy@gmail.com** with details
2. **Include reproduction steps**
3. **Provide impact assessment**
4. **Suggest possible fixes** if known

## ⚡ Performance Contributions

### Performance Guidelines

When contributing performance improvements:

1. **Measure before optimizing** - Establish baseline
2. **Profile the changes** - Ensure improvements are real
3. **Consider memory usage** - Not just speed
4. **Test edge cases** - Ensure optimization doesn't break functionality

### Performance Testing

```javascript
// Example performance test
describe('Performance Tests', () => {
  it('should evaluate rules efficiently', () => {
    const engine = createRuleEngine();
    const rule = createComplexRule();
    const context = createLargeContext();

    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine.evaluateExpr(rule, context);
    }

    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;

    expect(avgTime).toBeLessThan(5); // Less than 5ms per evaluation
  });

  it('should not leak memory', () => {
    const engine = createRuleEngine();
    const initialMemory = process.memoryUsage().heapUsed;

    // Perform many operations
    for (let i = 0; i < 10000; i++) {
      engine.evaluateExpr(rule, context);
    }

    // Force garbage collection if available
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
  });
});
```

## 📦 Release Process

### Versioning

We follow **Semantic Versioning (SemVer)**:

- **MAJOR** version for incompatible API changes
- **MINOR** version for backward-compatible functionality additions
- **PATCH** version for backward-compatible bug fixes

### Release Types

**Patch Release (1.0.1):**

- Bug fixes
- Documentation updates
- Performance improvements (non-breaking)
- Security fixes (non-breaking)

**Minor Release (1.1.0):**

- New features
- New operators
- Deprecations (with backward compatibility)
- Performance improvements with API changes

**Major Release (2.0.0):**

- Breaking API changes
- Removed deprecated features
- Major architectural changes
- Security changes that break compatibility

### Contributing to Releases

**For maintainers:**

1. **Update CHANGELOG.md**
2. **Update version in package.json**
3. **Create release tag**
4. **Publish to npm**
5. **Create GitHub release**

**For contributors:**

- **Label PRs appropriately** to help with changelog generation
- **Update migration guides** for breaking changes
- **Test against pre-release versions** when available

## 🤝 Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be respectful** and professional in all interactions
- **Be constructive** in feedback and criticism
- **Be patient** with new contributors
- **Help others learn** and grow

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions, ideas, and general discussion
- **Pull Requests** - Code contributions and reviews
- **Security Email** - crafts69guy@gmail.com for vulnerabilities

### Getting Help

If you need help:

1. **Check the documentation** first
2. **Search existing issues** and discussions
3. **Ask specific questions** with context
4. **Provide minimal reproduction** when reporting problems

### Recognition

We appreciate all contributions! Contributors are recognized:

- **CONTRIBUTORS.md** - List of all contributors
- **GitHub releases** - Acknowledgments in release notes
- **Documentation** - Credit for major documentation contributions

## 🎯 Quick Reference

### Common Commands

```bash
# Setup
git clone <fork-url>
npm install

# Development
npm run dev          # Development mode
npm test            # Run tests
npm run test:watch  # Watch mode
npm run lint        # Check code style
npm run lint:fix    # Fix style issues
npm run build       # Build project

# Before PR
npm test            # Ensure tests pass
npm run lint        # Check style
npm run build       # Verify build works
git rebase upstream/main  # Sync with latest
```

### Contribution Checklist

**Before starting:**

- [ ] Issue exists and is assigned to you
- [ ] Fork the repository
- [ ] Set up development environment
- [ ] Read relevant documentation

**During development:**

- [ ] Follow coding standards
- [ ] Write tests for new functionality
- [ ] Update documentation as needed
- [ ] Test edge cases and error conditions
- [ ] Ensure performance is acceptable

**Before submitting PR:**

- [ ] All tests pass locally
- [ ] Code is properly formatted
- [ ] Commit messages follow convention
- [ ] Branch is rebased on latest main
- [ ] PR description is complete

**After PR submission:**

- [ ] Address review feedback promptly
- [ ] Keep PR updated with main branch
- [ ] Respond to questions and suggestions

### Best Practices Summary

1. **Start small** - Begin with simple contributions
2. **Communicate early** - Discuss ideas before implementing
3. **Test thoroughly** - Cover edge cases and error conditions
4. **Document well** - Help others understand your code
5. **Be patient** - Reviews take time, and feedback helps improve quality
6. **Stay involved** - Help maintain your contributions over time

## 🔗 Additional Resources

### Learning Resources

**JavaScript/ES6+:**

- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [ES6 Features](https://github.com/lukehoban/es6features)

**Testing:**

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

**Git & GitHub:**

- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

**Code Quality:**

- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

### Project-Specific Resources

**Documentation:**

- [API Reference](./docs/api/)
- [Performance Guide](./docs/performance.md)
- [Security Guide](./docs/security.md)
- [Examples](./examples/)

**Development:**

- [Architecture Overview](./docs/architecture.md)
- [Operator Development Guide](./docs/operators.md)
- [Testing Strategy](./docs/testing.md)

## 📞 Contact

### Maintainers

- **Lead Maintainer:** [Name](mailto:crafts69guy@gmail.com)
- **Security Contact:** [crafts69guy@gmail.com](mailto:crafts69guy@gmail.com)
- **Performance Contact:** [crafts69guy@gmail.com](mailto:crafts69guy@gmail.com)

### Community

- **GitHub Discussions:** [Ask questions and share ideas](https://github.com/project/rule-engine-js/discussions)
- **Issues:** [Report bugs and request features](https://github.com/project/rule-engine-js/issues)
- **Twitter:** [@RuleEngineJS](https://twitter.com/RuleEngineJS) for updates

---

## 🙏 Thank You

Thank you for contributing to Rule Engine JS! Your efforts help make this project better for everyone. Whether you're fixing bugs, adding features, improving documentation, or helping other users, every contribution matters.

### First-Time Contributors

Special thanks to first-time contributors! We know contributing to open source can be intimidating, and we appreciate you taking the time to learn our processes and help improve the project.

### Regular Contributors

Thank you to our regular contributors who help maintain the project, review PRs, and guide new contributors. Your ongoing commitment is invaluable.

### Community

Thanks to everyone who uses Rule Engine JS, reports issues, asks questions, and helps others in the community. You make this project worthwhile.

---

**Happy coding! 🚀**

_Remember: Every expert was once a beginner. Don't be afraid to ask questions, make mistakes, and learn along the way._
