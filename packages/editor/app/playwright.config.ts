import { defineConfig } from "@playwright/test";

// The demo is the test bed: each test makes an edit with the pointer or the keyboard, then reads the file it leaves.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5182",
    headless: true,
    browserName: "chromium",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      // A Chromium of your own instead of the one `playwright install` downloads.
      ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  webServer: {
    command: "pnpm exec vite --port 5182 --strictPort",
    url: "http://localhost:5182",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
