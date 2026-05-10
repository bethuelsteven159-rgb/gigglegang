module.exports = {
  clearMocks: true,
  collectCoverage: true,

  collectCoverageFrom: [
    'server.js',
    'js/**/*.js',
    '!**/*.test.js',
    '!node_modules/**'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/server.test.js']
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/__tests__/payment.test.js',
        '<rootDir>/__tests__/checkout-payment.test.js',
        '<rootDir>/__tests__/student-cancel-refund.test.js'
      ]
    }
  ]
};