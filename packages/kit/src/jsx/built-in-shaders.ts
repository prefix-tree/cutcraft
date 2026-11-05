// Built-in effects drawn by a shader: each is a `defineEffect` the kit declares itself, run by the same pipeline as a
// file's own. A built-in shader effect keeps a CSS filter of the same type as its fallback where there is no WebGL
// (player/src/model/effects.ts).
import { z } from "zod";

import { type ShaderDefinition, shaderDefinition } from "./shaders";

/**
 * Levels: the input range [black, white] stretched to [0, 1], then a gamma curve on the midtones, per channel:
 * out = ((in − black) / (white − black)) ^ (1 / gamma). Gamma above 1 lifts the midtones, below 1 deepens them; black
 * and white stay where they are. The standard input-levels adjustment of image editors.
 */
const levels = shaderDefinition("effect", {
  name: "levels",
  params: z.object({
    black: z.number().min(0).max(1).default(0),
    white: z.number().min(0).max(1).default(1),
    gamma: z.number().min(0.01).max(10).default(1),
  }),
  shader: `vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float range = max(white - black, 1e-5);
  vec3 v = clamp((c.rgb - black) / range, 0.0, 1.0);
  return vec4(pow(v, vec3(1.0 / max(gamma, 0.01))), c.a);
}`,
});

/**
 * A 3D colour lookup table (a `.cube` file in the manifest, kind `lut`): each colour is looked up in the table's cube,
 * between its entries by trilinear filtering, and mixed with the original by `amount`. The coordinates are moved half an
 * entry in, so 0 and 1 land on the first and last entries' centres rather than their edges.
 */
const lut = shaderDefinition("effect", {
  name: "lut",
  params: z.object({
    src: z.string().regex(/^asset:/, 'the LUT, as "asset:ID": a .cube file in the manifest'),
    amount: z.number().min(0).max(1).default(1),
  }),
  shader: `vec4 effect(vec2 uv) {
  vec4 c = texture(image, uv);
  float n = float(textureSize(src, 0).x);
  vec3 graded = texture(src, (clamp(c.rgb, 0.0, 1.0) * (n - 1.0) + 0.5) / n).rgb;
  return vec4(mix(c.rgb, graded, amount), c.a);
}`,
});

/** The built-in effect types the kit draws with a shader. */
export const BUILT_IN_SHADERS: readonly ShaderDefinition[] = [levels, lut];

/** Built-in shader effects with no CSS filter to fall back on: without WebGL they are not drawn. */
export const SHADER_ONLY_EFFECTS = ["lut"] as const;

/** The built-in shader of an effect type, if it has one. */
export function builtInShader(type: unknown): ShaderDefinition | undefined {
  return BUILT_IN_SHADERS.find((s) => s.name === type);
}
