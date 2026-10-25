import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", "docs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // Graphics are drawn by the browser preview and the Node export alike.
      // Nothing in src/ may touch the DOM or Node built-ins.
      "no-restricted-globals": ["error", "window", "document", "navigator", "localStorage", "process"],
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["node:*", "fs", "path", "os", "child_process"], message: "src/ must stay runtime-neutral." }] },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["test/**", "fixtures/**", "scripts/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
