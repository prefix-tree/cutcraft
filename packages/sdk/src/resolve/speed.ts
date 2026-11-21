import { curveAt } from "@uberscene/kit/schema";

/** A speed key: `at` is clip seconds with the freeze holds taken out. */
export interface RampKey {
  readonly at: number;
  readonly speed: number;
  readonly easing?: string | undefined;
}
/** A hold: shows source second `at` for `duration` from element-relative `start`, then the clip resumes where it stopped. */
export interface FreezeHold {
  readonly at: number;
  readonly start: number;
  readonly duration: number;
}

const INTEGRATION_STEPS = 64;

/** Speed at clip time `u` under keys sorted by `at`: holds outside the keys, eases between them. */
export function rampSpeed(keys: readonly RampKey[], u: number): number {
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  if (u <= first.at) return first.speed;
  if (u >= last.at) return last.speed;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!,
      b = keys[i + 1]!;
    if (u < a.at || u >= b.at) continue;
    return curveAt(
      [
        { at: a.at, value: a.speed, easing: a.easing },
        { at: b.at, value: b.speed },
      ],
      u,
    ) as number;
  }
  return last.speed;
}

/** Source seconds played in `rel` clip seconds: ∫₀ʳᵉˡ speed by the trapezium rule, a fixed step count per key segment. */
export function rampAdvance(keys: readonly RampKey[], rel: number): number {
  if (rel <= 0) return 0;
  const bounds = [0, ...keys.map((k) => k.at).filter((at) => at > 0 && at < rel), rel];
  let total = 0;
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i]!,
      b = bounds[i + 1]!;
    if (b <= a) continue;
    const h = (b - a) / INTEGRATION_STEPS;
    let sum = (rampSpeed(keys, a) + rampSpeed(keys, b)) / 2;
    for (let s = 1; s < INTEGRATION_STEPS; s++) sum += rampSpeed(keys, a + s * h);
    total += sum * h;
  }
  return total;
}

/** Clip seconds that play `advance` source seconds: the inverse of `rampAdvance`, by bisection (speed ≥ 0.1, so it is monotonic). */
export function rampInverse(keys: readonly RampKey[], advance: number): number {
  if (advance <= 0) return 0;
  let lo = 0,
    hi = advance / 0.1;
  for (let i = 0; i < 60 && hi - lo > 1e-9; i++) {
    const mid = (lo + hi) / 2;
    if (rampAdvance(keys, mid) < advance) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Element-relative `rel` with the holds before it taken out, or the held source second when `rel` is inside a hold. Holds sorted by `start`. */
export function freezeShift(
  holds: readonly FreezeHold[],
  rel: number,
): { readonly rel: number } | { readonly held: number } {
  let shift = 0;
  for (const h of holds) {
    if (rel < h.start) break;
    if (rel < h.start + h.duration) return { held: h.at };
    shift += h.duration;
  }
  return { rel: rel - shift };
}

/** Element-relative time of clip time `u`: the inverse of `freezeShift` outside the holds. A time at a hold's start plays before it. */
export function freezeUnshift(holds: readonly FreezeHold[], u: number): number {
  let rel = u;
  for (const h of holds) if (h.start < rel - 1e-9) rel += h.duration; // tolerance: source seconds minus `in` carry float noise
  return rel;
}

/**
 * The holds a clip reaches when, without any hold, it would last `played` seconds. A hold starts at a time of the
 * clip that counts the holds before it, so each one reached moves the end back. A hold at the clip's very end is
 * reached: it holds the last frame. One written after that never begins, and adds nothing.
 */
export function reachedHolds(holds: readonly FreezeHold[], played: number): FreezeHold[] {
  const reached: FreezeHold[] = [];
  let shift = 0;
  for (const h of holds) {
    if (h.start - shift > played + 1e-9) break;
    reached.push(h);
    shift += h.duration;
  }
  return reached;
}

/** Seconds of holds inside the first `length` seconds of a clip: a hold cut off by the clip's end counts in part. */
export function heldWithin(holds: readonly FreezeHold[], length: number): number {
  return holds.reduce((n, h) => n + Math.min(h.duration, Math.max(0, length - h.start)), 0);
}

/** Total seconds the holds add to a clip. */
export function holdTotal(holds: readonly FreezeHold[]): number {
  return holds.reduce((n, h) => n + h.duration, 0);
}

interface TimingChild {
  readonly kind: string;
  readonly props: Readonly<Record<string, unknown>>;
}

/** A clip's speed keys (from `speed={[…]}`), sorted by `at`. */
export function speedKeysOf(children: readonly TimingChild[]): RampKey[] {
  return (
    children
      .filter((c) => c.kind === "speedKey")
      .map((c) => ({
        at: Number(c.props.at ?? 0),
        speed: Number(c.props.speed ?? 1),
        easing: c.props.easing as string | undefined,
      }))
      // A key the schema refuses is reported there and takes no part: the ramp's arithmetic needs speeds of 0.1 and up.
      .filter((k) => Number.isFinite(k.at) && k.at >= 0 && Number.isFinite(k.speed) && k.speed >= 0.1)
      .sort((a, b) => a.at - b.at)
  );
}

/** A clip's holds (from `freezes`), sorted by `start`. */
export function freezeHoldsOf(children: readonly TimingChild[]): FreezeHold[] {
  return (
    children
      .filter((c) => c.kind === "freeze")
      .map((c) => ({
        at: Number(c.props.at ?? 0),
        start: Number(c.props.start ?? 0),
        duration: Number(c.props.duration ?? 0),
      }))
      // A hold the schema refuses is reported there and holds nothing.
      .filter((h) => [h.at, h.start, h.duration].every(Number.isFinite) && h.at >= 0 && h.start >= 0 && h.duration > 0)
      .sort((a, b) => a.start - b.start)
  );
}
