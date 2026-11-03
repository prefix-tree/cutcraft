import { random as generator, hash } from "@cutcraft/graphics";

import { EASING_FN, type SpringConfig, springAt } from "../resolve/speed";
import type { Easing } from "./enums";

/**
 * Pure animation helpers for `<Layer>` code, beside `useT()` and `useLayer()`. They take numbers and return
 * numbers, so they run the same in the preview and under the export's Satori.
 */

export type Extrapolate = "extend" | "clamp";

export interface InterpolateOptions {
  /** The curve inside each segment of the ranges; default linear. */
  readonly easing?: Easing;
  /** Past the first or last input: keep the line going (default) or hold the end value. */
  readonly extrapolateLeft?: Extrapolate;
  readonly extrapolateRight?: Extrapolate;
}

/**
 * Maps `input` from `inputRange` onto `outputRange`, piecewise: `interpolate(elapsed, [0, 0.5, 2], [0, 1, 0.8])`.
 * The input range must increase. Beyond the ends the value extends linearly, unless clamped; easing applies only inside.
 */
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options: InterpolateOptions = {},
): number {
  if (inputRange.length < 2 || inputRange.length !== outputRange.length)
    throw new Error("interpolate() wants input and output ranges of the same length, at least two");
  for (let i = 1; i < inputRange.length; i++) {
    if (!(inputRange[i]! > inputRange[i - 1]!))
      throw new Error(`interpolate() wants an increasing input range, got [${inputRange.join(", ")}]`);
  }
  let i = 1;
  while (i < inputRange.length - 1 && input > inputRange[i]!) i++;
  const a = inputRange[i - 1]!,
    b = inputRange[i]!;
  let x = (input - a) / (b - a);
  if (x < 0 && options.extrapolateLeft === "clamp") x = 0;
  if (x > 1 && options.extrapolateRight === "clamp") x = 1;
  const k = x >= 0 && x <= 1 && options.easing ? EASING_FN[options.easing](x) : x;
  const lo = outputRange[i - 1]!,
    hi = outputRange[i]!;
  return lo + (hi - lo) * k;
}

export interface SpringOptions extends SpringConfig {
  /** Seconds since the spring was let go; `useLayer().elapsed` for the layer's start. */
  readonly time: number;
  readonly from?: number;
  readonly to?: number;
  /** Never pass `to`: the spring stops at it instead of overshooting. */
  readonly overshootClamping?: boolean;
}

/** A physical spring from `from` (default 0) to `to` (default 1) at `time` seconds: mass 1, damping 10, stiffness 100 unless given. */
export function spring({ time, from = 0, to = 1, overshootClamping = false, ...config }: SpringOptions): number {
  const v = springAt(time, from, to, config);
  return overshootClamping ? (to >= from ? Math.min(v, to) : Math.max(v, to)) : v;
}

/** A number in [0, 1) fixed by `seed`: the same seed gives the same number every frame, in the preview and the export. */
export function random(seed: string | number): number {
  return generator(hash(String(seed)))();
}
