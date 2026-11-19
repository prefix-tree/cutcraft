// `uberscene where video.tsx --at 2.6`: where each thing on screen is at a moment, in pixels, against the frame and
// the safe zones, and what it overlaps. It reports; `--check-layout` is the judge.
import { type Moment, parseMoments, type ResolvedState, resolveMoments } from "@uberscene/kit";
import type { DrawRect, MediaResolver } from "@uberscene/player/engine";

import type { FontFile } from "./fonts";
import { collision, type Insets, overflow, rect, rounded, SAFE_ZONES, type SafeZoneName, SLACK } from "./layout-check";
import { type ExportSource, openEngine } from "./renderer";
import type { InkBounds } from "./web/page/protocol";

export interface WhereOptions {
  readonly state: ResolvedState;
  readonly source: ExportSource;
  readonly media: MediaResolver;
  /** Moments to report, comma-separated (see `parseMoments`). */
  readonly at: string;
  /**
   * The zone to hold each thing against, by name or as margins. Left out: `tiktok`, `reels` and `shorts` for a
   * portrait video, `title-safe` for any other.
   */
  readonly safeZone?: SafeZoneName | Insets;
  readonly fonts?: readonly FontFile[];
  readonly frameTimeout?: number;
  readonly onLog?: (message: string) => void;
}

type Side = "left" | "top" | "right" | "bottom";

export interface WhereThing {
  /** An element's id, or `<its id>/<name>` for a part its code named with `data-name`. */
  readonly id: string;
  readonly kind: string;
  /** Its ink, in composition pixels from the top left. */
  readonly box: DrawRect;
  readonly inFrame: boolean;
  /** Per zone: whether the ink is inside it, and how far past each edge it is when not. */
  readonly zones: Readonly<
    Record<string, { readonly inside: boolean; readonly out: readonly { readonly side: Side; readonly px: number }[] }>
  >;
  /** The other things its ink overlaps, each with the overlapping part of this one. */
  readonly over: readonly { readonly id: string; readonly box: DrawRect }[];
}

export interface WhereMoment extends Moment {
  readonly things: readonly WhereThing[];
}

export interface WhereResult {
  readonly width: number;
  readonly height: number;
  /** The zones each thing was held against. */
  readonly zones: readonly string[];
  readonly moments: readonly WhereMoment[];
  /** Moments that could not be found, and why. */
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/** How far a box is past each edge of an area, for the edges it is past. */
function past(box: DrawRect, area: DrawRect): { side: Side; px: number }[] {
  const all = [
    ["left", area.x - box.x],
    ["top", area.y - box.y],
    ["right", box.x + box.w - (area.x + area.w)],
    ["bottom", box.y + box.h - (area.y + area.h)],
  ] as const;
  return all.filter(([, px]) => px > SLACK).map(([side, px]) => ({ side, px: Math.round(px) }));
}

/**
 * What was measured at one moment, as rows: each thing's box, whether it is in the frame and in each zone, and what
 * it overlaps. `zones` are named rectangles in composition pixels.
 */
export function describeThings(
  found: readonly InkBounds[],
  zones: readonly (readonly [string, DrawRect])[],
  frame: DrawRect,
): WhereThing[] {
  return found.map((b) => ({
    id: b.id,
    kind: b.kind,
    box: rounded(b.rect),
    inFrame: overflow(b.rect, frame) <= SLACK,
    zones: Object.fromEntries(
      zones.map(([name, area]) => {
        const out = past(b.rect, area);
        return [name, { inside: out.length === 0, out }];
      }),
    ),
    // A part is always over the element that drew it, and that element over its parts: neither is news.
    over: found.flatMap((o) => {
      if (o === b || o.id === b.of || o.of === b.id) return [];
      const hit = collision(b.parts, o.parts);
      return hit ? [{ id: o.id, box: rounded(hit.mine) }] : [];
    }),
  }));
}

/** The rectangle a zone leaves clear, in a frame of the given size. */
export function zoneRect(zone: SafeZoneName | Insets, width: number, height: number): DrawRect {
  const z: Insets = typeof zone === "object" ? zone : SAFE_ZONES[zone];
  return {
    x: z.left * width,
    y: z.top * height,
    w: width - (z.left + z.right) * width,
    h: height - (z.top + z.bottom) * height,
  };
}

/** Measures every overlay, the captions and each named part at the moments asked for. */
export async function whereThings(options: WhereOptions): Promise<WhereResult> {
  const { state } = options;
  const { width: W, height: H, fps } = state.composition;
  const picked = resolveMoments(state, parseMoments(options.at));
  const names: readonly string[] =
    typeof options.safeZone === "string"
      ? [options.safeZone]
      : options.safeZone
        ? ["custom"]
        : H > W
          ? ["tiktok", "reels", "shorts"]
          : ["title-safe"];
  const areas = names.map((name): [string, DrawRect] => [
    name,
    zoneRect(typeof options.safeZone === "object" ? options.safeZone : (name as SafeZoneName), W, H),
  ]);
  const frame: DrawRect = { x: 0, y: 0, w: W, h: H };
  const warnings: string[] = [];
  const moments: WhereMoment[] = [];
  if (picked.moments.length === 0)
    return { width: W, height: H, zones: names, moments, errors: picked.errors, warnings };
  const engine = await openEngine({ ...options, warnings });
  try {
    for (const m of picked.moments) {
      const found = await engine.bounds(m.frame / fps, { parts: true });
      const seen = new Set<string>();
      for (const b of found) {
        if (seen.has(b.id) && b.kind === "part")
          warnings.push(
            `"${b.id}" names more than one element at ${m.time.toFixed(2)} s; give each its own data-name to tell them apart`,
          );
        seen.add(b.id);
      }
      moments.push({ ...m, things: describeThings(found, areas, frame) });
    }
    const failed = await engine.errors();
    for (const f of failed) warnings.push(`asset error: ${f}`);
  } finally {
    await engine.close();
  }
  return { width: W, height: H, zones: names, moments, errors: picked.errors, warnings: [...new Set(warnings)] };
}

/** The report as text: a block per moment, a row per thing. */
export function formatWhere(result: WhereResult): string {
  const blocks = result.moments.map((m) => {
    if (m.things.length === 0) return `${m.time.toFixed(2)} s (frame ${m.frame}): nothing to measure`;
    const idWidth = Math.max(...m.things.map((t) => t.id.length));
    const kindWidth = Math.max(...m.things.map((t) => t.kind.length));
    const boxWidth = Math.max(...m.things.map((t) => rect(t.box).length));
    const rows = m.things.map((t) => {
      const zones = result.zones
        .map((name) => {
          const z = t.zones[name];
          return `${name}: ${!z || z.inside ? "in" : `out ${z.out.map((o) => `${o.side} ${o.px} px`).join(", ")}`}`;
        })
        .join("   ");
      const over = t.over.map((o) => `over "${o.id}" (${o.box.w} x ${o.box.h} px)`).join(", ");
      return `  ${t.id.padEnd(idWidth)}  ${t.kind.padEnd(kindWidth)}  ${rect(t.box).padEnd(boxWidth)}  ${t.inFrame ? "in frame " : "off frame"}  ${zones}${over ? `   ${over}` : ""}`;
    });
    return [`${m.time.toFixed(2)} s (frame ${m.frame})`, ...rows].join("\n");
  });
  return `${blocks.join("\n\n")}\n`;
}
