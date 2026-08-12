import { defineConfig } from 'vitest/config';

// Dedicated config for mutation testing (Stryker).
// Mutation testing only needs tests that exercise the mutated library
// (scripts/lib/data-pipeline.js). The golden-file, real-dataset, and
// frontend tests are excluded here — byte-comparison against committed
// files is incompatible with Stryker's source instrumentation.
export default defineConfig({
  test: {
    include: [
      'tests/unit/data-pipeline.test.mjs',
      'tests/property/**/*.test.mjs'
    ],
    environment: 'node'
  }
});
