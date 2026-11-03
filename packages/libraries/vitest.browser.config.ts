import { defineConfig } from "vitest/config";

// Free code in a real Chromium: WebGL, Web Animations and layout, which jsdom has none of.
export default defineConfig({ test: { globals: true, environment: "node", include: ["test/browser/*.test.ts"], testTimeout: 120_000, hookTimeout: 120_000 } });
