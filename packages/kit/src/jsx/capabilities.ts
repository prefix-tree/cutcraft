import type { ElementCapabilities } from "./define";

const none: ElementCapabilities = {
  timed: false,
  visual: false,
  audio: false,
  trimSource: false,
  transformable: false,
  container: false,
  childKinds: [],
  placementScope: "none",
};

const with_ = (over: Partial<ElementCapabilities>): ElementCapabilities => ({ ...none, ...over });

const CLIP_CHILDREN = ["effect", "keyframe", "mask", "speedKey", "freeze"] as const;
const OVERLAY_CHILDREN = ["effect", "keyframe", "mask"] as const;

/**
 * What each element kind can do. Ported from OpenReel's timeline-items table,
 * keyed by kind instead of by instance; media clips resolve `visual`/`audio`
 * from the asset manifest at resolve time (see resolve/placement.ts).
 */
export const KIND_CAPABILITIES: Readonly<Record<string, ElementCapabilities>> = {
  composition: with_({
    container: true,
    childKinds: ["track", "marker", "multicam", "captions"],
    placementScope: "none",
  }),
  track: with_({
    container: true,
    placementScope: "composition",
    childKinds: [
      "clip",
      "audio",
      "gap",
      "transition",
      "title",
      "shape",
      "svg",
      "sticker",
      "adjustment",
      "nested",
      "layer",
      "multicam",
    ],
  }),
  clip: with_({
    timed: true,
    visual: true,
    audio: true,
    trimSource: true,
    transformable: true,
    container: true,
    childKinds: CLIP_CHILDREN,
    placementScope: "track",
  }),
  audio: with_({
    timed: true,
    audio: true,
    trimSource: true,
    container: true,
    childKinds: ["keyframe"],
    placementScope: "track",
  }),
  gap: with_({ timed: true, placementScope: "track" }),
  transition: with_({ timed: true, visual: true, placementScope: "track" }),
  title: with_({
    timed: true,
    visual: true,
    transformable: true,
    container: true,
    childKinds: OVERLAY_CHILDREN,
    placementScope: "track",
  }),
  shape: with_({
    timed: true,
    visual: true,
    transformable: true,
    container: true,
    childKinds: OVERLAY_CHILDREN,
    placementScope: "track",
  }),
  svg: with_({
    timed: true,
    visual: true,
    transformable: true,
    container: true,
    childKinds: OVERLAY_CHILDREN,
    placementScope: "track",
  }),
  sticker: with_({
    timed: true,
    visual: true,
    transformable: true,
    container: true,
    childKinds: OVERLAY_CHILDREN,
    placementScope: "track",
  }),
  captions: with_({ visual: true, container: true, childKinds: ["caption"], placementScope: "composition" }),
  caption: with_({ timed: true, visual: true, placementScope: "child" }),
  marker: with_({ placementScope: "composition" }),
  adjustment: with_({
    timed: true,
    visual: true,
    trimSource: true,
    container: true,
    childKinds: ["effect", "keyframe"],
    placementScope: "track",
  }),
  mask: with_({ container: true, childKinds: ["keyframe"], placementScope: "child" }),
  nested: with_({
    timed: true,
    visual: true,
    audio: true,
    trimSource: true,
    transformable: true,
    container: true,
    childKinds: CLIP_CHILDREN,
    placementScope: "track",
  }),
  multicam: with_({ container: true, childKinds: ["angle", "cut"], placementScope: "composition" }),
  angle: with_({ placementScope: "child" }),
  cut: with_({ placementScope: "child" }),
  layer: with_({
    timed: true,
    visual: true,
    transformable: true,
    container: true,
    childKinds: ["effect", "keyframe"],
    placementScope: "track",
  }),
  effect: with_({ container: true, childKinds: ["keyframe"], placementScope: "child" }),
  keyframe: with_({ placementScope: "child" }),
  speedKey: with_({ placementScope: "child" }),
  freeze: with_({ placementScope: "child" }),
};

export function capabilitiesOf(kind: string): ElementCapabilities {
  return KIND_CAPABILITIES[kind] ?? none;
}
