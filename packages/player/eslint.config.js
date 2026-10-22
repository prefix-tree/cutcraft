import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", "test-results/**", "playwright-report/**", "e2e/app/public/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // The player is browser code; it may touch the DOM but never Node.
      "no-restricted-globals": ["error", "process"],
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["node:*", "fs", "path", "os", "child_process"], message: "src/ runs in the browser." }] },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["test/**", "e2e/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
