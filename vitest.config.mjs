import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'test/*.test.mjs',
      'src/**/*.test.mjs',
      'server/**/*.test.mjs',
      'scripts/**/*.test.mjs',
      'tools/**/*.test.mjs',
      'web/**/*.test.mjs',
    ],
    setupFiles: ['test/setup.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.mjs', 'server/**/*.mjs', 'web/js/**/*.mjs'],
      exclude: ['**/*.test.mjs', 'web/js/main.mjs'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        statements: 96.1,
        branches: 88,
        functions: 98.1,
        lines: 97.1,
      },
    },
  },
})
