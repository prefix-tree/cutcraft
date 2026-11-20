// A video file may import modules of its own beside it (`import { ChatReveal } from "./blocks/chat-reveal"`). The kit
// reads no disk: the host gathers their texts with `gatherLocalFiles` and passes them to `loadModule` as `files`, keyed
// by their path from the video file's folder. The CLI reads them from the project; the export page gets them in its
// job, with the file's own text.
import { transform } from "sucrase";

/** The extensions a local module may have; an import may leave the extension out. */
const EXTENSIONS = [".tsx", ".ts"] as const;

/** Compiles a module's text as `loadModule` runs it. */
export function compileModule(source: string): string {
  return transform(source, {
    transforms: ["typescript", "jsx", "imports"],
    keepUnusedImports: true,
    jsxRuntime: "automatic",
    production: true,
  }).code;
}

/** Whether an import names a local module (`./x`, `../x`) rather than a package. */
export function isLocalImport(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

/** The folder of a path from the video file's folder: `blocks/chat.tsx` → `blocks`; `video.tsx` → ``. */
export function folderOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

/** `folder` and `specifier` joined, with `.` and `..` worked out. A path above the video's folder keeps its `..`. */
function joinPath(folder: string, specifier: string): string {
  const out: string[] = [];
  for (const part of [...folder.split("/"), ...specifier.split("/")]) {
    if (part === "" || part === ".") continue;
    if (part === ".." && out.length > 0 && out[out.length - 1] !== "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/** The paths a local import may mean, in the order they are tried. */
export function candidatesOf(folder: string, specifier: string): string[] {
  const base = joinPath(folder, specifier);
  if (EXTENSIONS.some((ext) => base.endsWith(ext))) return [base];
  return [...EXTENSIONS.map((ext) => `${base}${ext}`), ...EXTENSIONS.map((ext) => `${base}/index${ext}`)];
}

/** The local imports a module's compiled code requires, in order, each once. */
function localImportsOf(code: string): string[] {
  const found = new Set<string>();
  for (const m of code.matchAll(/\brequire\((["'])([^"']+)\1\)/g))
    if (isLocalImport(m[2] as string)) found.add(m[2] as string);
  return [...found];
}

export interface GatherOptions {
  /** How errors name the video file; default "the file". */
  readonly name?: string;
  /** What the host offers by import name, as for `loadModule`: a name it offers (even `./lengths`) is not read. */
  readonly imports?: Readonly<Record<string, unknown>>;
}

/**
 * The texts of every local module a video file imports, and of the modules they import in turn, keyed by path from
 * the video file's folder. `read` returns a path's text, or `undefined` when there is no such file; it may throw to
 * refuse a path (one outside the project, say). An import of a file that is not there, or that is not `.ts` or
 * `.tsx`, fails with the importing file's path.
 */
export function gatherLocalFiles(
  source: string,
  read: (path: string) => string | undefined,
  options: GatherOptions = {},
): Record<string, string> {
  const name = options.name ?? "the file";
  const offered = options.imports ?? {};
  const files: Record<string, string> = {};
  const visit = (code: string, path: string, folder: string): void => {
    for (const specifier of localImportsOf(code)) {
      if (specifier in offered) continue;
      const ext = /\.[a-z0-9]+$/i.exec(specifier.split("/").pop() ?? "")?.[0];
      if (ext && !(EXTENSIONS as readonly string[]).includes(ext))
        throw new Error(`${path} imports "${specifier}": a video's own modules are .ts or .tsx files`);
      const tried = candidatesOf(folder, specifier);
      const hit = tried.find((p) => p in files);
      if (hit) continue;
      let found: string | undefined;
      let text: string | undefined;
      for (const p of tried) {
        text = read(p);
        if (text !== undefined) {
          found = p;
          break;
        }
      }
      if (found === undefined || text === undefined)
        throw new Error(`${path} imports "${specifier}", which is not there (looked for ${tried.join(", ")})`);
      files[found] = text;
      visit(compileModule(text), found, folderOf(found));
    }
  };
  visit(compileModule(source), name, "");
  return files;
}
