import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here("."),
  publicDir: here("public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@cutcraft/kit": here("../../../kit/src/index.ts"),
      "@cutcraft/player": here("../../src/index.ts"),
    },
  },
  server: { port: 5179, strictPort: true, fs: { allow: [here("../../..")] } },
  optimizeDeps: { include: ["react", "react-dom/client", "mediabunny", "zod"] },
});
