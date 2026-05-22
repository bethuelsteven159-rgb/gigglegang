module.exports = {
  clearMocks: true,
  collectCoverage: true,

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  projects: [
    {
      displayName: 'backend',
      rootDir: '..',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/backend/**/*.test.js',
        '<rootDir>/backend/**/*.spec.js'
      ],
      collectCoverageFrom: [
        '<rootDir>/backend/**/*.js',
        '!<rootDir>/backend/**/*.test.js',
        '!<rootDir>/backend/**/*.spec.js',
        '!<rootDir>/backend/node_modules/**'
      ],
      coveragePathIgnorePatterns: [
        '/node_modules/'
      ]
    },
    {
      displayName: 'frontend',
      rootDir: '.',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/js/**/*.test.js',
        '<rootDir>/js/**/*.spec.js'
      ],
      collectCoverageFrom: [
        '<rootDir>/js/**/*.js',

        '!<rootDir>/js/**/*.test.js',
        '!<rootDir>/js/**/*.spec.js',

        '!<rootDir>/js/config/supabase.js',
        '!<rootDir>/js/admin_analytics.js',
        '!<rootDir>/js/main.js',

        '!<rootDir>/node_modules/**'
      ],
      coveragePathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/js/config/supabase.js',
        '<rootDir>/js/admin_analytics.js',
        '<rootDir>/js/main.js'
      ]
    }
  ]
};