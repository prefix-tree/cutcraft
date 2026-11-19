import { type DependencyList, type RefObject, useLayoutEffect, useRef } from "react";

import { holdLayerFrame } from "./engines";
import { useLayer } from "./use-t";

/**
 * Anything that can be set to a moment: a GSAP timeline as it is, an Anime.js or Lottie animation in a small
 * wrapper. `seek` is given seconds since the layer started; a promise holds the export's frame until it settles.
 * When the object is replaced or the layer unmounts, `revert`, `destroy` or `kill` is called, the first it has.
 */
export interface Seekable {
  seek(seconds: number): unknown;
  revert?(): unknown;
  destroy?(): unknown;
  kill?(): unknown;
}

/**
 * An animation from another library, played on the video's clock. `create` builds it once, paused, given the
 * element the returned ref is on; on every frame it is seeked to the layer's time before the frame is painted, so it
 * scrubs both ways and exports as previewed. Rebuilt when `deps` change, as with `useEffect`.
 *
 * ```tsx
 * const ref = useSeekable((el) => gsap.timeline({ paused: true }).to(el.querySelector(".dot"), { x: 300 }));
 * return <div ref={ref}><div className="dot" /></div>;
 * ```
 */
export function useSeekable<T extends Element = HTMLDivElement>(
  create: (scope: T) => Seekable,
  deps: DependencyList = [],
): RefObject<T | null> {
  const scope = useRef<T | null>(null);
  const current = useRef<Seekable | null>(null);
  const { elapsed } = useLayer();
  useLayoutEffect(() => {
    if (!scope.current) throw new Error("useSeekable: put the ref it returns on an element");
    const made = create(scope.current);
    current.current = made;
    return () => {
      current.current = null;
      (made.revert ?? made.destroy ?? made.kill)?.call(made);
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: the caller names what rebuilds it, as with useEffect.
  }, deps);
  useLayoutEffect(() => {
    const made = current.current;
    if (!made) return;
    const done = made.seek(elapsed);
    if (isThenable(done)) {
      const release = holdLayerFrame();
      done.then(release, release);
    }
  });
  return scope;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";
}
