// The easing curves every moving value uses, and the one function that reads a curve of keys. The player draws with
// them, the editor splits curves with them, and speed ramps integrate them, so all three agree on every frame.
import type { Easing } from "./jsx/enums";

type Fn = (x: number) => number;

/** CSS cubic-bezier(x1, y1, x2, y2) solved for y at a given x by bisection. */
function bezier(x1: number, y1: number, x2: number, y2: number): Fn {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sampleX = (u: number): number => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number): number => ((ay * u + by) * u + cy) * u;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0,
      hi = 1,
      u = x;
    for (let i = 0; i < 24; i++) {
      const sx = sampleX(u);
      if (Math.abs(sx - x) < 1e-6) break;
      if (sx < x) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return sampleY(u);
  };
}

const inOut =
  (f: Fn): Fn =>
  (x) =>
    x < 0.5 ? f(2 * x) / 2 : 1 - f(2 - 2 * x) / 2;
const out =
  (f: Fn): Fn =>
  (x) =>
    1 - f(1 - x);
const pow =
  (n: number): Fn =>
  (x) =>
    x ** n;
const sineIn: Fn = (x) => 1 - Math.cos((x * Math.PI) / 2);
const expoIn: Fn = (x) => (x === 0 ? 0 : 2 ** (10 * x - 10));
const circIn: Fn = (x) => 1 - Math.sqrt(1 - x * x);
const backIn =
  (s: number): Fn =>
  (x) =>
    (s + 1) * x * x * x - s * x * x;
const elasticIn =
  (p: number): Fn =>
  (x) =>
    x === 0 ? 0 : x === 1 ? 1 : -(2 ** (10 * x - 10)) * Math.sin(((x * 10 - 10.75) * (2 * Math.PI)) / p);
const bounceFull: Fn = (x) => {
  const n1 = 7.5625,
    d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) {
    x -= 1.5 / d1;
    return n1 * x * x + 0.75;
  }
  if (x < 2.5 / d1) {
    x -= 2.25 / d1;
    return n1 * x * x + 0.9375;
  }
  x -= 2.625 / d1;
  return n1 * x * x + 0.984375;
};
/** A bounce blended toward linear by `1 - h`: `h = 1` is the full bounce, smaller values damp it. */
const bounceOut =
  (h: number): Fn =>
  (x) =>
    x + (bounceFull(x) - x) * h;

/** A spring's physics: mass, damping and stiffness. */
export interface SpringConfig {
  readonly mass?: number;
  readonly damping?: number;
  readonly stiffness?: number;
}

/**
 * Where a spring released at rest from `from` toward `to` is after `time` seconds: the closed-form
 * damped oscillator, under-, critically or over-damped. Defaults are mass 1, damping 10, stiffness 100.
 */
export function springAt(
  time: number,
  from: number,
  to: number,
  { mass = 1, damping = 10, stiffness = 100 }: SpringConfig = {},
): number {
  if (time <= 0) return from;
  const w0 = Math.sqrt(stiffness / mass),
    zeta = damping / (2 * Math.sqrt(stiffness * mass)),
    x0 = from - to;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return (
      to + Math.exp(-zeta * w0 * time) * (x0 * Math.cos(wd * time) + ((zeta * w0 * x0) / wd) * Math.sin(wd * time))
    );
  }
  if (zeta === 1) return to + Math.exp(-w0 * time) * (x0 + w0 * x0 * time);
  const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1)),
    r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
  return to + ((-r2 * x0) / (r1 - r2)) * Math.exp(r1 * time) + ((r1 * x0) / (r1 - r2)) * Math.exp(r2 * time);
}

/** The default spring squeezed into 0..1: it settles (to about 0.1%) at x = 1, overshooting about 16% on the way. */
const SPRING_SETTLE = Math.log(1000) / 5;
const springEase: Fn = (x) => (x >= 1 ? 1 : springAt(x * SPRING_SETTLE, 0, 1));

const quadIn = pow(2),
  cubicIn = pow(3),
  quartIn = pow(4),
  quintIn = pow(5);
const back = backIn(1.70158),
  backStrong = backIn(2.6);
const elastic = elasticIn(3),
  elasticSoft = elasticIn(4.5);
const bounce = bounceOut(1),
  bounceSmall = bounceOut(0.5);

export const EASING_FN: Readonly<Record<Easing, Fn>> = {
  linear: (x) => x,
  ease: bezier(0.25, 0.1, 0.25, 1),
  easeIn: bezier(0.42, 0, 1, 1),
  easeOut: bezier(0, 0, 0.58, 1),
  easeInOut: bezier(0.42, 0, 0.58, 1),
  hold: (x) => (x >= 1 ? 1 : 0),
  bezier: bezier(0.25, 0.1, 0.25, 1),
  smoothstep: (x) => x * x * (3 - 2 * x),
  smootherstep: (x) => x * x * x * (x * (x * 6 - 15) + 10),
  snappy: bezier(0.2, 0.9, 0.3, 1),
  smooth: inOut(sineIn),
  spring: springEase,
  easeInQuad: quadIn,
  easeOutQuad: out(quadIn),
  easeInOutQuad: inOut(quadIn),
  easeInCubic: cubicIn,
  easeOutCubic: out(cubicIn),
  easeInOutCubic: inOut(cubicIn),
  easeInQuart: quartIn,
  easeOutQuart: out(quartIn),
  easeInOutQuart: inOut(quartIn),
  easeInQuint: quintIn,
  easeOutQuint: out(quintIn),
  easeInOutQuint: inOut(quintIn),
  easeInSine: sineIn,
  easeOutSine: out(sineIn),
  easeInOutSine: inOut(sineIn),
  easeInExpo: expoIn,
  easeOutExpo: out(expoIn),
  easeInOutExpo: inOut(expoIn),
  easeInCirc: circIn,
  easeOutCirc: out(circIn),
  easeInOutCirc: inOut(circIn),
  easeInBack: back,
  easeOutBack: out(back),
  easeInOutBack: inOut(back),
  easeInBackStrong: backStrong,
  easeOutBackStrong: out(backStrong),
  easeInOutBackStrong: inOut(backStrong),
  easeInElastic: elastic,
  easeOutElastic: out(elastic),
  easeInOutElastic: inOut(elastic),
  easeInElasticSoft: elasticSoft,
  easeOutElasticSoft: out(elasticSoft),
  easeInOutElasticSoft: inOut(elasticSoft),
  easeInBounce: out(bounce),
  easeOutBounce: bounce,
  easeInOutBounce: inOut(out(bounce)),
  easeInBounceSmall: out(bounceSmall),
  easeOutBounceSmall: bounceSmall,
  easeInOutBounceSmall: inOut(out(bounceSmall)),
};

/** An easing name spelled the way it was before 0.6, which free code still takes: `"easeIn"` and the like now. */
export type OldEasing = "ease-in" | "ease-out" | "ease-in-out";

/** The easing names spelled in kebab-case before 0.6, and their spelling since. */
const OLD_EASINGS: Readonly<Record<OldEasing, Easing>> = {
  "ease-in": "easeIn",
  "ease-out": "easeOut",
  "ease-in-out": "easeInOut",
};
const warned = new Set<string>();

/**
 * The curve an easing name names, for free code (`interpolate`, `progress`, `ease`): an old spelling such as
 * `"ease-in-out"` still works, with one warning per name that says the new one. A JSX prop takes only the new spelling.
 * Undefined for a name that is no easing.
 */
export function easingCurve(name: string | undefined): Fn | undefined {
  if (name === undefined) return undefined;
  // Own keys only: `toString` or `constructor` would otherwise read a function every object inherits.
  if (Object.hasOwn(EASING_FN, name)) return EASING_FN[name as Easing];
  const now = Object.hasOwn(OLD_EASINGS, name) ? OLD_EASINGS[name as OldEasing] : undefined;
  if (now === undefined) return undefined;
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`easing "${name}" is now "${now}"; the old name still works in code, but not in a prop`);
  }
  return EASING_FN[now];
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** `name` applied to `x` clamped to 0..1; an unknown or missing name is linear. */
export function ease(name: string | undefined, x: number): number {
  const fn = easingCurve(name) ?? EASING_FN.linear;
  return fn(clamp01(x));
}

/** One key of a curve: a value at a time, and the easing of the move that leaves it. */
export interface CurveKey {
  readonly at: number;
  readonly value: unknown;
  readonly easing?: string | undefined;
}

/**
 * The value of a curve at `t`, keys sorted by `at`. It holds before the first key and after the last; between two keys
 * it moves by the easing of the key it leaves. Numbers, and lists of numbers of one length, move; anything else steps.
 * `easeBy` replaces the easing lookup (the player passes one that warns on an unknown name).
 */
export function curveAt(
  keys: readonly CurveKey[],
  t: number,
  easeBy: (name: string | undefined, x: number) => number = ease,
): unknown {
  const first = keys[0];
  if (!first) return undefined;
  const last = keys[keys.length - 1]!;
  if (t <= first.at) return first.value;
  if (t >= last.at) return last.value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (t < a.at || t >= b.at) continue;
    const span = b.at - a.at;
    const u = span <= 0 ? 1 : easeBy(a.easing, (t - a.at) / span);
    if (typeof a.value === "number" && typeof b.value === "number") return a.value + (b.value - a.value) * u;
    if (numberList(a.value) && numberList(b.value) && a.value.length === b.value.length) {
      const to = b.value;
      return a.value.map((v, j) => v + (to[j]! - v) * u);
    }
    return a.value;
  }
  return last.value;
}

function numberList(v: unknown): v is readonly number[] {
  return Array.isArray(v) && v.every((x) => typeof x === "number");
}
