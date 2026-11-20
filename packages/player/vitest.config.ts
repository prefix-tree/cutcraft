import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    alias: {
      "@uberscene/kit/schema": new URL("../kit/src/schema.ts", import.meta.url).pathname,
      "@uberscene/sdk": new URL("../sdk/src/index.ts", import.meta.url).pathname,
      "@uberscene/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
      "@uberscene/player/engine": new URL("./src/engine.ts", import.meta.url).pathname,
      "@uberscene/player": new URL("./src/index.ts", import.meta.url).pathname,
    },
  },
});
