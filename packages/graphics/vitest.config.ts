import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // test/browser runs in Chromium: test:browser.
    include: ["test/*.test.ts", "test/*.test.tsx"],
    alias: {
      "@uberscene/kit/schema": new URL("../kit/src/schema.ts", import.meta.url).pathname,
      "@uberscene/sdk/resolver": new URL("../sdk/src/resolver.ts", import.meta.url).pathname,
      "@uberscene/sdk": new URL("../sdk/src/index.ts", import.meta.url).pathname,
      "@uberscene/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
    },
  },
});
