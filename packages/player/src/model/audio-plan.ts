import {
  capabilitiesOf,
  type FreezeHold,
  freezeHoldsOf,
  lookupAsset,
  type Placement,
  type RampKey,
  type ResolvedState,
  type ResolvedTrack,
  rampAdvance,
  rampInverse,
  rampSpeed,
  speedKeysOf,
} from "@cutcraft/kit";

import { AUDIO_CHUNK_S, DUCK_ATTACK_S, DUCK_RELEASE_S, ENVELOPE_STEP_S } from "../constants";
import type { ResolveNested } from "./frame-plan";
import { keyframedValue } from "./keyframes";

/** A gain breakpoint in composition seconds. */
export type GainPoint = readonly [t: number, value: number];

export interface AudioOccurrence {
  readonly id: string;
  readonly asset: string;
  readonly chunk: number;
  /** Composition range of this chunk, unclipped; the engine clips to "now". */
  readonly compStart: number;
  readonly compEnd: number;
  /** Source seconds of the chunk's buffer; stable across windows so decoded PCM caches. */
  readonly bufferFrom: number;
  readonly bufferTo: number;
  /** Placement speed; the engine multiplies in the transport rate. Ignored when `rate` is set. */
  readonly speed: number;
  /** Speed-key ramp: buffer seconds per composition second, piecewise linear over [compStart, compEnd]. */
  readonly rate?: readonly GainPoint[];
  readonly gain: readonly GainPoint[];
  readonly pan?: readonly GainPoint[];
  /** The buffer plays backwards: the engine reverses the decoded PCM. */
  readonly reverse?: true;
}

/** Every audio-bearing chunk that overlaps [from, to). */
export function buildAudioPlan(
  state: ResolvedState,
  from: number,
  to: number,
  resolveNested?: ResolveNested,
): AudioOccurrence[] {
  const out: AudioOccurrence[] = [];
  const anySolo = state.tracks.some((t) => t.solo);
  for (const track of state.tracks) {
    if (track.hidden || track.muted || (anySolo && !track.solo)) continue;
    for (const p of [...state.items.values()].filter(
      (q) => q.track === track.id && q.parent !== null && q.kind !== "transition",
    )) {
      if (!capabilitiesOf(p.kind).audio) continue;
      if (p.end <= from || p.start >= to) continue;
      if (p.kind === "nested") {
        out.push(...nestedOccurrences(state, p, track, from, to, resolveNested));
        continue;
      }
      const src = p.source;
      if (!src || src.out <= src.in) continue;
      const asset = lookupAsset(state.manifest, src.asset);
      if (!asset || asset.kind === "image" || (asset.kind === "video" && !asset.audio)) continue;
      const reverse = p.props.reverse === true;
      const envelope = buildGainEnvelope(p, track, state, p.start, p.end);
      const children = p.children.map((id) => state.items.get(id)).filter((c): c is Placement => c !== undefined);
      const pan = panEnvelope(p, children);
      for (const chunk of chunksOf(p, src, reverse, speedKeysOf(children), freezeHoldsOf(children))) {
        if (chunk.compEnd <= from || chunk.compStart >= to) continue;
        out.push({
          id: p.id,
          asset: asset.id,
          chunk: chunk.index,
          compStart: chunk.compStart,
          compEnd: chunk.compEnd,
          bufferFrom: chunk.bufferFrom,
          bufferTo: chunk.bufferTo,
          speed: src.speed,
          ...(chunk.rate ? { rate: chunk.rate } : {}),
          gain: envelope,
          ...(pan ? { pan } : {}),
          ...(reverse ? { reverse } : {}),
        });
      }
    }
  }
  return out;
}

interface Chunk {
  index: number;
  compStart: number;
  compEnd: number;
  bufferFrom: number;
  bufferTo: number;
  rate?: GainPoint[];
}

/**
 * Pieces of the source range in source order: cut every `AUDIO_CHUNK_S` when
 * long, and where each freeze hold starts, so a hold is a gap with no audio.
 * A piece maps to composition time through the speed (or the speed-key ramp's
 * inverse) plus the holds before it. A reversed placement plays its last
 * piece first, so its range counts back from `src.out`.
 */
function chunksOf(
  p: Placement,
  src: NonNullable<Placement["source"]>,
  reverse: boolean,
  keys: readonly RampKey[],
  holds: readonly FreezeHold[],
): Chunk[] {
  const length = src.out - src.in;
  const ramp = keys.length > 0;
  const advance = (u: number): number => (ramp ? rampAdvance(keys, u) : u * src.speed);
  const inverse = (a: number): number => (ramp ? rampInverse(keys, a) : a / src.speed);
  // Where each hold starts, with the holds before it taken out.
  let before = 0;
  const holdAt = holds.map((h) => {
    const u = h.start - before;
    before += h.duration;
    return { u, duration: h.duration };
  });
  const cuts = new Set<number>([0, length]);
  if (length > 2 * AUDIO_CHUNK_S) for (let s = AUDIO_CHUNK_S; s < length; s += AUDIO_CHUNK_S) cuts.add(s);
  for (const { u } of holdAt) {
    const a = Math.min(length, Math.max(0, advance(u)));
    cuts.add(reverse ? length - a : a);
  }
  const sorted = [...cuts].sort((x, y) => x - y);
  const chunks: Chunk[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const s1 = sorted[i]!,
      s2 = sorted[i + 1]!;
    if (s2 - s1 < 1e-9) continue;
    const [u1, u2] = (reverse ? [length - s2, length - s1] : [s1, s2]).map(inverse) as [number, number];
    const mid = (u1 + u2) / 2;
    const offset = p.start + holdAt.reduce((n, h) => (h.u <= mid ? n + h.duration : n), 0);
    const compStart = round(offset + u1),
      compEnd = round(offset + u2);
    const rate = ramp ? rateEnvelope(keys, u1, u2).map(([u, v]) => [round(offset + u), v] as const) : undefined;
    chunks.push({
      index: chunks.length,
      compStart,
      compEnd,
      bufferFrom: src.in + s1,
      bufferTo: src.in + s2,
      ...(rate ? { rate } : {}),
    });
  }
  return chunks;
}

/** Ramp speed over clip seconds [u1, u2] (holds taken out): the key times plus a fixed step inside ramps, as the gain envelope samples. */
function rateEnvelope(keys: readonly RampKey[], u1: number, u2: number): GainPoint[] {
  const times = new Set<number>([u1, u2]);
  for (let i = 0; i < keys.length; i++) {
    const a = keys[i]!,
      b = keys[i + 1];
    if (a.at > u1 && a.at < u2) times.add(a.at);
    if (b && a.speed !== b.speed)
      for (let u = a.at + ENVELOPE_STEP_S; u < b.at; u += ENVELOPE_STEP_S) if (u > u1 && u < u2) times.add(u);
  }
  return [...times].sort((x, y) => x - y).map((u) => [u, round(rampSpeed(keys, u))] as const);
}

function nestedOccurrences(
  state: ResolvedState,
  p: Placement,
  track: ResolvedTrack,
  from: number,
  to: number,
  resolveNested: ResolveNested | undefined,
): AudioOccurrence[] {
  const inner = resolveNested?.(p);
  const src = p.source;
  if (!inner || !src) return [];
  // shortcut: a nested placement plays at its constant speed, its own speed keys and freezes are ignored; map through rampInverse/freezeShift if nested ramps are wanted.
  const toInner = (t: number): number => src.in + (t - p.start) * src.speed;
  const toOuter = (t: number): number => p.start + (t - src.in) / src.speed;
  const outerEnvelope = buildGainEnvelope(p, track, state, p.start, p.end);
  return buildAudioPlan(inner, toInner(Math.max(from, p.start)), toInner(Math.min(to, p.end)), resolveNested)
    .map((o) => {
      const compStart = Math.max(p.start, toOuter(o.compStart));
      const compEnd = Math.min(p.end, toOuter(o.compEnd));
      const inner = o.gain.map(([t, v]) => [toOuter(t), v] as const);
      return {
        ...o,
        id: `${p.id}/${o.id}`,
        compStart,
        compEnd,
        speed: o.speed * src.speed,
        ...(o.rate ? { rate: o.rate.map(([t, v]) => [round(toOuter(t)), v * src.speed] as const) } : {}),
        gain: multiplyEnvelopes([inner, outerEnvelope], compStart, compEnd),
      };
    })
    .filter((o) => o.compEnd > o.compStart);
}

type Factor = (t: number) => number;

/**
 * Gain over [winFrom, winTo] in composition seconds: volume × keyframed
 * `audio.volume` × fades × automation × ducking. The factors are multiplied
 * and sampled at their breakpoints plus a fixed step inside ramps, so the
 * product stays close to piecewise linear.
 */
export function buildGainEnvelope(
  p: Placement,
  track: ResolvedTrack,
  state: ResolvedState,
  winFrom: number,
  winTo: number,
): GainPoint[] {
  const children = p.children.map((id) => state.items.get(id)).filter((c): c is Placement => c !== undefined);
  const volume = typeof p.props.volume === "number" ? p.props.volume : 1;
  const factors: Factor[] = [];
  const breaks = new Set<number>([winFrom, winTo]);
  const ramps: [number, number][] = [];

  const kfs = children.filter((c) => c.kind === "keyframe" && c.props.property === "audio.volume");
  if (kfs.length > 0) {
    factors.push((t) => Number(keyframedValue(children, "audio.volume", t - p.start, volume)));
    const ats = kfs.map((k) => p.start + Number(k.props.at ?? 0)).sort((a, b) => a - b);
    ats.forEach((at) => breaks.add(at));
    for (let i = 0; i < ats.length - 1; i++) ramps.push([ats[i]!, ats[i + 1]!]);
  } else {
    factors.push(() => volume);
  }

  const fade = p.props.fade as { in?: number; out?: number } | undefined;
  if (fade?.in && fade.in > 0) {
    const a = p.start,
      b = p.start + fade.in;
    factors.push((t) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a)));
    breaks.add(a);
    breaks.add(b);
  }
  if (fade?.out && fade.out > 0) {
    const a = p.end - fade.out,
      b = p.end;
    factors.push((t) => (t <= a ? 1 : t >= b ? 0 : (b - t) / (b - a)));
    breaks.add(a);
    breaks.add(b);
  }

  const automation = (p.props.automation as { volume?: [number, number][] } | undefined)?.volume;
  if (automation && automation.length > 0) {
    const pts = [...automation].sort((x, y) => x[0] - y[0]).map(([rel, v]) => [p.start + rel, v] as const);
    factors.push((t) => interpolate(pts, t));
    pts.forEach(([t]) => breaks.add(t));
  }

  const duck = p.props.duck as { under: string; to: number; attack?: number; release?: number } | undefined;
  if (duck) {
    const attack = duck.attack ?? DUCK_ATTACK_S,
      release = duck.release ?? DUCK_RELEASE_S;
    const intervals = duckIntervals(state, duck.under, p.id);
    for (const [a, b] of intervals) {
      breaks.add(a - attack);
      breaks.add(a);
      breaks.add(b);
      breaks.add(b + release);
      if (attack > 0) ramps.push([a - attack, a]);
      if (release > 0) ramps.push([b, b + release]);
    }
    factors.push((t) => {
      let f = 1;
      for (const [a, b] of intervals) {
        let g = 1;
        if (t >= a && t <= b) g = duck.to;
        else if (t < a && t > a - attack) g = 1 - (1 - duck.to) * ((t - (a - attack)) / attack);
        else if (t > b && t < b + release) g = duck.to + (1 - duck.to) * ((t - b) / release);
        f = Math.min(f, g);
      }
      return f;
    });
  }
  void track;

  const times = [...breaks].filter((t) => t >= winFrom && t <= winTo).sort((a, b) => a - b);
  const sampled = new Set<number>(times);
  for (const [a, b] of ramps) {
    for (let t = a + ENVELOPE_STEP_S; t < b; t += ENVELOPE_STEP_S) if (t > winFrom && t < winTo) sampled.add(round(t));
  }
  const value = (t: number): number => factors.reduce((acc, f) => acc * f(t), 1);
  return [...sampled].sort((a, b) => a - b).map((t) => [round(t), round(value(t))] as const);
}

/** Composition intervals where sound plays on the track `under` names by id, else on the tracks of that role; silent assets and muted clips do not duck. */
export function duckIntervals(state: ResolvedState, under: string, exceptId: string): [number, number][] {
  const tracks = state.tracks.some((t) => t.id === under)
    ? [under]
    : state.tracks.filter((t) => t.role === under).map((t) => t.id);
  const ranges = [...state.items.values()]
    .filter(
      (q) =>
        q.track !== null &&
        tracks.includes(q.track) &&
        q.id !== exceptId &&
        q.parent !== null &&
        capabilitiesOf(q.kind).audio &&
        hasSound(state, q),
    )
    .filter((q) => q.end > q.start)
    .map((q) => [q.start, q.end] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

function hasSound(state: ResolvedState, p: Placement): boolean {
  if (p.kind === "nested") return true;
  const asset = p.source ? lookupAsset(state.manifest, p.source.asset) : null;
  return (
    asset !== null &&
    asset.kind !== "image" &&
    (asset.kind === "audio" || asset.audio !== undefined) &&
    p.props.volume !== 0
  );
}

/** Pan over the placement: its `audio.pan` keyframes (sampled inside each segment), else `automation.pan`; keyframes win when both are written. */
function panEnvelope(p: Placement, children: readonly Placement[]): GainPoint[] | undefined {
  const ats = children
    .filter((c) => c.kind === "keyframe" && c.props.property === "audio.pan")
    .map((k) => Number(k.props.at ?? 0))
    .sort((a, b) => a - b);
  if (ats.length > 0) {
    const rels = new Set(ats);
    for (let i = 0; i < ats.length - 1; i++)
      for (let r = ats[i]! + ENVELOPE_STEP_S; r < ats[i + 1]!; r += ENVELOPE_STEP_S) rels.add(r);
    return [...rels]
      .sort((a, b) => a - b)
      .map((rel) => [round(p.start + rel), round(Number(keyframedValue(children, "audio.pan", rel, 0)))] as const);
  }
  const automation = (p.props.automation as { pan?: [number, number][] } | undefined)?.pan;
  if (!automation || automation.length === 0) return undefined;
  return [...automation].sort((x, y) => x[0] - y[0]).map(([rel, v]) => [round(p.start + rel), v] as const);
}

function interpolate(pts: readonly (readonly [number, number])[], t: number): number {
  const first = pts[0]!,
    last = pts[pts.length - 1]!;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!,
      b = pts[i + 1]!;
    if (t >= a[0] && t < b[0]) return b[0] === a[0] ? b[1] : a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
  }
  return last[1];
}

function multiplyEnvelopes(envs: readonly (readonly GainPoint[])[], from: number, to: number): GainPoint[] {
  const times = new Set<number>([from, to]);
  for (const e of envs) for (const [t] of e) if (t >= from && t <= to) times.add(t);
  return [...times]
    .sort((a, b) => a - b)
    .map((t) => [round(t), round(envs.reduce((acc, e) => acc * (e.length ? interpolate(e, t) : 1), 1))] as const);
}

function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
