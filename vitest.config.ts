import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["**/node_modules/**", "**/.next/**", "**/.worktrees/**", "tests/e2e/**"],
    setupFiles: ["./tests/setup.ts"]
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
