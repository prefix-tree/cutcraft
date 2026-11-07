// Effects and transitions a file writes itself: a GLSL function and a zod schema for its params, declared at the top of
// the file with effect() or transition() and passed to <Effect type> or <Transition type>. A declaration is a value:
// nothing is registered anywhere. A tree's definitions are collected from the elements that use them and from the
// module's exports (resolve/collect.ts), so each player owns its own. The player draws them with WebGL.
import type { ZodObject } from "zod";

import { TRANSITION_TYPES, VIDEO_EFFECT_TYPES } from "../effects/registry";
import { type DefineOptions, type NoParams, type ShaderDefinition, shaderDefinition } from "./shader-definition";

export {
  type DefineOptions,
  type NoParams,
  type ShaderDefinition,
  type ShaderStep,
  type ShaderTable,
  type ShaderUniform,
  shaderDefinition,
  uniformsOf,
} from "./shader-definition";

/** What every value a file declares (an effect, a transition, a font) carries, so collection can recognise it. */
export const DECLARED = Symbol.for("cutcraft.declared");

/**
 * An effect a file declares, as `effect()` returns it: the definition itself, a value with no side effect. Passed as
 * `<Effect type={ref}>`, it is collected from the element; exported, from the module, so the editor can offer it.
 */
export interface EffectRef<P extends ZodObject = ZodObject> {
  readonly [DECLARED]: "effect";
  readonly name: string;
  readonly definition: ShaderDefinition<P>;
}
/** A transition a file declares, as `transition()` returns it: the definition itself. */
export interface TransitionRef<P extends ZodObject = ZodObject> {
  readonly [DECLARED]: "transition";
  readonly name: string;
  readonly definition: ShaderDefinition<P>;
}

/** Whether a value is an effect or transition a file declared. */
export function isShaderRef(value: unknown): value is EffectRef | TransitionRef {
  const kind = (value as { [DECLARED]?: unknown } | null)?.[DECLARED];
  return kind === "effect" || kind === "transition";
}

function declare<P extends ZodObject>(kind: ShaderDefinition["kind"], options: DefineOptions<P>): ShaderDefinition<P> {
  const builtIn = (kind === "effect" ? VIDEO_EFFECT_TYPES : TRANSITION_TYPES) as readonly string[];
  if (builtIn.includes(options.name)) throw new Error(`${kind} "${options.name}" is built in; give yours another name`);
  return shaderDefinition(kind, options);
}

/**
 * Declares an effect drawn by a GLSL function, and returns it for `<Effect type>`. Call it at the top of the file. The
 * shader reads each param as `params.NAME`.
 *
 *   const glitch = effect({
 *     name: "glitch",
 *     params: z.object({ amount: z.number().min(0).max(1).default(0.3) }),
 *     shader: `vec4 effect(vec2 uv) {
 *       float shift = params.amount * 0.02 * sin(time * 40.0 + uv.y * 80.0);
 *       return vec4(texture(image, uv + vec2(shift, 0)).r, texture(image, uv).g, texture(image, uv - vec2(shift, 0)).b,
 *                   texture(image, uv).a);
 *     }`,
 *   });
 *   <Clip id="city" src="asset:city"><Effect id="g" type={glitch} params={{ amount: 0.5 }} /></Clip>
 */
export function effect<P extends ZodObject = NoParams>(options: DefineOptions<P>): EffectRef<P> {
  const definition = declare("effect", options);
  return Object.freeze({ [DECLARED]: "effect" as const, name: definition.name, definition });
}

/**
 * Declares a transition drawn by a GLSL function of the two pictures, and returns it for `<Transition type>`.
 *
 *   const sweep = transition({
 *     name: "sweep",
 *     shader: `vec4 transition(vec2 uv) { return uv.x < progress ? texture(to, uv) : texture(from, uv); }`,
 *   });
 */
export function transition<P extends ZodObject = NoParams>(options: DefineOptions<P>): TransitionRef<P> {
  const definition = declare("transition", options);
  return Object.freeze({ [DECLARED]: "transition" as const, name: definition.name, definition });
}

/** The shader a file declares under this name for an `<Effect>` or `<Transition>`, if any. */
export function shaderFor(
  shaders: readonly ShaderDefinition[],
  kind: ShaderDefinition["kind"],
  type: unknown,
): ShaderDefinition | undefined {
  return shaders.find((s) => s.kind === kind && s.name === type);
}

/** Whether a file draws anything with a shader it declares: what only a renderer with WebGL draws. */
export function usesShaders(state: {
  readonly shaders: readonly ShaderDefinition[];
  readonly items: ReadonlyMap<string, { readonly kind: string; readonly props: Readonly<Record<string, unknown>> }>;
}): boolean {
  if (state.shaders.length === 0) return false;
  for (const p of state.items.values())
    if ((p.kind === "effect" || p.kind === "transition") && shaderFor(state.shaders, p.kind, p.props.type)) return true;
  return false;
}
