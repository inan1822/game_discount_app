import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",  // required for ESM + mongodb-memory-server
  },
})
