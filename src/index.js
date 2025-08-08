/**
 * Rule Engine JS - Main entry point
 */

// Simple test exports
export const VERSION = '1.0.0';

export function createRuleEngine(config = {}) {
  return {
    version: VERSION,
    config: config,
    evaluate: () => ({ success: true })
  };
}

export const OPERATOR_NAMES = {
  EQ: 'eq',
  AND: 'and'
};
