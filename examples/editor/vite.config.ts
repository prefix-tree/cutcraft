import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/": here("./src/"),
      "@uberscene/kit/schema": here("../../packages/kit/src/schema.ts"),
      "@uberscene/sdk/resolver": here("../../packages/sdk/src/resolver.ts"),
      "@uberscene/sdk": here("../../packages/sdk/src/index.ts"),
      "@uberscene/kit": here("../../packages/kit/src/index.ts"),
      "@uberscene/player/fonts.css": here("../../packages/player/fonts.css"),
      "@uberscene/player": here("../../packages/player/src/index.ts"),
      "@uberscene/editor": here("../../packages/editor/src/index.ts"),
    },
  },
  // The SDK's source tools pull Babel; Babel reads process.env.
  define: { "process.env": "{}" },
  server: { fs: { allow: [here("../..")] } },
  optimizeDeps: { include: ["react", "react-dom/client", "mediabunny", "zod"] },
});
