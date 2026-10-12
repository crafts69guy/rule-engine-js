// jest.config.cjs
module.exports = {
  testEnvironment: 'node',
  watchman: false,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/**/*.spec.js'],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  coverageThreshold: {
    global: {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98,
    },
  },

  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js'],

  // Transform ES modules to CommonJS for Jest
  transform: {
    '^.+\\.js$': [
      'babel-jest',
      {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { node: 'current' },
              modules: 'auto', // Let Babel decide based on environment
            },
          ],
        ],
      },
    ],
  },

  // Handle module resolution
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Don't transform these node_modules
  transformIgnorePatterns: ['node_modules/(?!(@babel|@rollup)/)'],

  verbose: true,
};
