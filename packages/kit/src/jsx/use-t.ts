/**
 * Time inside a `<Layer>`. The kit has no renderer, so these throw unless a
 * Player installs an implementation. Fixtures and the resolver never call
 * them: Layer interiors are opaque and are not expanded.
 */
export interface LayerClock {
  /** 0..1 progress through the layer. */
  readonly t: number;
  /** Seconds since the layer started, clamped to its duration. */
  readonly elapsed: number;
  /** Seconds until the layer ends, clamped to 0. */
  readonly remaining: number;
  /** The layer's duration in seconds. */
  readonly duration: number;
  /** Composition time in seconds. */
  readonly time: number;
  /** The composition's frame rate. */
  readonly fps: number;
}

/**
 * The installed clock lives on `globalThis`, not in this module: a cut file loaded by a tool may carry its own
 * copy of the kit (a private module graph, a second install), and its `useT()` must still find the player's clock.
 */
const slot = ((globalThis as Record<symbol, { impl: (() => LayerClock) | null }>)[
  Symbol.for("@cutcraft/kit/layer-clock")
] ??= { impl: null });

/** The layer's clock: progress, seconds elapsed and remaining, its duration, the composition time. */
export function useLayer(): LayerClock {
  const impl = slot.impl;
  if (!impl) {
    throw new Error("useLayer() needs a Player. The kit does not render; install one with installLayerClock().");
  }
  return impl();
}

/** Normalised time (0..1) inside a `<Layer>`; `useLayer().t`. */
export function useT(): number {
  const impl = slot.impl;
  if (!impl) {
    throw new Error("useT() needs a Player. The kit does not render; install one with installLayerClock().");
  }
  return impl().t;
}

export function installLayerClock(fn: (() => LayerClock) | null): void {
  slot.impl = fn;
}
