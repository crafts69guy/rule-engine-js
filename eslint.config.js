import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2021,
        // Test helpers from tests/setup.js
        expectRuleToPass: 'readonly',
        expectRuleToFail: 'readonly',
        testContext: 'readonly',
      },
    },
  },
];
