import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    alias: {
      "@cutcut/kit/source": new URL("../../packages/kit/src/source/index-public.ts", import.meta.url).pathname,
      "@cutcut/kit": new URL("../../packages/kit/src/index.ts", import.meta.url).pathname,
      "@cutcut/player": new URL("../../packages/player/src/index.ts", import.meta.url).pathname,
    },
  },
});
