import { ComparisonOperators } from './comparison.js';
import { NumericOperators } from './numeric.js';
import { LogicalOperators } from './logical.js';

/**
 * Register all built-in operators with the rule engine
 */
export function registerBuiltinOperators(engine, pathResolver, config) {
  // Register comparison operators
  const comparisonOps = new ComparisonOperators(pathResolver, config);
  comparisonOps.register(engine);

  // Register numeric operators
  const numericOps = new NumericOperators(pathResolver, config);
  numericOps.register(engine);

  // Register logical operators
  const logicalOps = new LogicalOperators(pathResolver, config);
  logicalOps.register(engine);
}

// Export operator classes for advanced usage
export { ComparisonOperators } from './comparison.js';
export { NumericOperators } from './numeric.js';
export { LogicalOperators } from './logical.js';
export { BaseOperator } from './base/BaseOperator.js';
