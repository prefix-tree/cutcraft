// `cutcraft inspect video.tsx`: the timeline read back as an editor reads it, in text or as flat JSON rows, and what
// is on screen and heard at chosen moments. It runs the resolver and the player's model only: no browser, no media.
import {
  capabilitiesOf,
  type ElementRow,
  lookupAsset,
  type Moment,
  parseMoments,
  type ResolvedState,
  resolveMoments,
  spokenWords,
  type TimelineRows,
  timelineRows,
} from "@cutcraft/kit";
import {
  animatedTransform,
  buildGainEnvelope,
  paramsAt,
  placementSourceTime,
  visiblePlacements,
} from "@cutcraft/player/engine";

import { envelopeAt } from "./mixer";

/** One element on screen at a moment, with its values there. */
export interface SeenElement {
  readonly id: string;
  readonly kind: string;
  readonly track: string;
  /** 0..1 through the element. */
  readonly progress: number;
  /** The second of its asset on screen, for footage. */
  readonly sourceTime?: number;
  readonly text?: string;
  /** The transform where it differs from the resting one, keyframes applied. */
  readonly transform?: Readonly<Record<string, unknown>>;
  /** Each effect in the order it runs, with its params at this moment. */
  readonly effects: readonly {
    readonly id: string;
    readonly type: string;
    readonly params: Readonly<Record<string, unknown>>;
  }[];
  /** The transition it is in, and how far through. */
  readonly transition?: { readonly id: string; readonly role: "out" | "in"; readonly progress: number };
}

/** One sound playing at a moment. */
export interface HeardElement {
  readonly id: string;
  readonly track: string;
  readonly asset: string;
  /** The gain after volume, keyframes, fades, automation and ducking. */
  readonly gain: number;
}

export interface MomentView extends Moment {
  /** What is drawn, the top of the picture first. */
  readonly seen: readonly SeenElement[];
  readonly heard: readonly HeardElement[];
  /** The transcript word being said. */
  readonly word?: { readonly i: number; readonly text: string; readonly clip: string };
  /** The caption on screen. */
  readonly caption?: string;
}

const ms = (x: number): number => Math.round(x * 1000) / 1000 + 0;
const typeName = (type: unknown): string =>
  typeof type === "string" ? type : String((type as { name?: unknown } | null)?.name ?? "custom");

/** What is on screen and heard at one moment. */
export function describeAt(state: ResolvedState, moment: Moment): MomentView {
  const t = moment.time;
  const seen: SeenElement[] = [];
  for (const { placement: p, track, children, transition } of visiblePlacements(state, t)) {
    // A clip at the very end of the transition it leaves through draws nothing.
    if (transition?.role === "out" && transition.progress >= 1) continue;
    const rel = t - p.start;
    const transform = restless(animatedTransform(p.props.transform as never, children, rel) as Record<string, unknown>);
    const text = p.kind === "title" ? state.tree.byId.get(p.id)?.text : undefined;
    seen.push({
      id: p.id,
      kind: p.kind,
      track: track.id,
      progress: ms(p.duration > 0 ? Math.min(1, Math.max(0, rel / p.duration)) : 0),
      ...(p.source ? { sourceTime: ms(placementSourceTime(p, children, t)) } : {}),
      ...(text ? { text } : {}),
      ...(transform ? { transform } : {}),
      effects: children
        .filter((c) => c.kind === "effect" && c.props.enabled !== false)
        .map((c) => ({ id: c.id, type: typeName(c.props.type), params: paramsAt(state.items, c, rel) })),
      ...(transition
        ? { transition: { id: transition.placement.id, role: transition.role, progress: ms(transition.progress) } }
        : {}),
    });
  }
  // The file's first track is the bottom of the picture; a person reads a frame from the top.
  seen.reverse();

  const heard: HeardElement[] = [];
  const anySolo = state.tracks.some((track) => track.solo);
  for (const track of state.tracks) {
    if (track.hidden || track.muted || (anySolo && !track.solo)) continue;
    for (const p of state.items.values()) {
      if (p.track !== track.id || p.parent === null || !capabilitiesOf(p.kind).audio) continue;
      // Ends carry float fuzz from the resolver: a sound is over at its end, to the microsecond.
      if (!(t >= p.start && t < p.end - 1e-6) || !p.source) continue;
      const asset = lookupAsset(state.manifest, p.source.asset);
      if (!asset || asset.kind === "image" || (asset.kind === "video" && !asset.audio)) continue;
      const gain = envelopeAt(buildGainEnvelope(p, track, state, p.start, p.end), t, 1);
      heard.push({ id: p.id, track: track.id, asset: asset.id, gain: Math.round(gain * 100) / 100 });
    }
  }

  const word = spokenWords(state).find((w) => t >= w.start && t < w.end);
  const caption = [...state.items.values()].find(
    (p) => p.kind === "caption" && state.items.get(p.parent ?? "")?.kind === "captions" && t >= p.start && t < p.end,
  );
  return {
    ...moment,
    seen,
    heard,
    ...(word ? { word: { i: word.i, text: word.text, clip: word.play } } : {}),
    ...(caption ? { caption: String(caption.props.text ?? "") } : {}),
  };
}

/** The parts of a transform that differ from one at rest, rounded; undefined when none do. */
function restless(t: Record<string, unknown>): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  const pair = (v: unknown, rest: number): { x: number; y: number } | undefined => {
    const p = typeof v === "number" ? { x: v, y: v } : (v as { x?: number; y?: number } | undefined);
    if (!p) return undefined;
    const x = ms(p.x ?? rest),
      y = ms(p.y ?? rest);
    return x === rest && y === rest ? undefined : { x, y };
  };
  const position = pair(t.position, 0);
  if (position) out.position = position;
  const scale = pair(t.scale, 1);
  if (scale) out.scale = scale;
  if (typeof t.rotation === "number" && ms(t.rotation) !== 0) out.rotation = ms(t.rotation);
  if (typeof t.opacity === "number" && ms(t.opacity) !== 1) out.opacity = ms(t.opacity);
  return Object.keys(out).length > 0 ? out : undefined;
}

const seconds = (x: number): string => x.toFixed(2);
const quote = (text: string, max = 48): string =>
  `"${text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text}"`;
const value = (v: unknown): string =>
  typeof v === "number" ? String(Math.round(v * 1000) / 1000) : typeof v === "string" ? v : JSON.stringify(v);
const paramList = (params: Readonly<Record<string, unknown>>): string =>
  Object.entries(params)
    .map(([name, v]) => `${name}=${value(v)}`)
    .join(" ");

/** The timeline as text: a line for the video, then each track with its elements in time order. */
export function formatTimeline(file: string, rows: TimelineRows): string {
  const c = rows.composition;
  const lines = [
    `${file}  ${c.width}x${c.height}  ${c.fps} fps  ${seconds(c.duration)} s (${c.frames} frames)  ${rows.errors.length} error${rows.errors.length === 1 ? "" : "s"}`,
  ];
  for (const e of rows.errors) lines.push(`  error: ${e.id ?? "?"}: ${e.message}`);
  const effects = new Map<string, string[]>();
  for (const fx of rows.effects) {
    const params = paramList(fx.params);
    effects.set(fx.element, [...(effects.get(fx.element) ?? []), `${fx.id}(${fx.type}${params ? ` ${params}` : ""})`]);
  }
  const keyed = new Map<string, Set<string>>();
  for (const k of rows.keyframes) keyed.set(k.element, (keyed.get(k.element) ?? new Set()).add(k.property));
  const words = new Map<string, TimelineRows["words"][number][]>();
  for (const w of rows.words) words.set(w.clip, [...(words.get(w.clip) ?? []), w]);

  const line = (e: ElementRow): string => {
    const when =
      e.end > e.start
        ? `${seconds(e.start).padStart(7)}–${seconds(e.end).padEnd(7)}`
        : seconds(e.start).padStart(7).padEnd(15);
    const parts = [when, e.kind.padEnd(10), e.id];
    if (e.kind === "transition") parts.push(`${e.type ?? ""} (${e.from} → ${e.to})`);
    if (e.asset)
      parts.push(
        `asset:${e.asset} ${seconds(e.in ?? 0)}–${seconds(e.out ?? 0)}${e.speed !== 1 ? ` at ${e.speed}x` : ""}`,
      );
    if (e.text) parts.push(quote(e.text));
    if (e.label) parts.push(`"${e.label}"`);
    if (e.anchor)
      parts.push(`anchor ${e.anchor}${e.at !== undefined ? ` at ${e.at}` : ""}${e.offset ? ` +${e.offset}` : ""}`);
    const said = words.get(e.id);
    if (said?.length) {
      const first = said[0] as (typeof said)[number],
        last = said[said.length - 1] as (typeof said)[number];
      parts.push(`words ${first.i}–${last.i} ${quote(said.map((w) => w.text).join(" "))}`);
    }
    const fx = effects.get(e.id);
    if (fx) parts.push(`effects: ${fx.join(", ")}`);
    const keys = keyed.get(e.id);
    if (keys) parts.push(`keyframes: ${[...keys].join(", ")}`);
    return `  ${parts.join("  ")}`;
  };

  for (const track of [...rows.tracks].sort((a, b) => a.order - b.order)) {
    const flags = [track.hidden && "hidden", track.muted && "muted", track.solo && "solo"].filter(Boolean);
    lines.push(`track ${track.id} (${track.layout}${flags.length ? `, ${flags.join(", ")}` : ""})`);
    for (const e of rows.elements) if (e.track === track.id && e.parent === track.id) lines.push(line(e));
  }
  const loose = rows.elements.filter((e) => e.track === null && e.kind !== "caption");
  if (loose.length > 0) {
    lines.push("composition");
    for (const e of loose) {
      lines.push(line(e));
      if (e.kind === "captions") for (const cue of rows.elements) if (cue.parent === e.id) lines.push(`  ${line(cue)}`);
    }
  }
  if (rows.cuts.length > 0)
    lines.push(
      `cuts: ${rows.cuts.map((cut) => `${seconds(cut.time)} ${cut.from}→${cut.to}${cut.transition ? ` (${cut.transition})` : ""}`).join(", ")}`,
    );
  return `${lines.join("\n")}\n`;
}

/** Each moment as text: where it is, what is drawn from the top down, what is heard and said. */
export function formatAt(views: readonly MomentView[]): string {
  const blocks = views.map((v) => {
    const lines = [`${v.label}  ${seconds(v.time)} s  frame ${v.frame}  (${v.about})`];
    if (v.seen.length === 0) lines.push("  seen: nothing but the background");
    for (const s of v.seen) {
      const parts = [`${s.kind} ${s.id}`, `${Math.round(s.progress * 100)}% through`];
      if (s.sourceTime !== undefined) parts.push(`source ${seconds(s.sourceTime)} s`);
      if (s.text) parts.push(quote(s.text));
      if (s.transition)
        parts.push(
          `${s.transition.role === "in" ? "coming in" : "going out"} through ${s.transition.id} at ${Math.round(s.transition.progress * 100)}%`,
        );
      if (s.transform) parts.push(`transform ${paramList(flat(s.transform))}`);
      for (const fx of s.effects)
        parts.push(`${fx.id}(${fx.type}${Object.keys(fx.params).length ? ` ${paramList(fx.params)}` : ""})`);
      lines.push(`  seen: ${parts.join("  ")}`);
    }
    for (const h of v.heard) lines.push(`  heard: ${h.id} (asset:${h.asset}) gain ${h.gain.toFixed(2)}`);
    if (v.word) lines.push(`  said: word ${v.word.i} ${quote(v.word.text)} in ${v.word.clip}`);
    if (v.caption) lines.push(`  caption: ${quote(v.caption, 80)}`);
    return lines.join("\n");
  });
  return `${blocks.join("\n\n")}\n`;
}

/** `{ position: { x, y } }` as `position.x`, `position.y`, for one line of text. */
function flat(t: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, v] of Object.entries(t)) {
    if (v && typeof v === "object") for (const [k, inner] of Object.entries(v)) out[`${name}.${k}`] = inner;
    else out[name] = v;
  }
  return out;
}

export interface InspectOptions {
  /** A comma-separated list of moments; without it, the whole timeline. */
  readonly at?: string;
  /** Flat rows as JSON instead of text. */
  readonly json?: boolean;
}

export interface InspectResult {
  /** What to print. */
  readonly output: string;
  /** What was wrong with the moments asked for; the command fails when any is. */
  readonly errors: readonly string[];
}

/** The timeline of a resolved file, or its moments, as text or JSON. `file` is the name printed. */
export function inspect(file: string, state: ResolvedState, options: InspectOptions = {}): InspectResult {
  const rows = timelineRows(state);
  if (options.at === undefined)
    return { output: options.json ? `${JSON.stringify(rows, null, 2)}\n` : formatTimeline(file, rows), errors: [] };
  const { moments, errors } = resolveMoments(state, parseMoments(options.at));
  const views = moments.map((m) => describeAt(state, m));
  return {
    output: options.json ? `${JSON.stringify({ ...rows, at: views }, null, 2)}\n` : formatAt(views),
    errors,
  };
}
