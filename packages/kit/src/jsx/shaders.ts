// Effects and transitions a file writes itself: a GLSL function and a zod schema for its params, declared at the top of
// the file and used by name in <Effect type> or <Transition type>. The player draws them with WebGL, in the preview
// and the export.
import { type ZodObject, z } from "zod";

import { TRANSITION_TYPES, VIDEO_EFFECT_TYPES } from "./enums";

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

interface ShaderStore {
  scope: Map<string, ShaderDefinition> | null;
  readonly global: Map<string, ShaderDefinition>;
}

// On globalThis, so a second copy of the kit in one page or process still shares it.
const STORE_KEY = Symbol.for("cutcraft.shaders.store");
const store: ShaderStore = ((globalThis as Record<symbol, ShaderStore | undefined>)[STORE_KEY] ??= {
  scope: null,
  global: new Map(),
});

/** The shaders a module loaded by `loadModule` declared, stored on its exports under this key. */
export const MODULE_SHADERS = Symbol.for("cutcraft.shaders");

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

function declare(kind: ShaderDefinition["kind"], options: DefineOptions): string {
  const builtIn = (kind === "effect" ? VIDEO_EFFECT_TYPES : TRANSITION_TYPES) as readonly string[];
  if (builtIn.includes(options.name)) throw new Error(`${kind} "${options.name}" is built in; give yours another name`);
  const def = shaderDefinition(kind, options);
  (store.scope ?? store.global).set(`${kind}:${def.name}`, def);
  return def.name;
}

export interface DefineOptions {
  readonly name: string;
  readonly params?: ZodObject;
  /** The GLSL of a one-pass effect or of a transition. */
  readonly shader?: string;
  /** An effect of several passes, run in order: each reads the one before as `image` and the element as `original`. */
  readonly passes?: readonly string[];
}

/**
 * Declares an effect drawn by a GLSL function, and returns its name for `<Effect type>`. Call it at the top of the file.
 *
 *   const glitch = defineEffect({
 *     name: "glitch",
 *     params: z.object({ amount: z.number().min(0).max(1).default(0.3) }),
 *     shader: `vec4 effect(vec2 uv) {
 *       float shift = amount * 0.02 * sin(time * 40.0 + uv.y * 80.0);
 *       return vec4(texture(image, uv + vec2(shift, 0)).r, texture(image, uv).g, texture(image, uv - vec2(shift, 0)).b,
 *                   texture(image, uv).a);
 *     }`,
 *   });
 *   <Clip id="city" src="asset:city"><Effect id="g" type={glitch} params={{ amount: 0.5 }} /></Clip>
 */
export function defineEffect(options: DefineOptions): string {
  return declare("effect", options);
}

/**
 * Declares a transition drawn by a GLSL function of the two pictures, and returns its name for `<Transition type>`.
 *
 *   const sweep = defineTransition({
 *     name: "sweep",
 *     shader: `vec4 transition(vec2 uv) { return uv.x < progress ? texture(to, uv) : texture(from, uv); }`,
 *   });
 */
export function defineTransition(options: DefineOptions): string {
  return declare("transition", options);
}

/** Runs `load` and returns the shaders declared while it ran: how `loadModule` keeps each file's apart. */
export function collectShaders(load: () => void): ShaderDefinition[] {
  const outer = store.scope;
  const scope = new Map<string, ShaderDefinition>();
  store.scope = scope;
  try {
    load();
  } finally {
    store.scope = outer;
  }
  return [...scope.values()];
}

/** The shaders a module declared: those `loadModule` recorded for it, or else every one declared outside a load. */
export function shadersOf(mod: object): readonly ShaderDefinition[] {
  return (mod as Record<symbol, readonly ShaderDefinition[] | undefined>)[MODULE_SHADERS] ?? [...store.global.values()];
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
