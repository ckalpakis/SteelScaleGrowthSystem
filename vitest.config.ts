import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Transform JSX/TSX with the automatic runtime so component modules can be
  // imported and server-rendered in tests (tsconfig uses jsx: "preserve" for Next).
  // Vite 8 transforms with oxc. Next's tsconfig sets `jsx: "preserve"`, which
  // would leave JSX untransformed in tests; override to the automatic runtime so
  // component modules can be imported and server-rendered.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
