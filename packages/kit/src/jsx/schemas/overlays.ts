import { z } from "zod";

import { zBlendMode, zShapeType, zTextAnimationType } from "../enums";
import {
  assetRefSchema,
  colorSchema,
  entranceProps,
  fitProp,
  fontWeightSchema,
  gradientSchema,
  idSchema,
  overlayProps,
  placedProps,
  shadowSchema,
  textShadowSchema,
  themedLengthSchema,
  timedProps,
  timeRefSchema,
  vec2Schema,
  visualProps,
} from "./common";
import { zSvgColorType, zTextAlign, zTextDecoration, zTextValign } from "./enums-local";

const textAnimationSchema = z.strictObject({
  /** Which animation: `typewriter`, `fade`, a slide, `scale` or `wordByWord`. */
  type: zTextAnimationType,
  in: z.number().nonnegative().default(0.5),
  out: z.number().nonnegative().default(0.5),
  stagger: z.number().nonnegative().optional(),
});

/** How a title's letters look. Every field has a default, so `{}` is plain white Inter at 48 pixels. */
const titleLookSchema = z.strictObject({
  /** A theme title preset this look starts from; the fields written beside it win. */
  preset: idSchema.optional(),
  /** The font family: a bundled one, one the file declares, or one from the font catalogue. A theme preset may set it instead. */
  font: z.string().default("Inter"),
  /** The letters' size, in pixels. */
  size: z.number().min(1).max(1000).default(48),
  /** How heavy the letters are: 100 to 900, or `normal` and `bold`. */
  weight: fontWeightSchema.default("bold"),
  /** Slanted letters. */
  italic: z.boolean().default(false),
  /** The letters' colour, or a theme token such as `$text`. */
  color: colorSchema.default("#ffffff"),
  /** A colour filling the text box behind the letters. */
  background: colorSchema.optional(),
  /** An outline around the letters: its colour and thickness in pixels. */
  stroke: z.strictObject({ color: colorSchema, thickness: z.number().min(0).max(100) }).optional(),
  /** A drop shadow under the letters: colour, blur and offset in pixels. */
  shadow: textShadowSchema.optional(),
  /** Which side of the text box the lines sit against. */
  align: zTextAlign.default("center"),
  /** Where in the text box's height the text sits. */
  valign: zTextValign.default("middle"),
  /** The distance between lines, as a multiple of the letters' size. */
  lineHeight: z.number().min(0.1).max(10).default(1.2),
  /** Extra space between letters, in pixels. */
  letterSpacing: z.number().min(-100).max(100).default(0),
  /** A line under, over or through the letters. */
  decoration: zTextDecoration.optional(),
});

/** The fields a theme's title preset may hold: the look, without `preset` (a preset does not start from another). */
export const TITLE_LOOK_KEYS: readonly string[] = Object.keys(titleLookSchema.shape).filter((k) => k !== "preset");

export const titleSchema = z.strictObject({
  ...timedProps,
  ...overlayProps,
  ...entranceProps,
  /**
   * How the letters look: a theme title preset by name (`"h1"`), or an object of `font`, `size`, `weight`, `italic`,
   * `color`, `background`, `stroke`, `shadow`, `align`, `valign`, `lineHeight`, `letterSpacing` and `decoration`, with
   * `preset` naming the preset it starts from. Without a preset, the theme's `default` title preset applies. The text
   * box is the title's `box`: its `width` and `height`, the whole frame when left out, so background, align and valign
   * work inside it.
   */
  style: z
    .union([
      idSchema.transform((preset): { preset?: string | undefined } => ({ preset })).pipe(titleLookSchema),
      titleLookSchema,
    ])
    .prefault({}),
  /** An entrance and exit: its type, its seconds in and out, and for wordByWord the delay between words. */
  animation: textAnimationSchema.optional(),
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
  thickness: z.number().nonnegative(),
  opacity: z.number().min(0).max(1).optional(),
  dashArray: z.array(z.number().nonnegative()).optional(),
  dashOffset: z.number().optional(),
  lineCap: z.enum(["butt", "round", "square"]).optional(),
  lineJoin: z.enum(["miter", "round", "bevel"]).optional(),
  gradient: gradientSchema.optional(),
});

export const shapeSchema = z.strictObject({
  ...timedProps,
  ...overlayProps,
  ...entranceProps,
  /** A theme preset for shapes. */
  style: idSchema.optional(),
  /** Which shape it draws. */
  type: zShapeType,
  /** The shape's box, in pixels; left out, 200. */
  width: z.number().positive().optional(),
  /** The shape's box height, in pixels; left out, 200. */
  height: z.number().positive().optional(),
  /** A polygon's or path's corners, as fractions of the box from its top left. */
  points: z.array(vec2Schema).optional(),
  /** A colour, or `{ type, color, gradient, opacity }` for a gradient or no fill. */
  fill: fillSchema.optional(),
  /** The outline: colour, thickness in pixels, opacity, dashes, caps and joins. */
  stroke: strokeSchema.optional(),
  /** A drop shadow: colour, blur and offset in pixels. */
  shadow: shadowSchema.optional(),
  /** Several shadows, drawn in order, for layered or inner shadows. */
  shadows: z.array(shadowSchema).optional(),
  /** A rectangle's rounded corners, in pixels or a theme token such as `$radius`. */
  cornerRadius: themedLengthSchema.optional(),
  /** A rectangle's corners rounded one by one, in pixels. */
  cornerRadii: z
    .strictObject({ topLeft: z.number(), topRight: z.number(), bottomRight: z.number(), bottomLeft: z.number() })
    .optional(),
  /** How many points a star has; left out, 5. */
  starPoints: z.number().int().min(3).optional(),
  /** A star's inner corners, as a fraction of its outer radius; left out, 0.5. */
  innerRadius: z.number().min(0).max(1).optional(),
});

export const svgSchema = z
  .strictObject({
    ...timedProps,
    ...overlayProps,
    ...fitProp,
    /** A theme preset for svg elements. */
    style: idSchema.optional(),
    /** An SVG file from the manifest, as `asset:<id>`. Give this or `content`. */
    src: assetRefSchema.optional(),
    /** Inline SVG markup. Give this or `src`. */
    content: z.string().optional(),
    /** The part of the drawing to show, in its own units, as the SVG `viewBox` attribute. */
    viewBox: z
      .strictObject({ minX: z.number(), minY: z.number(), width: z.number().positive(), height: z.number().positive() })
      .optional(),
    /** How the drawing fits its box, as the SVG attribute of that name (`xMidYMid meet`). */
    preserveAspectRatio: z.string().optional(),
    /** Recolours it: `tint` keeps the shading and colours it, `replace` paints every drawn pixel; `opacity` is how much. */
    color: z
      .strictObject({ type: zSvgColorType, tint: colorSchema.optional(), opacity: z.number().min(0).max(1).optional() })
      .optional(),
    ...entranceProps,
  })
  .refine((v) => Boolean(v.src) !== Boolean(v.content), { message: "Svg takes either src or content" });

export const stickerSchema = z.strictObject({
  ...timedProps,
  ...overlayProps,
  ...entranceProps,
  /** A theme preset for stickers. */
  style: idSchema.optional(),
  /** An image the manifest lists (`asset:party`): PNG, SVG, WebP or GIF. */
  src: z.string().refine((v) => v.startsWith("asset:"), {
    message: "a sticker is an image asset (asset:…); icon stickers were removed, so draw an icon as an <Svg>",
  }),
});

export const adjustmentSchema = z.strictObject({
  ...timedProps,
  /** How much of its effects to mix over the picture beneath. */
  opacity: z.number().min(0).max(1).default(1),
  /** How the filtered picture mixes with the one beneath, as CSS `mix-blend-mode` does. */
  blend: zBlendMode.default("normal"),
  /** Off, it filters nothing and stays in the file. */
  enabled: z.boolean().default(true),
});

export const nestedSchema = z.strictObject({
  ...timedProps,
  ...visualProps,
  /** A pure helper component returning tracks, or a file reference. Validated at collect time. */
  of: z.union([
    z.custom<(props: Record<string, unknown>) => unknown>((v) => typeof v === "function"),
    z.string().startsWith("file:"),
  ]),
  /** Where in the nested sequence it starts, in its own seconds. */
  in: timeRefSchema.optional(),
  /** Where in the nested sequence it ends, as `in`. */
  out: timeRefSchema.optional(),
  /** A gain on all its sound: 1 as it is, 0 muted. */
  volume: z.number().min(0).max(4).default(1),
});

export const layerSchema = z.strictObject({
  ...timedProps,
  ...entranceProps,
  ...placedProps,
  /** How the layer mixes with what is under it, as CSS `mix-blend-mode` does. */
  blend: zBlendMode.optional(),
  /**
   * The layer is a ground that other things sit on: a wall behind a game, a scrim that darkens footage under a
   * title. The layout check then treats it like a background: it is not held to the safe zone and is not said to
   * cover the captions.
   */
  ground: z.boolean().optional(),
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
  /** The camera: `position` and `lookAt` as `[x, y, z]`, `fov` in degrees, clipping planes, zoom, or orthographic. */
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
  /** The scene's background colour; left out, transparent over what is beneath. */
  background: colorSchema.optional(),
  /** Builds the scene once from `{ scene, camera, renderer, THREE, width, height }`, and may return `update(frame)` for every frame. */
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
  /** Motion steps: `[selector, keyframes, options]`, where `at` in the options is seconds into the layer. */
  sequence: z.array(motionStepSchema).default([]),
});
