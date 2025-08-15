# Performance Guide - Rule Engine JS

Comprehensive guide to optimizing performance and achieving maximum efficiency with Rule Engine JS.

## 📊 Table of Contents

- [Quick Performance Wins](#quick-performance-wins)
- [Understanding Performance Metrics](#understanding-performance-metrics)
- [Engine Configuration](#engine-configuration)
- [Rule Optimization](#rule-optimization)
- [Caching Strategies](#caching-strategies)
- [Memory Management](#memory-management)
- [Benchmarking and Monitoring](#benchmarking-and-monitoring)
- [Scaling Strategies](#scaling-strategies)
- [Common Performance Pitfalls](#common-performance-pitfalls)
- [Advanced Optimization Techniques](#advanced-optimization-techniques)

## 🚀 Quick Performance Wins

### 1. Optimal Engine Configuration

```javascript
// ✅ Performance-optimized configuration
const engine = createRuleEngine({
  enableCache: true, // Essential for performance
  maxCacheSize: 2000, // Larger cache for better hit rates
  strict: false, // Allow type coercion (faster)
  maxDepth: 15, // Reasonable nesting limit
  maxOperators: 200, // Generous operator limit
});

// ❌ Poor performance configuration
const slowEngine = createRuleEngine({
  enableCache: false, // Misses all caching benefits
  maxCacheSize: 10, // Cache too small
  strict: true, // Slower type checking
  maxDepth: 5, // Too restrictive
  maxOperators: 20, // Too limiting
});
```

### 2. Rule Structure Optimization

```javascript
// ✅ Optimized rule order (fastest checks first)
const optimizedRule = rules.and(
  rules.eq('user.active', true), // Boolean check (fastest)
  rules.gte('user.age', 18), // Numeric comparison (fast)
  rules.in('user.role', ['admin', 'user']), // Array lookup (medium)
  rules.contains('user.email', '@company'), // String operation (slower)
  rules.validation.email('user.email') // Regex validation (slowest)
);

// ❌ Unoptimized rule order (expensive checks first)
const slowRule = rules.and(
  rules.validation.email('user.email'), // Expensive regex first
  rules.contains('user.email', '@company'), // String operation
  rules.in('user.role', ['admin', 'user']), // Array lookup
  rules.gte('user.age', 18), // Numeric comparison
  rules.eq('user.active', true) // Simple boolean last
);
```

### 3. Engine Instance Reuse

```javascript
// ✅ Reuse engine instance for caching benefits
const globalEngine = createRuleEngine({ maxCacheSize: 2000 });

function validateUser(user) {
  return globalEngine.evaluateExpr(userRule, user);
}

function validateOrder(order) {
  return globalEngine.evaluateExpr(orderRule, order);
}

// ❌ Creating new engines (no caching benefit)
function validateUser(user) {
  const engine = createRuleEngine(); // New instance every time
  return engine.evaluateExpr(userRule, user);
}
```

## 📈 Understanding Performance Metrics

### Built-in Metrics

```javascript
const engine = createRuleEngine();

// Perform some evaluations
engine.evaluateExpr(rule, context);

// Get comprehensive metrics
const metrics = engine.getMetrics();
console.log({
  totalEvaluations: metrics.evaluations,
  cacheHitRate: (metrics.cacheHits / metrics.evaluations) * 100 + '%',
  averageTime: metrics.avgTime + 'ms',
  totalTime: metrics.totalTime + 'ms',
  errorCount: metrics.errors,
});

// Expected output:
// {
//   totalEvaluations: 150,
//   cacheHitRate: '73.3%',
//   averageTime: '0.85ms',
//   totalTime: '127.5ms',
//   errorCount: 2
// }
```

### Cache Statistics

```javascript
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

## ⚙️ Engine Configuration

### Cache Configuration

```javascript
// High-volume applications
const highVolumeEngine = createRuleEngine({
  enableCache: true,
  maxCacheSize: 5000, // Large cache for better hit rates
});

// Memory-constrained environments
const lightweightEngine = createRuleEngine({
  enableCache: true,
  maxCacheSize: 500, // Smaller cache footprint
});

// Real-time applications (consistency over speed)
const realTimeEngine = createRuleEngine({
  enableCache: false, // Always fresh evaluation
});
```

### Type Checking Configuration

```javascript
// Performance-focused (loose type checking)
const fastEngine = createRuleEngine({
  strict: false, // Allow type coercion (faster)
});

// Accuracy-focused (strict type checking)
const accurateEngine = createRuleEngine({
  strict: true, // Exact type matching (slower but safer)
});
```

## 🧩 Rule Optimization

### Operator Speed Rankings

**Fastest to Slowest:**

1. **Boolean operators** (`eq` with boolean values)
2. **Null checks** (`isNull`, `isNotNull`)
3. **Numeric comparisons** (`gt`, `gte`, `lt`, `lte`, `between`)
4. **Array membership** (`in`, `notIn` - depends on array size)
5. **String operations** (`contains`, `startsWith`, `endsWith`)
6. **Regular expressions** (`regex` - depends on pattern complexity)
7. **Logical operators** (`and`, `or`, `not` - depends on sub-expressions)

### Optimal Rule Structure

```javascript
// ✅ Performance-optimized rule structure
const optimizedBusinessRule = rules.and(
  // 1. Fast boolean checks first
  rules.isTrue('user.active'),
  rules.isFalse('user.deleted'),

  // 2. Numeric comparisons
  rules.gte('user.age', 18),
  rules.lte('user.loginAttempts', 3),

  // 3. Array membership (with small arrays)
  rules.in('user.role', ['admin', 'user']),
  rules.notIn('user.status', ['banned']),

  // 4. String operations
  rules.contains('user.email', '@company.com'),
  rules.startsWith('user.department', 'ENG'),

  // 5. Complex validations last
  rules.validation.email('user.email'),
  rules.regex('user.phone', phonePattern)
);
```

### Early Exit Optimization

```javascript
// ✅ Structure rules for early exit
const earlyExitRule = rules.or(
  rules.eq('user.role', 'admin'), // Most likely to be true first
  rules.eq('user.role', 'moderator'), // Second most likely
  rules.and(
    // Least likely (complex check)
    rules.eq('user.role', 'user'),
    rules.gte('user.experience', 1000),
    rules.isTrue('user.verified')
  )
);

// The OR operator stops at the first true condition,
// so put most likely conditions first
```

## 🗄️ Caching Strategies

### Expression Caching

Rule Engine JS automatically caches complete rule evaluation results:

```javascript
const rule = rules.and(rules.eq('user.role', 'admin'), rules.gte('user.age', 18));

// First evaluation - computed and cached
const result1 = engine.evaluateExpr(rule, userData); // ~2ms

// Second evaluation with same rule and context - cache hit
const result2 = engine.evaluateExpr(rule, userData); // ~0.1ms
```

### Path Resolution Caching

Dot-notation path lookups are automatically cached:

```javascript
// First access - traverses object tree and caches
const value1 = engine.resolvePath(data, 'user.profile.settings.theme'); // ~0.5ms

// Subsequent access - uses cached path
const value2 = engine.resolvePath(data, 'user.profile.settings.theme'); // ~0.05ms
```

### Regex Pattern Caching

Compiled regex patterns are cached for reuse:

```javascript
const emailRule = rules.regex('email', '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$');

// Pattern compiled once and cached
engine.evaluateExpr(emailRule, user1); // Compiles pattern
engine.evaluateExpr(emailRule, user2); // Reuses compiled pattern
engine.evaluateExpr(emailRule, user3); // Reuses compiled pattern
```

### Cache Management

```javascript
// Monitor cache performance
function monitorCachePerformance(engine, engineName) {
  const metrics = engine.getMetrics();
  const cacheStats = engine.getCacheStats();

  const hitRate = metrics.cacheHits / metrics.evaluations;

  if (hitRate < 0.7) {
    console.warn(`${engineName} cache hit rate is low: ${hitRate * 100}%`);
    console.log('Consider increasing cache size or reviewing rule patterns');
  }

  return { hitRate, metrics, cacheStats };
}

// Periodic cache cleanup for long-running applications
let evaluationCount = 0;
const CACHE_CLEANUP_INTERVAL = 10000;

function evaluateWithCleanup(rule, context) {
  const result = engine.evaluateExpr(rule, context);

  evaluationCount++;
  if (evaluationCount % CACHE_CLEANUP_INTERVAL === 0) {
    engine.clearCache();
    console.log(`Cache cleared after ${evaluationCount} evaluations`);
  }

  return result;
}
```

## 🧠 Memory Management

### Efficient Context Preparation

```javascript
// ✅ Prepare minimal context objects
function createMinimalContext(fullUserData) {
  return {
    user: {
      id: fullUserData.user.id,
      email: fullUserData.user.email,
      role: fullUserData.user.role,
      age: fullUserData.user.age,
      active: fullUserData.user.active,
      // Only include fields needed for rules
    },
  };
}

// ❌ Avoid large, unnecessary context objects
function createBloatedContext(fullUserData) {
  return {
    user: fullUserData.user, // Entire user object
    metadata: fullUserData.metadata, // Large metadata
    history: fullUserData.activityHistory, // Large activity log
    preferences: fullUserData.preferences, // Unused preferences
    // Lots of unused data
  };
}
```

### Memory-Efficient Rule Patterns

```javascript
// ✅ Reuse rule definitions
const commonRules = {
  isActiveUser: rules.and(rules.isTrue('user.active'), rules.isFalse('user.deleted')),

  hasValidAge: rules.between('user.age', [18, 120]),

  isVerifiedUser: rules.and(rules.isTrue('user.verified'), rules.validation.email('user.email')),
};

// Combine reusable rules
const userAccessRule = rules.and(
  commonRules.isActiveUser,
  commonRules.hasValidAge,
  commonRules.isVerifiedUser
);

// ❌ Avoid recreating identical rules
function createAccessRule() {
  return rules.and(
    rules.isTrue('user.active'), // Recreated every time
    rules.isFalse('user.deleted'), // Recreated every time
    rules.between('user.age', [18, 120]) // Recreated every time
  );
}
```

### Memory Monitoring

```javascript
// Monitor memory usage in Node.js environments
function monitorMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    console.log({
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`,
      cacheStats: engine.getCacheStats(),
    });
  }
}

// Periodic memory monitoring
setInterval(monitorMemoryUsage, 60000); // Every minute
```

## 📊 Benchmarking and Monitoring

### Custom Benchmarking

```javascript
function benchmarkRule(engine, rule, contexts, iterations = 1000) {
  const results = {
    totalTime: 0,
    averageTime: 0,
    minTime: Infinity,
    maxTime: 0,
    cacheHitRate: 0,
    successRate: 0,
  };

  const startMetrics = engine.getMetrics();
  const startTime = performance.now();

  let successes = 0;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const context = contexts[i % contexts.length];
    const iterationStart = performance.now();

    const result = engine.evaluateExpr(rule, context);

    const iterationEnd = performance.now();
    const iterationTime = iterationEnd - iterationStart;

    times.push(iterationTime);
    results.minTime = Math.min(results.minTime, iterationTime);
    results.maxTime = Math.max(results.maxTime, iterationTime);

    if (result.success) successes++;
  }

  const endTime = performance.now();
  const endMetrics = engine.getMetrics();

  results.totalTime = endTime - startTime;
  results.averageTime = results.totalTime / iterations;
  results.successRate = (successes / iterations) * 100;

  const cacheHits = endMetrics.cacheHits - startMetrics.cacheHits;
  const totalEvaluations = endMetrics.evaluations - startMetrics.evaluations;
  results.cacheHitRate = (cacheHits / totalEvaluations) * 100;

  // Calculate percentiles
  times.sort((a, b) => a - b);
  results.p50 = times[Math.floor(times.length * 0.5)];
  results.p95 = times[Math.floor(times.length * 0.95)];
  results.p99 = times[Math.floor(times.length * 0.99)];

  return results;
}

// Usage
const rule = rules.and(
  rules.eq('user.active', true),
  rules.validation.email('user.email'),
  rules.gte('user.age', 18)
);

const contexts = [
  { user: { active: true, email: 'user1@example.com', age: 25 } },
  { user: { active: true, email: 'user2@example.com', age: 30 } },
  { user: { active: false, email: 'user3@example.com', age: 22 } },
];

const benchmark = benchmarkRule(engine, rule, contexts, 1000);
console.log(benchmark);
```

### Performance Monitoring in Production

```javascript
class PerformanceMonitor {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.options = {
      alertThreshold: options.alertThreshold || 10, // ms
      sampleRate: options.sampleRate || 0.1, // 10% sampling
      ...options,
    };

    this.samples = [];
    this.alerts = [];
  }

  wrapEvaluateExpr(rule, context) {
    const shouldSample = Math.random() < this.options.sampleRate;

    if (shouldSample) {
      const startTime = performance.now();
      const result = this.engine.evaluateExpr(rule, context);
      const endTime = performance.now();

      const duration = endTime - startTime;
      this.samples.push({
        duration,
        timestamp: Date.now(),
        ruleComplexity: this.estimateRuleComplexity(rule),
        contextSize: this.estimateContextSize(context),
        success: result.success,
      });

      if (duration > this.options.alertThreshold) {
        this.alerts.push({
          duration,
          timestamp: Date.now(),
          rule: JSON.stringify(rule),
          contextKeys: Object.keys(context),
        });
      }

      return result;
    }

    return this.engine.evaluateExpr(rule, context);
  }

  estimateRuleComplexity(rule) {
    // Simple complexity estimation based on rule structure
    return JSON.stringify(rule).length;
  }

  estimateContextSize(context) {
    // Simple size estimation
    return JSON.stringify(context).length;
  }

  getStats() {
    if (this.samples.length === 0) return null;

    const durations = this.samples.map((s) => s.duration);
    durations.sort((a, b) => a - b);

    return {
      sampleCount: this.samples.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      slowQueries: this.alerts.length,
      engineMetrics: this.engine.getMetrics(),
    };
  }
}

// Usage
const monitor = new PerformanceMonitor(engine, {
  alertThreshold: 5, // Alert for operations > 5ms
  sampleRate: 0.2, // Sample 20% of operations
});

// Use monitored evaluation
const result = monitor.wrapEvaluateExpr(rule, context);

// Get performance statistics
const stats = monitor.getStats();
console.log(stats);
```

## 📈 Scaling Strategies

### Horizontal Scaling

```javascript
// Worker-based rule evaluation for CPU-intensive rules
class RuleWorkerPool {
  constructor(workerCount = 4) {
    this.workers = [];
    this.taskQueue = [];
    this.activeJobs = new Map();

    for (let i = 0; i < workerCount; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    // In a real implementation, this would create Web Workers
    // or child processes for rule evaluation
    const worker = {
      id: this.workers.length,
      busy: false,
      engine: createRuleEngine({ maxCacheSize: 1000 }),
    };

    this.workers.push(worker);
    return worker;
  }

  async evaluateRule(rule, context) {
    return new Promise((resolve, reject) => {
      const task = { rule, context, resolve, reject };

      const availableWorker = this.workers.find((w) => !w.busy);
      if (availableWorker) {
        this.executeTask(availableWorker, task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  executeTask(worker, task) {
    worker.busy = true;

    // Simulate async execution
    setTimeout(() => {
      try {
        const result = worker.engine.evaluateExpr(task.rule, task.context);
        task.resolve(result);
      } catch (error) {
        task.reject(error);
      } finally {
        worker.busy = false;
        this.processQueue();
      }
    }, 0);
  }

  processQueue() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find((w) => !w.busy);
    if (availableWorker) {
      const task = this.taskQueue.shift();
      this.executeTask(availableWorker, task);
    }
  }
}

// Usage
const workerPool = new RuleWorkerPool(4);

async function evaluateMultipleRules(rulesAndContexts) {
  const promises = rulesAndContexts.map(({ rule, context }) =>
    workerPool.evaluateRule(rule, context)
  );

  return Promise.all(promises);
}
```

### Rule Preprocessing

```javascript
// Precompile and optimize rules for better performance
class RuleCompiler {
  constructor(engine) {
    this.engine = engine;
    this.compiledRules = new Map();
  }

  compileRule(ruleId, rule) {
    // Analyze rule structure for optimization opportunities
    const analysis = this.analyzeRule(rule);

    // Create optimized version
    const optimizedRule = this.optimizeRule(rule, analysis);

    // Pre-warm cache
    this.preWarmCache(optimizedRule);

    this.compiledRules.set(ruleId, {
      original: rule,
      optimized: optimizedRule,
      analysis,
      compiledAt: Date.now(),
    });

    return optimizedRule;
  }

  analyzeRule(rule) {
    return {
      complexity: this.calculateComplexity(rule),
      operatorCounts: this.countOperators(rule),
      hasRegex: this.hasRegexOperators(rule),
      maxDepth: this.calculateMaxDepth(rule),
    };
  }

  optimizeRule(rule, analysis) {
    // Rule optimization strategies based on analysis
    if (analysis.hasRegex) {
      // Pre-compile regex patterns
      return this.preCompileRegex(rule);
    }

    // Other optimizations...
    return rule;
  }

  preWarmCache(rule) {
    // Pre-evaluate with common contexts to warm cache
    const commonContexts = [
      { user: { active: true, role: 'user', age: 25 } },
      { user: { active: true, role: 'admin', age: 30 } },
      { user: { active: false, role: 'user', age: 22 } },
    ];

    commonContexts.forEach((context) => {
      try {
        this.engine.evaluateExpr(rule, context);
      } catch (error) {
        // Ignore errors during pre-warming
      }
    });
  }

  // Helper methods for analysis
  calculateComplexity(rule) {
    return JSON.stringify(rule).length;
  }

  countOperators(rule, counts = {}) {
    if (typeof rule !== 'object' || rule === null) return counts;

    Object.keys(rule).forEach((key) => {
      counts[key] = (counts[key] || 0) + 1;
      if (Array.isArray(rule[key])) {
        rule[key].forEach((item) => {
          if (typeof item === 'object') {
            this.countOperators(item, counts);
          }
        });
      }
    });

    return counts;
  }

  hasRegexOperators(rule) {
    const ruleStr = JSON.stringify(rule);
    return ruleStr.includes('"regex"');
  }

  calculateMaxDepth(rule, depth = 0) {
    if (typeof rule !== 'object' || rule === null) return depth;

    let maxDepth = depth;
    Object.values(rule).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object') {
            maxDepth = Math.max(maxDepth, this.calculateMaxDepth(item, depth + 1));
          }
        });
      }
    });

    return maxDepth;
  }

  preCompileRegex(rule) {
    // Implementation for regex pre-compilation
    return rule;
  }
}
```

## ⚠️ Common Performance Pitfalls

### 1. Creating New Engines Repeatedly

```javascript
// ❌ Creates new engine every time (no caching benefit)
function validateUser(user) {
  const engine = createRuleEngine();
  return engine.evaluateExpr(userRule, user);
}

// ✅ Reuse engine instance
const sharedEngine = createRuleEngine({ maxCacheSize: 2000 });

function validateUser(user) {
  return sharedEngine.evaluateExpr(userRule, user);
}
```

### 2. Poor Rule Ordering

```javascript
// ❌ Expensive operations first
const inefficientRule = rules.and(
  rules.regex('email', complexEmailPattern), // Expensive regex first
  rules.eq('active', true) // Simple check last
);

// ✅ Fast operations first
const efficientRule = rules.and(
  rules.eq('active', true), // Fast check first
  rules.regex('email', complexEmailPattern) // Expensive regex last
);
```

### 3. Bloated Context Objects

```javascript
// ❌ Large unnecessary context
const bloatedContext = {
  user: fullUserObject, // 50KB of user data
  session: fullSessionData, // 100KB of session data
  preferences: allUserPreferences, // 25KB of preferences
  // Only need user.active and user.role
};

// ✅ Minimal context
const minimalContext = {
  user: {
    active: user.active,
    role: user.role,
  },
};
```

### 4. Inefficient Array Operations

```javascript
// ❌ Large arrays in rules
const largeArrayRule = rules.in('user.id', thousandsOfUserIds);

// ✅ Use more specific checks or pre-filter
const efficientRule = rules.and(
  rules.in('user.department', ['eng', 'sales']), // Small array
  rules.gte('user.id', minUserId), // Range check
  rules.lte('user.id', maxUserId)
);
```

### 5. Complex Regex Patterns

```javascript
// ❌ Overly complex regex
const complexPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$';

// ✅ Break into simpler checks
const simpleValidation = rules.and(
  rules.gte('password.length', 8),
  rules.regex('password', '[a-z]'), // Has lowercase
  rules.regex('password', '[A-Z]'), // Has uppercase
  rules.regex('password', '\\d'), // Has digit
  rules.regex('password', '[@$!%*?&]') // Has special char
);
```

## 🔧 Advanced Optimization Techniques

### 1. Rule Compilation and Caching

```javascript
class AdvancedRuleEngine {
  constructor(config) {
    this.baseEngine = createRuleEngine(config);
    this.compiledRules = new Map();
    this.ruleStats = new Map();
  }

  compileRule(ruleId, rule) {
    // Analyze and optimize rule structure
    const optimizedRule = this.optimizeRuleStructure(rule);

    this.compiledRules.set(ruleId, {
      original: rule,
      optimized: optimizedRule,
      compiledAt: Date.now(),
      executionCount: 0,
      totalTime: 0,
    });

    return optimizedRule;
  }

  evaluateCompiledRule(ruleId, context) {
    const compiled = this.compiledRules.get(ruleId);
    if (!compiled) {
      throw new Error(`Rule ${ruleId} not compiled`);
    }

    const startTime = performance.now();
    const result = this.baseEngine.evaluateExpr(compiled.optimized, context);
    const endTime = performance.now();

    // Update statistics
    compiled.executionCount++;
    compiled.totalTime += endTime - startTime;

    return result;
  }

  optimizeRuleStructure(rule) {
    // Implement rule optimization strategies
    return this.reorderForPerformance(rule);
  }

  reorderForPerformance(rule) {
    if (!rule.and && !rule.or) return rule;

    // Reorder AND/OR conditions by estimated performance
    const operator = rule.and ? 'and' : 'or';
    const conditions = rule[operator];

    const scored = conditions.map((condition) => ({
      condition,
      score: this.estimatePerformanceScore(condition),
    }));

    // Sort by performance score (lower = faster)
    scored.sort((a, b) => a.score - b.score);

    return {
      [operator]: scored.map((item) => item.condition),
    };
  }

  estimatePerformanceScore(condition) {
    if (typeof condition !== 'object') return 1;

    // Estimate based on operator type
    const operators = Object.keys(condition);
    if (operators.includes('regex')) return 10; // Slowest
    if (operators.includes('contains')) return 5; // Medium
    if (operators.includes('in')) return 3; // Fast
    if (operators.includes('eq')) return 1; // Fastest

    return 2; // Default
  }

  getRuleStats(ruleId) {
    const compiled = this.compiledRules.get(ruleId);
    if (!compiled) return null;

    return {
      executionCount: compiled.executionCount,
      averageTime: compiled.totalTime / compiled.executionCount,
      totalTime: compiled.totalTime,
      compiledAt: new Date(compiled.compiledAt),
    };
  }
}
```

### 2. Context Preprocessing

```javascript
class ContextProcessor {
  constructor() {
    this.processors = new Map();
  }

  registerProcessor(contextType, processor) {
    this.processors.set(contextType, processor);
  }

  preprocess(contextType, rawContext) {
    const processor = this.processors.get(contextType);
    if (!processor) return rawContext;

    return processor(rawContext);
  }
}

// Example processors
const contextProcessor = new ContextProcessor();

// User context processor
contextProcessor.registerProcessor('user', (raw) => ({
  user: {
    id: raw.user?.id,
    email: raw.user?.email?.toLowerCase(),
    role: raw.user?.role,
    active: Boolean(raw.user?.active),
    age: parseInt(raw.user?.age) || 0,
    permissions: Array.isArray(raw.user?.permissions) ? raw.user.permissions : [],
  },
}));

// Order context processor
contextProcessor.registerProcessor('order', (raw) => ({
  order: {
    id: raw.order?.id,
    total: parseFloat(raw.order?.total) || 0,
    items: Array.isArray(raw.order?.items) ? raw.order.items : [],
    status: raw.order?.status?.toLowerCase(),
    createdAt: raw.order?.createdAt ? new Date(raw.order.createdAt) : null,
  },
}));

// Usage
function evaluateWithPreprocessing(rule, rawContext, contextType) {
  const processedContext = contextProcessor.preprocess(contextType, rawContext);
  return engine.evaluateExpr(rule, processedContext);
}
```

### 3. Lazy Evaluation Strategies

```javascript
class LazyRuleEngine {
  constructor(baseEngine) {
    this.baseEngine = baseEngine;
    this.lazyContexts = new WeakMap();
  }

  createLazyContext(dataSource) {
    const lazyContext = {};
    const accessed = new Set();

    const handler = {
      get: (target, prop) => {
        if (!accessed.has(prop)) {
          accessed.add(prop);
          // Only fetch data when actually needed
          target[prop] = this.resolveProperty(dataSource, prop);
        }
        return target[prop];
      },
    };

    return new Proxy(lazyContext, handler);
  }

  resolveProperty(dataSource, prop) {
    // Implement lazy loading logic based on your data source
    if (typeof dataSource.get === 'function') {
      return dataSource.get(prop);
    }
    return dataSource[prop];
  }

  evaluateExpr(rule, lazyContext) {
    return this.baseEngine.evaluateExpr(rule, lazyContext);
  }
}

// Usage with database-backed lazy loading
class DatabaseLazyContext {
  constructor(userId, db) {
    this.userId = userId;
    this.db = db;
    this.cache = {};
  }

  async get(prop) {
    if (this.cache[prop] !== undefined) {
      return this.cache[prop];
    }

    // Lazy load from database
    switch (prop) {
      case 'user':
        this.cache.user = await this.db.users.findById(this.userId);
        break;
      case 'permissions':
        this.cache.permissions = await this.db.permissions.findByUserId(this.userId);
        break;
      case 'preferences':
        this.cache.preferences = await this.db.preferences.findByUserId(this.userId);
        break;
    }

    return this.cache[prop];
  }
}
```

## 📋 Performance Checklist

### Pre-Production Checklist

- [ ] **Engine Configuration**
  - [ ] Cache enabled with appropriate size
  - [ ] Reasonable depth and operator limits
  - [ ] Strict mode configured based on needs

- [ ] **Rule Optimization**
  - [ ] Fast operations ordered before slow operations
  - [ ] Complex regex patterns simplified where possible
  - [ ] Array sizes minimized in `in`/`notIn` operations

- [ ] **Context Management**
  - [ ] Context objects contain only necessary data
  - [ ] Large objects avoided in context
  - [ ] Data types are consistent and appropriate

- [ ] **Caching Strategy**
  - [ ] Engine instances reused across evaluations
  - [ ] Cache hit rates monitored and optimized
  - [ ] Cache cleanup implemented for long-running apps

- [ ] **Monitoring**
  - [ ] Performance metrics tracked
  - [ ] Slow operations identified and optimized
  - [ ] Memory usage monitored

### Production Monitoring

```javascript
// Production performance monitoring setup
class ProductionMonitor {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.options = {
      slowThreshold: options.slowThreshold || 10, // ms
      memoryAlertThreshold: options.memoryAlertThreshold || 100, // MB
      sampleRate: options.sampleRate || 0.1, // 10%
      ...options,
    };

    this.metrics = {
      evaluations: 0,
      slowEvaluations: 0,
      totalTime: 0,
      errors: 0,
    };

    this.alerts = [];
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Memory monitoring
    setInterval(() => {
      this.checkMemoryUsage();
    }, 60000); // Every minute

    // Performance alerts
    setInterval(() => {
      this.checkPerformanceAlerts();
    }, 300000); // Every 5 minutes
  }

  wrapEvaluateExpr(rule, context) {
    const shouldSample = Math.random() < this.options.sampleRate;

    if (shouldSample) {
      const startTime = performance.now();

      try {
        const result = this.engine.evaluateExpr(rule, context);
        const endTime = performance.now();
        const duration = endTime - startTime;

        this.metrics.evaluations++;
        this.metrics.totalTime += duration;

        if (duration > this.options.slowThreshold) {
          this.metrics.slowEvaluations++;
          this.alerts.push({
            type: 'slow_evaluation',
            duration,
            timestamp: Date.now(),
            rule: this.hashRule(rule),
          });
        }

        return result;
      } catch (error) {
        this.metrics.errors++;
        throw error;
      }
    }

    return this.engine.evaluateExpr(rule, context);
  }

  checkMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;

      if (heapUsedMB > this.options.memoryAlertThreshold) {
        this.alerts.push({
          type: 'high_memory',
          heapUsedMB: Math.round(heapUsedMB),
          timestamp: Date.now(),
        });
      }
    }
  }

  checkPerformanceAlerts() {
    const averageTime = this.metrics.totalTime / this.metrics.evaluations;
    const slowRate = this.metrics.slowEvaluations / this.metrics.evaluations;

    if (averageTime > this.options.slowThreshold / 2) {
      this.alerts.push({
        type: 'degraded_performance',
        averageTime: Math.round(averageTime * 100) / 100,
        timestamp: Date.now(),
      });
    }

    if (slowRate > 0.1) {
      // More than 10% slow evaluations
      this.alerts.push({
        type: 'high_slow_rate',
        slowRate: Math.round(slowRate * 100),
        timestamp: Date.now(),
      });
    }
  }

  hashRule(rule) {
    // Simple rule hash for identification
    return JSON.stringify(rule).substring(0, 100) + '...';
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageTime: this.metrics.totalTime / this.metrics.evaluations,
      slowRate: this.metrics.slowEvaluations / this.metrics.evaluations,
      errorRate: this.metrics.errors / this.metrics.evaluations,
      alerts: this.alerts.slice(-10), // Last 10 alerts
    };
  }

  clearAlerts() {
    this.alerts = [];
  }
}

// Usage
const monitor = new ProductionMonitor(engine, {
  slowThreshold: 5, // Alert for >5ms operations
  memoryAlertThreshold: 500, // Alert at 500MB
  sampleRate: 0.2, // Sample 20% of operations
});

// Replace normal evaluation with monitored version
const monitoredEvaluate = monitor.wrapEvaluateExpr.bind(monitor);

// Use in your application
function validateUser(user) {
  return monitoredEvaluate(userValidationRule, { user });
}

// Check metrics periodically
setInterval(() => {
  const metrics = monitor.getMetrics();
  console.log('Performance metrics:', metrics);

  if (metrics.alerts.length > 0) {
    console.warn('Performance alerts:', metrics.alerts);
    monitor.clearAlerts();
  }
}, 600000); // Every 10 minutes
```

## 🎯 Performance Goals and Targets

### Recommended Performance Targets

| Metric                   | Good        | Excellent  | Notes                         |
| ------------------------ | ----------- | ---------- | ----------------------------- |
| Average Evaluation Time  | < 2ms       | < 1ms      | For typical business rules    |
| Cache Hit Rate           | > 70%       | > 85%      | In steady-state applications  |
| Memory Usage Growth      | < 10MB/hour | < 5MB/hour | For long-running applications |
| 95th Percentile Response | < 10ms      | < 5ms      | For complex rules             |
| Error Rate               | < 1%        | < 0.1%     | Rule evaluation errors        |

### Optimization Priority Matrix

| Impact     | Easy                                                            | Medium                                                                | Hard                                                           |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| **High**   | Enable caching<br/>Reuse engines<br/>Order rules optimally      | Pre-compile rules<br/>Optimize context size<br/>Monitor performance   | Lazy evaluation<br/>Worker pools<br/>Custom operators          |
| **Medium** | Use helper methods<br/>Avoid complex regex<br/>Minimize arrays  | Cache compiled patterns<br/>Preprocess contexts<br/>Batch evaluations | Rule compilation<br/>Context streaming<br/>Memory optimization |
| **Low**    | Add monitoring<br/>Use strict mode wisely<br/>Document patterns | Profile individual rules<br/>Optimize edge cases<br/>Fine-tune limits | Custom caching<br/>Database integration<br/>Advanced analytics |

## 🚀 Quick Wins Summary

The fastest ways to improve performance:

1. **Enable caching** with adequate cache size
2. **Reuse engine instances** across evaluations
3. **Order rule conditions** from fastest to slowest
4. **Minimize context object size** to essential data only
5. **Use simple operators** when possible instead of complex regex
6. **Monitor performance** to identify bottlenecks
7. **Avoid creating new engines** in hot code paths
8. **Batch similar evaluations** when possible

Remember: **Measure first, optimize second**. Use the built-in metrics and monitoring tools to identify actual bottlenecks before optimizing.
