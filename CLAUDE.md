# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

- **Version**: 1.0.3-beta.0
- **Status**: Beta release with Phase 3 production features complete
- **Test Coverage**: 615 tests (614 passing, 1 skipped), >90% code coverage
- **Main Branch**: production
- **Current Branch**: feature/stateful-operator

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

**StatefulRuleEngine** (`src/core/StatefulRuleEngine.js`)

- Wraps base RuleEngine to add state tracking and event-driven capabilities
- Maintains previous states for comparison across evaluations
- Event system: `triggered`, `untriggered`, `changed`, `evaluated`
- Optional evaluation history storage with configurable size limits
- Batch evaluation support via `evaluateBatch()`
- Flexible triggering modes (default: false → true transitions, optional: every change)
- Pure change rule detection for optimized triggering logic

**Phase 1 Enhancements (Production-Ready):**

- **State TTL/Expiration**: Automatic cleanup of stale states with configurable expiration times
- **Deep Copy Protection**: Prevents context mutation issues with circular reference handling
- **Listener Management**: Memory leak detection with configurable thresholds and cleanup methods
- **State Statistics**: Real-time monitoring of memory usage, rule counts, and state age

**Phase 2 Enhancements (Production-Ready):**

- **History Management Strategy Pattern**:
  - `GlobalHistoryManager`: FIFO queue with global size limit (legacy mode)
  - `PerRuleHistoryManager`: Separate queues per rule to prevent history domination
  - Configurable via `maxHistorySize` (global) or `maxHistoryPerRule` options
- **Batch Evaluation Error Handling**:
  - `stopOnError`: Option to halt batch processing on first error
  - `collectErrors`: Option to gather detailed error information for debugging
  - Returns structured response: `{ results, success, successCount, errorCount, totalCount, errors }`
  - Handles both engine-returned errors (`result.error`) and unexpected exceptions
- **Resource Cleanup**: `destroy()` method for proper resource management

**Phase 3.2 Concurrency Control (Production-Ready):**

- **ConcurrencyManager** (`src/core/concurrency/ConcurrencyManager.js`):
  - Per-rule execution queues with configurable concurrency limits
  - Automatic timeout handling with cleanup and callbacks
  - Queue management with max size limits and overflow callbacks
  - Promise-based async execution with proper error propagation
  - Statistics tracking: active, queued, completed, timeout counts
- **Integration**: All evaluation methods are now async (breaking change from Phase 2)
- **Configuration**: `concurrency` option with `maxConcurrent`, `timeout`, `onTimeout`, `onQueueFull`

**Phase 3.3 Enhanced Error Recovery (Production-Ready):**

- **RetryManager** (`src/core/recovery/RetryStrategies.js`):
  - Three retry strategies: exponential backoff, fixed delay, linear backoff
  - Configurable max attempts, delays, and retryable error patterns
  - Retry history tracking per rule with attempt timestamps
  - Optional retry callback hooks
- **CircuitBreaker** (`src/core/recovery/CircuitBreaker.js`):
  - State machine: closed (normal), open (failing), half-open (testing)
  - Configurable failure threshold and reset timeout
  - Automatic state transitions with timer management
  - Per-rule circuit tracking with statistics
  - Optional circuit state change callbacks
- **FallbackManager** (`src/core/recovery/FallbackManager.js`):
  - Three-tier fallback: fallback rules, fallback values, default values
  - Fallback history tracking per rule
  - Optional fallback callback hooks
- **ErrorRecoveryManager** (`src/core/recovery/ErrorRecoveryManager.js`):
  - Coordinates all error recovery strategies
  - Execution pipeline: Circuit Breaker → Retry → Fallback
  - Error history and rate tracking per rule with time windows
  - Comprehensive statistics across all recovery mechanisms
- **Integration**: Wraps concurrency manager in evaluate() method

**RuleHelpers** (`src/helpers/RuleHelpers.js`)

- Fluent API for building rule expressions
- Organized by operator categories (comparison, logical, string, array, special, state)
- Includes field comparison helpers and validation patterns
- Factory function: `createRuleHelpers()`

### Operator System

All operators inherit from `BaseOperator` (`src/operators/base/BaseOperator.js`) and are organized by category:

- **Comparison**: `eq`, `neq`, `gt`, `gte`, `lt`, `lte` (100% coverage)
- **Logical**: `and`, `or`, `not` (96% coverage)
- **String**: `contains`, `startsWith`, `endsWith`, `regex` (95% coverage)
- **Array**: `in`, `notIn` (100% coverage)
- **Numeric**: `add`, `subtract`, `multiply`, `divide`, `modulo` (94.11% coverage)
- **Special**: `between`, `isNull`, `isNotNull` (93.33% coverage)
- **State Change**: `changed`, `changedBy`, `changedFrom`, `changedTo`, `increased`, `decreased` (100% line coverage)

Operators are registered via `registerBuiltinOperators()` in `src/operators/index.js`.

#### State Change Operators (`src/operators/state.js`)

State change operators require a `_previous` context and are designed for use with `StatefulRuleEngine`:

- **`changed`**: Detects any value change between evaluations
  - Usage: `{ changed: ["user.status"] }`
  - Returns `true` when value differs from previous state

- **`changedBy`**: Detects numeric change by specific threshold amount
  - Usage: `{ changedBy: ["temperature", 5] }` // changed by at least 5
  - Returns `true` when absolute change ≥ threshold

- **`changedFrom`**: Detects change from a specific value
  - Usage: `{ changedFrom: ["order.status", "pending"] }`
  - Returns `true` when previous value was "pending" and current is different

- **`changedTo`**: Detects change to a specific value
  - Usage: `{ changedTo: ["order.status", "completed"] }`
  - Returns `true` when current value is "completed" and previous was different

- **`increased`**: Detects numeric value increases
  - Usage: `{ increased: ["score"] }`
  - Returns `true` when current value > previous value

- **`decreased`**: Detects numeric value decreases
  - Usage: `{ decreased: ["stock"] }`
  - Returns `true` when current value < previous value

All state operators automatically mark the evaluation context with `_meta.hasChangeOperator = true` for tracking purposes.

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

- **UMD** (`dist/index.js`) - Browser-compatible, includes all dependencies (~126KB)
- **UMD Minified** (`dist/index.min.js`) - Production optimized (~46KB, 11.4KB gzipped)
- **ESM** (`dist/index.esm.js`) - Tree-shakeable ES modules, minified (~45KB, 11.3KB gzipped)
- **CommonJS** (`dist/index.cjs`) - Node.js compatibility, minified (~46KB, 11.3KB gzipped)

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
├── unit/           - Component-level tests (core, operators, helpers, utils)
│   ├── core/      - RuleEngine, StatefulRuleEngine, PathResolver tests
│   ├── operators/ - All operator category tests
│   ├── helpers/   - RuleHelpers tests
│   └── utils/     - TypeUtils, errors tests
├── integration/    - Cross-component tests, stateful features
├── e2e/           - End-to-end scenarios, stateful workflows
├── dist/          - Build verification tests
└── performance/   - Benchmarking tests (planned)
```

**Current Test Metrics:**

- **615 tests** (614 passing, 1 skipped)
  - 19 Phase 1 tests (state management)
  - 47 Phase 2 tests (history strategies, batch error handling)
  - 31 Phase 3.2 tests (concurrency control)
  - 11 Phase 3.3 tests (10 passing, 1 skipped - error recovery)
- **>90% coverage** overall
- Coverage by component:
  - Core: 89-100%
  - Operators: 87-100%
  - Helpers: 100%
  - Utils: 100%
  - Concurrency: 95%+
  - Recovery: 93%+

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

## Stateful Engine Usage

### Creating a Stateful Engine

```javascript
import { createRuleEngine, StatefulRuleEngine } from 'rule-engine-js';

// Create base engine
const baseEngine = createRuleEngine();

// Wrap with StatefulRuleEngine with all Phase 3 enhancements
const statefulEngine = new StatefulRuleEngine(baseEngine, {
  // Core options
  triggerOnEveryChange: false, // Trigger only on false → true transitions (default)
  storeHistory: true, // Keep evaluation history

  // Phase 2: History Management Strategy
  // Option 1: Global history (legacy mode - FIFO queue)
  maxHistorySize: 100, // Global limit across all rules

  // Option 2: Per-rule history (recommended for multi-rule scenarios)
  // maxHistoryPerRule: 50, // Separate queue per rule

  // Phase 1: Memory Management
  stateExpirationMs: 3600000, // 1 hour TTL for states (null = no expiration)
  cleanupIntervalMs: 60000, // Run cleanup every minute

  // Phase 1: Context Protection
  enableDeepCopy: true, // Deep copy contexts to prevent mutation (default: true)

  // Phase 1: Listener Management
  maxListeners: 100, // Warn when listener count exceeds threshold

  // Phase 3.2: Concurrency Control
  concurrency: {
    maxConcurrent: 10, // Maximum concurrent evaluations per rule
    timeout: 30000, // Evaluation timeout in milliseconds
    onTimeout: (ruleId) => console.error(`Timeout: ${ruleId}`),
    onQueueFull: (ruleId, queueSize) => console.warn(`Queue full: ${ruleId}`),
  },

  // Phase 3.3: Error Recovery
  errorRecovery: {
    retry: {
      enabled: true,
      maxAttempts: 3,
      strategy: 'exponential', // 'exponential', 'fixed', or 'linear'
      initialDelay: 100,
      maxDelay: 5000,
      onRetry: (attempt, error, ruleId) => console.log(`Retry ${attempt}/${3}`),
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000,
      onCircuitOpen: (ruleId, info) => console.error(`Circuit opened: ${ruleId}`),
    },
    fallback: {
      enabled: true,
      defaultValue: { success: false, fallback: true },
      onFallback: (ruleId, type, value) => console.log(`Fallback: ${type}`),
    },
  },
});
```

### Event System

```javascript
// Listen for rule triggers (false → true transition)
statefulEngine.on('triggered', (event) => {
  console.log(`Rule ${event.ruleId} triggered!`, event.context);
});

// Listen for state changes
statefulEngine.on('changed', (event) => {
  console.log(`Rule ${event.ruleId} state changed`);
});

// Listen for all evaluations
statefulEngine.on('evaluated', (event) => {
  console.log(`Rule ${event.ruleId} evaluated`, event.result);
});
```

### Evaluating Rules with State

```javascript
// Define a rule with state change operators
const temperatureAlert = {
  and: [
    { gte: ['temperature', 25] },
    { increased: ['temperature'] }, // Only trigger when temperature increases
  ],
};

// First evaluation (async as of Phase 3.2)
let data = { temperature: 20 };
await statefulEngine.evaluate('temp-rule', temperatureAlert, data);
// Result: { success: false, triggered: false }

// Second evaluation - temperature increased and is now ≥ 25
data = { temperature: 26 };
const result = await statefulEngine.evaluate('temp-rule', temperatureAlert, data);
// Result: { success: true, triggered: true }
// Event 'triggered' is emitted
```

### Batch Evaluation

```javascript
const rules = {
  'payment-received': { changedTo: ['order.paymentStatus', 'paid'] },
  'inventory-low': {
    and: [{ decreased: ['product.stock'] }, { lte: ['product.stock', 10] }],
  },
  'price-drop': {
    and: [{ decreased: ['product.price'] }, { changedBy: ['product.price', 5] }],
  },
};

// Basic batch evaluation (async as of Phase 3.2)
const batchResult = await statefulEngine.evaluateBatch(rules, orderData);
console.log(batchResult);
// {
//   results: {
//     'payment-received': { success: true, triggered: true, ... },
//     'inventory-low': { success: false, triggered: false, ... },
//     'price-drop': { success: true, triggered: true, ... }
//   },
//   success: true,
//   successCount: 2,
//   errorCount: 0,
//   totalCount: 3
// }

// Batch evaluation with error handling (Phase 2) - now async
const batchResultWithErrors = await statefulEngine.evaluateBatch(rules, orderData, {
  stopOnError: false, // Continue processing all rules even if one fails
  collectErrors: true, // Gather detailed error information
});

if (!batchResultWithErrors.success) {
  console.log('Errors encountered:', batchResultWithErrors.errors);
  // [
  //   {
  //     ruleId: 'inventory-low',
  //     rule: { ... },
  //     error: { message: '...', operator: '...', details: '...' },
  //     timestamp: '2023-...'
  //   }
  // ]
}
```

### State Management

```javascript
// Get evaluation history for a specific rule
const history = statefulEngine.getHistory('temp-rule');

// Clear state for a specific rule
statefulEngine.clearState('temp-rule');

// Clear all state
statefulEngine.clearState();
```

### Phase 1: Advanced State Management

```javascript
// Monitor state statistics
const stats = statefulEngine.getStateStats();
console.log(stats);
// {
//   totalRules: 42,
//   historySize: 100,
//   listenerCounts: { triggered: 5, changed: 3, evaluated: 2, untriggered: 1 },
//   oldestStateAge: 3245000, // milliseconds
//   memoryEstimate: { states: '~42KB', history: '~100KB', total: '~142KB' }
// }

// Manual cleanup of expired states
const cleanupResult = statefulEngine.cleanupExpiredStates();
console.log(cleanupResult);
// { removedCount: 5, removedRules: ['old-rule-1', 'old-rule-2', ...], timestamp: '...' }

// Listener management
console.log(statefulEngine.getListenerCount('triggered')); // 5
console.log(statefulEngine.getAllListenerCounts()); // { triggered: 5, ... }

// Remove all listeners for specific event
statefulEngine.removeAllListeners('triggered');

// Remove all listeners for all events
statefulEngine.removeAllListeners();

// Cleanup timer management
statefulEngine.stopCleanupTimer(); // Stop automatic cleanup
statefulEngine.startCleanupTimer(); // Restart automatic cleanup

// Complete resource cleanup (important for long-running apps)
statefulEngine.destroy(); // Stops timers, removes listeners, clears state
```

### Phase 1: Production Best Practices

**Memory Management:**

- Set `stateExpirationMs` for applications with many unique rule IDs
- Use `getStateStats()` to monitor memory usage in production
- Call `cleanupExpiredStates()` manually if you need immediate cleanup
- Always call `destroy()` when shutting down the engine

**Context Safety:**

- Keep `enableDeepCopy: true` (default) to prevent mutation bugs
- Only disable if you have performance constraints and manage context immutability manually
- Deep copy handles circular references automatically

**Listener Management:**

- Monitor listener counts with `getListenerCount()` in development
- Set appropriate `maxListeners` threshold for your use case
- Always remove listeners when they're no longer needed
- Use `removeAllListeners()` during cleanup or testing

**Example Production Setup:**

```javascript
const statefulEngine = new StatefulRuleEngine(baseEngine, {
  stateExpirationMs: 3600000, // 1 hour TTL
  cleanupIntervalMs: 300000, // Cleanup every 5 minutes
  enableDeepCopy: true, // Safety first
  maxListeners: 50, // Reasonable threshold
  storeHistory: false, // Disable if not needed (saves memory)
});

// Monitor in production
setInterval(() => {
  const stats = statefulEngine.getStateStats();
  if (stats.totalRules > 10000) {
    console.warn('High rule count detected:', stats);
  }
}, 60000);

// Graceful shutdown
process.on('SIGTERM', () => {
  statefulEngine.destroy();
  process.exit(0);
});
```

## Journaling Workflow

You (the AI agent) have to report what you did in this project at each end of the task in my Inkdrop note.

Create one in the "Journal" notebook with the title "Log: <Job title>".
Update the same note throughout the same session.

Update this note at each end of the task with the following format:

```
## Log: <task title>
- **Prompt**: <prompt you received>
- **Issue**: <issue description>

### What I did: <brief description of what you did>
...

### How I did it: <brief description of how you did it>
...

### What were challenging: <brief description of any challenges you faced>
...

### Future work (optional)
- <any future work or improvements you suggest>
```

- **IMPORTANT**: Do not forget to update the note at the end of each task!!!
