import { z } from "zod";
import { zTrackLayout, zTrackRole } from "../enums";
import { themeSchema } from "../../theme/schema";
import { colorSchema, gradientSchema, idSchema } from "./common";

export const compositionSchema = z.strictObject({
  id: idSchema.default("composition"),
  fps: z.number().positive().max(240),
  width: z.number().int().min(16).max(8192),
  height: z.number().int().min(16).max(8192),
  sampleRate: z.number().int().min(8000).max(192000).default(48000),
  channels: z.number().int().min(1).max(8).default(2),
  background: z
    .strictObject({
      mode: z.enum(["color", "blur", "gradient"]),
      color: colorSchema.optional(),
      gradient: gradientSchema.optional(),
    })
    .optional(),
  /** The video's look: palette, fonts, radius, motion style and element presets. Elements use it through `$tokens` and `style`. */
  theme: themeSchema.optional(),
});

export const trackSchema = z.strictObject({
  id: idSchema,
  layout: zTrackLayout.default("sequence"),
  name: z.string().optional(),
  role: zTrackRole.default("general"),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  muted: z.boolean().default(false),
  solo: z.boolean().default(false),
  group: idSchema.optional(),
});

export const markerSchema = z.strictObject({
  id: idSchema,
  at: z.number().nonnegative(),
  label: z.string().default(""),
  color: colorSchema.optional(),
});

export const gapSchema = z.strictObject({
  id: idSchema,
  duration: z.number().positive(),
});
