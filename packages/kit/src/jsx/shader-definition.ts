// What a shader effect or transition is: its GLSL passes and the zod schema of its params, checked when it is made.
// Built-in effects (effects/registry.ts) and a file's own (jsx/shaders.ts, effect()) are both made here.
import { type ZodObject, z } from "zod";

export interface ShaderDefinition<P extends ZodObject = ZodObject> {
  readonly kind: "effect" | "transition";
  readonly name: string;
  /** The params `<Effect params>` or `<Transition params>` takes, validated and given defaults by this schema. */
  readonly params: P;
  /**
   * GLSL ES 3.00, one source per pass, run in order. An effect's pass defines `vec4 effect(vec2 uv)` and a transition's
   * single pass `vec4 transition(vec2 uv)`. A pass may read `image` (an effect's picture: the element's for the first
   * pass, the pass before's for the others), `original` (the element's picture, in every pass) or `from` and `to` (a
   * transition's two pictures) as `sampler2D`, `resolution` (vec2, pixels), `time` (seconds into the element),
   * `progress` (0..1 through a transition), and each param as `params.NAME`: a number as a float, a boolean as a bool,
   * an array of 2 to 4 numbers as a vec, a colour string as a vec3, an `"asset:ID"` as a sampler.
   */
  readonly passes: readonly string[];
  /**
   * Built-in effects only: pictures the effect computes from its params (a curve's table), each read by the passes as
   * a `sampler2D` of that name. Bytes are RGBA, row 0 at the top.
   */
  readonly tables?: (params: Readonly<Record<string, unknown>>) => Readonly<Record<string, ShaderTable>>;
  /**
   * Built-in effects and transitions only: the values the passes read, from the params, where a param is written in a
   * form no uniform takes (a choice, as a string, read as a number).
   */
  readonly uniforms?: (params: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>;
  /**
   * Built-in effects only: the passes as drawn for these params, each a source from `passes` with the size it draws at
   * and the part of the frame it needs. Without it, every pass draws the whole frame at full size.
   */
  readonly steps?: (params: Readonly<Record<string, unknown>>) => readonly ShaderStep[];
}

/**
 * One pass of a built-in as it is drawn: its GLSL, the size it draws at (a share of the frame's), and the part of the
 * frame it needs to draw, if not all of it.
 */
export interface ShaderStep {
  readonly source: string;
  /** Of the frame's size: a blur drawn smaller, read back full size through linear filtering. */
  readonly scale?: 1 | 0.5 | 0.25;
  /** The only part drawn: `box` in uv (`[x, y, width, height]`), grown by `margin` frame pixels on every side. */
  readonly region?: { readonly box: readonly [number, number, number, number]; readonly margin: number };
}

/** A small picture a built-in effect computes from its params. */
export interface ShaderTable {
  readonly width: number;
  readonly height: number;
  /** width × height × 4 bytes, RGBA. */
  readonly data: Uint8Array;
}

/** The params of a shader that declares none. */
export type NoParams = ZodObject<Record<never, never>>;

const NAME = /^[a-z][a-zA-Z0-9-]*$/;

/** A param's name: letters and digits, words joined by single underscores, as GLSL allows after a prefix. */
const PARAM = /^[A-Za-z](?:_?[A-Za-z0-9])*$/;

/** A pass's `params.NAME` reads. */
const PARAM_READ = /(?<![.\w])params\.([A-Za-z_]\w*)/g;

/** Checks a declaration and makes its definition; throws what is wrong with it. */
export function shaderDefinition<P extends ZodObject = NoParams>(
  kind: ShaderDefinition["kind"],
  options: DefineOptions<P>,
): ShaderDefinition<P> {
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
  const declared = Object.keys(options.params?.shape ?? {});
  for (const param of declared)
    if (!PARAM.test(param))
      throw new Error(`${kind} "${name}": param "${param}" is not a name; use letters and digits, joined by single _`);
  for (const pass of passes)
    for (const [, read] of pass.matchAll(PARAM_READ))
      if (!declared.includes(read as string))
        throw new Error(`${kind} "${name}": the shader reads params.${read}, which its params do not declare`);
  return { kind, name, params: options.params ?? (z.object({}) as ZodObject as P), passes };
}

export interface DefineOptions<P extends ZodObject = ZodObject> {
  readonly name: string;
  readonly params?: P;
  /** The GLSL of a one-pass effect or of a transition. */
  readonly shader?: string;
  /** An effect of several passes, run in order: each reads the one before as `image` and the element as `original`. */
  readonly passes?: readonly string[];
}
