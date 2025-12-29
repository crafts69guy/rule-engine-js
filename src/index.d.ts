/**
 * rule-engine-js TypeScript Definitions
 * A high-performance, secure rule engine with dynamic field comparison support
 */

// =============================================================================
// IMPORTS
// =============================================================================

export * from './types';

import {
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
  StatefulEvaluationResult,
  BatchEvaluationResult,
  BatchEvaluationOptions,
  StateStats,
  CleanupResult,
  HistoryEntry,
  StatefulEventType,
  StatefulEventListener,
  StatefulRuleEngineConfig,
  // Path utility types
  Path,
  PathValue,
  PathsOfType,
  NumericPath,
  StringPath,
  BooleanPath,
  ArrayPath,
} from './types';

// =============================================================================
// CLASSES
// =============================================================================

/**
 * Path resolver for safely accessing nested object properties
 */
export class PathResolver {
  constructor(config?: RuleEngineConfig);
  resolve(context: EvaluationContext, path: string, defaultValue?: unknown): unknown;
  resolveValue(context: EvaluationContext, value: unknown, defaultValue?: unknown): unknown;
  resolveValueOrLiteral(context: EvaluationContext, value: unknown): unknown;
  resolveValueOrDefault(context: EvaluationContext, value: unknown, defaultValue: unknown): unknown;
  clearCache(): void;
  getCacheStats(): { size: number; maxSize: number; hitRate: number } | null;
}

/**
 * Main Rule Engine class
 * Handles rule evaluation, operator management, and performance tracking
 */
export class RuleEngine {
  constructor(config?: RuleEngineConfig);

  // ... (Other properties remain the same) ...
  /** Path resolver instance */
  pathResolver: PathResolver;
  /** Registered operators */
  operators: Map<string, OperatorHandler>;
  /** Performance metrics */
  metrics: RuleEngineMetrics;
  /** Current configuration */
  config: Required<RuleEngineConfig>;

  /**
   * Evaluate a rule expression against a context
   */
  evaluateExpr(expr: RuleExpression, context: EvaluationContext, depth?: number): EvaluationResult;

  /**
   * Register a custom operator
   */
  registerOperator(
    name: string,
    handler: OperatorHandler,
    options?: OperatorRegistrationOptions
  ): void;

  /**
   * Get all registered operators
   */
  getOperators(): string[];

  /**
   * Get performance metrics
   */
  getMetrics(): RuleEngineMetrics;

  /**
   * Clear all caches
   */
  clearCache(): void;

  /**
   * Get current configuration
   */
  getConfig(): Required<RuleEngineConfig>;

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats;
}

/**
 * Stateful Rule Engine
 * Wraps base RuleEngine to add state tracking and event-driven capabilities
 */
export class StatefulRuleEngine {
  constructor(engine: RuleEngine, options?: StatefulRuleEngineConfig);

  /**
   * Evaluate a rule with state tracking
   */
  evaluate(
    ruleId: string,
    rule: RuleExpression,
    context: EvaluationContext
  ): Promise<StatefulEvaluationResult>;

  /**
   * Evaluate multiple rules in batch
   */
  evaluateBatch(
    rules: Record<string, RuleExpression>,
    context: EvaluationContext,
    options?: BatchEvaluationOptions
  ): Promise<BatchEvaluationResult>;

  /**
   * Add event listener
   */
  on(event: StatefulEventType, listener: StatefulEventListener): void;

  /**
   * Remove event listener
   */
  off(event: StatefulEventType, listener: StatefulEventListener): void;

  /**
   * Emit event to all listeners
   */
  emit(event: StatefulEventType, data: unknown): void;

  /**
   * Get evaluation history for a rule
   */
  getHistory(ruleId?: string): HistoryEntry[];

  /**
   * Get all history (across all rules)
   */
  getAllHistory(): HistoryEntry[];

  /**
   * Get history statistics
   */
  getHistoryStats(): { size: number; oldestAge: number | null };

  /**
   * Clear state for a specific rule or all rules
   */
  clearState(ruleId?: string): void;

  /**
   * Get state statistics
   */
  getStateStats(): StateStats;

  /**
   * Get concurrency statistics
   */
  getConcurrencyStats(): unknown; // TODO: Define ConcurrencyStats type if needed

  /**
   * Cleanup expired states
   */
  cleanupExpiredStates(): CleanupResult;

  /**
   * Get listener count for an event
   */
  getListenerCount(event: StatefulEventType): number;

  /**
   * Get all listener counts
   */
  getAllListenerCounts(): Record<StatefulEventType, number>;

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: StatefulEventType): void;

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void;

  /**
   * Start cleanup timer
   */
  startCleanupTimer(): void;

  /**
   * Destroy the engine and cleanup resources
   */
  destroy(): void;
}

// =============================================================================
// RULE HELPERS
// =============================================================================

/**
 * Field comparison helpers with optional path autocomplete
 * @template T - Context type for path inference (default: any for untyped usage)
 */
export interface FieldHelpers<T = any> {
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
 * Validation helpers with optional path autocomplete
 * @template T - Context type for path inference (default: any for untyped usage)
 */
export interface ValidationHelpers<T = any> {
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
 * Rule building helpers class with optional path autocomplete
 *
 * @template T - Context type for path inference (default: any for untyped usage)
 *
 * @example
 * // Untyped usage (backward compatible)
 * const helpers = createRuleHelpers();
 * helpers.eq('any.path', 'value');
 *
 * @example
 * // Typed usage with path autocomplete
 * interface UserContext {
 *   user: { name: string; age: number; email: string };
 *   order: { total: number; status: string };
 * }
 *
 * const helpers = createRuleHelpers<UserContext>();
 *
 * // IDE will autocomplete paths: 'user', 'user.name', 'user.age', etc.
 * const rule = helpers.and(
 *   helpers.gte('user.age', 18),        // ✓ path autocomplete
 *   helpers.eq('user.name', 'John'),    // ✓ type-safe value
 * );
 */
export class RuleHelpers<T = any> {
  /** Operator name constants */
  ops: OperatorNames;
  /** Field comparison helpers */
  field: FieldHelpers<T>;
  /** Validation pattern helpers */
  validation: ValidationHelpers<T>;

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
// ERROR CLASSES
// =============================================================================

/**
 * Base error class for rule engine errors
 */
export class RuleEngineError extends Error {
  constructor(
    message: string,
    operator?: string | null,
    context?: Record<string, unknown>,
    cause?: Error
  );
  operator: string | null;
  context: Record<string, unknown>;
  timestamp: string;
}

/**
 * Error thrown when an operator fails
 */
export class OperatorError extends RuleEngineError {
  constructor(message: string, operator: string, context?: Record<string, unknown>, cause?: Error);
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends RuleEngineError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error);
}

// =============================================================================
// UTILITY CLASSES
// =============================================================================

/**
 * Type coercion and validation utilities
 */
export class TypeUtils {
  static coerceToNumber(value: unknown, strict?: boolean): number | null;
  static coerceToString(value: unknown, strict?: boolean): string | null;
  static coerceToBoolean(value: unknown, strict?: boolean): boolean | null;
  static isEqual(left: unknown, right: unknown, strict?: boolean): boolean;

  static isObject(value: unknown): value is Record<string, unknown>;
  static isArray(value: unknown): value is unknown[];
  static isString(value: unknown): value is string;
  static isNumber(value: unknown): value is number;
  static isBoolean(value: unknown): value is boolean;
  static isNull(value: unknown): boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Built-in operator names
 */
export const OPERATOR_NAMES: OperatorNames;

/**
 * State change operator names
 */
export const STATE_OPERATOR_NAMES: StateOperatorNames;

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new rule engine instance with built-in operators
 */
export function createRuleEngine(config?: RuleEngineConfig): {
  evaluateExpr: (
    expr: RuleExpression,
    context: EvaluationContext,
    depth?: number
  ) => EvaluationResult;
  registerOperator: (
    name: string,
    handler: OperatorHandler,
    options?: OperatorRegistrationOptions
  ) => void;
  getOperators: () => string[];
  getMetrics: () => RuleEngineMetrics;
  getConfig: () => Required<RuleEngineConfig>;
  getCacheStats: () => CacheStats;
  clearCache: () => void;
  resolvePath: (context: EvaluationContext, path: string, defaultValue?: unknown) => unknown;
  resolveValue: (context: EvaluationContext, value: unknown, defaultValue?: unknown) => unknown;
  OPERATOR_NAMES: OperatorNames;
  _internal: {
    pathResolver: PathResolver;
    engine: RuleEngine;
  };
};

/**
 * Create a new RuleHelpers instance
 *
 * @example
 * // Untyped usage (backward compatible)
 * const helpers = createRuleHelpers();
 * helpers.eq('any.path', 'value');
 *
 * @example
 * // Typed usage with path autocomplete
 * interface MyContext {
 *   user: { name: string; age: number; email: string };
 *   order: { total: number; status: string };
 * }
 *
 * const helpers = createRuleHelpers<MyContext>();
 *
 * // IDE will autocomplete paths: 'user', 'user.name', 'user.age', etc.
 * const rule = helpers.and(
 *   helpers.gte('user.age', 18),        // ✓ path autocomplete
 *   helpers.eq('user.name', 'John'),    // ✓ type-safe value
 * );
 */
export function createRuleHelpers<T = any>(): RuleHelpers<T>;
