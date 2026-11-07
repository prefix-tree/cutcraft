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

import { type ColourFunction, type ShaderDefinition, shaderDefinition } from "../jsx/shader-definition";
import { type GlslModule, glsl } from "./glsl";

export { aroundGauss } from "./gauss";
export type { ColourFunction };

/** Params at which an effect changes nothing: the player draws nothing for it there. */
export type Neutral = Readonly<Record<string, unknown>>;

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
  const colour: ColourFunction = {
    fn: `cc_${options.name}`,
    uses: options.uses ?? [],
    prelude: options.prelude ?? "",
    code: `vec3 cc_${options.name}(vec3 c) {
${options.rgb}
}
`,
  };
  const def = shaderDefinition("effect", {
    name: options.name,
    params: options.params,
    shader: glsl`${colour.uses}${colour.prelude}${colour.code}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  return vec4(${colour.fn}(c.rgb), c.a);
}`,
  });
  return { ...def, colour, ...(options.neutral ? { neutral: options.neutral } : {}) };
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

/** A shader's `params.NAME` reads. */
const PARAM_READ = /(?<![.\w])params\.([A-Za-z_]\w*)/g;

/**
 * One effect pass that draws a run of colour transforms in order: each one's modules and prelude once, each function
 * renamed by its place in the run and reading its params under its `prefix` (`params.e0_stops`), then one read of the
 * pixel, each function in turn, and its alpha kept. Two members must not share a prelude or a table.
 */
export function fusedColourSource(
  members: readonly { readonly colour: ColourFunction; readonly prefix: string }[],
): string {
  const uses = members.flatMap((m) => m.colour.uses);
  const preludes = [...new Set(members.map((m) => m.colour.prelude).filter(Boolean))];
  const fns = members.map((m, i) =>
    m.colour.code
      .replace(new RegExp(`\\b${m.colour.fn}\\b`, "g"), `${m.colour.fn}_${i}`)
      .replace(PARAM_READ, (_, name: string) => `params.${m.prefix}${name}`),
  );
  const calls = members.map((m, i) => `  v = ${m.colour.fn}_${i}(v);\n`).join("");
  return glsl`${uses}${preludes.join("")}${fns.join("")}vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  vec3 v = c.rgb;
${calls}  return vec4(v, c.a);
}`;
}
