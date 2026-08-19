import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'test/*.test.mjs',
      'src/**/*.test.mjs',
      'scripts/**/*.test.mjs',
      'tools/**/*.test.mjs',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.mjs'],
      exclude: ['**/*.test.mjs'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        statements: 95.4,
        branches: 88.2,
        functions: 96.2,
        lines: 96.5,
      },
    },
  },
})
