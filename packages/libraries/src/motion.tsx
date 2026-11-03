import { useLayer } from "@cutcraft/kit";
import {
  useAnimate,
  useMotionValue,
  type AnimationPlaybackControls,
  type AnimationSequence,
  type MotionValue,
} from "motion/react";
import { useLayoutEffect, useRef, type DependencyList, type ReactNode, type RefObject } from "react";

/**
 * Seconds since the layer started, as a Motion value: feed it to `useTransform` and style a `motion` element with
 * the result. It follows the video's clock, so it scrubs and exports frame for frame.
 */
export function useLayerTime(): MotionValue<number> {
  const { elapsed } = useLayer();
  const value = useMotionValue(elapsed);
  // Set while rendering, as Motion's own hooks do: `useTransform` re-subscribes in a layout effect on every render,
  // so a value set from an effect can fire while nobody listens and land one frame late.
  if (value.get() !== elapsed) value.set(elapsed);
  return value;
}

/**
 * A Motion sequence (`[selector or element, keyframes, options]`, with `at` for placement) played on the video's
 * clock: built paused and set to the layer's time on every frame, so it scrubs both ways and exports as previewed.
 * Selectors are scoped to the returned ref. Rebuilt when `deps` change.
 */
export function useTimeline<T extends Element = HTMLDivElement>(
  sequence: AnimationSequence,
  deps: DependencyList = [],
): RefObject<T | null> {
  const [scope, animate] = useAnimate<T>();
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const { elapsed } = useLayer();
  useLayoutEffect(() => {
    const c = animate(sequence);
    c.pause();
    controls.current = c;
    return () => {
      c.stop();
      controls.current = null;
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: the caller names what rebuilds the sequence, as with useEffect.
  }, deps);
  useLayoutEffect(() => {
    if (controls.current) controls.current.time = elapsed;
  });
  return scope as RefObject<T | null>;
}

/** What draws `<Motion>`: its children in a box filling the layer, animated by its `sequence` on the video's clock. */
export function MotionLayer(props: { readonly sequence?: unknown; readonly children?: ReactNode }) {
  const sequence = (props.sequence ?? []) as AnimationSequence;
  // A literal sequence edited in the inspector arrives as a new array with new content: rebuild on content.
  const scope = useTimeline<HTMLDivElement>(sequence, [JSON.stringify(sequence)]);
  return (
    <div ref={scope} style={{ position: "absolute", inset: 0 }}>
      {props.children}
    </div>
  );
}
