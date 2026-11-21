import type { ReactElement } from "react";
import type { z } from "zod";

import type { EffectParams, TransitionParams } from "../effects/registry";
import { capabilitiesOf } from "./capabilities";
import { defineElement, type VocabularyComponent, type VocabularyMeta, type VocabularyProps } from "./define";
import type { Easing, TransitionType, VideoEffectType } from "./enums";
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
export const Clip = el("clip", clipSchema) as unknown as WithEffects<VocabularyComponent<"clip", typeof clipSchema>>;
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
export const Title = el("title", titleSchema) as unknown as WithEffects<
  VocabularyComponent<"title", typeof titleSchema>
>;
export const Shape = el("shape", shapeSchema) as unknown as WithEffects<
  VocabularyComponent<"shape", typeof shapeSchema>
>;
export const Svg = el("svg", svgSchema) as unknown as WithEffects<VocabularyComponent<"svg", typeof svgSchema>>;
export const Sticker = el("sticker", stickerSchema) as unknown as WithEffects<
  VocabularyComponent<"sticker", typeof stickerSchema>
>;
export const Captions = el("captions", captionsSchema);
export const Caption = el("caption", captionSchema);
export const Marker = el("marker", markerSchema);
export const Adjustment = el("adjustment", adjustmentSchema) as unknown as WithEffects<
  VocabularyComponent<"adjustment", typeof adjustmentSchema>
>;
export const Mask = el("mask", maskSchema);
export const Nested = el("nested", nestedSchema) as unknown as WithEffects<
  VocabularyComponent<"nested", typeof nestedSchema>
>;
export const Multicam = el("multicam", multicamSchema);
export const Angle = el("angle", angleSchema);
export const Cut = el("cut", cutSchema);
export const Layer = el("layer", layerSchema) as unknown as WithEffects<
  VocabularyComponent<"layer", typeof layerSchema>
>;
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
const threeLayer = engineLayer("three", threeSchema.omit({ engine: true }));
export const Three = threeLayer as unknown as WithEffects<typeof threeLayer> & { readonly engine: "three" };
/** Children animated by a Motion `sequence` on the video's clock. */
const motionLayer = engineLayer("motion", motionSchema.omit({ engine: true }));
export const Motion = motionLayer as unknown as WithEffects<typeof motionLayer> & { readonly engine: "motion" };

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

/** The params of an effect type: a built-in's, or those of one `effect()` returned. */
export type EffectParamsOf<T> = T extends VideoEffectType
  ? EffectParams<T>
  : T extends EffectRef<infer P>
    ? z.input<P>
    : never;

/** One key of a value that changes over time. */
export interface Key<V> {
  readonly at: number;
  readonly value: V;
  readonly easing?: Easing;
}

/** A value written as a constant, or as keys over time. */
export type Animatable<V> = V | readonly Key<V>[];

/** One entry of an element's `effects`: its type, then each of that type's params, a constant or keys. */
export type EffectSpec<T> = { readonly type: T; readonly enabled?: boolean } & (string extends keyof EffectParamsOf<T>
  ? // An effect that declares no params takes none.
    unknown
  : { readonly [P in keyof EffectParamsOf<T>]?: Animatable<EffectParamsOf<T>[P]> });

/** Any effect a file may write: a built-in by name, or one the file declares. */
// biome-ignore lint/suspicious/noExplicitAny: any declared effect, whatever its params; read back by EffectParamsOf.
export type AnyEffectSpec = { [T in VideoEffectType]: EffectSpec<T> }[VideoEffectType] | EffectSpec<EffectRef<any>>;

/**
 * Each entry of an `effects` list checked against its own type: a built-in's params, or those of the `effect()` it
 * names. The list is read as a tuple, so a declared effect's params are its own, not any effect's.
 */
export type CheckedEffects<A extends readonly unknown[]> = {
  readonly [I in keyof A]: A[I] extends { readonly type: infer T }
    ? // biome-ignore lint/suspicious/noExplicitAny: any declared effect; its own params are read back by EffectParamsOf.
      T extends VideoEffectType | EffectRef<any>
      ? EffectSpec<T> & { readonly [P in Exclude<keyof A[I], keyof EffectSpec<T>>]: never }
      : AnyEffectSpec
    : AnyEffectSpec;
};

/** An element whose `effects` prop is typed per effect, so a wrong param name is a type error. */
type WithEffects<C> =
  C extends VocabularyComponent<infer K, infer S>
    ? VocabularyMeta<K, S> &
        (<const A extends readonly AnyEffectSpec[] = readonly []>(
          props: Omit<VocabularyProps<S>, "effects"> & { effects?: A & CheckedEffects<A> },
        ) => ReactElement | null)
    : never;

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
} as const;

/**
 * The resolver's own item kinds: what it makes of the `effects`, key lists, `speed` keys and `freezes` a file writes
 * as props (`expandKeys` in the SDK). No file writes them as elements.
 */
export const DERIVED_SCHEMAS = {
  effect: effectSchema,
  keyframe: keyframeSchema,
  speedKey: speedKeySchema,
  freeze: freezeSchema,
} as const;
export type DerivedKind = keyof typeof DERIVED_SCHEMAS;
export const DERIVED_KINDS: ReadonlySet<string> = new Set(Object.keys(DERIVED_SCHEMAS));

export const SCHEMAS_BY_KIND = {
  ...Object.fromEntries(Object.values(ELEMENTS).map((component) => [component.kind, component.schema])),
  ...DERIVED_SCHEMAS,
} as Readonly<Record<string, z.ZodType>>;

export type ElementKind = (typeof ELEMENTS)[keyof typeof ELEMENTS]["kind"];
