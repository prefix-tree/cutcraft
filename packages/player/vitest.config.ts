import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    alias: {
      "@cut/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
      "@cut/player": new URL("./src/index.ts", import.meta.url).pathname,
    },
  },
});
