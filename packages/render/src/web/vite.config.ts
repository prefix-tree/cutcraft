// Builds the export page into dist/web/page for the published package; the workspace serves it from source instead.

import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("./page/", import.meta.url)),
  base: "./",
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  define: { "process.env": "{}" },
  build: {
    outDir: fileURLToPath(new URL("../../dist/web/page/", import.meta.url)),
    emptyOutDir: true,
    target: "es2022",
  },
  logLevel: "warn",
});
