import { Composition, collect, resolve, type Placement, type ResolvedState } from "@cutcut/kit";
import { createElement, type ReactElement } from "react";
import type { ResolveNested } from "./model/frame-plan";

/**
 * Resolves `<Nested of={Helper}>` by calling the helper and wrapping what it
 * returns in a composition of the parent's size. File references
 * (`of="file:..."`) have no loader yet and resolve to nothing.
 */
export function makeNestedResolver(parent: () => ResolvedState): ResolveNested {
  const cache = new WeakMap<object, ResolvedState>();
  return (p: Placement) => {
    const of = p.props.of;
    if (typeof of !== "function") return null;
    const hit = cache.get(of as object);
    if (hit) return hit;
    const outer = parent();
    const { of: _of, id: _id, ...rest } = p.props as Record<string, unknown>;
    const inner = (of as (props: Record<string, unknown>) => ReactElement | null)(rest);
    const element = createElement(Composition, { fps: outer.composition.fps, width: outer.composition.width, height: outer.composition.height }, inner);
    const state = resolve(collect(element as ReactElement), outer.manifest);
    cache.set(of as object, state);
    return state;
  };
}
