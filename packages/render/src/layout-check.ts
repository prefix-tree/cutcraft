import { lookupAsset, type ResolvedState, type SubjectBox } from "@cutcut/kit";
import { FRAME_EPS, buildFramePlan, captureWarnings, type DrawOp, type DrawRect, type MediaResolver } from "@cutcut/player/engine";
import type { ReactNode } from "react";
import { initEnv } from "./env";
import { OverlayPlane, type OverlayBounds, type OverlayFont } from "./overlays";

/** Margins as fractions of the frame's height (top, bottom) and width (left, right). */
export interface Insets { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number }

/**
 * Where a platform's own UI covers the picture. TikTok, Reels and Shorts are the platforms' published in-feed ad
 * zones for 1080×1920 (TikTok and Shorts in pixels, Meta in percent), as collected at
 * https://reap.video/blog/short-form-video-safe-zones and https://www.hopperhq.com/blog/instagram-reel-size/,
 * checked 2026-10-31; the platforms' templates in their ads managers are the source of truth. Title- and
 * action-safe are SMPTE ST 2046-1: the middle 90% and 93% of the frame.
 */
export const SAFE_ZONES = {
  tiktok: { top: 240 / 1920, bottom: 660 / 1920, left: 120 / 1080, right: 120 / 1080 },
  reels: { top: 0.14, bottom: 0.35, left: 0.06, right: 0.06 },
  shorts: { top: 288 / 1920, bottom: 672 / 1920, left: 48 / 1080, right: 192 / 1080 },
  "title-safe": { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
  "action-safe": { top: 0.035, bottom: 0.035, left: 0.035, right: 0.035 },
} as const satisfies Record<string, Insets>;
export type SafeZoneName = keyof typeof SAFE_ZONES;

export type LayoutRule = "frame-edge" | "safe-zone" | "captions" | "subject";

/** One element breaking one rule over a run of consecutive samples. */
export interface LayoutIssue {
  readonly rule: LayoutRule;
  readonly id: string;
  readonly kind: string;
  /** What it runs into: the captions element's id, `subject`, or the safe zone's name (`custom` for insets). */
  readonly with?: string;
  /** Composition seconds of the first and last sample that break the rule. */
  readonly from: number;
  readonly to: number;
}

export interface LayoutCheckOptions {
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  readonly interiors?: ReadonlyMap<string, ReactNode>;
  readonly fonts?: readonly OverlayFont[];
  /** A named zone or margins of your own; default `title-safe`. */
  readonly safeZone?: SafeZoneName | Insets;
  /** Where the subject is, as fractions of the frame, while footage shows whose manifest entry has no `subjects`. */
  readonly subject?: DrawRect;
  /** Seconds between samples; default one frame. */
  readonly step?: number;
  readonly from?: number;
  readonly to?: number;
}

export interface LayoutCheckResult {
  readonly issues: readonly LayoutIssue[];
  readonly samples: number;
  readonly warnings: readonly string[];
}

/** Pixels an element may stray before it counts: the ink scan's own slack. */
const SLACK = 2;
/** A subject box is used this many seconds either side of the time it was sampled at. */
const SUBJECT_REACH = 1;

/**
 * Samples the composition and reports every overlay (titles, shapes, graphics, stickers, layers, and captions) that
 * leaves the frame, leaves the safe zone, covers captions (not captions themselves), or covers the subject, as runs
 * of consecutive offending samples. Overlays beneath the footage, and ones whose ink fills the frame (backgrounds),
 * are not checked; neither is a moment where an element is fainter than 10%.
 */
export async function checkLayout(options: LayoutCheckOptions): Promise<LayoutCheckResult> {
  initEnv();
  const { state } = options;
  const { fps, width: W, height: H, duration } = state.composition;
  const zoneName = typeof options.safeZone === "string" ? options.safeZone : options.safeZone ? "custom" : "title-safe";
  const z: Insets = typeof options.safeZone === "object" ? options.safeZone : SAFE_ZONES[options.safeZone ?? "title-safe"];
  const safe: DrawRect = { x: z.left * W, y: z.top * H, w: W - (z.left + z.right) * W, h: H - (z.top + z.bottom) * H };
  const step = Math.max(1, Math.round((options.step ?? 1 / fps) * fps));
  const first = Math.round(Math.max(0, options.from ?? 0) * fps);
  const last = Math.ceil(Math.min(duration, options.to ?? duration) * fps - FRAME_EPS);

  const warnings: string[] = [];
  captureWarnings((m) => { if (!warnings.includes(m)) warnings.push(m); });
  const plane = new OverlayPlane({ state, media: options.media, warn: (m) => warnings.push(m), ...(options.interiors ? { interiors: options.interiors } : {}), ...(options.fonts ? { fonts: options.fonts } : {}) });
  const issues: LayoutIssue[] = [];
  const open = new Map<string, { issue: { -readonly [K in keyof LayoutIssue]: LayoutIssue[K] }; n: number }>();
  const report = (rule: LayoutRule, b: OverlayBounds, n: number, other?: string): void => {
    const key = `${rule}|${b.id}|${other ?? ""}`;
    const run = open.get(key);
    if (run && run.n === n - step) { run.issue.to = n / fps; run.n = n; return; }
    const issue = { rule, id: b.id, kind: b.kind, ...(other !== undefined ? { with: other } : {}), from: n / fps, to: n / fps };
    issues.push(issue);
    open.set(key, { issue, n });
  };

  let samples = 0;
  try {
    for (let n = first; n < last; n += step) {
      samples++;
      const t = n / fps;
      const shown = (await plane.bounds(t)).filter((b) => !b.backdrop && !covers(b.rect, { x: 0, y: 0, w: W, h: H }));
      const captions = shown.filter((b) => b.kind === "captions");
      const subjects = subjectRects(state, t, options.subject);
      for (const b of shown) {
        if (!inside(b.rect, { x: 0, y: 0, w: W, h: H })) report("frame-edge", b, n);
        else if (!inside(b.rect, safe)) report("safe-zone", b, n, zoneName);
        if (b.kind !== "captions") for (const c of captions) if (overlaps(b.rect, c.rect)) report("captions", b, n, c.id);
        if (subjects.some((s) => overlaps(b.rect, s))) report("subject", b, n, "subject");
      }
    }
  } finally {
    plane.dispose();
    captureWarnings(null);
  }
  return { issues, samples, warnings };
}

function inside(r: DrawRect, area: DrawRect): boolean {
  return r.x >= area.x - SLACK && r.y >= area.y - SLACK && r.x + r.w <= area.x + area.w + SLACK && r.y + r.h <= area.y + area.h + SLACK;
}

function covers(r: DrawRect, area: DrawRect): boolean {
  return r.x <= area.x + SLACK && r.y <= area.y + SLACK && r.x + r.w >= area.x + area.w - SLACK && r.y + r.h >= area.y + area.h - SLACK;
}

function overlaps(a: DrawRect, b: DrawRect): boolean {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > SLACK && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > SLACK;
}

/**
 * The subject's boxes in composition pixels at `t`: from the manifest's `subjects` of each picture on screen, mapped
 * through its crop, fit and transform; else, while footage shows, the `fallback` region.
 */
export function subjectRects(state: ResolvedState, t: number, fallback?: DrawRect): DrawRect[] {
  const { width: W, height: H } = state.composition;
  const out: DrawRect[] = [];
  let footage = false, known = false;
  // shortcut: pictures inside a <Nested> are not looked into; resolve the nested plan here if subjects inside one matter.
  for (const op of buildFramePlan(state, t).ops) {
    if ((op.kind !== "video" && op.kind !== "image") || !op.asset) continue;
    footage = true;
    const asset = lookupAsset(state.manifest, op.asset);
    if (!asset?.subjects?.length) continue;
    known = true;
    const ref = op.cropReference ?? { width: asset.width ?? W, height: asset.height ?? H };
    for (const box of boxesAt(asset.subjects, asset.kind === "image" ? 0 : op.sourceTime ?? 0)) {
      const r = onScreen(box, op, ref, W, H);
      if (r) out.push(r);
    }
  }
  if (!known && footage && fallback) out.push({ x: fallback.x * W, y: fallback.y * H, w: fallback.w * W, h: fallback.h * H });
  return out;
}

/**
 * The boxes sampled nearest to source second `time`, within a second of it; malformed boxes are skipped.
 * shortcut: the nearest sample, not an interpolation between two; interpolate by box order if subjects move fast.
 */
function boxesAt(subjects: readonly SubjectBox[], time: number): SubjectBox[] {
  const valid = subjects.filter((b) => [b.t, b.x, b.y, b.w, b.h].every(Number.isFinite) && b.w > 0 && b.h > 0);
  let best = Number.POSITIVE_INFINITY;
  for (const b of valid) best = Math.min(best, Math.abs(b.t - time));
  if (best > SUBJECT_REACH) return [];
  return valid.filter((b) => Math.abs(Math.abs(b.t - time) - best) < 1e-9);
}

/** A box in source fractions through the op's crop, its drawn rect and matrix, clipped to the frame; null when off screen. */
function onScreen(box: SubjectBox, op: DrawOp, ref: { width: number; height: number }, W: number, H: number): DrawRect | null {
  const crop = op.crop ?? { x: 0, y: 0, w: ref.width, h: ref.height };
  const clamp = (v: number): number => Math.max(0, Math.min(1, v));
  const x0 = clamp((box.x * ref.width - crop.x) / crop.w) * op.rect.w, x1 = clamp(((box.x + box.w) * ref.width - crop.x) / crop.w) * op.rect.w;
  const y0 = clamp((box.y * ref.height - crop.y) / crop.h) * op.rect.h, y1 = clamp(((box.y + box.h) * ref.height - crop.y) / crop.h) * op.rect.h;
  if (x1 <= x0 || y1 <= y0) return null;
  const { a, b, c, d, e, f } = op.matrix;
  const xs = [x0, x1, x0, x1].map((x, i) => a * x + c * (i < 2 ? y0 : y1) + e);
  const ys = [x0, x1, x0, x1].map((x, i) => b * x + d * (i < 2 ? y0 : y1) + f);
  const left = Math.max(0, Math.min(...xs)), top = Math.max(0, Math.min(...ys));
  const right = Math.min(W, Math.max(...xs)), bottom = Math.min(H, Math.max(...ys));
  return right > left && bottom > top ? { x: left, y: top, w: right - left, h: bottom - top } : null;
}
