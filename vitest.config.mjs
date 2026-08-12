import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.mjs', 'tests/property/**/*.test.mjs'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['scripts/lib/**/*.js'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85
      }
    }
  }
});
