import { defineConfig } from "vitest/config";

// The same suites run under node and jsdom: the SDK must never depend on
// either runtime, so a test that passes in one and fails in the other is a bug.
const shared = {
  globals: true,
  include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  alias: {
    "@uberscene/kit/schema": new URL("../kit/src/schema.ts", import.meta.url).pathname,
    "@uberscene/kit": new URL("../kit/src/index.ts", import.meta.url).pathname,
    "@uberscene/sdk/resolver": new URL("./src/resolver.ts", import.meta.url).pathname,
    "@uberscene/sdk": new URL("./src/index.ts", import.meta.url).pathname,
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
