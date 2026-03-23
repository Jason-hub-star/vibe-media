import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web"),
    },
  },
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "apps/backend/tests/**/*.test.ts"
    ]
  }
});
