import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/registry/": here("../registry/"),
      "@/": here("./src/"),
      "@uberscene/kit/schema": here("../../kit/src/schema.ts"),
      "@uberscene/sdk/resolver": here("../../sdk/src/resolver.ts"),
      "@uberscene/sdk": here("../../sdk/src/index.ts"),
      "@uberscene/kit": here("../../kit/src/index.ts"),
      "@uberscene/player/fonts.css": here("../../player/fonts.css"),
      "@uberscene/player": here("../../player/src/index.ts"),
      "@uberscene/editor": here("../src/index.ts"),
    },
  },
  // The SDK's source tools pull Babel; Babel reads process.env.
  define: { "process.env": "{}" },
  server: { fs: { allow: [here("../../..")] } },
  optimizeDeps: { include: ["react", "react-dom/client", "mediabunny", "zod"] },
});
