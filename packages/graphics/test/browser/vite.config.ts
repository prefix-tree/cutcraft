import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const src = (p: string): string => new URL(p, import.meta.url).pathname;

export default defineConfig({
  root: src("./page"),
  plugins: [react()],
  logLevel: "error",
  resolve: {
    alias: {
      "@cutcraft/kit": src("../../../kit/src/index.ts"),
      "@cutcraft/player": src("../../../player/src/index.ts"),
    },
    dedupe: ["react", "react-dom", "three"],
  },
  server: { port: 0, fs: { allow: [src("../../../..")] } },
});
