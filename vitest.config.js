import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    fileParallelism: false,
    env: {
      // Placeholder only: ingest-risk-pdf.test.js mocks the Bedrock client,
      // so this satisfies config's required-secret check without a real key.
      AWS_BEARER_TOKEN_BEDROCK: 'test-token'
    },
    coverage: {
      provider: 'v8',
      clean: false,
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [...configDefaults.exclude, 'coverage']
    },
    setupFiles: ['test/setup.js'],
    include: [
      'test/unit/**/*.test.js',
      'test/integration/**/*.test.js',
      'src/**/*.test.js'
    ]
  }
})
