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
        statements: 95.55,
        branches: 88.55,
        functions: 96.35,
        lines: 96.65,
      },
    },
  },
})
