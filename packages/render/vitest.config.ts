import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    alias: {
      "@uberscene/kit/schema": new URL("../kit/src/schema.ts", import.meta.url).pathname,
      "@uberscene/sdk/resolver": new URL("../sdk/src/resolver.ts", import.meta.url).pathname,
      "@uberscene/sdk": new URL("../sdk/src/index.ts", import.meta.url).pathname,
      "@uberscene/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
      "@uberscene/player/engine": new URL("../player/src/engine.ts", import.meta.url).pathname,
    },
  },
});
