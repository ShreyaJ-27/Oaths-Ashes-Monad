import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/monad-e2e.test.ts"],
    testTimeout: 180000,
    fileParallelism: false,
    poolOptions: {
      threads: { singleThread: true },
    },
    sequence: { concurrent: false },
  },
});
