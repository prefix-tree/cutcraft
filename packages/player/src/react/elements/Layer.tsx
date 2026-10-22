import type { ReactNode } from "react";
import { localT } from "../../model/time";
import { LayerContext } from "../context";
import { dataAttrs, overlayStyle, type ElementProps } from "./shared";

/** Arbitrary React inside the composition, driven by `useT()` through LayerContext. */
export function Layer(p: ElementProps & { readonly interior: ReactNode }) {
  const comp = p.state.composition;
  const style = overlayStyle(p, { width: comp.width, height: comp.height });
  return (
    <div {...dataAttrs(p.placement)} style={style}>
      <LayerContext.Provider value={localT(p.placement, p.time)}>{p.interior}</LayerContext.Provider>
    </div>
  );
}
