/**
 * Rule Engine JS - Main entry point
 */

import { RuleEngine } from './core/RuleEngine.js';
import { OPERATOR_NAMES } from './constants/operators.js';
import { registerBuiltinOperators } from './operators/index.js';

/**
 * Create a new rule engine instance with built-in operators
 */
export function createRuleEngine(config = {}) {
  const engine = new RuleEngine(config);

  // Register all built-in operators
  registerBuiltinOperators(engine, engine.pathResolver, engine.config);

  return {
    // Core functionality
    evaluateExpr: engine.evaluateExpr.bind(engine),
    registerOperator: engine.registerOperator.bind(engine),

    // Metadata & monitoring
    getOperators: engine.getOperators.bind(engine),
    getMetrics: engine.getMetrics.bind(engine),
    getConfig: engine.getConfig.bind(engine),
    getCacheStats: engine.getCacheStats.bind(engine),
    clearCache: engine.clearCache.bind(engine),

    // Safe path resolution methods
    resolvePath: (context, path, defaultValue) =>
      engine.pathResolver.resolve(context, path, defaultValue),

    resolveValue: (context, value, defaultValue) =>
      engine.pathResolver.resolveValueOrLiteral(context, value, defaultValue),

    // Constants
    OPERATOR_NAMES,

    // Advanced: Only for custom operator development
    _internal: {
      pathResolver: engine.pathResolver,
      engine: engine,
    },
  };
}

// Re-export important classes and constants
export { OPERATOR_NAMES } from './constants/operators.js';
export { RuleEngineError, OperatorError, ValidationError } from './utils/errors.js';
export { PathResolver } from './core/PathResolver.js';
export { RuleEngine } from './core/RuleEngine.js';
export { TypeUtils } from './utils/TypeUtils.js';

// Export rule helpers
export { createRuleHelpers, RuleHelpers } from './helpers/index.js';
