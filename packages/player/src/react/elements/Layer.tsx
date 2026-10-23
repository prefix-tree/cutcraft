import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { layerClock } from "../../model/time";
import { LayerContext } from "../context";
import { dataAttrs, overlayStyle, type ElementProps } from "./shared";

/** Arbitrary React inside the composition, driven by `useLayer()` and `useT()` through LayerContext. */
export function Layer(p: ElementProps & { readonly interior: ReactNode }) {
  const comp = p.state.composition;
  const style = overlayStyle(p, { width: comp.width, height: comp.height });
  return (
    <div {...dataAttrs(p.placement)} style={style}>
      <LayerContext.Provider value={layerClock(p.placement, p.time, comp.fps)}>{withHandles(p.interior, p.placement.interior?.props)}</LayerContext.Provider>
    </div>
  );
}

/** The interior as written, with the Layer's handles (edited props) applied to its one component. */
function withHandles(interior: ReactNode, props: Readonly<Record<string, unknown>> | undefined): ReactNode {
  if (!props) return interior;
  const only = Children.toArray(interior).filter((c) => c !== null && typeof c !== "boolean" && c !== "");
  const child = only.length === 1 ? only[0] : null;
  return isValidElement(child) ? cloneElement(child, props) : interior;
}
