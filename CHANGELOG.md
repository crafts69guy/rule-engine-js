# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Preparing for next release

## [1.0.0] - 2025-08-12

### Added

- 🎉 Initial release of Rule Engine JS
- **Core Features:**
  - High-performance rule evaluation engine with caching
  - Dynamic field comparison support
  - Comprehensive operator set (comparison, logical, string, array, special)
  - Built-in security protections against prototype pollution
  - TypeScript definitions for better developer experience
  - Zero external dependencies

- **Operators:**
  - Comparison: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
  - Logical: `and`, `or`, `not`
  - String: `contains`, `startsWith`, `endsWith`, `regex`
  - Array: `in`, `notIn`
  - Special: `between`, `isNull`, `isNotNull`

- **Performance Features:**
  - LRU caching for expressions and path resolution
  - Performance metrics tracking
  - Bundle size optimization (< 25KB gzipped)
  - Multiple output formats (UMD, ESM, CommonJS)

- **Developer Experience:**
  - Rule helpers for clean, readable syntax
  - Comprehensive error handling with detailed context
  - Extensive test coverage (>90%)
  - Complete TypeScript support
  - Field comparison helpers for dynamic rules

- **Security:**
  - Prototype pollution protection
  - Function access prevention
  - Safe path resolution
  - Configurable security settings

- **Build System:**
  - Optimized Rollup configuration
  - Multiple output formats
  - Bundle size analysis
  - Quality checks integration

### Developer Features

- Rule helpers library for easier rule construction
- Validation helpers for common patterns
- Field comparison utilities for dynamic rules
- Comprehensive error types with context

### Documentation

- Complete API documentation
- Real-world usage examples
- Performance optimization guides
- Security best practices

### Testing

- Unit tests for all operators
- Integration tests for real-world scenarios
- Performance benchmarks
- Browser compatibility tests

## [0.9.0] - Development Phase

### Added

- Core engine architecture
- Basic operator implementations
- Initial testing framework

### Changed

- Refined API design based on testing

### Fixed

- Various bug fixes during development

---

## Release Notes

### v1.0.0 Highlights

This is the first stable release of Rule Engine JS, a powerful and secure JavaScript rule engine designed for modern applications.

**Key Features:**

- **Zero Dependencies**: Lightweight with no external dependencies
- **High Performance**: Intelligent caching with LRU eviction
- **Type Safe**: Full TypeScript support with comprehensive type definitions
- **Secure**: Built-in protection against common security vulnerabilities
- **Flexible**: Support for dynamic field comparison and custom operators
- **Developer Friendly**: Clean API with helper functions for rule construction

**Use Cases:**

- User access control and permissions
- Business rule validation
- Form validation with dynamic dependencies
- Content filtering and recommendations
- Dynamic pricing and discount logic
- Workflow and approval processes

**Getting Started:**

```javascript
import { createRuleEngine, createRuleHelpers } from 'rule-engine-js';

const engine = createRuleEngine();
const rules = createRuleHelpers();

const rule = rules.and(
  rules.gte('user.age', 18),
  rules.eq('user.status', 'active'),
  rules.in('user.role', ['admin', 'user'])
);

const result = engine.evaluateExpr(rule, userData);
```

**Breaking Changes from Pre-1.0:**

- None (first stable release)

**Migration Guide:**

- This is the first stable release, no migration needed

---

## Contributing

When contributing to this project, please follow these changelog guidelines:

1. **Add entries under `[Unreleased]`** for new changes
2. **Use standard categories:**
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for removed features
   - `Fixed` for bug fixes
   - `Security` for vulnerability fixes

3. **Follow format:** `- Brief description of change (#PR-number)`
4. **Move entries to dated release** when releasing

## Version History

- **1.0.0**: First stable release with complete feature set
- **0.9.x**: Development and testing phases
- **0.1.0**: Initial project setup

## Support

For questions, issues, or contributions:

- [GitHub Issues](https://github.com/crafts69guy/rule-engine-js/issues)
- [Documentation](https://github.com/crafts69guy/rule-engine-js#readme)
- [Discussions](https://github.com/crafts69guy/rule-engine-js/discussions)
