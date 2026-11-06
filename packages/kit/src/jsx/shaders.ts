// Effects and transitions a file writes itself: a GLSL function and a zod schema for its params, declared at the top of
// the file and used by name in <Effect type> or <Transition type>. The player draws them with WebGL, in the preview
// and the export.
import { TRANSITION_TYPES, VIDEO_EFFECT_TYPES } from "../effects/registry";
import { type DefineOptions, type ShaderDefinition, shaderDefinition } from "./shader-definition";

export { type DefineOptions, type ShaderDefinition, type ShaderTable, shaderDefinition } from "./shader-definition";

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

function declare(kind: ShaderDefinition["kind"], options: DefineOptions): string {
  const builtIn = (kind === "effect" ? VIDEO_EFFECT_TYPES : TRANSITION_TYPES) as readonly string[];
  if (builtIn.includes(options.name)) throw new Error(`${kind} "${options.name}" is built in; give yours another name`);
  const def = shaderDefinition(kind, options);
  (store.scope ?? store.global).set(`${kind}:${def.name}`, def);
  return def.name;
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
