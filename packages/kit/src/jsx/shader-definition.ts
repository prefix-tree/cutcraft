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
  /** Each param a shader can read, and how it reaches it: from the schema, once. */
  readonly uniforms: readonly ShaderUniform[];
  /**
   * Built-in effects only: pictures the effect computes from its params (a curve's table), each read by the passes as
   * a `sampler2D` of that name. Bytes are RGBA, row 0 at the top.
   */
  readonly tables?: (params: Readonly<Record<string, unknown>>) => Readonly<Record<string, ShaderTable>>;
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

/**
 * How a param reaches the shader, worked out from its schema once:
 * - `float`, `bool`, `vec2`..`vec4`: a number, a boolean, a tuple of numbers;
 * - `colour`: a `#rgb`/`#rrggbb` string (by its pattern), as a vec3;
 * - `enum`: one of `options`, as an int, its index; the shader can name an option as `params.NAME.OPTION`;
 * - `asset`: an `"asset:ID"` string (by its pattern), as a sampler, 2D or 3D by the asset loaded;
 * - `string` and `numbers`: a string or a list of numbers with no pattern or fixed length in the schema, read by their
 *   value: a colour or an asset, a vec of their length.
 */
export interface ShaderUniform {
  readonly name: string;
  readonly kind: "float" | "bool" | "vec2" | "vec3" | "vec4" | "colour" | "enum" | "asset" | "string" | "numbers";
  readonly options?: readonly string[];
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

/** A pass's `params.NAME` reads, and `params.NAME.OPTION` names of an enum's options. */
const PARAM_READ = /(?<![.\w])params\.([A-Za-z_]\w*)/g;
const OPTION_READ = /(?<![.\w])params\.([A-Za-z_]\w*)\.([A-Za-z_]\w*)/g;

const COLOUR_PATTERN = "^#([0-9a-f]{3}|[0-9a-f]{6})$";

type JsonSchema = {
  readonly type?: string;
  readonly pattern?: string;
  readonly enum?: readonly unknown[];
  readonly prefixItems?: readonly JsonSchema[];
  readonly items?: JsonSchema | false;
};

/** How a param of this (JSON) schema reaches a shader, or null for one no uniform can carry. */
function uniformKind(schema: JsonSchema): Omit<ShaderUniform, "name"> | null {
  if (Array.isArray(schema.enum) && schema.enum.every((o) => typeof o === "string"))
    return { kind: "enum", options: schema.enum as string[] };
  if (schema.type === "number" || schema.type === "integer") return { kind: "float" };
  if (schema.type === "boolean") return { kind: "bool" };
  if (schema.type === "string") {
    if (schema.pattern === COLOUR_PATTERN) return { kind: "colour" };
    if (schema.pattern?.startsWith("^asset:")) return { kind: "asset" };
    return { kind: "string" };
  }
  if (schema.type === "array") {
    const items = schema.prefixItems;
    if (
      items &&
      items.length >= 2 &&
      items.length <= 4 &&
      items.every((i) => i.type === "number" || i.type === "integer")
    )
      return { kind: `vec${items.length}` as "vec2" | "vec3" | "vec4" };
    if (!items && schema.items && (schema.items.type === "number" || schema.items.type === "integer"))
      return { kind: "numbers" };
  }
  return null;
}

/** Each param of a schema that a uniform can carry, and how. */
export function uniformsOf(params: ZodObject): ShaderUniform[] {
  const json = z.toJSONSchema(params, { io: "input", unrepresentable: "any" }) as {
    properties?: Record<string, JsonSchema>;
  };
  return Object.entries(json.properties ?? {}).flatMap(([name, schema]) => {
    const kind = uniformKind(schema);
    return kind ? [{ name, ...kind }] : [];
  });
}

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
  const params = options.params ?? (z.object({}) as ZodObject as P);
  const uniforms = uniformsOf(params);
  for (const pass of passes) {
    for (const [, read] of pass.matchAll(PARAM_READ)) {
      if (!declared.includes(read as string))
        throw new Error(`${kind} "${name}": the shader reads params.${read}, which its params do not declare`);
      if (!uniforms.some((u) => u.name === read))
        throw new Error(
          `${kind} "${name}": params.${read} cannot reach a shader; a param is a number, a boolean, 2 to 4 numbers, a colour, an asset or one of a list of names`,
        );
    }
    for (const [, param, option] of pass.matchAll(OPTION_READ)) {
      const u = uniforms.find((x) => x.name === param);
      if (u?.kind === "enum" && !u.options?.includes(option as string))
        throw new Error(
          `${kind} "${name}": params.${param} has no option "${option}": it has ${u.options?.join(", ")}`,
        );
    }
  }
  return { kind, name, params, passes, uniforms };
}

export interface DefineOptions<P extends ZodObject = ZodObject> {
  readonly name: string;
  readonly params?: P;
  /** The GLSL of a one-pass effect or of a transition. */
  readonly shader?: string;
  /** An effect of several passes, run in order: each reads the one before as `image` and the element as `original`. */
  readonly passes?: readonly string[];
}
