/**
 * Operator name constants
 */
export const OPERATOR_NAMES = {
  // Comparison operators
  EQ: 'eq',
  NEQ: 'neq',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',

  // Array operators
  IN: 'in',
  NOT_IN: 'notIn',

  // Logical operators
  AND: 'and',
  OR: 'or',
  NOT: 'not',

  // String operators
  CONTAINS: 'contains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  REGEX: 'regex',

  // Special operators
  BETWEEN: 'between',
  IS_NULL: 'isNull',
  IS_NOT_NULL: 'isNotNull',
};

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  maxDepth: 10,
  maxOperators: 100,
  maxCacheSize: 1000,
  enableCache: true,
  enableDebug: false,
  strict: true,
  allowPrototypeAccess: false,
};
