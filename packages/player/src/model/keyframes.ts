import type { Easing, Placement } from "@cutcut/kit";
import { devWarn } from "../warn";

type Fn = (x: number) => number;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

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
const pow = (n: number): Fn => (x) => Math.pow(x, n);
const sineIn: Fn = (x) => 1 - Math.cos((x * Math.PI) / 2);
const expoIn: Fn = (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10));
const circIn: Fn = (x) => 1 - Math.sqrt(1 - x * x);
const backIn = (s: number): Fn => (x) => (s + 1) * x * x * x - s * x * x;
const elasticIn = (p: number): Fn => (x) => (x === 0 ? 0 : x === 1 ? 1 : -Math.pow(2, 10 * x - 10) * Math.sin(((x * 10 - 10.75) * (2 * Math.PI)) / p));
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

export function ease(name: string | undefined, x: number): number {
  const fn = EASING_FN[name as Easing];
  if (!fn) {
    if (name !== undefined) devWarn(`easing:${name}`, `unknown easing "${name}", using linear`);
    return clamp01(x);
  }
  return fn(clamp01(x));
}

interface Key { at: number; value: unknown; easing: string | undefined }

function keysFor(children: readonly Placement[], property: string): Key[] {
  const keys: Key[] = [];
  for (const c of children) {
    if (c.kind !== "keyframe" || c.props.property !== property) continue;
    keys.push({ at: Number(c.props.at ?? 0), value: c.props.value, easing: c.props.easing as string | undefined });
  }
  return keys.sort((a, b) => a.at - b.at);
}

/**
 * The keyframed value of `property` at element-relative time `rel`. Holds
 * before the first and after the last key; the segment between two keys uses
 * the easing of the key it leaves. Non-numeric values step.
 */
export function keyframedValue<T>(children: readonly Placement[], property: string, rel: number, fallback: T): T {
  const keys = keysFor(children, property);
  const first = keys[0];
  if (!first) return fallback;
  const last = keys[keys.length - 1]!;
  if (rel <= first.at) return first.value as T;
  if (rel >= last.at) return last.value as T;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!, b = keys[i + 1]!;
    if (rel < a.at || rel >= b.at) continue;
    if (typeof a.value !== "number" || typeof b.value !== "number") return a.value as T;
    const span = b.at - a.at;
    const u = span <= 0 ? 1 : ease(a.easing, (rel - a.at) / span);
    return (a.value + (b.value - a.value) * u) as T;
  }
  return last.value as T;
}

export function hasKeyframes(children: readonly Placement[], property: string): boolean {
  return children.some((c) => c.kind === "keyframe" && c.props.property === property);
}
