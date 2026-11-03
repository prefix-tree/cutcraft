import { type Placement, type ResolvedState, resolveScene, type SceneFn } from "@cutcraft/kit";

import type { ResolveNested } from "./model/frame-plan";

/**
 * Resolves `<Nested of={Helper}>` through the kit's `resolveScene`, once per
 * helper. File references (`of="file:..."`) have no loader yet and resolve
 * to nothing.
 */
export function makeNestedResolver(parent: () => ResolvedState): ResolveNested {
  const cache = new WeakMap<object, ResolvedState>();
  return (p: Placement) => {
    const of = p.props.of;
    if (typeof of !== "function") return null;
    const hit = cache.get(of as object);
    if (hit) return hit;
    const outer = parent();
    const state = resolveScene(of as SceneFn, p.props, outer.composition, outer.manifest);
    cache.set(of as object, state);
    return state;
  };
}
