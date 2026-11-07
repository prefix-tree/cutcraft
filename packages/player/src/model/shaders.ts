import {
  builtInShader,
  builtInTransition,
  type Placement,
  type ResolvedState,
  SHADER_ONLY_EFFECTS,
  type ShaderDefinition,
  type ShaderStep,
  type ShaderUniform,
  shaderFor,
} from "@cutcraft/kit";

import { cssPasses } from "./css-passes";
import { childFilter, paramsAt } from "./effects";
import type { TransitionRole } from "./visible";

/** One shader effect to run over an element's picture, with its params at this moment. */
export interface ShaderPass {
  readonly name: string;
  /** The effect's GLSL, one source per pass, run in order. */
  readonly sources: readonly string[];
  /** How a built-in draws its passes for these params (sizes, regions); without it, each source over the frame. */
  readonly steps?: readonly ShaderStep[];
  /** A built-in effect (`levels`, `lut`…), drawn by the kit's shader. */
  readonly builtIn?: true;
  /** Pictures a built-in computes from its params (a curve's table), read by the passes by name. */
  readonly tables?: ShaderDefinition["tables"];
  readonly params: Readonly<Record<string, unknown>>;
  /** How each param reaches the shader, from the definition's schema. */
  readonly uniforms: readonly ShaderUniform[];
  /** Seconds into the element. */
  readonly time: number;
}

/** A shader transition (the file's own from `transition()`, or the kit's) on one side of it at this moment. */
export interface TransitionPass {
  /** A built-in transition (`iris`…), which crossfades where there is no WebGL. */
  readonly builtIn?: true;
  /** The transition's id, which pairs the outgoing side with the incoming one. */
  readonly id: string;
  readonly name: string;
  readonly source: string;
  readonly params: Readonly<Record<string, unknown>>;
  /** How each param reaches the shader, from the definition's schema. */
  readonly uniforms: readonly ShaderUniform[];
  /** 0..1 through the transition, eased by its curve. */
  readonly progress: number;
  readonly time: number;
  readonly role: "out" | "in";
  /** Between two clips, whose pictures the shader blends; false for one clip's edge, blended with nothing. */
  readonly paired: boolean;
}

/** An effect drawn by a shader (the file's own, or the kit's) as a pass at element-relative `rel`; undefined otherwise. */
function shaderPass(state: ResolvedState, c: Placement, rel: number): ShaderPass | undefined {
  if (c.kind !== "effect" || c.props.enabled === false) return undefined;
  const own = shaderFor(state.shaders, "effect", c.props.type);
  const def = own ?? builtInShader(c.props.type);
  if (!def) return undefined;
  const params = paramsAt(state.items, c, rel);
  return {
    name: def.name,
    sources: def.passes,
    ...(own ? {} : { builtIn: true as const }),
    ...(!own && def.tables ? { tables: def.tables } : {}),
    ...(!own && def.steps ? { steps: def.steps(params) } : {}),
    params,
    uniforms: def.uniforms,
    time: rel,
  };
}

/** How an element's effects draw: a CSS filter, shader passes, or both, decided by `effectPipeline`. */
export interface EffectPipeline {
  /** The CSS filter the element draws with. Empty when its effects run as passes. */
  readonly filter: string;
  /** The passes, in file order: the CSS-type effects among them as CSS passes. */
  readonly shaders?: readonly ShaderPass[];
  /** With passes: the element's look as CSS alone, for a painter without WebGL. */
  readonly fallbackFilter?: string;
}

/**
 * An element's effects (its `<Effect>` children) in the order the file writes them, at
 * element-relative `rel`:
 *
 * - no shader effect (and no shader transition, `transition`): one CSS filter, which needs no WebGL;
 * - otherwise, with `shaders` (the renderer can run them): every effect as passes in file order, CSS-type ones
 *   included (model/css-passes.ts), no filter, and the CSS-only look as `fallbackFilter`;
 * - without `shaders` (an overlay without HTML-in-Canvas): the CSS-only look as the filter, and only the passes that
 *   have no CSS form, which the renderer then reports it cannot draw.
 */
export function effectPipeline(
  state: ResolvedState,
  children: readonly Placement[],
  elementId: string,
  rel: number,
  options: { readonly shaders: boolean; readonly transition?: boolean },
): EffectPipeline {
  const steps: (ShaderPass | string)[] = [];
  for (const c of children) {
    const pass = shaderPass(state, c, rel);
    if (pass) steps.push(pass);
    else {
      const css = childFilter(state.items, c, elementId, rel);
      if (css) steps.push(css);
    }
  }
  const passes = steps.filter((s): s is ShaderPass => typeof s !== "string");
  const css = steps.filter((s): s is string => typeof s === "string").join(" ");
  if (passes.length === 0 && !options.transition) return { filter: css };
  // The look as CSS alone: the CSS-type effects, and the CSS form of each built-in shader effect that has one.
  const fallbackFilter = cssOnly(state, children, elementId, rel);
  if (!options.shaders) {
    const shaderOnly = passes.filter((p) => !hasCssFallback(p));
    return { filter: fallbackFilter, ...(shaderOnly.length > 0 ? { shaders: shaderOnly } : {}) };
  }
  const shaders = steps.flatMap((s) => (typeof s === "string" ? cssPasses(s, rel) : [s]));
  return { filter: "", ...(shaders.length > 0 ? { shaders } : {}), fallbackFilter };
}

/** The element's look as CSS alone, in file order: its CSS-type effects and the CSS form of its built-in shader effects. */
function cssOnly(state: ResolvedState, children: readonly Placement[], elementId: string, rel: number): string {
  const own = new Set(state.shaders.filter((s) => s.kind === "effect").map((s) => s.name));
  return children
    .map((c) => childFilter(state.items, c, elementId, rel, own))
    .filter(Boolean)
    .join(" ");
}

/** The side of a shader transition this clip plays (the file's own, or the kit's), or undefined for one drawn without a shader. */
export function transitionPass(state: ResolvedState, role: TransitionRole): TransitionPass | undefined {
  const x = role.placement;
  const own = shaderFor(state.shaders, "transition", x.props.type);
  const def = own ?? builtInTransition(x.props.type);
  if (!def) return undefined;
  return {
    id: x.id,
    name: def.name,
    ...(own ? {} : { builtIn: true as const }),
    source: def.passes[0] as string,
    params: (x.props.params ?? {}) as Readonly<Record<string, unknown>>,
    uniforms: def.uniforms,
    progress: role.progress,
    time: role.progress * x.duration,
    role: role.role,
    paired: x.between !== undefined,
  };
}

/** Whether a pass draws as a CSS filter where there is no WebGL: a built-in effect that has one. */
export function hasCssFallback(pass: ShaderPass): boolean {
  return pass.builtIn === true && !(SHADER_ONLY_EFFECTS as readonly string[]).includes(pass.name);
}
