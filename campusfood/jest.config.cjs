module.exports = {
  clearMocks: true,
  collectCoverage: true,

  collectCoverageFrom: [
    '<rootDir>/../backend/**/*.js',
    '<rootDir>/js/**/*.js',

    // Ignore test files
    '!**/*.test.js',
    '!**/*.spec.js',

    // Ignore config/setup files that are tested indirectly or mocked
    '!<rootDir>/js/config/supabase.js',

    // Ignore files that should not be measured in coverage
    '!<rootDir>/js/admin_analytics.js',
    '!<rootDir>/js/main.js',

    // Ignore dependencies
    '!<rootDir>/node_modules/**',
    '!<rootDir>/../backend/node_modules/**'
  ],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/js/config/supabase.js',
    '<rootDir>/js/admin_analytics.js',
    '<rootDir>/js/main.js',
    '<rootDir>/../backend/node_modules/'
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/../backend/**/*.test.js',
        '<rootDir>/../backend/**/*.spec.js',
        '<rootDir>/../backend/server.test.js',
        '<rootDir>/../backend/**/*.server.test.js'
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
