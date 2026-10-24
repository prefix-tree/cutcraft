import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    alias: {
      "@cutcut/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
      "@cutcut/player/engine": new URL("./src/engine.ts", import.meta.url).pathname,
      "@cutcut/player": new URL("./src/index.ts", import.meta.url).pathname,
    },
  },
});
