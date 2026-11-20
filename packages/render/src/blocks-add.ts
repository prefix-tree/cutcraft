// `uberscene blocks add` and `blocks update`: a block copied into the project as one file the project owns, recorded in
// the manifest with the version and hash it was copied at, so an update can tell a copy nobody touched (replaced) from
// one someone edited (left alone, with what changed). `--into` also places it in a video, as an import and a Layer.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

import {
  type AssetManifest,
  buildSourceIndex,
  type InstalledBlock,
  insertLayer,
  MOMENT_FORMS,
  parseMoment,
  type ResolveError,
} from "@uberscene/sdk";

import { findBlock } from "./blocks";
import { loadVideo } from "./load";
import { findManifest, MANIFEST_FILE } from "./manifest-file";
import { packageVersion } from "./skills";

export interface BlockAddOptions {
  /** Where the project is looked for (the folder of the nearest uberscene.json); default the process's folder. */
  readonly cwd?: string;
  /** The folder the copy goes in; default `blocks` beside the manifest. */
  readonly dir?: string;
  /** Replace a copy that differs from the block. */
  readonly force?: boolean;
  /** Where the blocks are read from; default the ones shipped with this package. */
  readonly source?: string;
}

export interface BlockAdded {
  readonly name: string;
  /** The copy. */
  readonly file: string;
  /** The manifest the copy is recorded in. */
  readonly manifest: string;
  /** `copied`, or `unchanged` when the same text was already there. */
  readonly status: "copied" | "unchanged";
  /** The component the copy exports. */
  readonly component: string;
}

/** Copies a block into the project and records it in the manifest. A different file already there wants `force`. */
export function addBlock(name: string, options: BlockAddOptions = {}): BlockAdded {
  const block = findBlock(name, options.source);
  const text = readFileSync(join(block.dir, "block.tsx"), "utf8");
  const { manifestPath, root } = projectOf(options.cwd);
  const file = join(options.dir === undefined ? join(root, "blocks") : resolve(root, options.dir), `${name}.tsx`);
  const there = existsSync(file) ? readFileSync(file, "utf8") : undefined;
  if (there !== undefined && there !== text && !options.force)
    throw new Error(`${file} is there already and differs from the block; --force replaces it`);
  if (there !== text) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  record(manifestPath, name, { version: packageVersion(), hash: hashOf(text) });
  return {
    name,
    file,
    manifest: manifestPath,
    status: there === text ? "unchanged" : "copied",
    component: block.component,
  };
}

export interface BlockPlacement {
  /** The video to place it in. */
  readonly video: string;
  /** The track it goes on, as the last child. */
  readonly track: string;
  /** Where it starts: seconds, an element's id (`hook`, `hook.end`) or a word of a clip (`hook@word:5`). */
  readonly at: string;
  /** The Layer's id; default the block's name, numbered if that is taken. */
  readonly id?: string;
  /** Seconds it lasts; default the block's natural length. */
  readonly duration?: number;
}

export interface BlockPlaced {
  readonly video: string;
  readonly id: string;
  /** The Layer as written. */
  readonly layer: string;
}

/**
 * Places a copied block in a video: its import, and a Layer holding it at the end of the track. The video is read back
 * the way an export reads it; if that fails, or it has errors it did not have, the video is left as it was.
 */
export async function placeBlock(added: BlockAdded, placement: BlockPlacement, source?: string): Promise<BlockPlaced> {
  const video = resolve(placement.video);
  if (!existsSync(video)) throw new Error(`${placement.video} does not exist`);
  const block = findBlock(added.name, source);
  const before = readFileSync(video, "utf8");
  const index = buildSourceIndex(before);
  const id = placement.id ?? freeId(added.name, (taken) => index.elements.has(taken));
  const timing = { ...timingOf(placement.at), duration: placement.duration ?? block.length };
  const from = importPath(video, added.file);
  const after = insertLayer(before, { track: placement.track, id, component: added.component, from, timing });
  const was = errorKeys((await loadVideo(video)).state.errors);
  writeFileSync(video, after);
  try {
    const now = (await loadVideo(video)).state.errors;
    const fresh = now.filter((e) => !was.has(keyOf(e)));
    if (fresh.length > 0)
      throw new Error(
        `placing ${added.name} gave ${placement.video} errors, so it is left as it was:\n${fresh.map((e) => `  ${e.id}: ${e.message}`).join("\n")}`,
      );
  } catch (error) {
    writeFileSync(video, before);
    throw error;
  }
  const layer = after.slice(
    after.indexOf(`<Layer id="${id}"`),
    after.indexOf("</Layer>", after.indexOf(`<Layer id="${id}"`)) + 8,
  );
  return { video, id, layer };
}

/** The Layer's timing props for a moment: a start, an anchor, or an anchor and a word. */
export function timingOf(at: string): Record<string, string | number> {
  const moment = parseMoment(at);
  if (moment.kind === "time" && moment.seconds !== undefined) return { start: moment.seconds };
  if (moment.kind === "element") {
    if (moment.point === "mid")
      throw new Error(`--at ${at}: a block starts at an element's start or end, not its middle`);
    return { anchor: moment.point === "end" ? `${moment.id}.end` : moment.id };
  }
  if (moment.kind === "ref" && moment.clip !== undefined) return { anchor: moment.clip, at: moment.ref };
  if (moment.kind === "ref") throw new Error(`--at ${at}: name the clip the word is in, as hook@${moment.ref}`);
  throw new Error(
    `--at ${at}: give seconds (4.5), an element (hook, hook.end) or a word of a clip (hook@word:14); moments are ${MOMENT_FORMS}`,
  );
}

export interface BlockUpdated {
  readonly name: string;
  readonly file: string;
  /**
   * `updated`: the copy was as added, and is now the shipped block; `current`: it already was; `edited`: it was changed
   * since it was added, and is left alone (or replaced, with `force`); `missing`: the copy is gone.
   */
  readonly status: "updated" | "current" | "edited" | "replaced" | "missing";
  /** For an edited copy: the shipped block against the copy, line by line. */
  readonly diff?: string;
}

/** Brings the copies the manifest records up to the shipped blocks, leaving edited copies alone unless `force`. */
export function updateBlocks(names: readonly string[], options: BlockAddOptions = {}): BlockUpdated[] {
  const { manifestPath, root } = projectOf(options.cwd);
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as AssetManifest)
    : undefined;
  const recorded = manifest?.blocks ?? {};
  const wanted = names.length > 0 ? names : Object.keys(recorded).sort();
  if (wanted.length === 0)
    throw new Error(`${manifestPath} records no blocks; add one with uberscene blocks add <name>`);
  return wanted.map((name) => {
    const entry = recorded[name];
    if (!entry) throw new Error(`${manifestPath} records no block "${name}"; add it with uberscene blocks add ${name}`);
    const block = findBlock(name, options.source);
    const shipped = readFileSync(join(block.dir, "block.tsx"), "utf8");
    const file = join(options.dir === undefined ? join(root, "blocks") : resolve(root, options.dir), `${name}.tsx`);
    if (!existsSync(file)) return { name, file, status: "missing" as const };
    const copy = readFileSync(file, "utf8");
    const edited = hashOf(copy) !== entry.hash;
    if (copy === shipped) {
      if (edited) record(manifestPath, name, { version: packageVersion(), hash: hashOf(shipped) });
      return { name, file, status: "current" as const };
    }
    if (edited && !options.force)
      return {
        name,
        file,
        status: "edited" as const,
        diff: lineDiff(shipped, copy, `${name} (shipped)`, relative(root, file)),
      };
    writeFileSync(file, shipped);
    record(manifestPath, name, { version: packageVersion(), hash: hashOf(shipped) });
    return { name, file, status: edited ? ("replaced" as const) : ("updated" as const) };
  });
}

/** The project: the folder of the nearest uberscene.json, or the folder asked about, where a new one is written. */
function projectOf(cwd = process.cwd()): { manifestPath: string; root: string } {
  const found = findManifest(cwd).path;
  const manifestPath = found ?? join(resolve(cwd), MANIFEST_FILE);
  return { manifestPath, root: dirname(manifestPath) };
}

/** Writes the block's record into the manifest, keeping everything else as it was. */
function record(manifestPath: string, name: string, entry: InstalledBlock): void {
  const manifest = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as AssetManifest)
    : ({ assets: {} } as AssetManifest);
  const blocks = Object.fromEntries(
    Object.entries({ ...manifest.blocks, [name]: entry }).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, blocks }, null, 2)}\n`);
}

function hashOf(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function freeId(base: string, taken: (id: string) => boolean): string {
  if (!taken(base)) return base;
  for (let n = 2; ; n++) if (!taken(`${base}-${n}`)) return `${base}-${n}`;
}

/** The import specifier of the copy from the video: relative, without its extension, with forward slashes. */
function importPath(video: string, file: string): string {
  const path = relative(dirname(video), file)
    .replace(/\.tsx$/, "")
    .split(sep)
    .join("/");
  return path.startsWith(".") ? path : `./${path}`;
}

function keyOf(e: ResolveError): string {
  return `${e.code} ${e.id} ${e.prop ?? ""}`;
}

function errorKeys(errors: readonly ResolveError[]): Set<string> {
  return new Set(errors.map(keyOf));
}

/** A line diff of two texts, in the unified form: `-` lines only in `a`, `+` lines only in `b`, three lines of context. */
export function lineDiff(a: string, b: string, aName: string, bName: string): string {
  const x = a.split("\n");
  const y = b.split("\n");
  // The longest common subsequence, by dynamic programming from the end.
  const lcs: number[][] = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      (lcs[i] as number[])[j] =
        x[i] === y[j]
          ? ((lcs[i + 1] as number[])[j + 1] as number) + 1
          : Math.max((lcs[i + 1] as number[])[j] as number, (lcs[i] as number[])[j + 1] as number);
  const ops: { op: " " | "-" | "+"; line: string; ai: number; bi: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j]) ops.push({ op: " ", line: x[i++] as string, ai: i, bi: ++j });
    else if (
      i < x.length &&
      (j === y.length || ((lcs[i + 1] as number[])[j] as number) >= ((lcs[i] as number[])[j + 1] as number))
    )
      ops.push({ op: "-", line: x[i++] as string, ai: i, bi: j });
    else ops.push({ op: "+", line: y[j++] as string, ai: i, bi: j });
  }
  const out = [`--- ${aName}`, `+++ ${bName}`];
  const changed = ops.map((o, k) => (o.op === " " ? -1 : k)).filter((k) => k >= 0);
  let k = 0;
  while (k < changed.length) {
    const first = changed[k] as number;
    let last = first;
    while (k + 1 < changed.length && (changed[k + 1] as number) - last <= 6) last = changed[++k] as number;
    k++;
    const from = Math.max(0, first - 3);
    const to = Math.min(ops.length, last + 4);
    const hunk = ops.slice(from, to);
    const aStart = hunk.find((o) => o.op !== "+")?.ai ?? 0;
    const bStart = hunk.find((o) => o.op !== "-")?.bi ?? 0;
    const aLen = hunk.filter((o) => o.op !== "+").length;
    const bLen = hunk.filter((o) => o.op !== "-").length;
    out.push(`@@ -${aStart},${aLen} +${bStart},${bLen} @@`);
    for (const o of hunk) out.push(`${o.op}${o.line}`);
  }
  return `${out.join("\n")}\n`;
}
