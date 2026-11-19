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
import type { ZodObject } from "zod";
import * as zod from "zod";

import * as kit from "../index";
import { candidatesOf, compileModule, folderOf, isLocalImport } from "./local-files";

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
  "@uberscene/kit": kit,
  "@cut/kit": kit,
};

export interface LoadOptions {
  /** Modules the host offers beyond `ALLOWED_IMPORTS`, by import name: the libraries free code in a Layer may use. */
  readonly imports?: Readonly<Record<string, unknown>>;
  /**
   * Names the file's code sees in place of the globals of that name, such as an export's `performance` and
   * `requestAnimationFrame` on the video's clock. Only the file's own code: a library it imports sees the real ones.
   */
  readonly scope?: Readonly<Record<string, unknown>>;
  /**
   * The texts of the file's own modules (`./blocks/chat-reveal`), keyed by path from the file's folder, as
   * `gatherLocalFiles` returns them. Each is compiled and run like the file, once, and sees the same imports and scope.
   */
  readonly files?: Readonly<Record<string, string>>;
}

export function loadModule(source: string, options: LoadOptions = {}): CutModule {
  const offered = { ...ALLOWED_IMPORTS, ...options.imports };
  const files = options.files ?? {};
  const scope = Object.entries(options.scope ?? {});
  // Local modules run once each, like Node's: a second import, or a cycle, gets the same (maybe partial) exports.
  const loaded = new Map<string, { exports: Record<string, unknown> }>();
  const run = (code: string, folder: string, from: string, module: { exports: Record<string, unknown> }): void => {
    const require = (name: string): unknown => {
      if (isLocalImport(name) && !(name in offered)) {
        const tried = candidatesOf(folder, name);
        const path = tried.find((p) => p in files);
        if (path === undefined)
          throw new Error(
            `${from} imports “${name}”, which the host did not pass (looked for ${tried.join(", ")}). Gather the file's own modules with gatherLocalFiles.`,
          );
        const cached = loaded.get(path);
        if (cached) return cached.exports;
        const entry = { exports: {} as Record<string, unknown> };
        loaded.set(path, entry);
        run(compileModule(files[path] as string), folderOf(path), path, entry);
        return entry.exports;
      }
      if (!(name in offered))
        throw new Error(
          `${from} imports “${name}”, which this host does not offer (it offers ${Object.keys(offered).join(", ")}).`,
        );
      return offered[name];
    };
    // What the file declares (effects, transitions, fonts) are values: collectModule finds them on its elements and
    // among its exports, so nothing is registered while it runs.
    new Function("require", "exports", "module", ...scope.map(([name]) => name), code)(
      require,
      module.exports,
      module,
      ...scope.map(([, value]) => value),
    );
  };
  const module = { exports: {} as Record<string, unknown> };
  run(compileModule(source), "", "The file", module);
  if (typeof module.exports.default !== "function") throw new Error("The file has no default export (the video).");
  return module.exports as unknown as CutModule;
}
