import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/localGame.test.ts", "test/integration.test.ts", "test/pending-order.test.ts"],
  },
});
