import { type ReactNode, useLayoutEffect, useRef } from "react";

import { layerEngine } from "@cutcraft/kit";

import { layerClock } from "../../model/time";
import { layerContent } from "../../overlays/content";
import { dataAttrs, type ElementProps, overlayStyle } from "../../overlays/layout";
import { devWarn } from "../../warn";
import { LayerContext } from "../context";
import { holdCssAnimations } from "../hold-animations";

/** Arbitrary React inside the composition, driven by `useLayer()` and `useT()` through LayerContext. */
export function Layer(p: ElementProps & { readonly interior: ReactNode }) {
  const comp = p.state.composition;
  const style = overlayStyle(p, { width: comp.width, height: comp.height });
  const clock = layerClock(p.placement, p.time, comp.fps);
  const ref = useRef<HTMLDivElement>(null);
  // Every render, not only when time moves: an interior that mounts new CSS animations must not let them run free.
  useLayoutEffect(() => {
    holdCssAnimations(ref.current, clock.elapsed);
  });
  return (
    <div ref={ref} {...dataAttrs(p.placement)} style={style}>
      <LayerContext.Provider value={clock}>
        {typeof p.placement.props.engine === "string" ? (
          <Engine name={p.placement.props.engine} props={p.placement.props}>
            {p.interior}
          </Engine>
        ) : (
          layerContent(p.interior, p.placement.interior?.props)
        )}
      </LayerContext.Provider>
    </div>
  );
}

/** An engine Layer (`<Three>`, `<Motion>`): drawn by the engine the host installed, with the Layer's resolved props. */
function Engine({
  name,
  props,
  children,
}: {
  readonly name: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: ReactNode;
}) {
  const Draw = layerEngine(name);
  if (!Draw) {
    devWarn(
      `engine:${name}`,
      `no layer engine "${name}" is installed, so <${name === "three" ? "Three" : name === "motion" ? "Motion" : name}> draws nothing; the host installs it (installFreeCodeLibraries from @cutcraft/libraries)`,
    );
    return null;
  }
  return <Draw {...props}>{children}</Draw>;
}
