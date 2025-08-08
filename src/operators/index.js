import { ComparisonOperators } from './comparison.js';
import { NumericOperators } from './numeric.js';
import { LogicalOperators } from './logical.js';
import { StringOperators } from './string.js';
import { RegexOperator } from './regex.js';
import { ArrayOperators } from './array.js';
import { SpecialOperators } from './special.js';

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

  // Register string operators
  const stringOps = new StringOperators(pathResolver, config);
  stringOps.register(engine);

  // Register regex operator
  const regexOp = new RegexOperator(pathResolver, config);
  regexOp.register(engine);

  // Register array operators
  const arrayOps = new ArrayOperators(pathResolver, config);
  arrayOps.register(engine);

  // Register special operators
  const specialOps = new SpecialOperators(pathResolver, config);
  specialOps.register(engine);
}

// Export operator classes for advanced usage
export { ComparisonOperators } from './comparison.js';
export { NumericOperators } from './numeric.js';
export { LogicalOperators } from './logical.js';
export { StringOperators } from './string.js';
export { RegexOperator } from './regex.js';
export { ArrayOperators } from './array.js';
export { SpecialOperators } from './special.js';
export { BaseOperator } from './base/BaseOperator.js';
