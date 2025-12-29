/**
 * Shared type definitions for rule-engine-js
 * These types are used across the library for better TypeScript support
 */

// =============================================================================
// PATH UTILITY TYPES (inlined from dot-path-value for zero dependencies)
// Credit: https://github.com/g-makarov/dot-path-value
// =============================================================================

/**
 * Primitive types that don't have nested properties
 */
type Primitive = null | undefined | string | number | boolean | symbol | bigint;

/**
 * Check if array type is a tuple (fixed length) vs regular array
 */
type IsTuple<T extends ReadonlyArray<unknown>> = number extends T['length'] ? false : true;

/**
 * Get tuple keys (numeric string indices)
 */
type TupleKeys<T extends ReadonlyArray<unknown>> = Exclude<keyof T, keyof unknown[]>;

/**
 * Array index key type
 */
type ArrayKey = number;

/**
 * Concatenate path segments, stopping at primitives
 */
type PathConcat<TKey extends string, TValue> = TValue extends Primitive
  ? TKey
  : TKey | `${TKey}.${Path<TValue>}`;

/**
 * Generate all possible dot-notation paths for a type
 * @example
 * type User = { name: string; address: { city: string } };
 * type UserPaths = Path<User>; // "name" | "address" | "address.city"
 */
export type Path<T> =
  T extends ReadonlyArray<infer V>
    ? IsTuple<T> extends true
      ? { [K in TupleKeys<T>]-?: PathConcat<K & string, T[K]> }[TupleKeys<T>]
      : PathConcat<`${ArrayKey}`, V>
    : { [K in keyof T]-?: PathConcat<K & string, T[K]> }[keyof T];

/**
 * Get the value type at a specific path
 * @example
 * type User = { name: string; address: { city: string } };
 * type City = PathValue<User, "address.city">; // string
 */
export type PathValue<T, TPath extends string> = T extends unknown
  ? TPath extends `${infer K}.${infer R}`
    ? K extends keyof T
      ? R extends Path<T[K]>
        ? undefined extends T[K]
          ? PathValue<T[K], R> | undefined
          : PathValue<T[K], R>
        : never
      : K extends `${ArrayKey}`
        ? T extends ReadonlyArray<infer V>
          ? PathValue<V, R & string>
          : never
        : never
    : TPath extends keyof T
      ? T[TPath]
      : TPath extends `${ArrayKey}`
        ? T extends ReadonlyArray<infer V>
          ? V
          : never
        : never
  : never;

/**
 * Filter paths by value type - get only paths that resolve to compatible types
 * @example
 * type User = { name: string; age: number };
 * type StringPaths = PathsOfType<User, string>; // "name"
 */
export type PathsOfType<T, V> = {
  [P in Path<T>]: PathValue<T, P> extends V ? P : never;
}[Path<T>];

/**
 * Paths that resolve to numeric values
 */
export type NumericPath<T> = PathsOfType<T, number>;

/**
 * Paths that resolve to string values
 */
export type StringPath<T> = PathsOfType<T, string>;

/**
 * Paths that resolve to boolean values
 */
export type BooleanPath<T> = PathsOfType<T, boolean>;

/**
 * Paths that resolve to array values
 */
export type ArrayPath<T> = PathsOfType<T, ReadonlyArray<unknown>>;

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Rule expression - a JSON object representing a rule
 * Keys are operator names, values are arrays of arguments
 */
export interface RuleExpression {
  [operator: string]: unknown[];
}

/**
 * Evaluation context - data object to evaluate rules against
 */
export type EvaluationContext = Record<string, unknown>;

/**
 * Result of rule evaluation
 */
export interface EvaluationResult {
  /** Whether the rule evaluated to true */
  success: boolean;
  /** The operator that was evaluated (if applicable) */
  operator?: string;
  /** Error message if evaluation failed */
  error?: string;
  /** Additional details about the evaluation */
  details?: Record<string, unknown>;
  /** Timestamp of when the error occurred */
  timestamp?: string;
}

/**
 * Rule engine configuration options
 */
export interface RuleEngineConfig {
  /** Maximum nesting depth for rules (default: 10) */
  maxDepth?: number;
  /** Maximum number of operators in a rule (default: 100) */
  maxOperators?: number;
  /** Maximum cache size for expression results (default: 1000) */
  maxCacheSize?: number;
  /** Enable expression caching (default: true) */
  enableCache?: boolean;
  /** Enable debug logging (default: false) */
  enableDebug?: boolean;
  /** Strict mode - throw on unknown operators (default: true) */
  strict?: boolean;
  /** Allow prototype access in paths (default: false) */
  allowPrototypeAccess?: boolean;
}

/**
 * Performance metrics for the rule engine
 */
export interface RuleEngineMetrics {
  /** Total number of evaluations */
  evaluations: number;
  /** Number of cache hits */
  cacheHits: number;
  /** Number of errors */
  errors: number;
  /** Total evaluation time in ms */
  totalTime: number;
  /** Average evaluation time in ms */
  avgTime: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  expression: {
    size: number;
    maxSize: number;
  } | null;
  path: {
    size: number;
    maxSize: number;
  };
}

// =============================================================================
// OPERATOR TYPES
// =============================================================================

/**
 * Operator names constants
 */
export interface OperatorNames {
  EQ: string;
  NEQ: string;
  GT: string;
  GTE: string;
  LT: string;
  LTE: string;
  IN: string;
  NOT_IN: string;
  AND: string;
  OR: string;
  NOT: string;
  CONTAINS: string;
  STARTS_WITH: string;
  ENDS_WITH: string;
  REGEX: string;
  BETWEEN: string;
  IS_NULL: string;
  IS_NOT_NULL: string;
}

/**
 * State operator names constants
 */
export interface StateOperatorNames {
  CHANGED: string;
  CHANGED_BY: string;
  CHANGED_FROM: string;
  CHANGED_TO: string;
  INCREASED: string;
  DECREASED: string;
}

/**
 * Options for comparison operators
 */
export interface ComparisonOptions {
  /** Strict equality check (default: true) */
  strict?: boolean;
}

/**
 * Options for string operators
 */
export interface StringOptions {
  /** Strict equality check (default: true) */
  strict?: boolean;
  /** Regex flags (e.g. 'i', 'g') - only for regex operator */
  flags?: string;
}

/**
 * Operator handler function type
 */
export type OperatorHandler = (
  args: unknown[],
  context: EvaluationContext,
  evaluateExpr: (
    expr: RuleExpression,
    context: EvaluationContext,
    depth?: number
  ) => EvaluationResult,
  depth: number
) => boolean;

/**
 * Operator registration options
 */
export interface OperatorRegistrationOptions {
  /** Allow overwriting existing operator */
  allowOverwrite?: boolean;
}

// =============================================================================
// RULE HELPERS TYPES
// =============================================================================

/**
 * Field comparison helpers
 */
export interface FieldHelpers {
  equals(leftPath: string, rightPath: string, options?: ComparisonOptions): RuleExpression;
  greaterThan(leftPath: string, rightPath: string, options?: ComparisonOptions): RuleExpression;
  greaterThanOrEqual(
    leftPath: string,
    rightPath: string,
    options?: ComparisonOptions
  ): RuleExpression;
  lessThan(leftPath: string, rightPath: string, options?: ComparisonOptions): RuleExpression;
  lessThanOrEqual(leftPath: string, rightPath: string, options?: ComparisonOptions): RuleExpression;
}

/**
 * Validation helpers
 */
export interface ValidationHelpers {
  email(path: string): RuleExpression;
  required(path: string): RuleExpression;
  minAge(path: string, minAge: number): RuleExpression;
  maxAge(path: string, maxAge: number): RuleExpression;
  ageRange(path: string, minAge: number, maxAge: number): RuleExpression;
  oneOf(path: string, values: unknown[] | string): RuleExpression;
  minLength(path: string, minLength: number): RuleExpression;
  maxLength(path: string, maxLength: number): RuleExpression;
  lengthRange(path: string, minLength: number, maxLength: number): RuleExpression;
  exactLength(path: string, length: number): RuleExpression;
}

// =============================================================================
// TYPED RULE HELPERS (with generic type inference)
// =============================================================================

/**
 * Typed field comparison helpers with path autocomplete
 */
export interface TypedFieldHelpers<T> {
  equals<P extends Path<T>>(
    leftPath: P,
    rightPath: Path<T>,
    options?: ComparisonOptions
  ): RuleExpression;
  greaterThan<P extends NumericPath<T>>(
    leftPath: P,
    rightPath: NumericPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;
  greaterThanOrEqual<P extends NumericPath<T>>(
    leftPath: P,
    rightPath: NumericPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;
  lessThan<P extends NumericPath<T>>(
    leftPath: P,
    rightPath: NumericPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;
  lessThanOrEqual<P extends NumericPath<T>>(
    leftPath: P,
    rightPath: NumericPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;
}

/**
 * Typed validation helpers with path autocomplete
 */
export interface TypedValidationHelpers<T> {
  email<P extends StringPath<T>>(path: P): RuleExpression;
  required<P extends Path<T>>(path: P): RuleExpression;
  minAge<P extends NumericPath<T>>(path: P, minAge: number): RuleExpression;
  maxAge<P extends NumericPath<T>>(path: P, maxAge: number): RuleExpression;
  ageRange<P extends NumericPath<T>>(path: P, minAge: number, maxAge: number): RuleExpression;
  oneOf<P extends Path<T>>(path: P, values: PathValue<T, P>[] | ArrayPath<T>): RuleExpression;
  minLength<P extends StringPath<T>>(path: P, minLength: number): RuleExpression;
  maxLength<P extends StringPath<T>>(path: P, maxLength: number): RuleExpression;
  lengthRange<P extends StringPath<T>>(
    path: P,
    minLength: number,
    maxLength: number
  ): RuleExpression;
  exactLength<P extends StringPath<T>>(path: P, length: number): RuleExpression;
}

/**
 * Typed rule helpers with full path autocomplete and type inference
 * @example
 * interface UserContext {
 *   user: { name: string; age: number; email: string };
 *   order: { total: number; items: string[] };
 * }
 *
 * const helpers = createRuleHelpers<UserContext>();
 *
 * // IDE will autocomplete paths: 'user', 'user.name', 'user.age', etc.
 * const rule = helpers.and(
 *   helpers.gte('user.age', 18),        // ✓ autocomplete works
 *   helpers.eq('user.name', 'John'),    // ✓ type-safe
 *   helpers.in('order.status', ['pending', 'completed'])  // ✓ validates array type
 * );
 */
export interface TypedRuleHelpers<T> {
  /** Operator name constants */
  ops: OperatorNames;
  /** Typed field comparison helpers */
  field: TypedFieldHelpers<T>;
  /** Typed validation pattern helpers */
  validation: TypedValidationHelpers<T>;

  // Comparison operators with path autocomplete
  eq<P extends Path<T>>(
    left: P,
    right: PathValue<T, P> | Path<T>,
    options?: ComparisonOptions
  ): RuleExpression;

  neq<P extends Path<T>>(
    left: P,
    right: PathValue<T, P> | Path<T>,
    options?: ComparisonOptions
  ): RuleExpression;

  gt<P extends NumericPath<T>>(
    left: P,
    right: number | NumericPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;

  gte<P extends NumericPath<T>>(
    left: P,
    right: number | NumericPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;

  lt<P extends NumericPath<T>>(
    left: P,
    right: number | NumericPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;

  lte<P extends NumericPath<T>>(
    left: P,
    right: number | NumericPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;

  // Logical operators
  and(...expressions: RuleExpression[]): RuleExpression;
  or(...expressions: RuleExpression[]): RuleExpression;
  not(expression: RuleExpression): RuleExpression;

  // String operators with path autocomplete
  contains<P extends StringPath<T>>(
    left: P,
    right: string | StringPath<T>,
    options?: StringOptions
  ): RuleExpression;

  startsWith<P extends StringPath<T>>(
    left: P,
    right: string | StringPath<T>,
    options?: StringOptions
  ): RuleExpression;

  endsWith<P extends StringPath<T>>(
    left: P,
    right: string | StringPath<T>,
    options?: StringOptions
  ): RuleExpression;

  regex<P extends StringPath<T>>(left: P, right: string, options?: StringOptions): RuleExpression;

  // Array operators with path autocomplete
  in<P extends Path<T>>(
    left: P,
    right: PathValue<T, P>[] | ArrayPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;

  notIn<P extends Path<T>>(
    left: P,
    right: PathValue<T, P>[] | ArrayPath<T>,
    options?: ComparisonOptions
  ): RuleExpression;

  // Special operators with path autocomplete
  between<P extends NumericPath<T>>(
    value: P,
    range: [number, number],
    options?: ComparisonOptions
  ): RuleExpression;

  isNull<P extends Path<T>>(path: P): RuleExpression;
  isNotNull<P extends Path<T>>(path: P): RuleExpression;

  // Convenience methods with path autocomplete
  isTrue<P extends BooleanPath<T>>(path: P): RuleExpression;
  isFalse<P extends BooleanPath<T>>(path: P): RuleExpression;
  isEmpty<P extends StringPath<T>>(path: P): RuleExpression;
  isNotEmpty<P extends StringPath<T>>(path: P): RuleExpression;
  exists<P extends Path<T>>(path: P): RuleExpression;
}

// =============================================================================
// STATEFUL ENGINE TYPES
// =============================================================================

/**
 * Stateful evaluation result
 */
export interface StatefulEvaluationResult extends EvaluationResult {
  /** Whether the rule was triggered (false -> true transition) */
  triggered: boolean;
  /** Previous evaluation result */
  previousResult?: boolean;
  /** Timestamp of evaluation */
  timestamp: string;
  /** Rule ID */
  ruleId: string;
}

/**
 * Batch evaluation result
 */
export interface BatchEvaluationResult {
  /** Results keyed by rule ID */
  results: Record<string, StatefulEvaluationResult>;
  /** Whether all evaluations succeeded */
  success: boolean;
  /** Number of successful evaluations */
  successCount: number;
  /** Number of failed evaluations */
  errorCount: number;
  /** Total number of evaluations */
  totalCount: number;
  /** Array of errors if collectErrors was enabled */
  errors?: BatchEvaluationError[];
}

/**
 * Batch evaluation error
 */
export interface BatchEvaluationError {
  ruleId: string;
  rule: RuleExpression;
  error: {
    message: string;
    operator?: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Batch evaluation options
 */
export interface BatchEvaluationOptions {
  /** Stop processing on first error */
  stopOnError?: boolean;
  /** Collect detailed error information */
  collectErrors?: boolean;
}

/**
 * State statistics
 */
export interface StateStats {
  totalRules: number;
  historySize: number;
  listenerCounts: Record<string, number>;
  oldestStateAge: number | null;
  memoryEstimate: {
    states: string;
    history: string;
    total: string;
  };
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  removedCount: number;
  removedRules: string[];
  timestamp: string;
}

/**
 * History entry
 */
export interface HistoryEntry {
  ruleId: string;
  result: StatefulEvaluationResult;
  context: EvaluationContext;
  timestamp: string;
}

/**
 * Stateful engine event types
 */
export type StatefulEventType = 'triggered' | 'untriggered' | 'changed' | 'evaluated';

/**
 * Stateful engine event payload
 */
export interface StatefulEvent {
  ruleId: string;
  result: StatefulEvaluationResult;
  context: EvaluationContext;
  previousResult?: boolean;
  timestamp: string;
}

/**
 * Stateful engine event listener
 */
export type StatefulEventListener = (event: StatefulEvent) => void;

/**
 * Concurrency configuration
 */
export interface ConcurrencyConfig {
  /** Maximum concurrent evaluations per rule */
  maxConcurrent?: number;
  /** Evaluation timeout in milliseconds */
  timeout?: number;
  /** Callback when evaluation times out */
  onTimeout?: (ruleId: string) => void;
  /** Callback when queue is full */
  onQueueFull?: (ruleId: string, queueSize: number) => void;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  enabled?: boolean;
  maxAttempts?: number;
  strategy?: 'exponential' | 'fixed' | 'linear';
  initialDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error, ruleId: string) => void;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  enabled?: boolean;
  failureThreshold?: number;
  resetTimeout?: number;
  onCircuitOpen?: (ruleId: string, info: { failures: number; lastFailure: Date }) => void;
}

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  enabled?: boolean;
  defaultValue?: unknown;
  onFallback?: (ruleId: string, type: string, value: unknown) => void;
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  retry?: RetryConfig;
  circuitBreaker?: CircuitBreakerConfig;
  fallback?: FallbackConfig;
}

/**
 * Stateful rule engine configuration
 */
export interface StatefulRuleEngineConfig {
  /** Trigger on every change, not just false -> true transitions */
  triggerOnEveryChange?: boolean;
  /** Store evaluation history */
  storeHistory?: boolean;
  /** Maximum global history size (legacy mode) */
  maxHistorySize?: number;
  /** Maximum history per rule (recommended) */
  maxHistoryPerRule?: number;
  /** State expiration time in milliseconds */
  stateExpirationMs?: number | null;
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs?: number;
  /** Enable deep copy of contexts */
  enableDeepCopy?: boolean;
  /** Maximum listeners before warning */
  maxListeners?: number;
  /** Concurrency control configuration */
  concurrency?: ConcurrencyConfig;
  /** Error recovery configuration */
  errorRecovery?: ErrorRecoveryConfig;
  /** Persistence configuration */
  persistence?: {
    enabled: boolean;
    autoSaveInterval?: number;
    onStateSave?: (state: string) => Promise<void>;
    onStateLoad?: () => Promise<string>;
    onHistorySave?: (entry: HistoryEntry) => Promise<void>;
  };
}
