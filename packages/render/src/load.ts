import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { collectModule, resolve, type AssetManifest, type ResolvedState } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";
import { indexLayerInteriors } from "@cutcraft/player/overlays";
import type { ReactNode } from "react";

export interface LoadOptions {
  /** A manifest file, or the manifest itself; default: the file's own `manifest` export. */
  readonly manifest?: string | AssetManifest;
  /** Props for the file's default component, over its `defaults` export. */
  readonly props?: Readonly<Record<string, unknown>>;
  /**
   * Modules the file may import beyond react, zod and the kit, by the name it imports them as. Each value is a module
   * specifier this host imports for it: a package name, or a path relative to the file's folder. A string, not the
   * module, so the same options can cross into a render worker.
   */
  readonly imports?: Readonly<Record<string, string>>;
}

export interface LoadedVideo {
  readonly state: ResolvedState;
  readonly manifest: AssetManifest;
  /** The children of each `<Layer id>`, for `renderVideo`. */
  readonly interiors: ReadonlyMap<string, ReactNode>;
}

/**
 * Evaluates a cut file the way the browser does, with the kit's `loadModule`, and resolves it against its manifest.
 * A file that imports something the host does not offer fails here as it would in the editor.
 */
export async function loadVideo(file: string, options: LoadOptions = {}): Promise<LoadedVideo> {
  const path = resolvePath(file);
  if (!existsSync(path)) throw new Error(`${file} does not exist`);
  const imports = await importAll(options.imports ?? {}, dirname(path));
  const mod = loadModule(readFileSync(path, "utf8"), { imports });
  const manifest = readManifest(options.manifest, mod as unknown as Record<string, unknown>, file);
  const state = resolve(collectModule(mod as never, options.props ?? {}), manifest);
  const element = mod.default({ ...(mod.defaults ?? {}), ...(options.props ?? {}) });
  return { state, manifest, interiors: indexLayerInteriors(element) };
}

/**
 * Imports each offered module from the file's folder, so a package resolves from the project that holds the file.
 * The namespace is marked `__esModule` so the file's default imports get its `default`, as a bundler would give them.
 */
async function importAll(specifiers: Readonly<Record<string, string>>, folder: string): Promise<Record<string, unknown>> {
  const fromFolder = createRequire(join(folder, "noop.js"));
  const entries = Object.entries(specifiers).map(async ([name, specifier]) => {
    const local = specifier.startsWith(".") || isAbsolute(specifier);
    const target = local ? pathToFileURL(resolvePath(folder, specifier)).href : packageUrl(fromFolder, specifier);
    const namespace = (await import(target)) as Record<string, unknown>;
    return [name, { __esModule: true, ...namespace }] as const;
  });
  return Object.fromEntries(await Promise.all(entries));
}

/** The package's entry as seen from the file's folder; an import-only package that `require` cannot resolve is left to `import`. */
function packageUrl(require: NodeJS.Require, specifier: string): string {
  try {
    return pathToFileURL(require.resolve(specifier)).href;
  } catch {
    return specifier;
  }
}

function readManifest(given: LoadOptions["manifest"], mod: Record<string, unknown>, file: string): AssetManifest {
  if (typeof given === "object") return given;
  if (typeof given === "string") return JSON.parse(readFileSync(given, "utf8")) as AssetManifest;
  const own = mod.manifest as AssetManifest | undefined;
  if (own?.assets) return own;
  throw new Error(`no manifest: pass one, or export \`manifest\` from ${file}`);
}
