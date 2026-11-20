import { z } from "zod";

import { zBlendMode, zEasing, zEntranceAnimation, zFitMode } from "../enums";

export const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
export const TIME_REF_PATTERN = /^(word|shot|silence):\d+(\.end)?$|^marker:[A-Za-z_][A-Za-z0-9_-]*$/;
export const ASSET_REF_PATTERN = /^asset:[A-Za-z0-9_.-]+$/;

export const idSchema = z.string().regex(ID_PATTERN, "ids are identifiers: letters, digits, _ and -");
export const assetRefSchema = z.string().regex(ASSET_REF_PATTERN, 'asset references look like "asset:ID"');
export const colorSchema = z.string().min(1);
/**
 * A length a theme can supply: pixels, or a token such as `$radius`. The
 * resolver replaces tokens before parsing; one it cannot resolve is reported
 * there and reads as 0.
 */
export const themedLengthSchema = z
  .union([z.number().nonnegative(), z.string().regex(/^\$[A-Za-z][A-Za-z0-9_-]*$/, 'theme tokens look like "$radius"')])
  .transform((v) => (typeof v === "number" ? v : 0));

export const timeRefSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(TIME_REF_PATTERN, 'time references look like "word:12", "shot:4.end", "silence:2" or "marker:ID"'),
]);

export const durationSchema = z.union([
  z.number().positive(),
  z.literal("fill"),
  z.literal("source"),
  z.strictObject({ match: idSchema }),
  /** Lasts until the element named ends, wherever this one starts. */
  z.strictObject({ until: idSchema }),
]);

/** Props shared by everything that occupies time on a track. */
export const timedProps = {
  /** The element's name: unique in the file, and what anchors, ducking and the editor refer to it by. */
  id: idSchema,
  /** Seconds from the start of the video. Free-layout tracks only; on a sequence track the element follows the one before it. */
  start: z.number().nonnegative().optional(),
  /** Overlays: start relative to another element's start, or to its end with `id.end`. */
  anchor: z
    .union([
      z.literal("start"),
      z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*(\.end)?$/, 'anchors look like "hook", "hook.end" or "start"'),
    ])
    .optional(),
  /** With `anchor`: a word, shot or silence of the anchor's source (`word:14655`); the start is where the anchor plays it, plus `offset`. */
  at: z
    .string()
    .regex(/^(word|shot|silence):\d+(\.end)?$/, 'at looks like "word:12", "word:12.end", "shot:3" or "silence:1"')
    .optional(),
  /** Seconds added to the start that `anchor` and `at` give; negative starts earlier. */
  offset: z.number().optional(),
  /**
   * How long it plays: seconds; `"source"` for the whole trimmed source; `"fill"` to run to the end of the
   * composition; `{ match: id }` for as long as another element; `{ until: id }` to end when another element ends.
   */
  duration: durationSchema.optional(),
};

export const vec2Schema = z.strictObject({ x: z.number(), y: z.number() });

export const transformSchema = z.strictObject({
  /** Pixels to move the element by, right and down from where its fit puts it (the frame's centre). */
  position: vec2Schema.optional(),
  /** A multiplier, the same on both axes or `{ x, y }`. */
  scale: z.union([z.number().min(0).max(10), vec2Schema]).optional(),
  /** Degrees, clockwise. */
  rotation: z.number().min(-360).max(360).optional(),
  /** The point it scales and rotates around, as fractions of its own box; left out, its centre `{ x: 0.5, y: 0.5 }`. */
  anchor: vec2Schema.optional(),
  /** 0 is invisible, 1 opaque. */
  opacity: z.number().min(0).max(1).optional(),
  /** Rounded corners, in pixels or a theme token such as `$radius`. */
  borderRadius: themedLengthSchema.optional(),
  /** The part of the source to show, as fractions of its width and height from the top left. */
  crop: z
    .strictObject({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(0).max(1),
      height: z.number().min(0).max(1),
    })
    .optional(),
});

const transformProp = {
  /** Where it sits and how it is turned: position, scale, rotation, anchor, opacity, rounded corners and crop. */
  transform: transformSchema.optional(),
};

const blendProp = {
  /** How it mixes with what is under it, as CSS `mix-blend-mode` does. */
  blend: zBlendMode.optional(),
};

/** How a picture with a size of its own fills the frame: footage, a nested sequence, an SVG. */
export const fitProp = {
  /** How it fills the frame: `contain` shows all of it, `cover` fills the frame and crops, `stretch` distorts to fill, `none` keeps its own size. */
  fit: zFitMode.optional(),
};

/** What everything drawn over the picture takes: where it sits, and how it mixes with what is under it. */
export const overlayProps = { ...transformProp, ...blendProp };

/** Footage and nested sequences: drawn on the canvas, fitted to the frame, with a strength for their blend. */
export const visualProps = {
  ...transformProp,
  ...fitProp,
  ...blendProp,
  /** How strongly it blends: multiplied into its opacity. */
  blendOpacity: z.number().min(0).max(1).optional(),
};

export const automationPointsSchema = z.array(z.tuple([z.number().nonnegative(), z.number()]));

export const audioProps = {
  /** A gain: 1 plays the source as it is, 0 mutes it, 2 is twice as loud. */
  volume: z.number().min(0).max(4).optional(),
  /** Seconds the sound fades in at the start and out at the end. */
  fade: z
    .strictObject({ in: z.number().nonnegative().optional(), out: z.number().nonnegative().optional() })
    .optional(),
  /** Volume and pan over time, as `[seconds into the element, value]` points; pan runs from -1 (left) to 1 (right). */
  automation: z
    .strictObject({ volume: automationPointsSchema.optional(), pan: automationPointsSchema.optional() })
    .optional(),
  /**
   * Turns this sound down while another plays: `under` is a track id or a track role (`dialogue`), `to` the volume
   * it falls to, `attack` and `release` the seconds it takes to fall and recover.
   */
  duck: z
    .strictObject({
      under: idSchema,
      to: z.number().min(0).max(1),
      attack: z.number().nonnegative().optional(),
      release: z.number().nonnegative().optional(),
    })
    .optional(),
};

export const shadowSchema = z.strictObject({
  color: colorSchema,
  blur: z.number().nonnegative().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  spread: z.number().optional(),
  inset: z.boolean().optional(),
});

/** A shadow under letters: text has no spread and no inner shadow. */
export const textShadowSchema = z.strictObject({
  color: colorSchema,
  blur: z.number().nonnegative().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const gradientSchema = z.strictObject({
  type: z.enum(["linear", "radial", "conic"]),
  angle: z.number().optional(),
  center: vec2Schema.optional(),
  stops: z
    .array(
      z.strictObject({
        offset: z.number().min(0).max(1),
        color: colorSchema,
        opacity: z.number().min(0).max(1).optional(),
      }),
    )
    .min(2),
});

export type Transform = z.output<typeof transformSchema>;

/** An entrance or an exit: what plays over `duration` seconds at the start or the end of an element. */
export const graphicAnimationSchema = z.strictObject({
  type: zEntranceAnimation,
  duration: z.number().positive().default(0.5),
  easing: zEasing.default("ease-out"),
});

export const entranceProps = {
  /** How it comes in: a fade, slide, scale or wipe over its first seconds, with an easing. */
  enter: graphicAnimationSchema.optional(),
  /** How it goes out, over its last seconds, as `enter`. */
  exit: graphicAnimationSchema.optional(),
};
