import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve as resolvePath, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { type AssetManifest, collectModule, type Knob, knobsOf, type ResolvedState, resolve } from "@uberscene/kit";
import { gatherLocalFiles, loadModule } from "@uberscene/kit/source";

import { findManifest, MANIFEST_FILE } from "./manifest-file";
import type { ExportSource } from "./renderer";

export interface LoadOptions {
  /**
   * A manifest file, or the manifest itself. Default: the file's own `manifest` export, then the nearest
   * `uberscene.json` from the file's folder upward, then a `manifest.json` beside the file.
   */
  readonly manifest?: string | AssetManifest;
  /** Props for the file's default component, over its `defaults` export. */
  readonly props?: Readonly<Record<string, unknown>>;
  /**
   * Modules the file may import beyond react, zod and the kit, by the name it imports them as. Each value is a module
   * specifier this host imports for it: a package name, or a path relative to the file's folder.
   */
  readonly imports?: Readonly<Record<string, string>>;
}

export interface LoadedVideo {
  readonly state: ResolvedState;
  readonly manifest: AssetManifest;
  /** The manifest's file, when it was read from one. */
  readonly manifestPath?: string;
  /** The file's text, manifest and props, for `renderVideo`: the export page loads the file itself. */
  readonly source: ExportSource;
  /** The file's `schema` values, with the value each has once `--props` are applied. */
  readonly knobs: readonly Knob[];
}

/**
 * Evaluates a cut file the way the browser does, with the kit's `loadModule`, and resolves it against its manifest.
 * A file that imports something the host does not offer fails here as it would in the editor.
 */
export async function loadVideo(file: string, options: LoadOptions = {}): Promise<LoadedVideo> {
  const path = resolvePath(file);
  if (!existsSync(path)) throw new Error(`${file} does not exist`);
  const imports = await importAll(options.imports ?? {}, dirname(path));
  const text = readFileSync(path, "utf8");
  const files = readLocalFiles(text, path, imports);
  const mod = loadModule(text, { imports, files });
  const { manifest, manifestPath } = readManifest(
    options.manifest,
    mod as unknown as Record<string, unknown>,
    file,
    dirname(path),
  );
  const state = resolve(collectModule(mod as never, options.props ?? {}), manifest);
  return {
    state,
    knobs: knobsOf(mod.schema, { ...mod.defaults, ...options.props }),
    manifest,
    ...(manifestPath ? { manifestPath } : {}),
    source: {
      text,
      manifest,
      ...(Object.keys(files).length ? { files } : {}),
      ...(options.props ? { props: options.props } : {}),
    },
  };
}

/**
 * Imports each offered module from the file's folder, so a package resolves from the project that holds the file.
 * The namespace is marked `__esModule` so the file's default imports get its `default`, as a bundler would give them.
 */
async function importAll(
  specifiers: Readonly<Record<string, string>>,
  folder: string,
): Promise<Record<string, unknown>> {
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

/**
 * The file's own modules (`./blocks/chat-reveal`), read from disk. The project is the folder of the nearest
 * uberscene.json, or the file's folder without one; a module outside it is refused.
 */
function readLocalFiles(text: string, path: string, imports: Record<string, unknown>): Record<string, string> {
  const folder = dirname(path);
  const found = findManifest(folder).path;
  const project = found ? dirname(found) : folder;
  return gatherLocalFiles(
    text,
    (p) => {
      const full = resolvePath(folder, p);
      const fromProject = relative(project, full);
      if (fromProject.startsWith(`..${sep}`) || isAbsolute(fromProject))
        throw new Error(`${p} is outside the project (${project}); a video's own modules live inside it`);
      return existsSync(full) ? readFileSync(full, "utf8") : undefined;
    },
    { name: relative(process.cwd(), path) || path, imports },
  );
}

function readManifest(
  given: LoadOptions["manifest"],
  mod: Record<string, unknown>,
  file: string,
  folder: string,
): { manifest: AssetManifest; manifestPath?: string } {
  if (typeof given === "object") return { manifest: given };
  if (typeof given === "string") return { manifest: readFile(given), manifestPath: resolvePath(given) };
  const own = mod.manifest as AssetManifest | undefined;
  if (own?.assets) return { manifest: own };
  const found = findManifest(folder);
  if (found.path) return { manifest: readFile(found.path), manifestPath: found.path };
  throw new Error(
    `no manifest for ${file}: no ${MANIFEST_FILE} in\n${found.checked.map((d) => `  ${d}`).join("\n")}\nRun \`uberscene add <media file>\` to make one, pass --manifest <file>, or export \`manifest\` from ${file}`,
  );
}

function readFile(path: string): AssetManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`cannot read the manifest ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const assets = (parsed as { assets?: unknown } | null)?.assets;
  if (typeof assets !== "object" || assets === null)
    throw new Error(`${path} is not an asset manifest: it has no "assets"`);
  return parsed as AssetManifest;
}
