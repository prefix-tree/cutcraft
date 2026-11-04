import type { ComponentType, ReactNode } from "react";

/**
 * What draws an engine Layer (`<Three>`, `<Motion>`): a component given the Layer's resolved props (functions
 * included) and its children. The kit draws nothing; a host installs engines, as `@cutcraft/graphics/libraries` does.
 */
export type LayerEngine = ComponentType<Readonly<Record<string, unknown>> & { readonly children?: ReactNode }>;

/** On `globalThis`, like the layer clock: a file loaded with its own copy of the kit still finds the host's engines. */
const engines = ((globalThis as Record<symbol, Map<string, LayerEngine>>)[Symbol.for("@cutcraft/kit/layer-engines")] ??=
  new Map());

/** Install (or with `null`, remove) the engine that draws `<Layer engine={name}>` tags such as `<Three>`. */
export function installLayerEngine(name: string, engine: LayerEngine | null): void {
  if (engine) engines.set(name, engine);
  else engines.delete(name);
}

export function layerEngine(name: string): LayerEngine | null {
  return engines.get(name) ?? null;
}

/**
 * Frames an engine is still preparing (a three.js renderer being created, say). The browser export waits for none
 * before it captures a frame; the player ignores them. On `globalThis` for the same reason as the engines.
 */
const pending = ((globalThis as Record<symbol, { count: number }>)[Symbol.for("@cutcraft/kit/layer-frames-pending")] ??=
  { count: 0 });

/** Hold the frame until the returned release is called (once; later calls do nothing). */
export function holdLayerFrame(): () => void {
  pending.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    pending.count--;
  };
}

/** How many holds are open: 0 when every engine has drawn the frame it was given. */
export function layerFramesPending(): number {
  return pending.count;
}
