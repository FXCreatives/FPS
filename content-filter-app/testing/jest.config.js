module.exports = {
  // Test environment configuration
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.{test,spec}.{js,ts}'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.config.js',
    '!**/test/**'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],

  // Test setup
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.js'
  ],

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Module file extensions
  moduleFileExtensions: ['js', 'ts', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest'
  },

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Global test configuration
  globals: {
    'ts-jest': {
      useESM: true
    }
  },

  // Test reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};