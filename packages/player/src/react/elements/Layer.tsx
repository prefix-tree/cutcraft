import type { ReactNode } from "react";
import { layerContent } from "../../overlays/content";
import { dataAttrs, overlayStyle, type ElementProps } from "../../overlays/layout";
import { layerClock } from "../../model/time";
import { LayerContext } from "../context";

/** Arbitrary React inside the composition, driven by `useLayer()` and `useT()` through LayerContext. */
export function Layer(p: ElementProps & { readonly interior: ReactNode }) {
  const comp = p.state.composition;
  const style = overlayStyle(p, { width: comp.width, height: comp.height });
  return (
    <div {...dataAttrs(p.placement)} style={style}>
      <LayerContext.Provider value={layerClock(p.placement, p.time, comp.fps)}>{layerContent(p.interior, p.placement.interior?.props)}</LayerContext.Provider>
    </div>
  );
}
