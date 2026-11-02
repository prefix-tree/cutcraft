import type { ResolvedState } from "@cutcraft/kit";

/** Kinds the overlay plane draws (as DOM in the preview, through Satori and skia in the export) rather than the canvas. */
export const OVERLAY_KINDS: ReadonlySet<string> = new Set(["title", "shape", "svg", "sticker", "graphic", "layer", "adjustment"]);

/** Kinds that put footage on the canvas. */
const FOOTAGE_KINDS: ReadonlySet<string> = new Set(["clip", "nested", "multicam"]);

const memo = new WeakMap<ResolvedState, ReadonlySet<string>>();

/**
 * The tracks whose overlays draw beneath the footage: those below every
 * visible track that holds footage, when one of them holds an overlay (a
 * background graphic under the cut, say). Empty otherwise, and then every
 * overlay draws above the footage as before. When it is not empty, the canvas
 * holds only the footage over a transparent ground, and the composition
 * background is painted beneath the backdrop instead.
 */
export function backdropTracks(state: ResolvedState): ReadonlySet<string> {
  const hit = memo.get(state);
  if (hit) return hit;
  const footage = state.tracks.filter((t) => !t.hidden && t.items.some((id) => FOOTAGE_KINDS.has(state.items.get(id)?.kind ?? "")));
  const lowest = footage.length ? Math.min(...footage.map((t) => t.order)) : -1;
  const drawn = (id: string) => { const k = state.items.get(id)?.kind ?? ""; return k !== "adjustment" && OVERLAY_KINDS.has(k); };
  const below = state.tracks.filter((t) => t.order < lowest && !t.hidden && t.items.some(drawn));
  const set: ReadonlySet<string> = new Set(below.map((t) => t.id));
  memo.set(state, set);
  return set;
}
