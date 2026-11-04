import { capabilitiesOf } from "./capabilities";
import { defineElement } from "./define";
import { captionSchema, captionsSchema } from "./schemas/captions";
import {
  audioEffectSchema,
  colorGradeSchema,
  effectSchema,
  freezeSchema,
  keyframeSchema,
  maskSchema,
  speedKeySchema,
} from "./schemas/children";
import { compositionSchema, gapSchema, markerSchema, trackSchema } from "./schemas/composition";
import { audioSchema, clipSchema } from "./schemas/media";
import { angleSchema, cutSchema, multicamSchema } from "./schemas/multicam";
import {
  adjustmentSchema,
  graphicSchema,
  layerSchema,
  motionSchema,
  nestedSchema,
  shapeSchema,
  stickerSchema,
  svgSchema,
  threeSchema,
  titleSchema,
} from "./schemas/overlays";
import { transitionSchema } from "./schemas/transition";

const el = <K extends string, S extends Parameters<typeof defineElement>[0]["schema"]>(kind: K, schema: S) =>
  defineElement({ kind, schema, capabilities: capabilitiesOf(kind) });

export const Composition = el("composition", compositionSchema);
export const Track = el("track", trackSchema);
export const Clip = el("clip", clipSchema);
export const Audio = el("audio", audioSchema);
export const Gap = el("gap", gapSchema);
export const Transition = el("transition", transitionSchema);
export const Title = el("title", titleSchema);
export const Shape = el("shape", shapeSchema);
export const Svg = el("svg", svgSchema);
export const Sticker = el("sticker", stickerSchema);
/**
 * @deprecated `<Graphic kind>` will be removed. Draw it with `<Motion>`, `<Three>` or a `<Layer>`; the showcase examples
 * show each (decision 0020).
 */
export const Graphic = el("graphic", graphicSchema);
export const Captions = el("captions", captionsSchema);
export const Caption = el("caption", captionSchema);
export const Marker = el("marker", markerSchema);
export const Adjustment = el("adjustment", adjustmentSchema);
export const Mask = el("mask", maskSchema);
export const Nested = el("nested", nestedSchema);
export const Multicam = el("multicam", multicamSchema);
export const Angle = el("angle", angleSchema);
export const Cut = el("cut", cutSchema);
export const Layer = el("layer", layerSchema);
/**
 * A Layer drawn by a library: kind `layer` to the resolver, the timeline and the editor, with props of its own and
 * an `engine` the Player looks up among the installed layer engines (`installLayerEngine`).
 */
const engineLayer = <E extends string, S extends Parameters<typeof defineElement>[0]["schema"]>(
  engine: E,
  schema: S,
) => {
  const component = defineElement({ kind: "layer", schema, capabilities: capabilitiesOf("layer") });
  Object.defineProperty(component, "engine", { value: engine, enumerable: true });
  return component as typeof component & { readonly engine: E };
};

/** A three.js scene on the timeline: `setup` for plain three.js, or React Three Fiber children. */
export const Three = engineLayer("three", threeSchema.omit({ engine: true }));
/** Children animated by a Motion `sequence` on the video's clock. */
export const Motion = engineLayer("motion", motionSchema.omit({ engine: true }));

/** The engine Layers by tag, and the schema each is checked against once collected (with its `engine`). */
export const ENGINE_LAYERS = { Three, Motion } as const;
export const ENGINE_SCHEMAS: Readonly<Record<string, typeof threeSchema | typeof motionSchema>> = {
  three: threeSchema,
  motion: motionSchema,
};

/** The engine a vocabulary component draws with, if it is an engine Layer. */
export function engineOf(type: unknown): string | null {
  const engine = (type as { engine?: unknown } | null)?.engine;
  return typeof engine === "string" ? engine : null;
}

export const Effect = el("effect", effectSchema);
export const AudioEffect = el("audioEffect", audioEffectSchema);
export const ColorGrade = el("colorGrade", colorGradeSchema);
export const Keyframe = el("keyframe", keyframeSchema);
export const SpeedKey = el("speedKey", speedKeySchema);
export const Freeze = el("freeze", freezeSchema);

export const ELEMENTS = {
  Composition,
  Track,
  Clip,
  Audio,
  Gap,
  Transition,
  Title,
  Shape,
  Svg,
  Sticker,
  Graphic,
  Captions,
  Caption,
  Marker,
  Adjustment,
  Mask,
  Nested,
  Multicam,
  Angle,
  Cut,
  Layer,
  Effect,
  AudioEffect,
  ColorGrade,
  Keyframe,
  SpeedKey,
  Freeze,
} as const;

export const SCHEMAS_BY_KIND = Object.fromEntries(
  Object.values(ELEMENTS).map((component) => [component.kind, component.schema]),
) as Readonly<Record<string, (typeof ELEMENTS)[keyof typeof ELEMENTS]["schema"]>>;

export type ElementKind = (typeof ELEMENTS)[keyof typeof ELEMENTS]["kind"];
