// jest.config.cjs
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/**/*.spec.js'],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
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
