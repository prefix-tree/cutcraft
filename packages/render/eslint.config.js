import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // The browser-export spike is throwaway measurement code (see spike/README.md), not part of the package.
  { ignores: ["node_modules/**", "dist/**", "spike/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "test/**/*.ts", "bench/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
