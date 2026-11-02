import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { collectModule, resolve, type AssetManifest, type ResolvedState } from "@cutcraft/kit";
import { indexLayerInteriors } from "@cutcraft/player/overlays";
import type { ReactNode } from "react";
import { tsImport } from "tsx/esm/api";

export interface LoadOptions {
  /** A manifest file, or the manifest itself; default: the file's own `manifest` export. */
  readonly manifest?: string | AssetManifest;
  /** Props for the file's default component, over its `defaults` export. */
  readonly props?: Readonly<Record<string, unknown>>;
  /** A tsconfig to extend when compiling the file (paths, target); default: the nearest `tsconfig.json`. The JSX runtime is always React's automatic one. */
  readonly tsconfig?: string;
}

export interface LoadedVideo {
  readonly state: ResolvedState;
  readonly manifest: AssetManifest;
  /** The children of each `<Layer id>`, for `renderVideo`. */
  readonly interiors: ReadonlyMap<string, ReactNode>;
}

/** Imports a cut file (a TSX module), evaluates it and resolves it against its manifest. */
export async function loadVideo(file: string, options: LoadOptions = {}): Promise<LoadedVideo> {
  const path = resolvePath(file);
  if (!existsSync(path)) throw new Error(`${file} does not exist`);
  const base = options.tsconfig ?? nearestTsconfig(path);
  const scratch = mkdtempSync(join(tmpdir(), "cutcut-tsconfig-"));
  try {
    // tsx applies a tsconfig only to files it includes, and a project's own tsconfig rarely names this file, so
    // compile with one that does: the project's settings, React's automatic JSX runtime, the file's folder.
    const tsconfig = join(scratch, "tsconfig.json");
    writeFileSync(tsconfig, JSON.stringify({ ...(base ? { extends: resolvePath(base) } : {}), compilerOptions: { jsx: "react-jsx" }, include: [`${dirname(path)}/**/*`] }));
    const loaded = (await tsImport(pathToFileURL(path).href, { parentURL: import.meta.url, tsconfig })) as Record<string, unknown>;
    // A file outside a `"type": "module"` package loads as CommonJS, and its exports arrive one level down.
    const mod = typeof loaded.default === "object" && loaded.default !== null && "default" in loaded.default ? (loaded.default as Record<string, unknown>) : loaded;
    if (typeof mod.default !== "function") throw new Error(`${file} must export a component as its default export`);
    const manifest = readManifest(options.manifest, mod, file);
    const video = mod as unknown as Parameters<typeof collectModule>[0];
    const state = resolve(collectModule(video, options.props ?? {}), manifest);
    const element = video.default({ ...(video.defaults ?? {}), ...(options.props ?? {}) });
    return { state, manifest, interiors: indexLayerInteriors(element) };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function readManifest(given: LoadOptions["manifest"], mod: Record<string, unknown>, file: string): AssetManifest {
  if (typeof given === "object") return given;
  if (typeof given === "string") return JSON.parse(readFileSync(given, "utf8")) as AssetManifest;
  const own = mod.manifest as AssetManifest | undefined;
  if (own?.assets) return own;
  throw new Error(`no manifest: pass one, or export \`manifest\` from ${file}`);
}

function nearestTsconfig(file: string): string | null {
  let dir = dirname(file);
  for (;;) {
    const candidate = join(dir, "tsconfig.json");
    if (existsSync(candidate)) return candidate;
    const up = parse(dir).root === dir ? null : dirname(dir);
    if (!up) return null;
    dir = up;
  }
}
