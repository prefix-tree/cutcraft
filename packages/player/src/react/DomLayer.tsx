import { memo, type ReactNode } from "react";

import { effectEntry, type Placement, type ResolvedState } from "@cutcraft/kit";

import { backdropTracks } from "../model/backdrop";
import { effectPipeline } from "../model/shaders";
import { frameIndex } from "../model/time";
import { type VisibleItem, visiblePlacements } from "../model/visible";
import { type ElementProps, OVERLAY_KINDS } from "../overlays/layout";
import { devWarn } from "../warn";
import { Adjustment } from "./elements/Adjustment";
import { Captions } from "./elements/Captions";
import { Layer } from "./elements/Layer";
import { Shape } from "./elements/Shape";
import { Sticker } from "./elements/Sticker";
import { Svg } from "./elements/Svg";
import { Title } from "./elements/Title";
import { useCompositionTime, usePlayer } from "./hooks";
import { htmlInCanvas } from "./html-in-canvas";
import { ShaderBox } from "./ShaderBox";

export interface DomLayerProps {
  readonly state: ResolvedState;
  readonly interiors: ReadonlyMap<string, ReactNode>;
  /** Which overlays: those beneath the footage (`backdropTracks`), or the rest and the captions (default). */
  readonly layer?: "backdrop" | "front";
}

/** Overlay elements as DOM, one absolutely positioned group per track in compositing order, above the canvas (or, for the backdrop, below it). */
export function DomLayer({ state, interiors, layer = "front" }: DomLayerProps) {
  const time = useCompositionTime();
  const exact = usePlayer().exactTime;
  const items = visiblePlacements(state, time).filter((v) => OVERLAY_KINDS.has(v.placement.kind));
  const byTrack = new Map<string, VisibleItem[]>();
  for (const item of items) {
    const list = byTrack.get(item.track.id) ?? [];
    list.push(item);
    byTrack.set(item.track.id, list);
  }
  const backdrop = backdropTracks(state);
  const tracks = state.tracks.filter((t) => backdrop.has(t.id) === (layer === "backdrop"));
  const captions = layer === "front" ? [...state.items.values()].filter((p) => p.kind === "captions") : [];
  return (
    <>
      {tracks.map((track) => {
        const list = byTrack.get(track.id);
        if (!list) return null;
        return (
          <div
            key={track.id}
            data-track={track.id}
            style={{ position: "absolute", inset: 0, zIndex: track.order + 1, pointerEvents: "none" }}
          >
            {list.map((item) => (
              <Element
                key={item.placement.id}
                item={item}
                state={state}
                time={time}
                exact={exact}
                interior={interiors.get(item.placement.id)}
              />
            ))}
          </div>
        );
      })}
      {captions.map((c) => (
        <div
          key={c.id}
          style={{ position: "absolute", inset: 0, zIndex: state.tracks.length + 1, pointerEvents: "none" }}
        >
          <Captions placement={c} state={state} time={time} />
        </div>
      ))}
    </>
  );
}

export interface ElementCellProps {
  item: VisibleItem;
  state: ResolvedState;
  time: number;
  interior: ReactNode;
  /** Re-render for any change of time, not only a new frame (the player's `exactTime`). */
  exact?: boolean;
}

/** Re-renders only when the element's own relative frame or placement changes. */
const Element = memo(
  function Element({ item, state, time, interior }: ElementCellProps) {
    const props: ElementProps = {
      placement: item.placement,
      children: item.children,
      state,
      time,
      transition: item.transition,
    };
    const content = elementContent(item, props, state, interior);
    if (item.placement.kind !== "adjustment") warnPostOnOverlay(item.placement.id, item.children);
    // An overlay's effects run in file order over its picture, drawn through HTML-in-Canvas. Without HTML-in-Canvas
    // they draw as CSS (overlays/layout.ts), and only the ones with no CSS form are left here, to be reported.
    const passes =
      item.placement.kind === "adjustment"
        ? undefined
        : effectPipeline(state, item.children, item.placement.id, time - item.placement.start, {
            shaders: htmlInCanvas(),
          }).shaders;
    // The box stays for as long as the element has an effect a shader draws, also at a moment when that effect
    // changes nothing and has no pass: taking the box away and putting it back would make the overlay's content
    // anew each time, and a three.js scene would be set up again in the middle of the video.
    if (!content || !passes || (passes.length === 0 && !hasShaderEffect(item.children))) return content;
    const { width, height } = state.composition;
    return (
      <ShaderBox id={item.placement.id} width={width} height={height} passes={passes}>
        {content}
      </ShaderBox>
    );
  },
  (a, b) => sameElement(a, b),
);

/** Whether an element has an enabled effect that is drawn by a shader: a built-in one, or one the file declares. */
function hasShaderEffect(children: readonly Placement[]): boolean {
  if (!htmlInCanvas()) return false;
  return children.some(
    (c) =>
      c.kind === "effect" &&
      c.props.enabled !== false &&
      (typeof c.props.type !== "string" || effectEntry(c.props.type)?.draw.kind === "shader"),
  );
}

/** Vignette and grain are painted on the canvas; an overlay has no pass for them yet, so the preview says so once. */
function warnPostOnOverlay(id: string, children: readonly Placement[]): void {
  for (const c of children) {
    if (c.kind !== "effect" || c.props.enabled === false || effectEntry(c.props.type)?.draw.kind !== "post") continue;
    const type = String(c.props.type);
    devWarn(
      `effect:${id}:${type}`,
      `effect "${type}" on overlay "${id}" is not drawn: put it on a clip or an <Adjustment>`,
    );
  }
}

function elementContent(item: VisibleItem, props: ElementProps, state: ResolvedState, interior: ReactNode): ReactNode {
  switch (item.placement.kind) {
    case "title":
      return <Title {...props} text={state.tree.byId.get(item.placement.id)?.text ?? ""} />;
    case "shape":
      return <Shape {...props} />;
    case "svg":
      return <Svg {...props} />;
    case "sticker":
      return <Sticker {...props} />;
    case "layer":
      return <Layer {...props} interior={interior} />;
    case "adjustment":
      return <Adjustment {...props} />;
    default:
      return null;
  }
}

/**
 * Whether two renders of an overlay would produce the same DOM. Placements
 * are new objects on every resolve, so compare what matters: timing, the
 * parsed props (referentially stable while untouched), children, the
 * element-relative frame, the transition progress, the text and the
 * composition box.
 */
export function sameElement(a: ElementCellProps, b: ElementCellProps): boolean {
  const p = a.item.placement,
    q = b.item.placement;
  // The resolver hands back the same Placement object when nothing about it changed.
  if (
    p !== q &&
    (p.id !== q.id ||
      p.kind !== q.kind ||
      p.start !== q.start ||
      p.end !== q.end ||
      p.props !== q.props ||
      p.interior !== q.interior)
  )
    return false;
  if (a.interior !== b.interior) return false;
  if (
    a.item.children.length !== b.item.children.length ||
    a.item.children.some(
      (c, i) =>
        c !== b.item.children[i] && (c.props !== b.item.children[i]!.props || c.start !== b.item.children[i]!.start),
    )
  )
    return false;
  const ca = a.state.composition,
    cb = b.state.composition;
  if (ca.width !== cb.width || ca.height !== cb.height || ca.fps !== cb.fps) return false;
  if (p.kind === "title" && a.state.tree.byId.get(p.id)?.text !== b.state.tree.byId.get(p.id)?.text) return false;
  if (
    a.exact || b.exact
      ? a.time - p.start !== b.time - q.start
      : frameIndex(a.time - p.start, ca.fps) !== frameIndex(b.time - q.start, cb.fps)
  )
    return false;
  return (a.item.transition?.progress ?? -1) === (b.item.transition?.progress ?? -1);
}
