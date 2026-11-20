import { type CurveKey, curveAt, EASING_FN, type Easing } from "@uberscene/kit/schema";
import type { Placement } from "@uberscene/sdk";

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

function keysWhere(children: readonly Placement[], match: (k: Placement) => boolean): CurveKey[] {
  const keys: CurveKey[] = [];
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

/** The kit's curve (`curveAt`), with this player's easing, which warns once on a name it does not know. */
function valueAt<T>(keys: readonly CurveKey[], rel: number, fallback: T): T {
  return keys.length === 0 ? fallback : (curveAt(keys, rel, ease) as T);
}

export function hasKeyframes(children: readonly Placement[], property: string): boolean {
  return children.some((c) => c.kind === "keyframe" && c.props.property === property);
}
