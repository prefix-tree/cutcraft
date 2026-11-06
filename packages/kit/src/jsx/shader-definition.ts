// What a shader effect or transition is: its GLSL passes and the zod schema of its params, checked when it is made.
// Built-in effects (effects/registry.ts) and a file's own (jsx/shaders.ts, defineEffect) are both made here.
import { type ZodObject, z } from "zod";

export interface ShaderDefinition {
  readonly kind: "effect" | "transition";
  readonly name: string;
  /** The params `<Effect params>` or `<Transition params>` takes, validated and given defaults by this schema. */
  readonly params: ZodObject;
  /**
   * GLSL ES 3.00, one source per pass, run in order. An effect's pass defines `vec4 effect(vec2 uv)` and a transition's
   * single pass `vec4 transition(vec2 uv)`. A pass may read `image` (an effect's picture: the element's for the first
   * pass, the pass before's for the others), `original` (the element's picture, in every pass) or `from` and `to` (a
   * transition's two pictures) as `sampler2D`, `resolution` (vec2, pixels), `time` (seconds into the element),
   * `progress` (0..1 through a transition), and each param by its name: a number as a float, a boolean as a bool, an
   * array of 2 to 4 numbers as a vec, a colour string as a vec3.
   */
  readonly passes: readonly string[];
  /**
   * Built-in effects only: pictures the effect computes from its params (a curve's table), each read by the passes as
   * a `sampler2D` of that name. Bytes are RGBA, row 0 at the top.
   */
  readonly tables?: (params: Readonly<Record<string, unknown>>) => Readonly<Record<string, ShaderTable>>;
}

/** A small picture a built-in effect computes from its params. */
export interface ShaderTable {
  readonly width: number;
  readonly height: number;
  /** width × height × 4 bytes, RGBA. */
  readonly data: Uint8Array;
}

const NAME = /^[a-z][a-zA-Z0-9-]*$/;

/** Names a param cannot take: the inputs every shader gets, and GLSL ES 3.00's built-in functions, which it would hide. */
const RESERVED = new Set([
  ...["image", "original", "from", "to", "resolution", "time", "progress", "position", "uv", "main"],
  ...["radians", "degrees", "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "asinh", "acosh"],
  ...["atanh", "pow", "exp", "log", "exp2", "log2", "sqrt", "inversesqrt", "abs", "sign", "floor", "trunc", "round"],
  ...["roundEven", "ceil", "fract", "mod", "modf", "min", "max", "clamp", "mix", "step", "smoothstep", "isnan"],
  ...["isinf", "length", "distance", "dot", "cross", "normalize", "faceforward", "reflect", "refract"],
  ...["matrixCompMult", "outerProduct", "transpose", "determinant", "inverse", "lessThan", "lessThanEqual"],
  ...["greaterThan", "greaterThanEqual", "equal", "notEqual", "any", "all", "not", "texture", "textureSize"],
  ...["textureLod", "texelFetch", "dFdx", "dFdy", "fwidth"],
]);

/** Checks a declaration and makes its definition; throws what is wrong with it. */
export function shaderDefinition(kind: ShaderDefinition["kind"], options: DefineOptions): ShaderDefinition {
  const { name } = options;
  if (!NAME.test(name)) throw new Error(`${kind} "${name}": a name is lowercase letters, digits and dashes`);
  if ((options.shader === undefined) === (options.passes === undefined))
    throw new Error(`${kind} "${name}": give it a shader or passes, not both`);
  const passes = options.passes ?? [options.shader as string];
  if (passes.length === 0) throw new Error(`${kind} "${name}": passes is empty`);
  if (kind === "transition" && passes.length > 1)
    throw new Error(`transition "${name}": a transition is one shader; passes are for effects`);
  const fn = kind === "effect" ? "effect" : "transition";
  const signature = new RegExp(`vec4\\s+${fn}\\s*\\(\\s*vec2\\s+\\w+\\s*\\)`);
  passes.forEach((pass, i) => {
    if (typeof pass !== "string" || !signature.test(pass))
      throw new Error(
        `${kind} "${name}": ${passes.length > 1 ? `pass ${i + 1}` : "the shader"} defines vec4 ${fn}(vec2 uv)`,
      );
  });
  for (const param of Object.keys(options.params?.shape ?? {}))
    if (RESERVED.has(param))
      throw new Error(
        `${kind} "${name}": param "${param}" is a name every shader already uses (a GLSL function or input); call it something else`,
      );
  return { kind, name, params: options.params ?? z.object({}), passes };
}

export interface DefineOptions {
  readonly name: string;
  readonly params?: ZodObject;
  /** The GLSL of a one-pass effect or of a transition. */
  readonly shader?: string;
  /** An effect of several passes, run in order: each reads the one before as `image` and the element as `original`. */
  readonly passes?: readonly string[];
}
