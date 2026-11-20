import { defineConfig } from "vitest/config";

const src = (path: string) => new URL(path, import.meta.url).pathname;

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    alias: {
      "@uberscene/kit/schema": src("../kit/src/schema.ts"),
      "@uberscene/sdk/resolver": src("../sdk/src/resolver.ts"),
      "@uberscene/sdk": src("../sdk/src/index.ts"),
      "@uberscene/kit": src("../kit/src/index.ts"),
      "@uberscene/player/engine": src("../player/src/engine.ts"),
      "@uberscene/player": src("../player/src/index.ts"),
    },
  },
});
