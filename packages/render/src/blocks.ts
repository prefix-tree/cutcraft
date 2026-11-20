// `uberscene blocks`: the blocks that ship inside this package, listed so an agent or a person can choose one by the
// job it does, and drawn as one sheet of their previews to choose by looking. Each block is a folder: `block.tsx`
// (the component, its `schema`, `defaults` and `meta`), `demo.tsx` (a video that places it) and `preview.png`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ZodType } from "zod";

import { blockMetaSchema, type Knob } from "@uberscene/kit";
import { BLOCK_ASPECTS, knobsOf } from "@uberscene/kit/schema";
import { gatherLocalFiles, loadModule } from "@uberscene/sdk";

import { writeAtomically } from "./atomic";
import { blankPicture, decodePng, encodePng, paste } from "./png";

/** One block, as `uberscene blocks` lists it. */
export interface BlockInfo {
  /** The folder's name, which is what `blocks add` takes. */
  readonly name: string;
  readonly title: string;
  readonly what: string;
  readonly useWhen: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly pairsWith: readonly string[];
  readonly tags: readonly string[];
  readonly aspects: readonly string[];
  /** Seconds it takes with its default timing. */
  readonly length: number;
  readonly beats: readonly string[];
  /** The second of its demo that its preview shows. */
  readonly poster: number;
  /** The component the block file exports, to place inside a `<Layer>`. */
  readonly component: string;
  /** What can be set where it is placed: its schema's values, with their defaults. */
  readonly props: readonly Knob[];
  /** The block's folder. */
  readonly dir: string;
  /** Its preview image, when it has one. */
  readonly preview?: string;
}

export interface BlockFilter {
  /** A job, a tag or a word: kept are the blocks whose title, what, use-when or tags mention it. */
  readonly for?: string;
  /** A frame shape the block is laid out for: `9:16`, `16:9`, `1:1` or `4:5`. */
  readonly aspect?: string;
  /** Where the blocks are read from; default the ones shipped with this package. */
  readonly source?: string;
}

/** The blocks shipped with this package: copied into `dist/blocks` at build, read from the repository when run from source. */
function blocksSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const built = join(here, "blocks");
  if (hasBlocks(built)) return built;
  const repo = resolve(here, "..", "..", "..", "blocks");
  if (hasBlocks(repo)) return repo;
  throw new Error(`the blocks are not in this package (looked in ${built} and ${repo})`);
}

/** One block by its name, from the shipped blocks or `source`; an unknown name is an error listing the names. */
export function findBlock(name: string, source?: string): BlockInfo {
  const all = listBlocks(source === undefined ? {} : { source });
  const found = all.find((b) => b.name === name);
  if (!found) throw new Error(`there is no block "${name}"; the blocks are ${all.map((b) => b.name).join(", ")}`);
  return found;
}

function hasBlocks(dir: string): boolean {
  return existsSync(dir) && readdirSync(dir).some((name) => existsSync(join(dir, name, "block.tsx")));
}

/** Every block, or those the filter keeps, in name order. A block whose `meta` is not valid is an error naming it. */
export function listBlocks(filter: BlockFilter = {}): BlockInfo[] {
  if (filter.aspect !== undefined && !(BLOCK_ASPECTS as readonly string[]).includes(filter.aspect))
    throw new Error(`--aspect wants one of ${BLOCK_ASPECTS.join(", ")}, got "${filter.aspect}"`);
  const root = filter.source ?? blocksSource();
  const all = readdirSync(root)
    .filter((name) => existsSync(join(root, name, "block.tsx")))
    .sort()
    .map((name) => readBlock(join(root, name), name));
  const words = (filter.for ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return all.filter((b) => {
    if (filter.aspect !== undefined && !b.aspects.includes(filter.aspect)) return false;
    if (words.length === 0) return true;
    const text = [b.name, b.title, b.what, ...b.useWhen, ...b.tags].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/**
 * A block file evaluated as the export evaluates the modules a video imports: through a one-line video that re-exports
 * it, since a block has no video of its own to export by default.
 */
const WRAPPER = 'export * from "./block";\nexport default function Block() {\n  return null;\n}\n';

function loadBlock(dir: string): Record<string, unknown> {
  const files = gatherLocalFiles(WRAPPER, (path) => readIfThere(join(dir, path)), { name: join(dir, "block.tsx") });
  return loadModule(WRAPPER, { files }) as unknown as Record<string, unknown>;
}

function readBlock(dir: string, name: string): BlockInfo {
  const file = join(dir, "block.tsx");
  const mod = loadBlock(dir);
  const parsed = blockMetaSchema.safeParse(mod.meta);
  if (!parsed.success)
    throw new Error(
      `${file}: its meta is not valid: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
    );
  const component = Object.keys(mod).find((key) => /^[A-Z]/.test(key) && typeof mod[key] === "function");
  if (!component) throw new Error(`${file} exports no component (a function whose name starts with a capital)`);
  const preview = join(dir, "preview.png");
  const { poster, ...meta } = parsed.data;
  return {
    name,
    ...meta,
    poster: poster ?? (meta.length * 2) / 3,
    component,
    props: knobsOf(mod.schema as ZodType | undefined, (mod.defaults ?? {}) as Record<string, unknown>),
    dir,
    ...(existsSync(preview) ? { preview } : {}),
  };
}

function readIfThere(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

/** The blocks as text to read: each with what it does, when to use it and when not, and the line that places it. */
export function formatBlocks(blocks: readonly BlockInfo[]): string {
  if (blocks.length === 0) return "no block matches\n";
  const out = blocks.map((b, i) => {
    const lines = [
      `${i + 1}. ${b.name}  ${b.title}  (${b.aspects.join(", ")}, ${b.length} s)`,
      `   ${b.what}`,
      `   use when: ${b.useWhen.join("; ")}`,
    ];
    if (b.avoidWhen.length > 0) lines.push(`   avoid when: ${b.avoidWhen.join("; ")}`);
    if (b.pairsWith.length > 0) lines.push(`   pairs with: ${b.pairsWith.join(", ")}`);
    lines.push(`   props: ${b.props.map((p) => p.key).join(", ")}`);
    if (b.beats.length > 0) lines.push(`   timed by: ${b.beats.join(", ")}`);
    lines.push(`   file: ${join(b.dir, "block.tsx")}`);
    lines.push(`   <Layer id="${b.name}" …><${b.component} … /></Layer>`);
    return lines.join("\n");
  });
  return `${out.join("\n\n")}

Copy a block's file into the project, as blocks/<name>.tsx beside uberscene.json, import its component from there
and place it in a <Layer>: its props are set where it is placed, so two placements differ without two copies.
uberscene blocks --sheet blocks.png draws their previews, numbered as listed here.
`;
}

const SHEET_GAP = 8;
const SHEET_GROUND = [0x16, 0x16, 0x1d] as const;
const PER_ROW = 4;

export interface BlockSheetResult {
  readonly width: number;
  readonly height: number;
  /** The blocks drawn, in reading order: left to right, then down; numbered as the listing numbers them. */
  readonly names: readonly string[];
  readonly columns: number;
}

/** Pastes the blocks' previews into one image, in the listing's order. A block with no preview is an error naming it. */
export async function blockSheet(blocks: readonly BlockInfo[], out: string): Promise<BlockSheetResult> {
  if (blocks.length === 0) throw new Error("no block to draw: the filter matches none");
  const pictures = blocks.map((b) => {
    if (!b.preview) throw new Error(`the block ${b.name} has no preview.png`);
    return decodePng(readFileSync(b.preview));
  });
  const width = Math.max(...pictures.map((p) => p.width));
  const height = Math.max(...pictures.map((p) => p.height));
  const columns = Math.min(PER_ROW, pictures.length);
  const rows = Math.ceil(pictures.length / columns);
  const sheet = blankPicture(
    columns * width + (columns + 1) * SHEET_GAP,
    rows * height + (rows + 1) * SHEET_GAP,
    SHEET_GROUND,
  );
  for (const [i, picture] of pictures.entries())
    paste(
      sheet,
      picture,
      SHEET_GAP + (i % columns) * (width + SHEET_GAP) + Math.floor((width - picture.width) / 2),
      SHEET_GAP + Math.floor(i / columns) * (height + SHEET_GAP) + Math.floor((height - picture.height) / 2),
    );
  await writeAtomically(out, encodePng(sheet));
  return { width: sheet.width, height: sheet.height, names: blocks.map((b) => b.name), columns };
}
