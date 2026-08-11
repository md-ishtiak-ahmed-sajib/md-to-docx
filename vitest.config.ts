import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'web/src/**/*.test.js', 'desktop/test/**/*.test.js'],
    globals: true,
    environment: 'node',
  },
})
