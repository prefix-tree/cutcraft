import { type Placement, type ResolvedState, shaderFor } from "@cutcraft/kit";

import { paramsAt } from "./effects";
import type { TransitionRole } from "./visible";

/** One declared effect (`defineEffect()`) to run over an element's picture, with its params at this moment. */
export interface ShaderPass {
  readonly name: string;
  readonly source: string;
  readonly params: Readonly<Record<string, unknown>>;
  /** Seconds into the element. */
  readonly time: number;
}

/** A declared transition (`defineTransition()`) on one side of it at this moment. */
export interface TransitionPass {
  /** The transition's id, which pairs the outgoing side with the incoming one. */
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly params: Readonly<Record<string, unknown>>;
  /** 0..1 through the transition, eased by its curve. */
  readonly progress: number;
  readonly time: number;
  readonly role: "out" | "in";
  /** Between two clips, whose pictures the shader blends; false for one clip's edge, blended with nothing. */
  readonly paired: boolean;
}

/** The element's declared effects, in file order, with keyframed params evaluated at element-relative `rel`. */
export function effectPasses(
  state: ResolvedState,
  children: readonly Placement[],
  rel: number,
): ShaderPass[] | undefined {
  if (state.shaders.length === 0) return undefined;
  const out: ShaderPass[] = [];
  for (const c of children) {
    if (c.kind !== "effect" || c.props.enabled === false) continue;
    const def = shaderFor(state.shaders, "effect", c.props.type);
    if (def) out.push({ name: def.name, source: def.shader, params: paramsAt(children, c, rel), time: rel });
  }
  return out.length > 0 ? out : undefined;
}

/** The side of a declared transition this clip plays, or undefined for a built-in transition. */
export function transitionPass(state: ResolvedState, role: TransitionRole): TransitionPass | undefined {
  const x = role.placement;
  const def = shaderFor(state.shaders, "transition", x.props.type);
  if (!def) return undefined;
  return {
    id: x.id,
    name: def.name,
    source: def.shader,
    params: (x.props.params ?? {}) as Readonly<Record<string, unknown>>,
    progress: role.progress,
    time: role.progress * x.duration,
    role: role.role,
    paired: x.between !== undefined,
  };
}

/** The effect types the file declares, which the filter string leaves to the shader passes. */
export function declaredEffects(state: ResolvedState): ReadonlySet<string> {
  return new Set(state.shaders.filter((s) => s.kind === "effect").map((s) => s.name));
}
