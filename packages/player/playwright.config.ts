import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  globalSetup: "./e2e/gen-media.ts",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5179",
    headless: true,
    browserName: "chromium",
    launchOptions: {
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
      ],
    },
  },
  webServer: {
    command: "pnpm exec vite --config e2e/app/vite.config.ts",
    url: "http://localhost:5179",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
