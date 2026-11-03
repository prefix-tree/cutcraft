import type { Easing } from "../jsx/enums";

type Fn = (x: number) => number;

/** CSS cubic-bezier(x1, y1, x2, y2) solved for y at a given x by bisection. */
function bezier(x1: number, y1: number, x2: number, y2: number): Fn {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (u: number): number => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number): number => ((ay * u + by) * u + cy) * u;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, u = x;
    for (let i = 0; i < 24; i++) {
      const sx = sampleX(u);
      if (Math.abs(sx - x) < 1e-6) break;
      if (sx < x) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return sampleY(u);
  };
}

const inOut = (f: Fn): Fn => (x) => (x < 0.5 ? f(2 * x) / 2 : 1 - f(2 - 2 * x) / 2);
const out = (f: Fn): Fn => (x) => 1 - f(1 - x);
const pow = (n: number): Fn => (x) => x ** n;
const sineIn: Fn = (x) => 1 - Math.cos((x * Math.PI) / 2);
const expoIn: Fn = (x) => (x === 0 ? 0 : 2 ** (10 * x - 10));
const circIn: Fn = (x) => 1 - Math.sqrt(1 - x * x);
const backIn = (s: number): Fn => (x) => (s + 1) * x * x * x - s * x * x;
const elasticIn = (p: number): Fn => (x) => (x === 0 ? 0 : x === 1 ? 1 : -(2 ** (10 * x - 10)) * Math.sin(((x * 10 - 10.75) * (2 * Math.PI)) / p));
const bounceFull: Fn = (x) => {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
  if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
  x -= 2.625 / d1;
  return n1 * x * x + 0.984375;
};
/** A bounce blended toward linear by `1 - h`: `h = 1` is the full bounce, smaller values damp it. */
const bounceOut = (h: number): Fn => (x) => x + (bounceFull(x) - x) * h;

/** A spring's physics: mass, damping and stiffness, as Remotion's `spring()` takes them. */
export interface SpringConfig { readonly mass?: number; readonly damping?: number; readonly stiffness?: number }

/**
 * Where a spring released at rest from `from` toward `to` is after `time` seconds: the closed-form
 * damped oscillator, under-, critically or over-damped. Defaults are mass 1, damping 10, stiffness 100.
 */
export function springAt(time: number, from: number, to: number, { mass = 1, damping = 10, stiffness = 100 }: SpringConfig = {}): number {
  if (time <= 0) return from;
  const w0 = Math.sqrt(stiffness / mass), zeta = damping / (2 * Math.sqrt(stiffness * mass)), x0 = from - to;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return to + Math.exp(-zeta * w0 * time) * (x0 * Math.cos(wd * time) + ((zeta * w0 * x0) / wd) * Math.sin(wd * time));
  }
  if (zeta === 1) return to + Math.exp(-w0 * time) * (x0 + w0 * x0 * time);
  const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1)), r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
  return to + ((-r2 * x0) / (r1 - r2)) * Math.exp(r1 * time) + ((r1 * x0) / (r1 - r2)) * Math.exp(r2 * time);
}

/** The default spring squeezed into 0..1: it settles (to about 0.1%) at x = 1, overshooting about 16% on the way. */
const SPRING_SETTLE = Math.log(1000) / 5;
const springEase: Fn = (x) => (x >= 1 ? 1 : springAt(x * SPRING_SETTLE, 0, 1));

const quadIn = pow(2), cubicIn = pow(3), quartIn = pow(4), quintIn = pow(5);
const back = backIn(1.70158), backStrong = backIn(2.6);
const elastic = elasticIn(3), elasticSoft = elasticIn(4.5);
const bounce = bounceOut(1), bounceSmall = bounceOut(0.5);

export const EASING_FN: Readonly<Record<Easing, Fn>> = {
  linear: (x) => x,
  ease: bezier(0.25, 0.1, 0.25, 1),
  "ease-in": bezier(0.42, 0, 1, 1),
  "ease-out": bezier(0, 0, 0.58, 1),
  "ease-in-out": bezier(0.42, 0, 0.58, 1),
  hold: (x) => (x >= 1 ? 1 : 0),
  bezier: bezier(0.25, 0.1, 0.25, 1),
  smoothstep: (x) => x * x * (3 - 2 * x),
  smootherstep: (x) => x * x * x * (x * (x * 6 - 15) + 10),
  snappy: bezier(0.2, 0.9, 0.3, 1),
  smooth: inOut(sineIn),
  spring: springEase,
  easeInQuad: quadIn, easeOutQuad: out(quadIn), easeInOutQuad: inOut(quadIn),
  easeInCubic: cubicIn, easeOutCubic: out(cubicIn), easeInOutCubic: inOut(cubicIn),
  easeInQuart: quartIn, easeOutQuart: out(quartIn), easeInOutQuart: inOut(quartIn),
  easeInQuint: quintIn, easeOutQuint: out(quintIn), easeInOutQuint: inOut(quintIn),
  easeInSine: sineIn, easeOutSine: out(sineIn), easeInOutSine: inOut(sineIn),
  easeInExpo: expoIn, easeOutExpo: out(expoIn), easeInOutExpo: inOut(expoIn),
  easeInCirc: circIn, easeOutCirc: out(circIn), easeInOutCirc: inOut(circIn),
  easeInBack: back, easeOutBack: out(back), easeInOutBack: inOut(back),
  easeInBackStrong: backStrong, easeOutBackStrong: out(backStrong), easeInOutBackStrong: inOut(backStrong),
  easeInElastic: elastic, easeOutElastic: out(elastic), easeInOutElastic: inOut(elastic),
  easeInElasticSoft: elasticSoft, easeOutElasticSoft: out(elasticSoft), easeInOutElasticSoft: inOut(elasticSoft),
  easeInBounce: out(bounce), easeOutBounce: bounce, easeInOutBounce: inOut(out(bounce)),
  easeInBounceSmall: out(bounceSmall), easeOutBounceSmall: bounceSmall, easeInOutBounceSmall: inOut(out(bounceSmall)),
};

/** A `<SpeedKey>`: `at` is clip seconds with the freeze holds taken out. */
export interface RampKey { readonly at: number; readonly speed: number; readonly easing?: string | undefined }
/** A `<Freeze>`: shows source second `at` for `duration` from element-relative `start`, then the clip resumes where it stopped. */
export interface FreezeHold { readonly at: number; readonly start: number; readonly duration: number }

const INTEGRATION_STEPS = 64;

/** Speed at clip time `u` under keys sorted by `at`: holds outside the keys, eases between them. */
export function rampSpeed(keys: readonly RampKey[], u: number): number {
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  if (u <= first.at) return first.speed;
  if (u >= last.at) return last.speed;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!, b = keys[i + 1]!;
    if (u < a.at || u >= b.at) continue;
    const span = b.at - a.at;
    const fn = EASING_FN[a.easing as Easing] ?? EASING_FN.linear;
    const k = span <= 0 ? 1 : fn(Math.min(1, Math.max(0, (u - a.at) / span)));
    return a.speed + (b.speed - a.speed) * k;
  }
  return last.speed;
}

/** Source seconds played in `rel` clip seconds: ∫₀ʳᵉˡ speed by the trapezium rule, a fixed step count per key segment. */
export function rampAdvance(keys: readonly RampKey[], rel: number): number {
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

/** Clip seconds that play `advance` source seconds: the inverse of `rampAdvance`, by bisection (speed ≥ 0.1, so it is monotonic). */
export function rampInverse(keys: readonly RampKey[], advance: number): number {
  if (advance <= 0) return 0;
  let lo = 0, hi = advance / 0.1;
  for (let i = 0; i < 60 && hi - lo > 1e-9; i++) {
    const mid = (lo + hi) / 2;
    if (rampAdvance(keys, mid) < advance) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Element-relative `rel` with the holds before it taken out, or the held source second when `rel` is inside a hold. Holds sorted by `start`. */
export function freezeShift(holds: readonly FreezeHold[], rel: number): { readonly rel: number } | { readonly held: number } {
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

/** Total seconds the holds add to a clip. */
export function holdTotal(holds: readonly FreezeHold[]): number {
  return holds.reduce((n, h) => n + h.duration, 0);
}

interface TimingChild { readonly kind: string; readonly props: Readonly<Record<string, unknown>> }

/** A clip's `<SpeedKey>` children, sorted by `at`. */
export function speedKeysOf(children: readonly TimingChild[]): RampKey[] {
  return children
    .filter((c) => c.kind === "speedKey")
    .map((c) => ({ at: Number(c.props.at ?? 0), speed: Number(c.props.speed ?? 1), easing: c.props.easing as string | undefined }))
    .sort((a, b) => a.at - b.at);
}

/** A clip's `<Freeze>` children, sorted by `start`. */
export function freezeHoldsOf(children: readonly TimingChild[]): FreezeHold[] {
  return children
    .filter((c) => c.kind === "freeze")
    .map((c) => ({ at: Number(c.props.at ?? 0), start: Number(c.props.start ?? 0), duration: Number(c.props.duration ?? 0) }))
    .sort((a, b) => a.start - b.start);
}
