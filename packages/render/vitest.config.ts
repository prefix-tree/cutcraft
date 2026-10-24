import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    alias: {
      "@cutcut/kit/source": new URL("../kit/src/source/index-public.ts", import.meta.url).pathname,
      "@cutcut/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
      "@cutcut/player/engine": new URL("../player/src/engine.ts", import.meta.url).pathname,
    },
  },
});
