// The shapes built-in effects share, each written once:
//
// - a colour transform: a pixel's colour changed by a function of that colour alone, its alpha kept (levels, exposure,
//   white balance…). Its function is kept on the definition, so a run of them can be drawn as one pass;
// - a mask transition: the next clip shown where a mask says, blended by it (iris, clock wipe, blinds…);
// - a blur and what is drawn around it (glow, region blur…), from ./gauss.
//
// A shape is here only when two built-ins or more share it. Each takes the params at which it changes nothing
// (`neutral`), so the player can skip it there.
import type { ZodObject } from "zod";

import { type ShaderDefinition, shaderDefinition } from "../jsx/shader-definition";
import { type GlslModule, glsl } from "./glsl";

export { aroundGauss } from "./gauss";

/** Params at which an effect changes nothing: the player draws nothing for it there. */
export type Neutral = Readonly<Record<string, unknown>>;

/** A colour transform's function: its GLSL (with what it needs before it), and its name. */
export interface ColourFunction {
  /** The function's name, `cc_<effect>`: `vec3 cc_<effect>(vec3 c)`. */
  readonly fn: string;
  /** The modules it uses, anything else it declares, and the function. */
  readonly code: string;
}

/**
 * An effect that changes each pixel's colour by a function of that colour alone, keeping its alpha. `rgb` is the body
 * of `vec3 cc_<name>(vec3 c)`; it may read `params.*`, `uses`'s modules, anything `prelude` declares, and the
 * effect's tables.
 */
export function colorTransform<P extends ZodObject>(options: {
  readonly name: string;
  readonly params: P;
  readonly uses?: readonly GlslModule[];
  readonly prelude?: string;
  readonly rgb: string;
  readonly neutral?: Neutral;
}): ShaderDefinition<P> & { readonly colour: ColourFunction; readonly neutral?: Neutral } {
  const fn = `cc_${options.name}`;
  const code = glsl`${options.uses ?? []}${options.prelude ?? ""}vec3 ${fn}(vec3 c) {
${options.rgb}
}
`;
  const def = shaderDefinition("effect", {
    name: options.name,
    params: options.params,
    shader: `${code}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  return vec4(${fn}(c.rgb), c.a);
}`,
  });
  return { ...def, colour: { fn, code }, ...(options.neutral ? { neutral: options.neutral } : {}) };
}

/**
 * A transition that shows the next clip where a mask says, blended by it: `mask` is the body of
 * `float cc_mask(vec2 uv)`, 0 for the outgoing clip and 1 for the next, from `progress` and `params.*`.
 */
export function maskTransition<P extends ZodObject>(options: {
  readonly name: string;
  readonly params: P;
  readonly uses?: readonly GlslModule[];
  readonly mask: string;
}): ShaderDefinition<P> {
  return shaderDefinition("transition", {
    name: options.name,
    params: options.params,
    shader: glsl`${options.uses ?? []}float cc_mask(vec2 uv) {
${options.mask}
}
vec4 transition(vec2 uv) {
  return mix(texture(from, uv), texture(to, uv), cc_mask(uv));
}`,
  });
}
