import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@uberscene/kit/source": here("../../packages/kit/src/source/index-public.ts"),
      "@uberscene/kit": here("../../packages/kit/src/index.ts"),
      "@uberscene/player/fonts.css": here("../../packages/player/fonts.css"),
      "@uberscene/player": here("../../packages/player/src/index.ts"),
    },
  },
  // The lint runs in the page through the kit's source tools, which pull Babel; Babel reads process.env.
  define: { "process.env": "{}" },
  server: { fs: { allow: [here("../..")] } },
  optimizeDeps: { include: ["react", "react-dom/client", "mediabunny", "zod"] },
});
