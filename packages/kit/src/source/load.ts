// A cut file's source as a running module, the same way everywhere it runs: the editor's preview and a server-side
// check. Sucrase removes TypeScript types and compiles JSX and imports; the result runs with a `require` that offers
// react, zod and the kit, plus whatever modules the host passes (a page that bundled three.js offers it here), so a
// file that imports anything else fails here as it would in the browser.
//
// This evaluates the source in the caller's realm. A host that loads files it does not trust runs this in a sandbox
// (an iframe, a permission-less Deno).

import type { ReactNode } from "react";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { transform } from "sucrase";
import type { ZodObject } from "zod";
import * as zod from "zod";

import * as kit from "../index";
import { collectShaders, MODULE_SHADERS } from "../jsx/shaders";
import { collectFonts, MODULE_FONTS } from "../theme/fonts";

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

export interface LoadOptions {
  /** Modules the host offers beyond `ALLOWED_IMPORTS`, by import name: the libraries free code in a Layer may use. */
  readonly imports?: Readonly<Record<string, unknown>>;
}

export function loadModule(source: string, options: LoadOptions = {}): CutModule {
  const { code } = transform(source, {
    transforms: ["typescript", "jsx", "imports"],
    keepUnusedImports: true,
    jsxRuntime: "automatic",
    production: true,
  });
  const module = { exports: {} as Record<string, unknown> };
  const offered = { ...ALLOWED_IMPORTS, ...options.imports };
  const require = (name: string) => {
    if (!(name in offered))
      throw new Error(
        `The file imports “${name}”, which this host does not offer (it offers ${Object.keys(offered).join(", ")}).`,
      );
    return offered[name];
  };
  // The faces the file declares (`font()`, `googleFont()`) are kept on its exports, apart from any other file's.
  let shaders: ReturnType<typeof collectShaders> = [];
  const fonts = collectFonts(() => {
    shaders = collectShaders(() => new Function("require", "exports", "module", code)(require, module.exports, module));
  });
  if (typeof module.exports.default !== "function") throw new Error("The file has no default export (the video).");
  Object.defineProperty(module.exports, MODULE_FONTS, { value: fonts });
  Object.defineProperty(module.exports, MODULE_SHADERS, { value: shaders });
  return module.exports as unknown as CutModule;
}
