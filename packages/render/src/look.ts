// `uberscene look video.tsx`: many frames from one browser start, as one contact sheet with a legend that says what
// each cell is. The frames are the export's own, so what a sheet shows is what the file renders.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { framesUntil, nearestFrame } from "@uberscene/kit/schema";
import type { MediaResolver } from "@uberscene/player/engine";
import {
  aroundMoments,
  createPatchLog,
  listenRange,
  type Moment,
  parseMoments,
  type ResolvedState,
  resolve,
  resolveMoments,
  skimMoments,
  spokenWords,
} from "@uberscene/sdk";

import { writeAtomically } from "./atomic";
import type { FontFile } from "./fonts";
import { FrameKeys, readCached, wholeKey, writeCached } from "./frame-cache";
import { describeAt } from "./inspect";
import type { Insets, SafeZoneName } from "./layout-check";
import { clippingWarning, type Loudness } from "./loudness";
import { blankPicture, decodePng, encodePng, paste } from "./png";
import { type ExportSource, openEngine } from "./renderer";
import type { InkBounds, SheetCell } from "./web/page/protocol";
import { describeThings, type WhereThing, zoneRect } from "./where";

/** The most cells one sheet holds: past this a cell is too small to read, and the call too slow to be one look. */
export const MAX_LOOK_CELLS = 64;

/** The space between cells and around the sheet, in pixels, and the colour of it (the tiles' own ground). */
const SHEET_GAP = 8;
const SHEET_GROUND = [0x16, 0x16, 0x1d] as const;

/** Overlays drawn as DOM, which a sheet can leave out by hiding them. */
const DOM_OVERLAYS = new Set(["title", "shape", "svg", "sticker", "layer", "motion", "three", "captions"]);

export interface LookOptions {
  readonly state: ResolvedState;
  readonly source: ExportSource;
  readonly media: MediaResolver;
  /** The sheet to write, a PNG. */
  readonly out: string;
  /** Moments to look at, comma-separated (see `parseMoments`). */
  readonly at?: string;
  /** An element or a transition to look around: five moments across it. */
  readonly around?: string;
  /** An effect, an adjustment or an overlay to draw each frame with and without, side by side. */
  readonly without?: string;
  /**
   * A stretch to read a move across: a range such as `2..3` or an element's id. The sheet is a strip of small
   * frames at even steps from its start to its end, each labelled with its time alone.
   */
  readonly motion?: string;
  /** Seconds between the frames of a `motion` strip. Left out: the step that gives twelve frames. */
  readonly step?: number;
  /**
   * A safe zone to draw over every cell, by name or as margins: what is outside it is shaded, and each overlay, the
   * captions and each named part is outlined, red where it leaves the zone or the frame. The legend's cells gain
   * `things`, the rows `whereThings` gives for that moment.
   */
  readonly zones?: SafeZoneName | Insets;
  /** The width of a cell's picture; default 480 (240 in a `motion` strip, 180 for a portrait video). */
  readonly cell?: number;
  /** Cells in a row; default up to 4 (an even number with `without`), up to 12 in a `motion` strip. */
  readonly columns?: number;
  /**
   * A stretch to show the sound of, under the cells: `all`, a range such as `2..6`, or an element's id. The strip
   * holds the mix's waveform on a decibel scale, a time scale and the words said; the result says how loud it is and where it is silent.
   */
  readonly listen?: string;
  /** A folder to write each cell's full frame into as well, as PNG. */
  readonly frames?: string;
  /**
   * A folder to keep drawn cells in, keyed by what draws them: a cell an edit did not touch is read from there, and
   * a sheet of such cells starts no browser. Without it, nothing is kept.
   */
  readonly cacheDir?: string;
  readonly fonts?: readonly FontFile[];
  readonly onAssetError?: "throw" | "continue";
  /** Seconds one frame may take before the export fails with the frame and the step it was in; default 60. */
  readonly frameTimeout?: number;
  readonly onLog?: (message: string) => void;
}

export interface LookCell extends Moment {
  readonly index: number;
  readonly row: number;
  readonly column: number;
  /** `without` for the cell drawn without the thing asked about. */
  readonly variant?: "with" | "without";
  /** The ids of what is drawn, from the top of the picture down. */
  readonly seen: readonly string[];
  /** With `zones`: where each thing in the cell is, against the frame and the zone. */
  readonly things?: readonly WhereThing[];
  /** The cell's full frame, with `frames`. */
  readonly file?: string;
}

export interface LookSound extends Loudness {
  /** The stretch, in seconds of the finished video. */
  readonly from: number;
  readonly to: number;
  /**
   * The loudest sample and the average level of the mix there, in dB relative to full scale; null for silence. The
   * mix is measured before the export clamps it: a peak above 0 clips in the file, and `clipped` counts the samples.
   */
  readonly peakDb: number | null;
  readonly rmsDb: number | null;
  /** Stretches of at least 0.3 s quieter than -50 dBFS. */
  readonly silences: readonly (readonly [number, number])[];
  /** The words said, at the times they are said. */
  readonly words: readonly {
    readonly i: number;
    readonly text: string;
    readonly start: number;
    readonly end: number;
    readonly clip: string;
  }[];
  /** Where the strip is on the sheet, in pixels. */
  readonly strip: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

export interface LookResult {
  /** The sheet written, or null when no moment could be drawn. */
  readonly sheet: string | null;
  readonly width: number;
  readonly height: number;
  readonly columns: number;
  readonly cells: readonly LookCell[];
  /** How many of the cells were read from the cache instead of drawn. */
  readonly cached: number;
  /** The stretch a `motion` strip covers and the seconds between its frames. */
  readonly motion?: { readonly from: number; readonly to: number; readonly step: number };
  /** The sound of the stretch asked for with `listen`. */
  readonly listen?: LookSound;
  /** Moments that could not be found, and why. */
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/** What `without` asks to leave out: effects to switch off, or one DOM overlay to hide. */
function leaveOut(state: ResolvedState, id: string): { effects: string[] } | { overlay: string } {
  const p = state.items.get(id);
  if (!p) throw new Error(`--without ${id}: the file has no element with the id "${id}"`);
  if (p.kind === "effect") return { effects: [id] };
  if (p.kind === "adjustment") {
    const effects = p.children.filter((child) => state.items.get(child)?.kind === "effect");
    if (effects.length === 0) throw new Error(`--without ${id}: the adjustment has no effects to leave out`);
    return { effects };
  }
  if (DOM_OVERLAYS.has(p.kind)) return { overlay: id };
  throw new Error(
    `--without ${id}: a ${p.kind} cannot be left out without moving the cut; name an effect, an adjustment or an overlay (a title, a shape, an SVG, a sticker, a layer, the captions)`,
  );
}

/** The frames a motion strip shows by default. */
const MOTION_CELLS = 12;

/** The frames of a stretch at even steps, first to last, each frame once. */
function motionMoments(
  state: ResolvedState,
  text: string,
  step: number | undefined,
): { moments: Moment[]; motion: { from: number; to: number; step: number } } {
  const stretch = listenRange(state, text, "show as a strip");
  if ("error" in stretch) throw new Error(`--motion ${stretch.error}`);
  if (step !== undefined && !(step > 0)) throw new Error("--step must be more than 0");
  const { fps, rate, duration } = state.composition;
  const frames = Math.max(1, framesUntil(duration, rate));
  // Never finer than a frame: two cells of the same frame say nothing.
  const every = Math.max(1 / fps, step ?? (stretch.to - stretch.from) / (MOTION_CELLS - 1));
  const count = Math.floor((stretch.to - stretch.from) / every + 1e-9) + 1;
  if (count > MAX_LOOK_CELLS)
    throw new Error(
      `that is ${count} cells; one look holds at most ${MAX_LOOK_CELLS}. Give a larger --step or a shorter stretch`,
    );
  const moments: Moment[] = [];
  for (let i = 0; i < count; i++) {
    const time = stretch.from + i * every;
    const frame = Math.min(frames - 1, nearestFrame(time, rate));
    if (moments.some((m) => m.frame === frame)) continue;
    const at = Math.round(time * 1000) / 1000;
    moments.push({ label: at.toFixed(2), time: at, frame, about: `in ${text}` });
  }
  return { moments, motion: { ...stretch, step: Math.round(every * 1000) / 1000 } };
}

/** Refuses options that do not go together, before anything is drawn. */
function validateLook(options: LookOptions): void {
  if (options.at !== undefined && options.around !== undefined) throw new Error("give --at or --around, not both");
  if (!/\.png$/i.test(options.out)) throw new Error(`a sheet is a PNG: ${options.out} does not end in .png`);
  if (options.motion !== undefined)
    for (const other of ["at", "around", "without"] as const)
      if (options[other] !== undefined) throw new Error(`--motion shows one stretch on its own; leave out --${other}`);
  if (options.step !== undefined && options.motion === undefined) throw new Error("--step goes with --motion");
  if (options.zones !== undefined && options.without !== undefined)
    throw new Error("--zones draws one picture of each moment; leave out --without");
}

/** Draws the moments asked for, or the ones an editor would skim, onto one sheet. */
export async function renderLook(options: LookOptions): Promise<LookResult> {
  const { state } = options;
  validateLook(options);
  const strip = options.motion !== undefined ? motionMoments(state, options.motion, options.step) : null;
  const picked = strip
    ? { moments: strip.moments, errors: [] }
    : options.around !== undefined
      ? aroundMoments(state, options.around)
      : options.at !== undefined
        ? resolveMoments(state, parseMoments(options.at))
        : { moments: skimMoments(state), errors: [] };
  const out = options.without !== undefined ? leaveOut(state, options.without) : null;
  const stretch = options.listen !== undefined ? listenRange(state, options.listen) : null;
  if (stretch && "error" in stretch) throw new Error(`--listen ${stretch.error}`);
  const perMoment = out ? 2 : 1;
  if (picked.moments.length * perMoment > MAX_LOOK_CELLS)
    throw new Error(
      `that is ${picked.moments.length * perMoment} cells; one look holds at most ${MAX_LOOK_CELLS}. Ask for fewer moments (a range with a larger step, or --around one element)`,
    );
  const columns = Math.max(
    1,
    Math.floor(options.columns ?? Math.min(strip ? MOTION_CELLS : 4, picked.moments.length * perMoment)) || 1,
  );
  const perRow = out ? Math.max(2, columns - (columns % 2)) : columns;
  const warnings: string[] = [];
  const empty = { width: 0, height: 0, columns: perRow, cells: [], cached: 0, errors: picked.errors, warnings };
  if (picked.moments.length === 0) return { sheet: null, ...empty };

  // A strip's cells are narrow, so each carries its time and nothing else.
  const stamp = (m: Moment): string => (strip ? m.label : `${m.time.toFixed(2)} s · f${m.frame} · ${m.label}`);
  const cells: SheetCell[] = [];
  const legend: Omit<LookCell, "file">[] = [];
  for (const m of picked.moments) {
    const seen = describeAt(state, m).seen.map((s) => s.id);
    for (const variant of out ? (["with", "without"] as const) : [undefined]) {
      const index = cells.length;
      const without =
        variant === "without" && out
          ? "effects" in out
            ? { effects: true as const }
            : { overlay: out.overlay }
          : null;
      cells.push({
        t: m.frame / state.composition.fps,
        label: stamp(m),
        ...(strip ? {} : { sub: variant ? `${variant} ${options.without}` : m.about }),
        ...(without ? { without } : {}),
      });
      legend.push({
        ...m,
        index,
        row: Math.floor(index / perRow),
        column: index % perRow,
        ...(variant ? { variant } : {}),
        seen: variant === "without" && out && "overlay" in out ? seen.filter((id) => id !== out.overlay) : seen,
      });
    }
  }

  const portrait = state.composition.height > state.composition.width;
  const cellWidth = Math.max(64, Math.round(options.cell ?? (strip ? (portrait ? 180 : 240) : 480)));
  // A frame without some effects is a frame of the file with them switched off: the same state the page draws.
  let bare = state;
  if (out && "effects" in out) {
    const log = createPatchLog();
    for (const id of out.effects) log.append({ op: "set", id, prop: "enabled", value: false });
    bare = resolve(state.tree, state.manifest, log);
  }
  // The zone as a rectangle of the frame, and its name for the rows. A strip's cells are too small for words.
  const { width: W, height: H } = state.composition;
  const zone = options.zones !== undefined ? zoneRect(options.zones, W, H) : null;
  const zoneName = typeof options.zones === "string" ? options.zones : "custom";
  const labels = !strip;
  // Each cell's files in the cache: its tile (with what was measured in it, beside it), and its full frame when
  // those are asked for.
  const keys = options.cacheDir
    ? new FrameKeys({ state, source: options.source, media: options.media, fonts: options.fonts })
    : null;
  const names = await Promise.all(
    cells.map(async (cell, i) => {
      if (!keys) return null;
      const frame = (legend[i] as (typeof legend)[number]).frame;
      const drawnState = cell.without?.effects ? bare : state;
      const hidden = cell.without?.overlay ?? null;
      return {
        tile: `tile-${await keys.key(frame, { tile: cellWidth, label: cell.label, sub: cell.sub, hidden, ...(zone ? { zone, labels } : {}) }, drawnState)}.png`,
        frame: `frame-${await keys.key(frame, { frame: true, hidden }, drawnState)}.png`,
      };
    }),
  );
  const tiles: (Uint8Array | null)[] = cells.map(() => null);
  const frames: (Uint8Array | null)[] = cells.map(() => null);
  const measured: (readonly InkBounds[] | null)[] = cells.map(() => null);
  const boundsFile = (tile: string): string => tile.replace(/\.png$/, ".json");
  if (options.cacheDir)
    for (const [i, name] of names.entries()) {
      if (!name) continue;
      const tile = readCached(options.cacheDir, name.tile);
      const frame = options.frames ? readCached(options.cacheDir, name.frame) : null;
      const bounds = zone ? readCached(options.cacheDir, boundsFile(name.tile)) : null;
      if (tile && (!options.frames || frame) && (!zone || bounds)) {
        tiles[i] = tile;
        frames[i] = frame;
        if (bounds) measured[i] = JSON.parse(Buffer.from(bounds).toString("utf8")) as InkBounds[];
      }
    }
  const missing = cells.map((_, i) => i).filter((i) => !tiles[i]);

  // The sound strip is as wide as the cells and the gaps between them.
  const stripWidth = perRow * cellWidth + (perRow - 1) * SHEET_GAP;
  const words = stretch
    ? spokenWords(state)
        .filter((w) => w.end > stretch.from && w.start < stretch.to)
        .map((w) => ({ i: w.i, text: w.text, start: w.start, end: w.end, clip: w.play }))
    : [];
  // Any part of the file can change its sound, so the strip is kept under a key of the whole file.
  const soundName =
    stretch && keys
      ? `listen-${await wholeKey(keys, { listen: [stretch.from, stretch.to], width: stripWidth })}`
      : null;
  let sound: (Pick<LookSound, "peakDb" | "rmsDb" | "silences"> & Loudness & { bytes: Uint8Array }) | null = null;
  if (stretch && soundName && options.cacheDir) {
    const bytes = readCached(options.cacheDir, `${soundName}.png`);
    const measured = readCached(options.cacheDir, `${soundName}.json`);
    if (bytes && measured) sound = { bytes, ...JSON.parse(Buffer.from(measured).toString("utf8")) };
  }

  // The browser starts only for what the cache does not hold.
  if (missing.length > 0 || (stretch && !sound)) {
    const engine = await openEngine({
      ...options,
      warnings,
      ...(out && "effects" in out ? { disabled: out.effects } : {}),
    });
    try {
      const drawn =
        missing.length > 0
          ? await engine.tiles({
              cells: missing.map((i) => cells[i] as SheetCell),
              cellWidth,
              ...(options.frames ? { keepFrames: true } : {}),
              ...(zone ? { zone, labels } : {}),
            })
          : { tiles: [], frames: [], bounds: [] };
      const heard =
        stretch && !sound
          ? await engine.listen({ from: stretch.from, to: stretch.to, width: stripWidth, words })
          : null;
      const failed = await engine.errors();
      if (failed.length > 0) {
        if (options.onAssetError !== "continue") throw new Error(`cannot render: ${failed.join("; ")}`);
        for (const f of failed) warnings.push(`asset error: ${f}`);
      }
      for (const [n, i] of missing.entries()) {
        tiles[i] = drawn.tiles[n] as Uint8Array;
        frames[i] = drawn.frames[n] ?? null;
        measured[i] = drawn.bounds[n] ?? null;
        const name = names[i];
        // A frame drawn with a placeholder for media that could not be read is not kept.
        if (options.cacheDir && name && failed.length === 0) {
          writeCached(options.cacheDir, name.tile, tiles[i] as Uint8Array);
          if (measured[i])
            writeCached(options.cacheDir, boundsFile(name.tile), Buffer.from(JSON.stringify(measured[i])));
          if (frames[i]) writeCached(options.cacheDir, name.frame, frames[i] as Uint8Array);
        }
      }
      if (heard) {
        sound = heard;
        if (options.cacheDir && soundName && failed.length === 0) {
          const { bytes, ...measured } = heard;
          writeCached(options.cacheDir, `${soundName}.png`, bytes);
          writeCached(options.cacheDir, `${soundName}.json`, Buffer.from(JSON.stringify(measured)));
        }
      }
    } finally {
      await engine.close();
    }
  }

  // clippedAt is already in the video's seconds here.
  const clips = sound ? clippingWarning(sound) : null;
  if (clips) warnings.push(clips);

  // The sheet is put together here, from tiles, so one made of cached cells needs no browser at all.
  const pictures = tiles.map((bytes) => decodePng(bytes as Uint8Array));
  const first = pictures[0] as (typeof pictures)[number];
  const rows = Math.ceil(cells.length / perRow);
  const cellsHeight = rows * first.height + (rows + 1) * SHEET_GAP;
  const soundStrip = sound ? decodePng(sound.bytes) : null;
  const sheet = blankPicture(
    perRow * first.width + (perRow + 1) * SHEET_GAP,
    cellsHeight + (soundStrip ? soundStrip.height + SHEET_GAP : 0),
    SHEET_GROUND,
  );
  if (soundStrip) paste(sheet, soundStrip, SHEET_GAP, cellsHeight);
  for (const [i, picture] of pictures.entries())
    paste(
      sheet,
      picture,
      SHEET_GAP + (i % perRow) * (first.width + SHEET_GAP),
      SHEET_GAP + Math.floor(i / perRow) * (first.height + SHEET_GAP),
    );
  await writeAtomically(options.out, encodePng(sheet));
  const files: string[] = [];
  if (options.frames) {
    await mkdir(options.frames, { recursive: true });
    for (const [i, bytes] of frames.entries()) {
      const cell = legend[i] as (typeof legend)[number];
      const name = `${String(i).padStart(2, "0")}-f${cell.frame}${cell.variant === "without" ? "-without" : ""}.png`;
      files.push(join(options.frames, name));
      await writeFile(files[i] as string, bytes as Uint8Array);
    }
  }
  return {
    sheet: options.out,
    width: sheet.width,
    height: sheet.height,
    columns: perRow,
    cells: legend.map((cell, i) => ({
      ...cell,
      ...(zone && measured[i]
        ? {
            things: describeThings(measured[i] as readonly InkBounds[], [[zoneName, zone]], { x: 0, y: 0, w: W, h: H }),
          }
        : {}),
      ...(files[i] ? { file: files[i] as string } : {}),
    })),
    cached: cells.length - missing.length,
    ...(strip ? { motion: strip.motion } : {}),
    ...(stretch && sound && soundStrip
      ? {
          listen: {
            from: stretch.from,
            to: stretch.to,
            peakDb: sound.peakDb,
            rmsDb: sound.rmsDb,
            lufs: sound.lufs,
            truePeakDb: sound.truePeakDb,
            clipped: sound.clipped,
            clippedAt: sound.clippedAt,
            silences: sound.silences,
            words,
            strip: { x: SHEET_GAP, y: cellsHeight, width: soundStrip.width, height: soundStrip.height },
          },
        }
      : {}),
    errors: picked.errors,
    warnings,
  };
}
