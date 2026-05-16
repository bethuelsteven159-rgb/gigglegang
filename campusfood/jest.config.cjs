module.exports = {
  clearMocks: true,
  collectCoverage: true,

  collectCoverageFrom: [
    'server.js',
    'js/**/*.js',

    // Ignore test files
    '!**/*.test.js',
    '!**/*.spec.js',

    // Ignore files that should not be measured in coverage
    '!js/admin_analytics.js',
    '!js/main.js',

    // Ignore dependencies
    '!node_modules/**'
  ],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/js/admin_analytics.js',
    '<rootDir>/js/main.js'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/server.test.js',
        '<rootDir>/**/*.server.test.js'
      ]
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/js/**/*.test.js',
        '<rootDir>/js/**/*.spec.js'
      ]
    }
  ]
};
