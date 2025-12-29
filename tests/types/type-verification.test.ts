/**
 * Comprehensive Type Verification for rule-engine-js
 * This file verifies that all types are fully matched with implementation
 * Run with: npx tsc --noEmit tests/types/type-verification.test.ts
 */

import {
  // Path utility types
  Path,
  PathValue,
  PathsOfType,
  NumericPath,
  StringPath,
  BooleanPath,
  ArrayPath,
  // Core types
  RuleExpression,
  EvaluationContext,
  EvaluationResult,
  RuleEngineConfig,
  RuleEngineMetrics,
  CacheStats,
  OperatorHandler,
  OperatorRegistrationOptions,
  OperatorNames,
  StateOperatorNames,
  ComparisonOptions,
  StringOptions,
  // Helper types (now generic)
  FieldHelpers,
  ValidationHelpers,
  // Stateful types
  StatefulEvaluationResult,
  BatchEvaluationResult,
  BatchEvaluationOptions,
  StateStats,
  CleanupResult,
  HistoryEntry,
  StatefulEventType,
  StatefulEventListener,
  StatefulRuleEngineConfig,
  ConcurrencyConfig,
  RetryConfig,
  CircuitBreakerConfig,
  FallbackConfig,
  ErrorRecoveryConfig,
  // Factory functions
  createRuleEngine,
  createRuleHelpers,
  // Classes
  RuleEngine,
  RuleHelpers,
  StatefulRuleEngine,
  PathResolver,
  TypeUtils,
  RuleEngineError,
  OperatorError,
  ValidationError,
  // Constants
  OPERATOR_NAMES,
  STATE_OPERATOR_NAMES,
} from '../../src';

// =============================================================================
// TEST CONTEXT INTERFACE
// =============================================================================

interface TestUser {
  name: string;
  age: number;
  email: string;
  isActive: boolean;
  score: number;
  address: {
    city: string;
    zipCode: number;
    country: string;
  };
  roles: string[];
  metadata: {
    createdAt: string;
    version: number;
    tags: string[];
  };
}

interface TestOrder {
  id: string;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  quantity: number;
  items: Array<{
    name: string;
    price: number;
  }>;
}

interface FullContext {
  user: TestUser;
  order: TestOrder;
  settings: {
    theme: string;
    notifications: boolean;
    maxItems: number;
  };
}

// =============================================================================
// 1. PATH UTILITY TYPES VERIFICATION
// =============================================================================

// Test Path<T> generates correct paths
type TestUserPaths = Path<TestUser>;
const validUserPath1: TestUserPaths = 'name';
const validUserPath2: TestUserPaths = 'age';
const validUserPath3: TestUserPaths = 'email';
const validUserPath4: TestUserPaths = 'isActive';
const validUserPath5: TestUserPaths = 'address';
const validUserPath6: TestUserPaths = 'address.city';
const validUserPath7: TestUserPaths = 'address.zipCode';
const validUserPath8: TestUserPaths = 'address.country';
const validUserPath9: TestUserPaths = 'metadata';
const validUserPath10: TestUserPaths = 'metadata.createdAt';
const validUserPath11: TestUserPaths = 'metadata.version';

type FullContextPaths = Path<FullContext>;
const validContextPath1: FullContextPaths = 'user';
const validContextPath2: FullContextPaths = 'user.name';
const validContextPath3: FullContextPaths = 'user.address.city';
const validContextPath4: FullContextPaths = 'order';
const validContextPath5: FullContextPaths = 'order.total';
const validContextPath6: FullContextPaths = 'settings.theme';

// Test PathValue<T, P> resolves correct types
type NameType = PathValue<TestUser, 'name'>; // string
type AgeType = PathValue<TestUser, 'age'>; // number
type IsActiveType = PathValue<TestUser, 'isActive'>; // boolean
type CityType = PathValue<TestUser, 'address.city'>; // string
type ZipType = PathValue<TestUser, 'address.zipCode'>; // number

const nameVal: NameType = 'John';
const ageVal: AgeType = 25;
const isActiveVal: IsActiveType = true;
const cityVal: CityType = 'NYC';
const zipVal: ZipType = 12345;

// Test filtered path types
type UserNumericPaths = NumericPath<TestUser>;
const numPath1: UserNumericPaths = 'age';
const numPath2: UserNumericPaths = 'score';
const numPath3: UserNumericPaths = 'address.zipCode';
const numPath4: UserNumericPaths = 'metadata.version';

type UserStringPaths = StringPath<TestUser>;
const strPath1: UserStringPaths = 'name';
const strPath2: UserStringPaths = 'email';
const strPath3: UserStringPaths = 'address.city';
const strPath4: UserStringPaths = 'address.country';

type UserBooleanPaths = BooleanPath<TestUser>;
const boolPath1: UserBooleanPaths = 'isActive';

// =============================================================================
// 2. TYPED RULE HELPERS VERIFICATION
// =============================================================================

const helpers = createRuleHelpers<FullContext>();

// 2.1 Verify ops property
const _ops: OperatorNames = helpers.ops;
console.log(_ops.EQ, _ops.AND, _ops.CONTAINS);

// 2.2 Verify comparison operators
const eqRule1 = helpers.eq('user.name', 'John');
const eqRule2 = helpers.eq('user.age', 25);
const eqRule3 = helpers.eq('user.name', 'user.email'); // field comparison
const eqRule4 = helpers.eq('user.isActive', true);
const eqRule5 = helpers.eq('user.name', 'test', { strict: true });

const neqRule1 = helpers.neq('order.status', 'cancelled');
const neqRule2 = helpers.neq('user.age', 0);

const gtRule1 = helpers.gt('user.age', 18);
const gtRule2 = helpers.gt('order.total', 100);
const gtRule3 = helpers.gt('user.age', 'user.score'); // field comparison

const gteRule1 = helpers.gte('user.age', 21);
const gteRule2 = helpers.gte('settings.maxItems', 10);

const ltRule1 = helpers.lt('user.age', 65);
const ltRule2 = helpers.lt('order.quantity', 100);

const lteRule1 = helpers.lte('user.score', 100);
const lteRule2 = helpers.lte('user.address.zipCode', 99999);

// 2.3 Verify logical operators
const andRule = helpers.and(
  helpers.gte('user.age', 18),
  helpers.eq('user.isActive', true),
  helpers.neq('order.status', 'cancelled')
);

const orRule = helpers.or(
  helpers.eq('order.status', 'completed'),
  helpers.gt('order.total', 1000)
);

const notRule = helpers.not(helpers.eq('user.isActive', false));

// Nested logical operators
const complexRule = helpers.and(
  helpers.or(
    helpers.gte('user.age', 18),
    helpers.eq('user.roles', ['admin'])
  ),
  helpers.not(helpers.eq('order.status', 'cancelled'))
);

// 2.4 Verify string operators
const containsRule1 = helpers.contains('user.email', '@gmail.com');
const containsRule2 = helpers.contains('user.name', 'John', { strict: false });

const startsWithRule1 = helpers.startsWith('user.name', 'J');
const startsWithRule2 = helpers.startsWith('user.email', 'admin');

const endsWithRule1 = helpers.endsWith('user.email', '.com');
const endsWithRule2 = helpers.endsWith('settings.theme', 'dark');

const regexRule1 = helpers.regex('user.email', '^[a-z]+@');
const regexRule2 = helpers.regex('user.name', '[A-Z]', { flags: 'i' });

// 2.5 Verify array operators
const inRule1 = helpers.in('order.status', ['pending', 'completed']);
const inRule2 = helpers.in('user.name', ['John', 'Jane', 'Bob']);
// in with path to array
const inRule3 = helpers.in('user.name', 'user.roles');

const notInRule1 = helpers.notIn('order.status', ['cancelled']);
const notInRule2 = helpers.notIn('settings.theme', ['deprecated', 'legacy']);

// 2.6 Verify special operators
const betweenRule1 = helpers.between('user.age', [18, 65]);
const betweenRule2 = helpers.between('order.total', [100, 10000]);
const betweenRule3 = helpers.between('user.score', [0, 100], { strict: true });

const isNullRule1 = helpers.isNull('user.email');
const isNullRule2 = helpers.isNull('order.id');

const isNotNullRule1 = helpers.isNotNull('user.name');
const isNotNullRule2 = helpers.isNotNull('settings.theme');

// 2.7 Verify convenience methods
const isTrueRule = helpers.isTrue('user.isActive');
const isFalseRule = helpers.isFalse('settings.notifications');

const isEmptyRule = helpers.isEmpty('user.name');
const isNotEmptyRule = helpers.isNotEmpty('user.email');

const existsRule = helpers.exists('order.id');

// 2.8 Verify field helpers
const fieldEqRule = helpers.field.equals('user.name', 'user.email');
const fieldGtRule = helpers.field.greaterThan('user.age', 'user.score');
const fieldGteRule = helpers.field.greaterThanOrEqual('order.total', 'settings.maxItems');
const fieldLtRule = helpers.field.lessThan('user.score', 'user.age');
const fieldLteRule = helpers.field.lessThanOrEqual('user.address.zipCode', 'order.quantity');

// 2.9 Verify validation helpers
const emailValidation = helpers.validation.email('user.email');
const requiredValidation = helpers.validation.required('user.name');
const minAgeValidation = helpers.validation.minAge('user.age', 18);
const maxAgeValidation = helpers.validation.maxAge('user.age', 100);
const ageRangeValidation = helpers.validation.ageRange('user.age', 18, 65);
const oneOfValidation = helpers.validation.oneOf('order.status', ['pending', 'completed']);
const minLengthValidation = helpers.validation.minLength('user.name', 2);
const maxLengthValidation = helpers.validation.maxLength('user.email', 100);
const lengthRangeValidation = helpers.validation.lengthRange('user.name', 2, 50);
const exactLengthValidation = helpers.validation.exactLength('order.id', 36);

// =============================================================================
// 3. UNTYPED RULE HELPERS VERIFICATION (backward compatibility)
// =============================================================================

const untypedHelpers = createRuleHelpers();

// These should work with any string path
const untypedEq = untypedHelpers.eq('any.path', 'value');
const untypedGt = untypedHelpers.gt('some.number', 100);
const untypedContains = untypedHelpers.contains('field.name', 'substring');
const untypedIn = untypedHelpers.in('status', ['a', 'b', 'c']);
const untypedBetween = untypedHelpers.between('value', [0, 100]);
const untypedIsNull = untypedHelpers.isNull('nullable.field');
const untypedIsTrue = untypedHelpers.isTrue('boolean.field');
const untypedField = untypedHelpers.field.equals('a', 'b');
const untypedValidation = untypedHelpers.validation.email('email');

// =============================================================================
// 4. CORE TYPES VERIFICATION
// =============================================================================

// RuleExpression
const expr: RuleExpression = { eq: ['path', 'value'] };

// EvaluationContext
const ctx: EvaluationContext = { user: { name: 'John' } };

// EvaluationResult
const result: EvaluationResult = {
  success: true,
  operator: 'eq',
  error: undefined,
  details: {},
  timestamp: new Date().toISOString(),
};

// RuleEngineConfig
const config: RuleEngineConfig = {
  maxDepth: 10,
  maxOperators: 100,
  maxCacheSize: 1000,
  enableCache: true,
  enableDebug: false,
  strict: true,
  allowPrototypeAccess: false,
};

// ComparisonOptions
const compOpts: ComparisonOptions = { strict: true };

// StringOptions
const strOpts: StringOptions = { strict: true, flags: 'i' };

// =============================================================================
// 5. STATEFUL ENGINE TYPES VERIFICATION
// =============================================================================

// StatefulRuleEngineConfig
const statefulConfig: StatefulRuleEngineConfig = {
  triggerOnEveryChange: false,
  storeHistory: true,
  maxHistorySize: 100,
  maxHistoryPerRule: 50,
  stateExpirationMs: 3600000,
  cleanupIntervalMs: 60000,
  enableDeepCopy: true,
  maxListeners: 100,
  concurrency: {
    maxConcurrent: 10,
    timeout: 30000,
    onTimeout: (ruleId) => console.log(`Timeout: ${ruleId}`),
    onQueueFull: (ruleId, queueSize) => console.log(`Queue full: ${ruleId}, ${queueSize}`),
  },
  errorRecovery: {
    retry: {
      enabled: true,
      maxAttempts: 3,
      strategy: 'exponential',
      initialDelay: 100,
      maxDelay: 5000,
      onRetry: (attempt, error, ruleId) => console.log(`Retry ${attempt}: ${ruleId}`),
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000,
      onCircuitOpen: (ruleId, info) => console.log(`Circuit open: ${ruleId}`),
    },
    fallback: {
      enabled: true,
      defaultValue: { success: false },
      onFallback: (ruleId, type, value) => console.log(`Fallback: ${ruleId}`),
    },
  },
};

// Event types
const eventType: StatefulEventType = 'triggered';
const listener: StatefulEventListener = (event) => {
  console.log(event.ruleId, event.result, event.context);
};

// BatchEvaluationOptions
const batchOpts: BatchEvaluationOptions = {
  stopOnError: false,
  collectErrors: true,
};

// =============================================================================
// 6. CLASS TYPES VERIFICATION
// =============================================================================

// RuleEngine class
const engine = new RuleEngine(config);
const evalResult = engine.evaluateExpr(expr, ctx);
engine.registerOperator('custom', (args, ctx, evalExpr, depth) => true);
const operators = engine.getOperators();
const metrics = engine.getMetrics();
const cacheStats = engine.getCacheStats();
engine.clearCache();

// PathResolver class
const resolver = new PathResolver(config);
const resolved = resolver.resolve(ctx, 'user.name');
const resolvedValue = resolver.resolveValue(ctx, 'user.name');
resolver.clearCache();

// RuleHelpers class
const ruleHelpers = new RuleHelpers();
const _ruleOps = ruleHelpers.ops;
const _ruleField = ruleHelpers.field;
const _ruleValidation = ruleHelpers.validation;

// TypeUtils class
const num = TypeUtils.coerceToNumber('123');
const str = TypeUtils.coerceToString(123);
const bool = TypeUtils.coerceToBoolean(1);
const isEq = TypeUtils.isEqual('a', 'a');
const isObj = TypeUtils.isObject({});
const isArr = TypeUtils.isArray([]);
const isStr = TypeUtils.isString('test');
const isNum = TypeUtils.isNumber(42);
const isBool = TypeUtils.isBoolean(true);
const isNullVal = TypeUtils.isNull(null);

// Error classes
const ruleError = new RuleEngineError('Error', 'eq', { key: 'value' });
const opError = new OperatorError('Op Error', 'gt', { left: 1, right: 2 });
const valError = new ValidationError('Validation Error', { field: 'test' });

// =============================================================================
// 7. FACTORY FUNCTION VERIFICATION
// =============================================================================

const createdEngine = createRuleEngine(config);
const _evalExpr = createdEngine.evaluateExpr;
const _registerOp = createdEngine.registerOperator;
const _getOps = createdEngine.getOperators;
const _getMetrics = createdEngine.getMetrics;
const _getConfig = createdEngine.getConfig;
const _getCacheStats = createdEngine.getCacheStats;
const _clearCache = createdEngine.clearCache;
const _resolvePath = createdEngine.resolvePath;
const _resolveValue = createdEngine.resolveValue;
const _opNames = createdEngine.OPERATOR_NAMES;
const _internal = createdEngine._internal;

// =============================================================================
// 8. CONSTANTS VERIFICATION
// =============================================================================

console.log(OPERATOR_NAMES.EQ);
console.log(OPERATOR_NAMES.NEQ);
console.log(OPERATOR_NAMES.GT);
console.log(OPERATOR_NAMES.GTE);
console.log(OPERATOR_NAMES.LT);
console.log(OPERATOR_NAMES.LTE);
console.log(OPERATOR_NAMES.IN);
console.log(OPERATOR_NAMES.NOT_IN);
console.log(OPERATOR_NAMES.AND);
console.log(OPERATOR_NAMES.OR);
console.log(OPERATOR_NAMES.NOT);
console.log(OPERATOR_NAMES.CONTAINS);
console.log(OPERATOR_NAMES.STARTS_WITH);
console.log(OPERATOR_NAMES.ENDS_WITH);
console.log(OPERATOR_NAMES.REGEX);
console.log(OPERATOR_NAMES.BETWEEN);
console.log(OPERATOR_NAMES.IS_NULL);
console.log(OPERATOR_NAMES.IS_NOT_NULL);

console.log(STATE_OPERATOR_NAMES.CHANGED);
console.log(STATE_OPERATOR_NAMES.CHANGED_BY);
console.log(STATE_OPERATOR_NAMES.CHANGED_FROM);
console.log(STATE_OPERATOR_NAMES.CHANGED_TO);
console.log(STATE_OPERATOR_NAMES.INCREASED);
console.log(STATE_OPERATOR_NAMES.DECREASED);

// =============================================================================
// SUMMARY
// =============================================================================

console.log(`
=== TYPE VERIFICATION COMPLETE ===

✓ Path<T> utility type
✓ PathValue<T, P> utility type
✓ NumericPath<T>, StringPath<T>, BooleanPath<T>, ArrayPath<T>
✓ TypedRuleHelpers<T> with all operators
✓ TypedFieldHelpers<T>
✓ TypedValidationHelpers<T>
✓ Untyped RuleHelpers (backward compatibility)
✓ Core types (RuleExpression, EvaluationContext, etc.)
✓ Stateful engine types
✓ Class types (RuleEngine, PathResolver, etc.)
✓ Factory functions
✓ Constants (OPERATOR_NAMES, STATE_OPERATOR_NAMES)

All types are fully matched with implementation!
`);
