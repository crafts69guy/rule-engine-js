# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development

- `npm run dev` - Start development mode with watch compilation
- `npm run build` - Full production build (clean + lib + types + analyze)
- `npm run build:lib` - Build library bundles only
- `npm run build:types` - Generate TypeScript declarations
- `npm run clean` - Remove all generated files (dist/, types/, coverage/)

### Testing

- `npm test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:all-envs` - Full test suite across Node versions and import formats
- `npm run test:quick` - Fast test run (used in pre-commit)

### Code Quality

- `npm run lint` - ESLint check on src/
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run lint:all` - Lint both src/ and tests/
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting without modifying
- `npm run quality:check` - Comprehensive quality validation

### Release & Publishing

- `npm run release:patch` - Bump patch version and publish
- `npm run release:minor` - Bump minor version and publish
- `npm run release:major` - Bump major version and publish

## Architecture Overview

### Core Components

**RuleEngine** (`src/core/RuleEngine.js`)

- Main evaluation engine with LRU caching and performance metrics
- Manages operator registry and expression validation
- Provides security protections against prototype pollution
- Key methods: `evaluateExpr()`, `registerOperator()`, `getMetrics()`

**PathResolver** (`src/core/PathResolver.js`)

- Safe path resolution with dot notation support
- Caching for performance optimization
- Security measures against malicious paths
- Resolves both literal values and object paths

**RuleHelpers** (`src/helpers/RuleHelpers.js`)

- Fluent API for building rule expressions
- Organized by operator categories (comparison, logical, string, array, special)
- Includes field comparison helpers and validation patterns
- Factory function: `createRuleHelpers()`

### Operator System

All operators inherit from `BaseOperator` (`src/operators/base/BaseOperator.js`) and are organized by category:

- **Comparison**: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
- **Logical**: `and`, `or`, `not`
- **String**: `contains`, `startsWith`, `endsWith`, `regex`
- **Array**: `in`, `notIn`
- **Special**: `between`, `isNull`, `isNotNull`

Operators are registered via `registerBuiltinOperators()` in `src/operators/index.js`.

### Type System

The project uses TypeScript declaration files for type safety while maintaining JavaScript source:

- Source: JavaScript ES modules in `src/`
- Types: Generated TypeScript declarations in `types/`
- Build: Configured via `tsconfig.json` with `emitDeclarationOnly: true`

### Security Features

- **Prototype Pollution Protection**: Automatically blocks dangerous paths like `__proto__`
- **Function Access Prevention**: Functions are blocked by default in path resolution
- **Depth Limiting**: Configurable max recursion depth and operator count
- **Path Validation**: Only accesses own properties, never prototype chain

## Build System

### Multiple Output Formats

- **UMD** (`dist/index.js`) - Browser-compatible, includes all dependencies
- **UMD Minified** (`dist/index.min.js`) - Production optimized
- **ESM** (`dist/index.esm.js`) - Tree-shakeable ES modules
- **CommonJS** (`dist/index.cjs`) - Node.js compatibility

### Build Tools

- **Rollup**: Module bundler with format-specific configurations
- **Babel**: JavaScript transpilation with environment-specific targets
- **Terser**: Minification for production builds
- **TypeScript**: Declaration generation only

## Testing Framework

### Jest Configuration (`jest.config.cjs`)

- Node.js test environment with Babel transformation
- Global test helpers in `tests/setup.js`
- Coverage threshold: 80% across all metrics
- Custom globals: `testContext`, `expectRuleToPass`, `expectRuleToFail`

### Test Structure

```
tests/
├── unit/           - Component-level tests
├── integration/    - Cross-component tests
├── e2e/           - End-to-end scenarios
└── performance/   - Benchmarking tests
```

### Test Helpers

Global test context provides common data structures:

```javascript
global.testContext = {
  user: { name: 'John Doe', age: 28, role: 'admin', ... },
  form: { score: 85, maxScore: 100 }
};
```

## Development Workflows

### Code Quality Pipeline

1. **Pre-commit**: `lint-staged` runs ESLint/Prettier on staged files + quick tests
2. **Pre-push**: Full test suite + build + quality check
3. **CI/CD**: Comprehensive validation including Node version compatibility

### Custom Scripts

- `scripts/quality-check.js` - Validates package integrity and test coverage
- `scripts/test-node-versions.js` - Tests across Node.js versions 16-20
- `scripts/test-imports.js` - Validates import/export functionality
- `scripts/analyze-bundle.js` - Bundle size analysis and reporting

### Performance Monitoring

The engine includes built-in metrics tracking:

- Evaluation count and timing
- Cache hit rates
- Error statistics
- Average response time

Access via `engine.getMetrics()` and `engine.getCacheStats()`.
