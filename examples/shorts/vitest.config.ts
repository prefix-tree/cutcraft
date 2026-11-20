import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    alias: {
      "@uberscene/kit/schema": new URL("../../packages/kit/src/schema.ts", import.meta.url).pathname,
      "@uberscene/sdk/resolver": new URL("../../packages/sdk/src/resolver.ts", import.meta.url).pathname,
      "@uberscene/sdk": new URL("../../packages/sdk/src/index.ts", import.meta.url).pathname,
      "@uberscene/kit": new URL("../../packages/kit/src/index.ts", import.meta.url).pathname,
    },
  },
});
