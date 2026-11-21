// Whether a param belongs to an effect, and a value fits it: a built-in effect's params schema (effects/registry.ts),
// or the one a file declares with effect().
import type { ZodType } from "zod";

import { effectEntry, RENAMED_EFFECT_PARAMS } from "../effects/registry";
import type { ShaderDefinition } from "./shader-definition";
import { shaderFor } from "./shaders";

/**
 * Whether `param` is a param of an effect of `type`, and `value` one it takes, by the effect's params schema: a
 * built-in's, or a file's own (`shaders`). Null when both hold; else which of the two is wrong and why.
 */
export function effectParamProblem(
  type: unknown,
  shaders: readonly ShaderDefinition[],
  param: string,
  value: unknown,
): { readonly prop: "param" | "value"; readonly message: string } | null {
  const schema = effectEntry(type)?.params ?? shaderFor(shaders, "effect", type)?.params;
  const shape = (schema?.shape ?? {}) as Record<string, ZodType>;
  const names = Object.keys(shape);
  const renamed = renamedParam(type, param);
  if (renamed !== undefined && names.includes(renamed))
    return {
      prop: "param",
      message: `param "${param}" of "${String(type)}" is now "${renamed}"; uberscene lint --fix moves the file`,
    };
  if (!names.includes(param))
    return {
      prop: "param",
      message: `effect "${String(type)}" has no param "${param}"${names.length > 0 ? `: it has ${names.join(", ")}` : ""}`,
    };
  const result = shape[param]?.safeParse(value);
  if (result && !result.success)
    return {
      prop: "value",
      message: `param "${param}" of "${String(type)}": ${result.error.issues[0]?.message ?? "invalid value"}`,
    };
  return null;
}

/** What a built-in effect's param `param` is called since 0.6, when that is another name; else undefined. */
export function renamedParam(type: unknown, param: string): string | undefined {
  if (typeof type !== "string" || !Object.hasOwn(RENAMED_EFFECT_PARAMS, type)) return undefined;
  const moved = RENAMED_EFFECT_PARAMS[type] as Readonly<Record<string, string>>;
  return Object.hasOwn(moved, param) ? moved[param] : undefined;
}
