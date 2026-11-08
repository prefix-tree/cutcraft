import type { ReactElement } from "react";
import type { z } from "zod";

import type { EffectParams, TransitionParams } from "../effects/registry";
import { capabilitiesOf } from "./capabilities";
import { defineElement, type VocabularyMeta, type VocabularyProps } from "./define";
import type { TransitionType, VideoEffectType } from "./enums";
import { captionSchema, captionsSchema } from "./schemas/captions";
import { effectSchema, freezeSchema, keyframeSchema, maskSchema, speedKeySchema } from "./schemas/children";
import { compositionSchema, gapSchema, markerSchema, trackSchema } from "./schemas/composition";
import { audioSchema, clipSchema } from "./schemas/media";
import { angleSchema, cutSchema, multicamSchema } from "./schemas/multicam";
import {
  adjustmentSchema,
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
import type { EffectRef, TransitionRef } from "./shaders";

const el = <K extends string, S extends Parameters<typeof defineElement>[0]["schema"]>(kind: K, schema: S) =>
  defineElement({ kind, schema, capabilities: capabilitiesOf(kind) });

export const Composition = el("composition", compositionSchema);
export const Track = el("track", trackSchema);
export const Clip = el("clip", clipSchema);
export const Audio = el("audio", audioSchema);
export const Gap = el("gap", gapSchema);
type TransitionBase = Omit<VocabularyProps<typeof transitionSchema>, "type" | "params">;

/** The params of a transition type: a built-in's, or those of one `transition()` returned. */
export type TransitionParamsOf<T> = T extends TransitionType
  ? TransitionParams<T>
  : T extends TransitionRef<infer P>
    ? z.input<P>
    : never;

/**
 * `<Transition>`: a built-in by its type, with that type's params (crossfade when the type is left out), or one the file
 * declares by what `transition()` returned, with its own params.
 */
export interface TransitionComponent extends VocabularyMeta<"transition", typeof transitionSchema> {
  // biome-ignore lint/suspicious/noExplicitAny: any ref, whatever its params; they are read back by TransitionParamsOf.
  <T extends TransitionType | TransitionRef<any> = "crossfade">(
    props: TransitionBase & { type?: T; params?: TransitionParamsOf<T> },
  ): ReactElement | null;
}

export const Transition = el("transition", transitionSchema) as unknown as TransitionComponent;
export const Title = el("title", titleSchema);
export const Shape = el("shape", shapeSchema);
export const Svg = el("svg", svgSchema);
export const Sticker = el("sticker", stickerSchema);
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

type EffectBase = Omit<VocabularyProps<typeof effectSchema>, "type" | "params">;

/** The params of an effect type: a built-in's, or those of one `effect()` returned. */
export type EffectParamsOf<T> = T extends VideoEffectType
  ? EffectParams<T>
  : T extends EffectRef<infer P>
    ? z.input<P>
    : never;

/**
 * `<Effect>`: a built-in by its type, with that type's params, or one the file declares by what `effect()` returned,
 * with its own params.
 */
export interface EffectComponent extends VocabularyMeta<"effect", typeof effectSchema> {
  // biome-ignore lint/suspicious/noExplicitAny: any ref, whatever its params; they are read back by EffectParamsOf.
  <T extends VideoEffectType | EffectRef<any>>(
    props: EffectBase & { type: T; params?: EffectParamsOf<T> },
  ): ReactElement | null;
}

export const Effect = el("effect", effectSchema) as unknown as EffectComponent;
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
  Keyframe,
  SpeedKey,
  Freeze,
} as const;

export const SCHEMAS_BY_KIND = Object.fromEntries(
  Object.values(ELEMENTS).map((component) => [component.kind, component.schema]),
) as Readonly<Record<string, (typeof ELEMENTS)[keyof typeof ELEMENTS]["schema"]>>;

export type ElementKind = (typeof ELEMENTS)[keyof typeof ELEMENTS]["kind"];
