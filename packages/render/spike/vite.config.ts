// Spike: the export page, served from source like the launch-recap example. Throwaway.
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here("./page"),
  plugins: [react()],
  resolve: {
    alias: {
      "@cutcraft/kit/source": here("../../kit/src/source/index-public.ts"),
      "@cutcraft/kit": here("../../kit/src/index.ts"),
      "@cutcraft/player/fonts.css": here("../../player/fonts.css"),
      "@cutcraft/player": here("../../player/src/index.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  define: { "process.env": "{}" },
  server: { fs: { allow: [here("../../..")] }, port: 5321, strictPort: true },
  optimizeDeps: { include: ["react", "react-dom/client", "mediabunny", "zod"] },
});
