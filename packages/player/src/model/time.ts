import type { Placement } from "@cutcut/kit";
import { FRAME_EPS } from "../constants";
import { ease } from "./keyframes";

const INTEGRATION_STEPS = 64;

export function frameIndex(t: number, fps: number): number {
  return Math.max(0, Math.floor(t * fps + FRAME_EPS));
}

export function frameTime(frame: number, fps: number): number {
  return frame / fps;
}

/** 0..1 progress through a placement, what `useT()` returns inside a Layer. */
export function localT(p: Placement, t: number): number {
  if (p.duration <= 0) return 0;
  const u = (t - p.start) / p.duration;
  return u < 0 ? 0 : u > 1 ? 1 : u;
}

interface SpeedKey { at: number; speed: number; easing: string | undefined }

function speedKeys(children: readonly Placement[]): SpeedKey[] {
  return children
    .filter((c) => c.kind === "speedKey")
    .map((c) => ({ at: Number(c.props.at ?? 0), speed: Number(c.props.speed ?? 1), easing: c.props.easing as string | undefined }))
    .sort((a, b) => a.at - b.at);
}

/** Speed at element-relative time `u` under a speed ramp: holds outside the keys, eases between them. */
function rampSpeed(keys: readonly SpeedKey[], u: number): number {
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  if (u <= first.at) return first.speed;
  if (u >= last.at) return last.speed;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!, b = keys[i + 1]!;
    if (u < a.at || u >= b.at) continue;
    const span = b.at - a.at;
    const k = span <= 0 ? 1 : ease(a.easing, (u - a.at) / span);
    return a.speed + (b.speed - a.speed) * k;
  }
  return last.speed;
}

/** ∫₀ʳ speed(u) du by the trapezium rule over a fixed number of steps per key segment: deterministic and cheap. */
function sourceAdvance(keys: readonly SpeedKey[], rel: number): number {
  if (rel <= 0) return 0;
  const bounds = [0, ...keys.map((k) => k.at).filter((at) => at > 0 && at < rel), rel];
  let total = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i]!, b = bounds[i + 1]!;
    if (b <= a) continue;
    const h = (b - a) / INTEGRATION_STEPS;
    let sum = (rampSpeed(keys, a) + rampSpeed(keys, b)) / 2;
    for (let s = 1; s < INTEGRATION_STEPS; s++) sum += rampSpeed(keys, a + s * h);
    total += sum * h;
  }
  return total;
}

/**
 * Source seconds a media placement shows at composition time `t`: in/out
 * trim, constant speed or a speed-key ramp, reverse, and freeze holds.
 * Freezes hold `at` over their window and resume where the ramp would have
 * been (no shift); the result is clamped to the trimmed range.
 */
export function placementSourceTime(p: Placement, children: readonly Placement[], t: number): number {
  const src = p.source;
  if (!src) return Math.max(0, t - p.start);
  const rel = Math.max(0, t - p.start);
  for (const c of children) {
    if (c.kind !== "freeze") continue;
    const fs = Number(c.props.start ?? 0), fd = Number(c.props.duration ?? 0);
    if (rel >= fs && rel < fs + fd) return clampSource(Number(c.props.at ?? src.in), src);
  }
  const keys = speedKeys(children);
  const advance = keys.length > 0 ? sourceAdvance(keys, rel) : rel * src.speed;
  const reverse = p.props.reverse === true;
  return clampSource(reverse ? src.out - advance : src.in + advance, src);
}

export function nestedSourceTime(p: Placement, t: number): number {
  const src = p.source;
  if (!src) return Math.max(0, t - p.start);
  return clampSource(src.in + Math.max(0, t - p.start) * src.speed, src);
}

function clampSource(v: number, src: { in: number; out: number }): number {
  const end = src.out > src.in ? src.out : src.in;
  return v < src.in ? src.in : v > end ? end : v;
}
