import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    alias: {
      "@uberscene/kit/source": new URL("../packages/kit/src/source/index-public.ts", import.meta.url).pathname,
      "@uberscene/kit": new URL("../packages/kit/src/index.ts", import.meta.url).pathname,
    },
  },
});
