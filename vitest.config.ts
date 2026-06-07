import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // CLI tests in src/index.test.ts spawn subprocesses with spawnSync and
    // may make real network calls (up to FETCH_TIMEOUT_MS = 15 s).  Set a
    // per-test timeout generous enough to cover the subprocess + overhead,
    // while still failing fast for genuinely hung tests.
    testTimeout: 30_000,
  },
});
