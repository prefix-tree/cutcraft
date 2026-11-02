// A cut file's source as a running module, the same way everywhere it runs: the editor's preview and a server-side
// check. Sucrase removes TypeScript types and compiles JSX and imports; the result runs with a `require` that offers
// react, zod and the kit and nothing else, so a file that imports anything more fails here as it would in the browser.
//
// This evaluates the source in the caller's realm. A host that loads files it does not trust runs this in a sandbox
// (an iframe, a permission-less Deno).
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { transform } from "sucrase";
import * as zod from "zod";
import * as kit from "../index";
import type { ReactNode } from "react";
import type { ZodObject } from "zod";

/** What a cut file exports: the schema of its tweakable values, their defaults, and the video itself. */
export interface CutModule {
  schema?: ZodObject;
  defaults?: Record<string, unknown>;
  default: (props: Record<string, unknown>) => ReactNode;
}

/** The modules a cut file may import. `@cut/kit` is the kit's old name, still accepted from older files. */
export const ALLOWED_IMPORTS: Readonly<Record<string, unknown>> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  zod,
  "@cutcraft/kit": kit,
  "@cut/kit": kit,
};

export function loadModule(source: string): CutModule {
  const { code } = transform(source, {
    transforms: ["typescript", "jsx", "imports"],
    keepUnusedImports: true,
    jsxRuntime: "automatic",
    production: true,
  });
  const module = { exports: {} as Record<string, unknown> };
  const require = (name: string) => {
    if (!(name in ALLOWED_IMPORTS)) throw new Error(`The file imports “${name}”, which a cut file may not.`);
    return ALLOWED_IMPORTS[name];
  };
  new Function("require", "exports", "module", code)(require, module.exports, module);
  if (typeof module.exports.default !== "function") throw new Error("The file has no default export (the video).");
  return module.exports as unknown as CutModule;
}
