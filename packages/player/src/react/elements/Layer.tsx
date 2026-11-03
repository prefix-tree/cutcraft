import { useLayoutEffect, useRef, type ReactNode } from "react";
import { layerContent } from "../../overlays/content";
import { dataAttrs, overlayStyle, type ElementProps } from "../../overlays/layout";
import { layerClock } from "../../model/time";
import { LayerContext } from "../context";
import { holdCssAnimations } from "../hold-animations";

/** Arbitrary React inside the composition, driven by `useLayer()` and `useT()` through LayerContext. */
export function Layer(p: ElementProps & { readonly interior: ReactNode }) {
  const comp = p.state.composition;
  const style = overlayStyle(p, { width: comp.width, height: comp.height });
  const clock = layerClock(p.placement, p.time, comp.fps);
  const ref = useRef<HTMLDivElement>(null);
  // Every render, not only when time moves: an interior that mounts new CSS animations must not let them run free.
  useLayoutEffect(() => { holdCssAnimations(ref.current, clock.elapsed); });
  return (
    <div ref={ref} {...dataAttrs(p.placement)} style={style}>
      <LayerContext.Provider value={clock}>{layerContent(p.interior, p.placement.interior?.props)}</LayerContext.Provider>
    </div>
  );
}
