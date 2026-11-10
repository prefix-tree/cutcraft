// `cutcraft look video.tsx`: many frames from one browser start, as one contact sheet with a legend that says what
// each cell is. The frames are the export's own, so what a sheet shows is what the file renders.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  aroundMoments,
  type Moment,
  parseMoments,
  type ResolvedState,
  resolveMoments,
  skimMoments,
} from "@cutcraft/kit";
import type { MediaResolver } from "@cutcraft/player/engine";

import type { FontFile } from "./fonts";
import { describeAt } from "./inspect";
import { type ExportSource, openEngine } from "./renderer";
import type { SheetCell } from "./web/page/protocol";

/** The most cells one sheet holds: past this a cell is too small to read, and the call too slow to be one look. */
export const MAX_LOOK_CELLS = 64;

/** Overlays drawn as DOM, which a sheet can leave out by hiding them. */
const DOM_OVERLAYS = new Set(["title", "shape", "svg", "sticker", "layer", "motion", "three", "captions"]);

export interface LookOptions {
  readonly state: ResolvedState;
  readonly source: ExportSource;
  readonly media: MediaResolver;
  /** The sheet to write: .jpg or .jpeg writes a JPEG, anything else a PNG. */
  readonly out: string;
  /** Moments to look at, comma-separated (see `parseMoments`). */
  readonly at?: string;
  /** An element or a transition to look around: five moments across it. */
  readonly around?: string;
  /** An effect, an adjustment or an overlay to draw each frame with and without, side by side. */
  readonly without?: string;
  /** The width of a cell's picture; default 480. */
  readonly cell?: number;
  /** Cells in a row; default up to 4 (an even number with `without`). */
  readonly columns?: number;
  /** A folder to write each cell's full frame into as well, as PNG. */
  readonly frames?: string;
  readonly fonts?: readonly FontFile[];
  readonly onAssetError?: "throw" | "continue";
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
  /** The cell's full frame, with `frames`. */
  readonly file?: string;
}

export interface LookResult {
  /** The sheet written, or null when no moment could be drawn. */
  readonly sheet: string | null;
  readonly width: number;
  readonly height: number;
  readonly columns: number;
  readonly cells: readonly LookCell[];
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

/** Draws the moments asked for, or the ones an editor would skim, onto one sheet. */
export async function renderLook(options: LookOptions): Promise<LookResult> {
  const { state } = options;
  if (options.at !== undefined && options.around !== undefined) throw new Error("give --at or --around, not both");
  const picked =
    options.around !== undefined
      ? aroundMoments(state, options.around)
      : options.at !== undefined
        ? resolveMoments(state, parseMoments(options.at))
        : { moments: skimMoments(state), errors: [] };
  const out = options.without !== undefined ? leaveOut(state, options.without) : null;
  const perMoment = out ? 2 : 1;
  if (picked.moments.length * perMoment > MAX_LOOK_CELLS)
    throw new Error(
      `that is ${picked.moments.length * perMoment} cells; one look holds at most ${MAX_LOOK_CELLS}. Ask for fewer moments (a range with a larger step, or --around one element)`,
    );
  const columns = Math.max(1, Math.floor(options.columns ?? Math.min(4, picked.moments.length * perMoment)) || 1);
  const perRow = out ? Math.max(2, columns - (columns % 2)) : columns;
  const warnings: string[] = [];
  const empty = { width: 0, height: 0, columns: perRow, cells: [], errors: picked.errors, warnings };
  if (picked.moments.length === 0) return { sheet: null, ...empty };

  const stamp = (m: Moment): string => `${m.time.toFixed(2)} s · f${m.frame} · ${m.label}`;
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
        sub: variant ? `${variant} ${options.without}` : m.about,
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

  const jpeg = /\.jpe?g$/i.test(options.out);
  const engine = await openEngine({
    ...options,
    warnings,
    ...(out && "effects" in out ? { disabled: out.effects } : {}),
  });
  try {
    const sheet = await engine.sheet({
      cells,
      columns: perRow,
      cellWidth: Math.max(64, Math.round(options.cell ?? 480)),
      type: jpeg ? "image/jpeg" : "image/png",
      ...(options.frames ? { keepFrames: true } : {}),
    });
    const failed = await engine.errors();
    if (failed.length > 0) {
      if (options.onAssetError !== "continue") throw new Error(`cannot render: ${failed.join("; ")}`);
      for (const f of failed) warnings.push(`asset error: ${f}`);
    }
    await writeFile(options.out, sheet.bytes);
    const files: string[] = [];
    if (options.frames) {
      await mkdir(options.frames, { recursive: true });
      for (const [i, bytes] of sheet.frames.entries()) {
        const cell = legend[i] as (typeof legend)[number];
        const name = `${String(i).padStart(2, "0")}-f${cell.frame}${cell.variant === "without" ? "-without" : ""}.png`;
        files.push(join(options.frames, name));
        await writeFile(files[i] as string, bytes);
      }
    }
    return {
      sheet: options.out,
      width: sheet.width,
      height: sheet.height,
      columns: perRow,
      cells: legend.map((cell, i) => ({ ...cell, ...(files[i] ? { file: files[i] as string } : {}) })),
      errors: picked.errors,
      warnings,
    };
  } finally {
    await engine.close();
  }
}
