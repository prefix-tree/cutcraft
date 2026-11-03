import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // test/browser runs in Chromium: test:browser.
    include: ["test/*.test.ts"],
    alias: {
      "@cutcraft/kit/source": new URL("../kit/src/source/index-public.ts", import.meta.url).pathname,
      "@cutcraft/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
    },
  },
});
