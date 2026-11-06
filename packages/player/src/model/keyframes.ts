import { EASING_FN, type Easing, type Placement } from "@cutcraft/kit";

import { devWarn } from "../warn";

export { EASING_FN };

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export function ease(name: string | undefined, x: number): number {
  const fn = EASING_FN[name as Easing];
  if (!fn) {
    if (name !== undefined) devWarn(`easing:${name}`, `unknown easing "${name}", using linear`);
    return clamp01(x);
  }
  return fn(clamp01(x));
}

interface Key {
  at: number;
  value: unknown;
  easing: string | undefined;
}

function keysWhere(children: readonly Placement[], match: (k: Placement) => boolean): Key[] {
  const keys: Key[] = [];
  for (const c of children) {
    if (c.kind !== "keyframe" || !match(c)) continue;
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
  return valueAt(
    keysWhere(children, (k) => k.props.property === property),
    rel,
    fallback,
  );
}

/** The keyframed value of an effect's `param` at element-relative `rel`, from the keyframes inside the effect. */
export function keyframedParam<T>(keys: readonly Placement[], param: string, rel: number, fallback: T): T {
  return valueAt(
    keysWhere(keys, (k) => k.props.param === param),
    rel,
    fallback,
  );
}

function valueAt<T>(keys: readonly Key[], rel: number, fallback: T): T {
  const first = keys[0];
  if (!first) return fallback;
  const last = keys[keys.length - 1]!;
  if (rel <= first.at) return first.value as T;
  if (rel >= last.at) return last.value as T;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!,
      b = keys[i + 1]!;
    if (rel < a.at || rel >= b.at) continue;
    const span = b.at - a.at;
    const u = span <= 0 ? 1 : ease(a.easing, (rel - a.at) / span);
    if (typeof a.value === "number" && typeof b.value === "number") return (a.value + (b.value - a.value) * u) as T;
    // Two lists of numbers of one length (a box, a corner) move element by element; anything else steps.
    if (numberList(a.value) && numberList(b.value) && a.value.length === b.value.length) {
      const to = b.value;
      return a.value.map((v, i) => v + ((to[i] as number) - v) * u) as T;
    }
    return a.value as T;
  }
  return last.value as T;
}

export function hasKeyframes(children: readonly Placement[], property: string): boolean {
  return children.some((c) => c.kind === "keyframe" && c.props.property === property);
}

function numberList(v: unknown): v is readonly number[] {
  return Array.isArray(v) && v.every((x) => typeof x === "number");
}
