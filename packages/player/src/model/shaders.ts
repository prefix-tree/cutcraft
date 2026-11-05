import {
  BUILT_IN_SHADERS,
  builtInShader,
  type Placement,
  type ResolvedState,
  SHADER_ONLY_EFFECTS,
  type ShaderDefinition,
  shaderFor,
} from "@cutcraft/kit";

import { paramsAt } from "./effects";
import type { TransitionRole } from "./visible";

/** One shader effect to run over an element's picture, with its params at this moment. */
export interface ShaderPass {
  readonly name: string;
  /** The effect's GLSL, one source per pass, run in order. */
  readonly sources: readonly string[];
  /** A built-in effect (`levels`, `lut`…), drawn by the kit's shader. */
  readonly builtIn?: true;
  /** Pictures a built-in computes from its params (a curve's table), read by the passes by name. */
  readonly tables?: ShaderDefinition["tables"];
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

/** The element's shader effects (the file's own and the kit's), in file order, with keyframed params evaluated at element-relative `rel`. */
export function effectPasses(
  state: ResolvedState,
  children: readonly Placement[],
  rel: number,
): ShaderPass[] | undefined {
  const out: ShaderPass[] = [];
  for (const c of children) {
    if (c.kind !== "effect" || c.props.enabled === false) continue;
    const own = shaderFor(state.shaders, "effect", c.props.type);
    const def = own ?? builtInShader(c.props.type);
    if (def)
      out.push({
        name: def.name,
        sources: def.passes,
        ...(own ? {} : { builtIn: true as const }),
        ...(!own && def.tables ? { tables: def.tables } : {}),
        params: paramsAt(children, c, rel),
        time: rel,
      });
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
    source: def.passes[0] as string,
    params: (x.props.params ?? {}) as Readonly<Record<string, unknown>>,
    progress: role.progress,
    time: role.progress * x.duration,
    role: role.role,
    paired: x.between !== undefined,
  };
}

/**
 * The effect types the filter string leaves to the shader passes: the ones the file declares, and with `builtIns` the
 * kit's own shader effects too. Without it those draw as their CSS filter, for a renderer that has no WebGL.
 */
export function shadedEffects(state: ResolvedState, builtIns: boolean): ReadonlySet<string> {
  const out = new Set(state.shaders.filter((s) => s.kind === "effect").map((s) => s.name));
  if (builtIns) for (const s of BUILT_IN_SHADERS) out.add(s.name);
  return out;
}

/** Whether a pass draws as a CSS filter where there is no WebGL: a built-in effect that has one. */
export function hasCssFallback(pass: ShaderPass): boolean {
  return pass.builtIn === true && !(SHADER_ONLY_EFFECTS as readonly string[]).includes(pass.name);
}
