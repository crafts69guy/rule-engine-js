import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'types/**', 'coverage/**', 'docs/**', 'examples/**', 'test-projects/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        expectRuleToPass: 'readonly',
        expectRuleToFail: 'readonly',
        testContext: 'readonly',
      },
    },
  },
];
