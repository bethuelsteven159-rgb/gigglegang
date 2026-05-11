module.exports = {
  clearMocks: true,
  collectCoverage: true,

  collectCoverageFrom: [
    'server.js',
    'js/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!node_modules/**'
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