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
  FieldHelpers,
  ValidationHelpers,
  StatefulEvaluationResult,
  BatchEvaluationResult,
  BatchEvaluationOptions,
  StateStats,
  CleanupResult,
  HistoryEntry,
  StatefulEventType,
  StatefulEventListener,
  StatefulRuleEngineConfig
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

/**
 * Rule building helpers class
 */
export class RuleHelpers {
  /** Operator name constants */
  ops: OperatorNames;
  /** Field comparison helpers */
  field: FieldHelpers;
  /** Validation pattern helpers */
  validation: ValidationHelpers;

  // Comparison operators
  eq(
    left: string | number,
    right: string | number | boolean,
    options?: ComparisonOptions
  ): RuleExpression;
  neq(
    left: string | number,
    right: string | number | boolean,
    options?: ComparisonOptions
  ): RuleExpression;
  gt(left: string | number, right: string | number, options?: ComparisonOptions): RuleExpression;
  gte(left: string | number, right: string | number, options?: ComparisonOptions): RuleExpression;
  lt(left: string | number, right: string | number, options?: ComparisonOptions): RuleExpression;
  lte(left: string | number, right: string | number, options?: ComparisonOptions): RuleExpression;

  // Logical operators
  and(...expressions: RuleExpression[]): RuleExpression;
  or(...expressions: RuleExpression[]): RuleExpression;
  not(expression: RuleExpression): RuleExpression;

  // String operators
  contains(left: string, right: string, options?: StringOptions): RuleExpression;
  startsWith(left: string, right: string, options?: StringOptions): RuleExpression;
  endsWith(left: string, right: string, options?: StringOptions): RuleExpression;
  regex(left: string, right: string, options?: StringOptions): RuleExpression;

  // Array operators
  in(left: string, right: unknown[] | string, options?: ComparisonOptions): RuleExpression;
  notIn(left: string, right: unknown[] | string, options?: ComparisonOptions): RuleExpression;

  // Special operators
  between(value: string, range: [number, number], options?: ComparisonOptions): RuleExpression;
  isNull(path: string): RuleExpression;
  isNotNull(path: string): RuleExpression;

  // Convenience methods
  isTrue(path: string): RuleExpression;
  isFalse(path: string): RuleExpression;
  isEmpty(path: string): RuleExpression;
  isNotEmpty(path: string): RuleExpression;
  exists(path: string): RuleExpression;
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
 */
export function createRuleHelpers(): RuleHelpers;
