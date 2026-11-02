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
