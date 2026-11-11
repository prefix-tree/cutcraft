// Frames on disk, keyed by what draws them. A frame's key is a hash of everything that decides its pixels: the
// elements on screen at that time with their resolved props, the media files they read, the composition's settings,
// the fonts, and the version of CutCraft and of Chrome. A frame an edit did not touch keeps its key, so it is read
// from disk instead of drawn again; a frame it did touch gets a new key, and the old file is simply never read.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { motionBlurOf, type Placement, type ResolvedState, shutterTimes } from "@cutcraft/kit";
import type { MediaResolver } from "@cutcraft/player/engine";

import type { FontFile } from "./fonts";
import type { ExportSource } from "./renderer";
import { CHROME_MILESTONE } from "./web/chrome";

/** Bumped when what a key covers, or what is stored under it, changes. */
const CACHE_FORMAT = 1;

const VERSION = (() => {
  try {
    return String(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
  } catch {
    return "unknown";
  }
})();

/** Elements whose picture is free code or another composition: anything in the file may decide it. */
const FREE = new Set(["layer", "motion", "three", "nested", "multicam"]);
/** Elements that last as long as the video does: their own range says nothing about a frame. */
const WHOLE = new Set(["composition", "track", "captions"]);
/** Elements that draw nothing. */
const SILENT = new Set(["audio", "marker"]);

/**
 * A value as text, the same for the same value whatever its key order. What JSON cannot hold is written by what it
 * is: a function by its source, a React element by its type and props, a schema by a placeholder. `free` is set
 * when the value holds code, so the caller knows the file's own text decides the picture too.
 */
function stable(value: unknown, flags: { free: boolean }, seen = new Set<object>()): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "function") {
    flags.free = true;
    return `fn:${Function.prototype.toString.call(value)}`;
  }
  if (typeof value !== "object") return JSON.stringify(value) ?? String(value);
  if (seen.has(value)) return "[cycle]";
  seen.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((v) => stable(v, flags, seen)).join(",")}]`;
    if (value instanceof Map) return `map${stable([...value.entries()], flags, seen)}`;
    if (value instanceof Set) return `set${stable([...value.values()], flags, seen)}`;
    const record = value as Record<string, unknown>;
    if ("_zod" in record || "_def" in record) return "[schema]";
    if ("$$typeof" in record) {
      flags.free = true;
      const type = record.type;
      const name = typeof type === "string" ? type : typeof type === "function" ? `fn:${type.toString()}` : "element";
      return `<${name} ${stable(record.props, flags, seen)}>`;
    }
    return `{${Object.keys(record)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(record[k], flags, seen)}`)
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

/** The placements that can draw at `t`: the ones on the timeline there, with everything inside them. */
function drawnAt(state: ResolvedState, t: number): Placement[] {
  const out = new Map<string, Placement>();
  const covers = (p: Placement): boolean => t >= p.start - 1e-6 && t <= p.end + 1e-6;
  const add = (p: Placement): void => {
    if (out.has(p.id)) return;
    out.set(p.id, p);
    for (const id of p.children) {
      const child = state.items.get(id);
      // Captions hold a cue for every line said; only the one on screen draws.
      if (child && (p.kind !== "captions" || covers(child))) add(child);
    }
  };
  for (const p of state.items.values()) {
    if (p.kind === "composition" || p.kind === "track") out.set(p.id, p);
    else if (!SILENT.has(p.kind) && p.end > p.start && covers(p)) {
      const parent = state.items.get(p.parent ?? "");
      // A child is added with its parent; a multicam's generated clips name it as their parent and are added here.
      if (!parent || parent.kind === "track" || parent.kind === "composition" || parent.kind === "multicam") add(p);
    }
  }
  return [...out.values()];
}

export interface FrameKeyInput {
  readonly state: ResolvedState;
  readonly source: ExportSource;
  readonly media: MediaResolver;
  readonly fonts?: readonly FontFile[] | undefined;
}

/** Works out frame keys for one file: what is shared by every frame is hashed once. */
export class FrameKeys {
  private readonly shared: string;
  private readonly whole: string;
  private readonly stats = new Map<string, Promise<string>>();

  constructor(private readonly input: FrameKeyInput) {
    const { state, source } = input;
    const flags = { free: false };
    const fonts = (input.fonts ?? []).map((f) => [
      f.name,
      f.weight,
      f.style,
      createHash("sha256")
        .update(new Uint8Array(f.data as ArrayBuffer))
        .digest("hex"),
    ]);
    this.shared = stable(
      {
        format: CACHE_FORMAT,
        version: VERSION,
        chrome: [CHROME_MILESTONE, source.executablePath ?? process.env.CUTCRAFT_CHROMIUM ?? ""],
        // Not the duration: a cut that grows at its end leaves the frames before it as they were.
        composition: {
          id: state.composition.id,
          fps: state.composition.fps,
          width: state.composition.width,
          height: state.composition.height,
        },
        theme: state.theme,
        declaredFonts: state.fonts,
        fonts,
      },
      flags,
    );
    // For a frame that free code draws: the file's text and props, and every element, since code can read them all.
    this.whole = stable({ text: source.text, props: source.props ?? {}, items: [...state.items.values()] }, flags);
  }

  /** The size and modified time of an asset's file: a re-encoded or replaced file is another picture. */
  private stat(asset: string): Promise<string> {
    let known = this.stats.get(asset);
    if (!known) {
      known = this.input.media.resolve(asset).then(
        (handle) => {
          if (handle.kind !== "path") return stable(handle, { free: false });
          const s = statSync(handle.path);
          return `${handle.path}:${s.size}:${s.mtimeMs}`;
        },
        () => "missing",
      );
      this.stats.set(asset, known);
    }
    return known;
  }

  /** See `wholeKey`: the whole file, every asset it plays, and `extra`. */
  async whole_(extra: unknown): Promise<string> {
    const assets = new Set<string>();
    for (const p of this.input.state.items.values()) if (p.source) assets.add(p.source.asset.replace(/^asset:/, ""));
    const stats = await Promise.all([...assets].sort().map(async (id) => `${id}=${await this.stat(id)}`));
    const hash = createHash("sha256");
    hash.update(this.shared);
    hash.update(this.whole);
    hash.update(`\n${stats.join("\n")}\n`);
    hash.update(stable(extra, { free: false }));
    return hash.digest("hex").slice(0, 40);
  }

  /**
   * The key of frame `frame`, as a file-name-safe string. `extra` names anything else that decides the stored bytes:
   * the kind of picture, its size, its label.
   */
  async key(frame: number, extra: unknown = null, state: ResolvedState = this.input.state): Promise<string> {
    const { fps, duration } = state.composition;
    const blur = motionBlurOf(state);
    const times = blur ? shutterTimes(frame / fps, fps, blur, duration) : [frame / fps];
    const flags = { free: false };
    const tree = state.tree;
    const drawn = times.map((t) =>
      drawnAt(state, t).map((p) => {
        if (FREE.has(p.kind)) flags.free = true;
        return stable(
          {
            id: p.id,
            kind: p.kind,
            track: p.track,
            parent: p.parent,
            // The composition, a track and the captions run the video's whole length, which is not theirs to say.
            ...(WHOLE.has(p.kind) ? {} : { start: p.start, end: p.end }),
            source: p.source,
            between: p.between,
            interior: p.interior,
            text: tree.byId.get(p.id)?.text,
            props: p.props,
          },
          flags,
        );
      }),
    );
    const body = stable(drawn, flags);
    const assets = new Set<string>();
    for (const m of body.matchAll(/asset:([A-Za-z0-9_-]+)/g)) assets.add(m[1] as string);
    for (const m of body.matchAll(/"asset":"([^"]+)"/g)) assets.add((m[1] as string).replace(/^asset:/, ""));
    const stats = await Promise.all([...assets].sort().map(async (id) => `${id}=${await this.stat(id)}`));
    const hash = createHash("sha256");
    hash.update(this.shared);
    hash.update(`\nframe:${frame} at ${times.join(",")}\n`);
    hash.update(body);
    hash.update(`\n${stats.join("\n")}\n`);
    hash.update(stable(extra, flags));
    if (flags.free) hash.update(this.whole);
    return hash.digest("hex").slice(0, 40);
  }
}

/** A key for something every part of the file can decide, such as its sound over a stretch. */
export async function wholeKey(keys: FrameKeys, extra: unknown): Promise<string> {
  return keys.whole_(extra);
}

/** A file from the cache, or null. */
export function readCached(dir: string, name: string): Uint8Array | null {
  try {
    return readFileSync(join(dir, name));
  } catch {
    return null;
  }
}

/** Keeps bytes in the cache. A cache that cannot be written is not an error: the frame is drawn again next time. */
export function writeCached(dir: string, name: string, bytes: Uint8Array): void {
  try {
    mkdirSync(dir, { recursive: true });
    // Written beside itself, then renamed, so a call that reads while another writes never sees half a file.
    const partial = join(dir, `${name}.${process.pid}.tmp`);
    writeFileSync(partial, bytes);
    renameSync(partial, join(dir, name));
  } catch {
    /* a read-only folder, a full disk: carry on without the cache */
  }
}
