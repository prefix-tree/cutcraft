import type { LayerClock } from "@uberscene/kit";
import {
  frameAtSeconds,
  frameStartSeconds,
  isDropFrame,
  type Rate,
  timecode as smpteTimecode,
} from "@uberscene/kit/schema";
import { freezeHoldsOf, freezeShift, type Placement, rampAdvance, speedKeysOf } from "@uberscene/sdk/resolver";

/** The frame a composition time falls in, counted in exact ticks. */
export function frameIndex(t: number, rate: Rate): number {
  return frameAtSeconds(t, rate);
}

/** When a frame starts, in seconds. */
export function frameTime(frame: number, rate: Rate): number {
  return frameStartSeconds(frame, rate);
}

/**
 * What the controls show and the contact sheet labels: `mm:ss.ff`, the frame within its second; at 29.97 and 59.94 the
 * drop-frame timecode editors show, `HH:MM:SS;FF`.
 */
export function timecode(t: number, rate: Rate): string {
  const frame = frameIndex(Math.max(0, t), rate);
  if (isDropFrame(rate)) return smpteTimecode(frame, rate);
  const nominal = Math.round(rate.num / rate.den);
  const s = Math.floor(frame / nominal);
  const f = frame % nominal;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
}

/** 0..1 progress through a placement, what `useT()` returns inside a Layer. */
export function localT(p: Placement, t: number): number {
  if (p.duration <= 0) return 0;
  const u = (t - p.start) / p.duration;
  return u < 0 ? 0 : u > 1 ? 1 : u;
}

/** What `useLayer()` returns inside a Layer: progress plus real seconds. */
export function layerClock(p: Placement, t: number, fps: number): LayerClock {
  const duration = Math.max(0, p.duration);
  const elapsed = Math.min(duration, Math.max(0, t - p.start));
  return { t: localT(p, t), elapsed, remaining: duration - elapsed, duration, time: t, fps };
}

/**
 * Source seconds a media placement shows at composition time `t`: in/out
 * trim, constant speed or a speed-key ramp, reverse, and freeze holds.
 * A freeze is an insert hold: it shows `at` over its window, then the clip
 * resumes from where it stopped; the result is clamped to the trimmed range.
 */
export function placementSourceTime(p: Placement, children: readonly Placement[], t: number): number {
  const src = p.source;
  if (!src) return Math.max(0, t - p.start);
  const shifted = freezeShift(freezeHoldsOf(children), Math.max(0, t - p.start));
  if ("held" in shifted) return clampSource(shifted.held, src);
  const keys = speedKeysOf(children);
  const advance = keys.length > 0 ? rampAdvance(keys, shifted.rel) : shifted.rel * src.speed;
  const reverse = p.props.reverse === true;
  return clampSource(reverse ? src.out - advance : src.in + advance, src);
}

// shortcut: a nested placement plays at its constant speed, its own speed keys and freezes are ignored; use placementSourceTime's mapping if nested ramps are wanted.
export function nestedSourceTime(p: Placement, t: number): number {
  const src = p.source;
  if (!src) return Math.max(0, t - p.start);
  return clampSource(src.in + Math.max(0, t - p.start) * src.speed, src);
}

function clampSource(v: number, src: { in: number; out: number }): number {
  const end = src.out > src.in ? src.out : src.in;
  return v < src.in ? src.in : v > end ? end : v;
}
