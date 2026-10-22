import { z } from "zod";
import { zBlendMode, zEmphasisAnimation, zFitMode } from "../enums";

export const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
export const TIME_REF_PATTERN = /^(word|shot|silence):\d+(\.end)?$|^marker:[A-Za-z_][A-Za-z0-9_-]*$/;
export const ASSET_REF_PATTERN = /^asset:[A-Za-z0-9_.-]+$/;

export const idSchema = z.string().regex(ID_PATTERN, "ids are identifiers: letters, digits, _ and -");
export const assetRefSchema = z.string().regex(ASSET_REF_PATTERN, 'asset references look like "asset:ID"');
export const colorSchema = z.string().min(1);

export const timeRefSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(TIME_REF_PATTERN, 'time references look like "word:12", "shot:4.end", "silence:2" or "marker:ID"'),
]);

export const durationSchema = z.union([
  z.number().positive(),
  z.literal("fill"),
  z.literal("source"),
  z.strictObject({ match: idSchema }),
]);

/** Props shared by everything that occupies time on a track. */
export const timedProps = {
  id: idSchema,
  /** Free-layout tracks only. */
  start: z.number().nonnegative().optional(),
  /** Overlays: start relative to another element. */
  anchor: z.union([idSchema, z.literal("start")]).optional(),
  offset: z.number().optional(),
  duration: durationSchema.optional(),
};

export const vec2Schema = z.strictObject({ x: z.number(), y: z.number() });
export const vec3Schema = z.strictObject({ x: z.number(), y: z.number(), z: z.number() });

export const transformSchema = z.strictObject({
  position: vec2Schema.optional(),
  scale: z.union([z.number().min(0).max(10), vec2Schema]).optional(),
  rotation: z.number().min(-360).max(360).optional(),
  anchor: vec2Schema.optional(),
  opacity: z.number().min(0).max(1).optional(),
  borderRadius: z.number().min(0).optional(),
  crop: z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0).max(1), height: z.number().min(0).max(1) }).optional(),
  rotate3d: vec3Schema.optional(),
  perspective: z.number().min(100).max(5000).optional(),
  transformStyle: z.enum(["flat", "preserve-3d"]).optional(),
});

export const visualProps = {
  transform: transformSchema.optional(),
  fit: zFitMode.optional(),
  blend: zBlendMode.optional(),
  blendOpacity: z.number().min(0).max(1).optional(),
  emphasis: z.union([
    zEmphasisAnimation,
    z.strictObject({
      type: zEmphasisAnimation,
      speed: z.number().positive().optional(),
      intensity: z.number().min(0).optional(),
      loop: z.boolean().optional(),
      focusPoint: vec2Schema.optional(),
      zoomScale: z.number().positive().optional(),
      holdDuration: z.number().nonnegative().optional(),
      startTime: z.number().nonnegative().optional(),
      animationDuration: z.number().positive().optional(),
    }),
  ]).optional(),
};

export const automationPointsSchema = z.array(z.tuple([z.number().nonnegative(), z.number()]));

export const audioProps = {
  volume: z.number().min(0).max(4).optional(),
  fade: z.strictObject({ in: z.number().nonnegative().optional(), out: z.number().nonnegative().optional() }).optional(),
  automation: z.strictObject({ volume: automationPointsSchema.optional(), pan: automationPointsSchema.optional() }).optional(),
  duck: z.strictObject({
    under: idSchema,
    to: z.number().min(0).max(1),
    attack: z.number().nonnegative().optional(),
    release: z.number().nonnegative().optional(),
  }).optional(),
};

export const shadowSchema = z.strictObject({
  color: colorSchema,
  blur: z.number().nonnegative().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  spread: z.number().optional(),
  inset: z.boolean().optional(),
});

export const gradientSchema = z.strictObject({
  type: z.enum(["linear", "radial", "conic"]),
  angle: z.number().optional(),
  center: vec2Schema.optional(),
  stops: z.array(z.strictObject({ offset: z.number().min(0).max(1), color: colorSchema, opacity: z.number().min(0).max(1).optional() })).min(2),
});

export type Transform = z.output<typeof transformSchema>;
