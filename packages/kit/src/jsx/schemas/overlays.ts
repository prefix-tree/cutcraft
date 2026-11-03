import { GRAPHIC_KINDS, GRAPHIC_KIND_NAMES } from "@cutcraft/graphics";
import { z } from "zod";
import { zBlendMode, zShapeType, zTextAnimationPreset } from "../enums";
import { zAnimationUnit, zSvgColorMode, zTextAlign, zTextDecoration, zTextValign } from "./enums-local";
import {
  assetRefSchema,
  colorSchema,
  entranceProps,
  gradientSchema,
  idSchema,
  shadowSchema,
  timedProps,
  timeRefSchema,
  themedLengthSchema,
  transformSchema,
  vec2Schema,
  visualProps,
} from "./common";

export const textAnimationSchema = z.strictObject({
  preset: zTextAnimationPreset,
  in: z.number().nonnegative().default(0.5),
  out: z.number().nonnegative().default(0.5),
  stagger: z.number().nonnegative().optional(),
  unit: zAnimationUnit.optional(),
  params: z
    .record(
      z.string(),
      z.union([z.number(), z.string(), z.boolean(), z.strictObject({ start: z.number(), end: z.number() })]),
    )
    .optional(),
});

export const text3dSchema = z.strictObject({
  enabled: z.boolean().default(true),
  depth: z.number().nonnegative().default(10),
  bevelThickness: z.number().nonnegative().optional(),
  bevelSize: z.number().nonnegative().optional(),
  bevelSegments: z.number().int().nonnegative().optional(),
  frontColor: colorSchema.optional(),
  sideColor: colorSchema.optional(),
  metalness: z.number().min(0).max(1).optional(),
  roughness: z.number().min(0).max(1).optional(),
  material: z.enum(["basic", "physical"]).optional(),
});

export const titleSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  ...entranceProps,
  /** A theme preset for titles; without one, the theme's `default` title preset applies. */
  style: idSchema.optional(),
  font: z.string().default("Inter"),
  size: z.number().min(1).max(1000).default(48),
  weight: z.union([z.number().int().min(100).max(900).multipleOf(100), z.enum(["normal", "bold"])]).default("bold"),
  italic: z.boolean().default(false),
  color: colorSchema.default("#ffffff"),
  background: colorSchema.optional(),
  stroke: z.strictObject({ color: colorSchema, width: z.number().min(0).max(100) }).optional(),
  shadow: shadowSchema.optional(),
  align: zTextAlign.default("center"),
  valign: zTextValign.default("middle"),
  /** The text box, in composition pixels; the whole frame when left out, so background, align and valign work inside it. */
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  lineHeight: z.number().min(0.1).max(10).default(1.2),
  letterSpacing: z.number().min(-100).max(100).default(0),
  decoration: zTextDecoration.optional(),
  animation: textAnimationSchema.optional(),
  text3d: text3dSchema.optional(),
  behindSubject: z.boolean().default(false),
});

const fillSchema = z.union([
  colorSchema,
  z.strictObject({
    type: z.enum(["solid", "gradient", "none"]),
    color: colorSchema.optional(),
    gradient: gradientSchema.optional(),
    opacity: z.number().min(0).max(1).optional(),
  }),
]);

const strokeSchema = z.strictObject({
  color: colorSchema,
  width: z.number().nonnegative(),
  opacity: z.number().min(0).max(1).optional(),
  dashArray: z.array(z.number().nonnegative()).optional(),
  dashOffset: z.number().optional(),
  lineCap: z.enum(["butt", "round", "square"]).optional(),
  lineJoin: z.enum(["miter", "round", "bevel"]).optional(),
  gradient: gradientSchema.optional(),
});

export const shapeSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  ...entranceProps,
  /** A theme preset for shapes. */
  style: idSchema.optional(),
  shape: zShapeType,
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  points: z.array(vec2Schema).optional(),
  fill: fillSchema.optional(),
  stroke: strokeSchema.optional(),
  shadow: shadowSchema.optional(),
  shadows: z.array(shadowSchema).optional(),
  cornerRadius: themedLengthSchema.optional(),
  cornerRadii: z
    .strictObject({ topLeft: z.number(), topRight: z.number(), bottomRight: z.number(), bottomLeft: z.number() })
    .optional(),
  starPoints: z.number().int().min(3).optional(),
  innerRadius: z.number().min(0).max(1).optional(),
});

export const svgSchema = z
  .strictObject({
    ...timedProps,
    ...visualProps,
    /** A theme preset for svg elements. */
    style: idSchema.optional(),
    src: assetRefSchema.optional(),
    content: z.string().optional(),
    viewBox: z
      .strictObject({ minX: z.number(), minY: z.number(), width: z.number().positive(), height: z.number().positive() })
      .optional(),
    preserveAspectRatio: z.string().optional(),
    color: z
      .strictObject({ mode: zSvgColorMode, tint: colorSchema.optional(), opacity: z.number().min(0).max(1).optional() })
      .optional(),
    ...entranceProps,
  })
  .refine((v) => Boolean(v.src) !== Boolean(v.content), { message: "Svg takes either src or content" });

const graphicBase = {
  ...timedProps,
  ...visualProps,
  ...entranceProps,
  /** A theme preset for graphics. */
  style: idSchema.optional(),
  /** The box, in composition pixels; each kind has a size of its own when these are left out. */
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
};

type Kinds = typeof GRAPHIC_KINDS;
type KindShape<K extends keyof Kinds> = Kinds[K]["shape"] extends infer S extends z.ZodRawShape ? S : never;
type GraphicVariant<K extends keyof Kinds> = z.ZodObject<
  typeof graphicBase & { kind: z.ZodLiteral<K> } & KindShape<K>,
  z.core.$strict
>;
type GraphicVariants = { [K in keyof Kinds]: GraphicVariant<K> }[keyof Kinds];

/** `<Graphic kind>`: the props every graphic takes, and the kind's own (see `@cutcraft/graphics`). */
export const graphicSchema = z.discriminatedUnion(
  "kind",
  GRAPHIC_KIND_NAMES.map((k) =>
    z.strictObject({ ...graphicBase, kind: z.literal(k), ...GRAPHIC_KINDS[k].shape }),
  ) as unknown as [GraphicVariants, ...GraphicVariants[]],
);

export const stickerSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  ...entranceProps,
  /** A theme preset for stickers. */
  style: idSchema.optional(),
  src: z.string().min(1),
  category: z.string().optional(),
  name: z.string().optional(),
});

export const adjustmentSchema = z.strictObject({
  ...timedProps,
  affects: z.union([z.literal("all"), z.array(idSchema).min(1)]).default("all"),
  opacity: z.number().min(0).max(1).default(1),
  blend: zBlendMode.default("normal"),
  enabled: z.boolean().default(true),
  transform: transformSchema.optional(),
});

export const nestedSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  /** A pure helper component returning tracks, or a file reference. Validated at collect time. */
  of: z.union([
    z.custom<(props: Record<string, unknown>) => unknown>((v) => typeof v === "function"),
    z.string().startsWith("file:"),
  ]),
  in: timeRefSchema.optional(),
  out: timeRefSchema.optional(),
  volume: z.number().min(0).max(4).default(1),
});

export const layerSchema = z.strictObject({
  ...timedProps,
  ...entranceProps,
  transform: transformSchema.optional(),
  blend: zBlendMode.optional(),
});

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

// biome-ignore-start lint/suspicious/noExplicitAny: the kit does not depend on three; its objects are any here so pasted three.js type-checks.
/** What `<Three setup>` gets once: the scene, its camera and renderer, and the three.js namespace. */
export interface ThreeSetupArgs {
  readonly scene: any;
  readonly camera: any;
  readonly renderer: any;
  readonly THREE: any;
  /** The canvas size in composition pixels. */
  readonly width: number;
  readonly height: number;
}
// biome-ignore-end lint/suspicious/noExplicitAny: end of the three.js setup types.

/** What the update `setup` returns gets on every frame: `time` is seconds since the layer started. */
export interface ThreeFrameArgs extends ThreeSetupArgs {
  readonly time: number;
  /** 0..1 through the layer. */
  readonly t: number;
  readonly duration: number;
  /** Seconds since the previous frame drawn; negative after a scrub back. Prefer `time`. */
  readonly delta: number;
}

type ThreeFrameUpdate = (frame: ThreeFrameArgs) => void;
// biome-ignore lint/suspicious/noConfusingVoidType: a setup may return nothing; `void` lets one without a return statement type-check.
type ThreeSetupResult = ThreeFrameUpdate | { update?: ThreeFrameUpdate; dispose?: () => void } | void;
export type ThreeSetupFunction = (setup: ThreeSetupArgs) => ThreeSetupResult;

/**
 * `<Three>`: a Layer that holds a three.js scene. `setup` takes `{ scene, camera, renderer, THREE, width, height }`
 * once and may return `update(frame)`, called on every frame with the layer's time; JSX children are React Three
 * Fiber. The camera and background are literal props, so the inspector edits them.
 */
export const threeSchema = layerSchema.extend({
  engine: z.literal("three"),
  camera: z
    .strictObject({
      position: vec3Schema.optional(),
      lookAt: vec3Schema.optional(),
      fov: z.number().min(1).max(179).optional(),
      near: z.number().positive().optional(),
      far: z.number().positive().optional(),
      zoom: z.number().positive().optional(),
      orthographic: z.boolean().optional(),
    })
    .optional(),
  background: colorSchema.optional(),
  setup: z.custom<ThreeSetupFunction>((v) => typeof v === "function", "setup must be a function").optional(),
});

/** One step of a Motion sequence: a selector inside the tag, its keyframes, and options (`duration`, `at`, `ease`…). */
const motionStepSchema = z.union([
  z.tuple([z.string(), z.record(z.string(), z.unknown())]),
  z.tuple([z.string(), z.record(z.string(), z.unknown()), z.record(z.string(), z.unknown())]),
]);

/** `<Motion>`: a Layer whose children are animated by a Motion sequence on the video's clock. */
export const motionSchema = layerSchema.extend({
  engine: z.literal("motion"),
  sequence: z.array(motionStepSchema).default([]),
});
