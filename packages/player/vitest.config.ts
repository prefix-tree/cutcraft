import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    alias: {
      "@cutcraft/kit/source": new URL("../kit/src/source/index-public.ts", import.meta.url).pathname,
      "@cutcraft/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
      "@cutcraft/player/engine": new URL("./src/engine.ts", import.meta.url).pathname,
      "@cutcraft/player/overlays": new URL("./src/overlays.ts", import.meta.url).pathname,
      "@cutcraft/player": new URL("./src/index.ts", import.meta.url).pathname,
    },
  },
});
