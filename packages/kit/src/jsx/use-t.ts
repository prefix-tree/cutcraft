/**
 * Normalised time (0..1) inside a `<Layer>`. The kit has no renderer, so this
 * throws unless a Player installs an implementation. Fixtures and the
 * resolver never call it: Layer interiors are opaque and are not expanded.
 */
let impl: (() => number) | null = null;

export function useT(): number {
  if (!impl) {
    throw new Error("useT() needs a Player. The kit does not render; install one with installUseT().");
  }
  return impl();
}

export function installUseT(fn: (() => number) | null): void {
  impl = fn;
}
