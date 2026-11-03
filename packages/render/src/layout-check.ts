import { lookupAsset, type ResolvedState, type SubjectBox } from "@cutcraft/kit";
import { FRAME_EPS, boundsOf, buildFramePlan, captureWarnings, type DrawOp, type DrawRect, type MediaResolver } from "@cutcraft/player/engine";
import { buildSourceIndex, type SourceIndex } from "@cutcraft/kit/source";
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

/**
 * One element breaking one rule over a run of consecutive samples, described for a reader who cannot see the
 * frame: what is wrong in words (`message`), the smallest change that clears it (`fix`), and the measurements at the
 * worst moment of the run. Boxes are composition pixels from the top left, rounded.
 */
export interface LayoutIssue {
  readonly rule: LayoutRule;
  readonly id: string;
  readonly kind: string;
  /** What it runs into: the captions element's id, `subject`, or the safe zone's name (`custom` for insets). */
  readonly with?: string;
  /** Composition seconds of the first and last sample that break the rule. */
  readonly from: number;
  readonly to: number;
  /** The worst moment: furthest past the edge, or the largest overlap. */
  readonly at: number;
  /** The element's ink at `at`; for an overlap, the part of it that overlaps. */
  readonly box: DrawRect;
  /** What it breaks at `at`: the frame, the safe zone, or the captions' or subject's box it overlaps. */
  readonly area: DrawRect;
  /** What is wrong, in one plain sentence. */
  readonly message: string;
  /** The smallest change that clears it at `at`, in props to edit. */
  readonly fix: string;
  /** Where to make the fix in the file, when the check was given the source. */
  readonly source?: SourceSpot;
}

/** A place in the cut file, as a compiler reports it. Line and column count from 1. */
export interface SourceSpot {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  /** That line of the file. */
  readonly code: string;
  /** Set when a helper generated the element: the spot is the call to it, not the element. */
  readonly helper?: string;
  /** Set when the element is one of several a loop makes: the spot is the JSX in the loop. */
  readonly loop?: true;
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
  /** The cut file's path (as it should be printed) and text, to point each issue at its place in the JSX. */
  readonly source?: { readonly file: string; readonly text: string };
}

export interface LayoutCheckResult {
  /** One line on what was checked and what was found. */
  readonly summary: string;
  readonly issues: readonly LayoutIssue[];
  readonly samples: number;
  readonly warnings: readonly string[];
}

/** Pixels an element may stray before it counts: the ink scan's own slack. */
const SLACK = 2;
/** A subject box is used this many seconds either side of the time it was sampled at. */
const SUBJECT_REACH = 1;

type Run = { -readonly [K in keyof LayoutIssue]: LayoutIssue[K] } & { n: number; worst: number };

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
  for (const k of ["step", "from", "to"] as const) {
    const v = options[k];
    if (v !== undefined && !(Number.isFinite(v) && v >= 0 && (k !== "step" || v > 0))) throw new Error(`${k} must be ${k === "step" ? "above 0" : "0 or more"} seconds, got ${v}`);
  }
  const zoneName = typeof options.safeZone === "string" ? options.safeZone : options.safeZone ? "custom" : "title-safe";
  const z: Insets = typeof options.safeZone === "object" ? options.safeZone : SAFE_ZONES[options.safeZone ?? "title-safe"];
  const frame: DrawRect = { x: 0, y: 0, w: W, h: H };
  const safe: DrawRect = { x: z.left * W, y: z.top * H, w: W - (z.left + z.right) * W, h: H - (z.top + z.bottom) * H };
  const step = Math.max(1, Math.round((options.step ?? 1 / fps) * fps));
  const first = Math.round((options.from ?? 0) * fps);
  const last = Math.ceil(Math.min(duration, options.to ?? duration) * fps - FRAME_EPS);

  const warnings: string[] = [];
  captureWarnings((m) => { if (!warnings.includes(m)) warnings.push(m); });
  const plane = new OverlayPlane({ state, media: options.media, warn: (m) => warnings.push(m), ...(options.interiors ? { interiors: options.interiors } : {}), ...(options.fonts ? { fonts: options.fonts } : {}) });
  const issues: Run[] = [];
  const open = new Map<string, Run>();
  /** Records a breach at frame `n` with its size (`worst` decides the moment the issue describes). */
  const report = (rule: LayoutRule, b: OverlayBounds, n: number, worst: number, box: DrawRect, area: DrawRect, other?: string): void => {
    const key = `${rule}|${b.id}|${other ?? ""}`;
    let run = open.get(key);
    if (!run || run.n !== n - step) {
      run = { rule, id: b.id, kind: b.kind, ...(other !== undefined ? { with: other } : {}), from: n / fps, to: n / fps, at: n / fps, box, area, message: "", fix: "", n, worst: -1 };
      issues.push(run);
      open.set(key, run);
    }
    run.to = n / fps;
    run.n = n;
    if (worst > run.worst) Object.assign(run, { worst, at: n / fps, box, area });
  };

  let samples = 0;
  try {
    for (let n = first; n < last; n += step) {
      samples++;
      const t = n / fps;
      const shown = (await plane.bounds(t)).filter((b) => !b.backdrop && !covers(b.rect, frame));
      const captions = shown.filter((b) => b.kind === "captions");
      const subjects = subjectRects(state, t, options.subject);
      for (const b of shown) {
        const out = overflow(b.rect, frame);
        if (out > SLACK) report("frame-edge", b, n, out, b.rect, frame);
        else if (overflow(b.rect, safe) > SLACK) report("safe-zone", b, n, overflow(b.rect, safe), b.rect, safe, zoneName);
        if (b.kind !== "captions") {
          for (const c of captions) {
            const hit = collision(b.parts, c.parts);
            if (hit) report("captions", b, n, hit.size, hit.mine, hit.theirs, c.id);
          }
        }
        for (const s of subjects) {
          const hit = collision(b.parts, [s]);
          if (hit) { report("subject", b, n, hit.size, hit.mine, hit.theirs, "subject"); break; }
        }
      }
    }
  } finally {
    plane.dispose();
    captureWarnings(null);
  }
  const ms = (t: number): number => Math.round(t * 1000) / 1000;
  const index = options.source ? buildSourceIndex(options.source.text) : null;
  const result = issues.map(({ n: _n, worst: _w, ...issue }) => {
    const described = describe({ ...issue, from: ms(issue.from), to: ms(issue.to), at: ms(issue.at), box: rounded(issue.box), area: rounded(issue.area) });
    const spot = options.source && index ? locate(options.source.file, index, state, issue.id, issue.kind) : null;
    return spot ? { ...described, source: spot } : described;
  });
  // As a compiler lists them: by place in the file, then by time; issues with no place come last, by time.
  const place = (i: LayoutIssue): number => (i.source ? i.source.line * 1e6 + i.source.column : Number.POSITIVE_INFINITY);
  result.sort((a, b) => place(a) - place(b) || a.from - b.from);
  const ids = new Set(result.map((i) => i.id));
  const every = step === 1 ? "every frame" : `every ${(step / fps).toFixed(2)} s`;
  const summary = result.length === 0
    ? `No layout issues in ${samples} samples (${every}, safe zone ${zoneName}).`
    : `${result.length} layout issue${result.length === 1 ? "" : "s"} on ${ids.size} element${ids.size === 1 ? "" : "s"} in ${samples} samples (${every}, safe zone ${zoneName}).`;
  return { summary, issues: result, samples, warnings };
}

/** How far `r` reaches past `area` on its worst side, in pixels; 0 or less when inside. */
function overflow(r: DrawRect, area: DrawRect): number {
  return Math.max(area.x - r.x, area.y - r.y, r.x + r.w - (area.x + area.w), r.y + r.h - (area.y + area.h));
}

function covers(r: DrawRect, area: DrawRect): boolean {
  return r.x <= area.x + SLACK && r.y <= area.y + SLACK && r.x + r.w >= area.x + area.w - SLACK && r.y + r.h >= area.y + area.h - SLACK;
}

function intersection(a: DrawRect, b: DrawRect): DrawRect | null {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

function union(boxes: readonly DrawRect[]): DrawRect {
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

/**
 * Where two sets of ink boxes overlap: the parts of each that touch the other, and the overlapping area in px².
 * The slack applies to the overlap as a whole, since a thin element's cells can each be thinner than it.
 */
function collision(mine: readonly DrawRect[], theirs: readonly DrawRect[]): { mine: DrawRect; theirs: DrawRect; size: number } | null {
  const a = new Set<DrawRect>(), b = new Set<DrawRect>(), hits: DrawRect[] = [];
  for (const p of mine) {
    for (const q of theirs) {
      const i = intersection(p, q);
      if (!i) continue;
      hits.push(i);
      a.add(p);
      b.add(q);
    }
  }
  if (hits.length === 0) return null;
  const all = union(hits);
  if (all.w <= SLACK || all.h <= SLACK) return null;
  return { mine: union([...a]), theirs: union([...b]), size: hits.reduce((sum, i) => sum + i.w * i.h, 0) };
}

function rounded(r: DrawRect): DrawRect {
  const x = Math.round(r.x), y = Math.round(r.y);
  return { x, y, w: Math.round(r.x + r.w) - x, h: Math.round(r.y + r.h) - y };
}

const s2 = (t: number): string => `${t.toFixed(2)} s`;
const rect = (r: DrawRect): string => `x ${r.x}..${r.x + r.w}, y ${r.y}..${r.y + r.h}`;
const SIDE = { left: "on the left", top: "at the top", right: "on the right", bottom: "at the bottom" } as const;
const signed = (v: number): string => (v > 0 ? `+${v}` : `${v}`);

/** A move of the element by (dx, dy) pixels in words, with the transform props that make it. */
function moveText(kind: string, dx: number, dy: number): string {
  const words = [dx && `${dx > 0 ? "right" : "left"} ${Math.abs(dx)} px`, dy && `${dy > 0 ? "down" : "up"} ${Math.abs(dy)} px`].filter(Boolean).join(" and ");
  if (kind === "captions") return `move the captions ${words} (style.position, or a smaller style.size)`;
  const props = [dx && `transform.position.x ${signed(dx)}`, dy && `transform.position.y ${signed(dy)}`].filter(Boolean).join(", ");
  return `move it ${words} (${props})`;
}

/** Fills in `message` and `fix` from the measurements. */
function describe(issue: LayoutIssue): LayoutIssue {
  const { box, area } = issue;
  const who = `${issue.kind} "${issue.id}"`;
  const when = issue.from === issue.to ? `at ${s2(issue.from)}` : `from ${s2(issue.from)} to ${s2(issue.to)}`;
  if (issue.rule === "frame-edge" || issue.rule === "safe-zone") {
    const past = [["left", area.x - box.x], ["top", area.y - box.y], ["right", box.x + box.w - (area.x + area.w)], ["bottom", box.y + box.h - (area.y + area.h)]] as const;
    const sides = past.filter(([, v]) => v > SLACK).map(([side, v]) => `${SIDE[side]} by ${v} px`).join(" and ");
    const message = `${who} ${issue.rule === "frame-edge" ? "runs off the frame" : `sticks out of the ${issue.with} safe zone`} ${sides}, ${when}.`;
    if (box.w > area.w || box.h > area.h) {
      const scale = Math.floor(Math.min(area.w / box.w, area.h / box.h) * 100) / 100;
      return { ...issue, message, fix: `it is ${box.w}×${box.h} px but the ${issue.rule === "frame-edge" ? "frame" : "zone"} is ${Math.round(area.w)}×${Math.round(area.h)}: scale it to ${scale} or less (transform.scale) and keep it within ${rect(area)}` };
    }
    const dx = box.x < area.x ? Math.ceil(area.x - box.x) : box.x + box.w > area.x + area.w ? -Math.ceil(box.x + box.w - (area.x + area.w)) : 0;
    const dy = box.y < area.y ? Math.ceil(area.y - box.y) : box.y + box.h > area.y + area.h ? -Math.ceil(box.y + box.h - (area.y + area.h)) : 0;
    return { ...issue, message, fix: moveText(issue.kind, dx, dy) };
  }
  const other = issue.rule === "subject" ? "the subject" : `captions "${issue.with}"`;
  const message = `${who} covers ${other} ${when}.`;
  // The shortest way out of the overlap, one axis at a time.
  const moves: [number, number][] = [[0, area.y - (box.y + box.h)], [0, area.y + area.h - box.y], [area.x - (box.x + box.w), 0], [area.x + area.w - box.x, 0]];
  const [dx, dy] = moves.map(([x, y]) => [x && x + Math.sign(x) * SLACK, y && y + Math.sign(y) * SLACK] as [number, number]).sort((p, q) => Math.abs(p[0] + p[1]) - Math.abs(q[0] + q[1]))[0]!;
  return { ...issue, message, fix: `${moveText(issue.kind, Math.round(dx), Math.round(dy))}, then check again: the move may run into something else` };
}

/**
 * Where to fix an element in the file: its `transform` (its `style` for captions), else its opening tag; for an
 * element a helper generated, the call to the helper; for one a loop made, the JSX in the loop. Null when the file
 * shows no single place for it.
 */
function locate(file: string, index: SourceIndex, state: ResolvedState, id: string, kind: string): SourceSpot | null {
  const node = state.tree.byId.get(id);
  const site = node?.editable === "generated" ? undefined : index.elements.get(id);
  const origin = node?.origin;
  const call = !site && origin ? index.calls.find((c) => c.helper === origin.helper && c.callIndex === origin.callIndex) : undefined;
  let at: number, helper: string | undefined, loop = false;
  if (site) {
    at = (site.props.get(kind === "captions" ? "style" : "transform") ?? site).range[0];
  } else if (call) {
    at = call.range[0];
    helper = call.helper;
  } else {
    const r = loopSite(index, state, id, kind);
    if (r === null) return null;
    at = r;
    loop = true;
  }
  const before = index.text.slice(0, at);
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEnd = index.text.indexOf("\n", at);
  return {
    file, line: before.split("\n").length, column: at - lineStart + 1, code: index.text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd),
    ...(helper ? { helper } : {}), ...(loop ? { loop: true as const } : {}),
  };
}

/**
 * The JSX in a loop that made element `id`: of the elements of its kind with an expression id inside its parent,
 * the one whose id template starts the way `id` does (`` `dot-${i}` `` for "dot-3"). Null unless exactly one fits.
 */
function loopSite(index: SourceIndex, state: ResolvedState, id: string, kind: string): number | null {
  const parent = state.tree.byId.get(id)?.parent;
  const within = parent ? index.elements.get(parent)?.range : undefined;
  const fits = index.dynamic.filter((d) => d.kind === kind && (!within || (d.range[0] >= within[0] && d.range[1] <= within[1])));
  const prefixed = fits.filter((d) => id.startsWith(/^[`'"]([^`'"$]*)/.exec(d.idText)?.[1] ?? ""));
  const pick = fits.length === 1 ? fits : prefixed;
  return pick.length === 1 ? pick[0]!.range[0] : null;
}

/**
 * The result as a compiler prints it: per issue `file:line:column`, the rule and the message, the line of JSX with a
 * caret under the spot, and the fix; then the summary.
 */
export function formatLayout(result: LayoutCheckResult): string {
  const blocks = result.issues.map((i) => {
    const where = i.source ? `${i.source.file}:${i.source.line}:${i.source.column}` : `<${i.kind} id="${i.id}">`;
    const lines = [`${where}: ${i.rule}: ${i.message}`];
    if (i.source) {
      const n = String(i.source.line);
      const note = i.source.helper ? ` made by ${i.source.helper}()` : i.source.loop ? ` made in a loop, as "${i.id}"` : "";
      lines.push(`  ${n} | ${i.source.code}`, `  ${" ".repeat(n.length)} | ${" ".repeat(i.source.column - 1)}^${note}`);
    }
    lines.push(`  fix: ${i.fix}`);
    return lines.join("\n");
  });
  return `${[...blocks, ...result.warnings.map((w) => `warning: ${w}`), result.summary].join("\n\n")}\n`;
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
  const r = boundsOf({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, op.matrix);
  const left = Math.max(0, r.x), top = Math.max(0, r.y), right = Math.min(W, r.x + r.w), bottom = Math.min(H, r.y + r.h);
  return right > left && bottom > top ? { x: left, y: top, w: right - left, h: bottom - top } : null;
}
