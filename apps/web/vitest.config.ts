import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/tests/unit/setup.ts"],
    include: ["src/tests/unit/**/*.test.ts"],
    restoreMocks: true,
  },
});
