import type { ResolvedState } from "@cut/kit";
import { memo, type ReactNode } from "react";
import { frameIndex } from "../model/time";
import { visiblePlacements, type VisibleItem } from "../model/visible";
import { Adjustment } from "./elements/Adjustment";
import { Captions } from "./elements/Captions";
import { Layer } from "./elements/Layer";
import { Shape } from "./elements/Shape";
import type { ElementProps } from "./elements/shared";
import { Sticker } from "./elements/Sticker";
import { Svg } from "./elements/Svg";
import { Title } from "./elements/Title";
import { useCompositionTime } from "./hooks";

const DOM_KINDS = new Set(["title", "shape", "svg", "sticker", "layer", "adjustment"]);

export interface DomLayerProps {
  readonly state: ResolvedState;
  readonly interiors: ReadonlyMap<string, ReactNode>;
}

/** Overlay elements as DOM, one absolutely positioned group per track in compositing order, above the canvas. */
export function DomLayer({ state, interiors }: DomLayerProps) {
  const time = useCompositionTime();
  const items = visiblePlacements(state, time).filter((v) => DOM_KINDS.has(v.placement.kind));
  const byTrack = new Map<string, VisibleItem[]>();
  for (const item of items) {
    const list = byTrack.get(item.track.id) ?? [];
    list.push(item);
    byTrack.set(item.track.id, list);
  }
  const captions = [...state.items.values()].filter((p) => p.kind === "captions");
  return (
    <>
      {state.tracks.map((track) => {
        const list = byTrack.get(track.id);
        if (!list) return null;
        return (
          <div key={track.id} data-track={track.id} style={{ position: "absolute", inset: 0, zIndex: track.order + 1, pointerEvents: "none" }}>
            {list.map((item) => <Element key={item.placement.id} item={item} state={state} time={time} interior={interiors.get(item.placement.id)} />)}
          </div>
        );
      })}
      {captions.map((c) => (
        <div key={c.id} style={{ position: "absolute", inset: 0, zIndex: state.tracks.length + 1, pointerEvents: "none" }}>
          <Captions placement={c} state={state} time={time} />
        </div>
      ))}
    </>
  );
}

interface ElementCellProps { item: VisibleItem; state: ResolvedState; time: number; interior: ReactNode }

/** Re-renders only when the element's own relative frame or placement changes. */
const Element = memo(
  function Element({ item, state, time, interior }: ElementCellProps) {
    const t = item.transition;
    const transitionOpacity = t ? (t.role === "out" ? 1 - t.progress : t.progress) : 1;
    const props: ElementProps = { placement: item.placement, children: item.children, state, time, transitionOpacity };
    switch (item.placement.kind) {
      case "title": return <Title {...props} />;
      case "shape": return <Shape {...props} />;
      case "svg": return <Svg {...props} />;
      case "sticker": return <Sticker {...props} />;
      case "layer": return <Layer {...props} interior={interior} />;
      case "adjustment": return <Adjustment {...props} />;
      default: return null;
    }
  },
  (a, b) => a.item.placement === b.item.placement && a.state === b.state && a.interior === b.interior && sameFrame(a, b),
);

function sameFrame(a: ElementCellProps, b: ElementCellProps): boolean {
  const fps = a.state.composition.fps;
  if (frameIndex(a.time - a.item.placement.start, fps) !== frameIndex(b.time - b.item.placement.start, fps)) return false;
  return (a.item.transition?.progress ?? -1) === (b.item.transition?.progress ?? -1);
}

