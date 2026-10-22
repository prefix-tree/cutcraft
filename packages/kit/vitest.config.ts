import { defineConfig } from "vitest/config";

// The same suites run under node and jsdom: the kit must never depend on
// either runtime, so a test that passes in one and fails in the other is a bug.
const shared = {
  globals: true,
  include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  alias: {
    "@cut/kit/source": new URL("./src/source/index-public.ts", import.meta.url).pathname,
    "@cut/kit": new URL("./src/index.ts", import.meta.url).pathname,
  },
};

export default defineConfig({
  test: {
    projects: [
      { test: { ...shared, name: "node", environment: "node" } },
      { test: { ...shared, name: "jsdom", environment: "jsdom" } },
    ],
  },
});
