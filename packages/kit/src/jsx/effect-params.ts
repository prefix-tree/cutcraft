// The params each built-in effect drawn as CSS reads (player/src/model/effects.ts, CANVAS_FILTERABLE and the post
// effects), so a keyframe's `param` on one of them can be checked. These effects have no params schema yet; the
// effect registry (RFC 0001, step 3) replaces this table with one.
import type { ZodType } from "zod";

import { builtInShader } from "./built-in-shaders";
import { type ShaderDefinition, shaderFor } from "./shaders";

export const CSS_EFFECT_PARAMS: Readonly<Record<string, readonly string[]>> = {
  brightness: ["amount", "value"],
  contrast: ["amount", "value"],
  saturation: ["amount", "value"],
  hue: ["angle", "amount", "value"],
  blur: ["radius", "amount", "value"],
  grayscale: ["amount", "value"],
  sepia: ["amount", "value"],
  invert: ["amount", "value"],
  temperature: ["amount", "value"],
  tint: ["amount", "value"],
  shadow: ["x", "y", "blur", "color"],
  vignette: ["amount", "intensity", "value"],
  grain: ["amount", "intensity", "value"],
};

/**
 * Whether `param` is a param of an effect of `type`, and `value` one it takes: a built-in shader effect's or a file's
 * own (`shaders`) by its params schema, a CSS effect by the names in `CSS_EFFECT_PARAMS`. Null when both hold; else
 * which of the two is wrong and why.
 */
export function effectParamProblem(
  type: unknown,
  shaders: readonly ShaderDefinition[],
  param: string,
  value: unknown,
): { readonly prop: "param" | "value"; readonly message: string } | null {
  const def = builtInShader(type) ?? shaderFor(shaders, "effect", type);
  const shape = def ? (def.params.shape as Record<string, ZodType>) : undefined;
  const names = shape ? Object.keys(shape) : (CSS_EFFECT_PARAMS[String(type)] ?? []);
  if (!names.includes(param))
    return {
      prop: "param",
      message: `effect "${String(type)}" has no param "${param}"${names.length > 0 ? `: it has ${names.join(", ")}` : ""}`,
    };
  const result = shape?.[param]?.safeParse(value);
  if (result && !result.success)
    return {
      prop: "value",
      message: `param "${param}" of "${String(type)}": ${result.error.issues[0]?.message ?? "invalid value"}`,
    };
  return null;
}
