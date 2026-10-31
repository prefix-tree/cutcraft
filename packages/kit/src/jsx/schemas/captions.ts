import { z } from "zod";
import { zCaptionAnimation } from "../enums";
import { zCaptionPosition } from "./enums-local";
import { assetRefSchema, colorSchema, idSchema, shadowSchema, timeRefSchema } from "./common";

export const captionStyleSchema = z.strictObject({
  font: z.string().optional(),
  size: z.number().min(1).max(1000).optional(),
  weight: z.union([z.number().int().min(100).max(900).multipleOf(100), z.enum(["normal", "bold"])]).optional(),
  color: colorSchema.optional(),
  background: colorSchema.optional(),
  shadow: shadowSchema.optional(),
  /** An outline around the letters, drawn under them. */
  stroke: z.strictObject({ color: colorSchema, width: z.number().min(0).max(40) }).optional(),
  position: zCaptionPosition.optional(),
  highlight: colorSchema.optional(),
  upcoming: colorSchema.optional(),
});

export const captionsSchema = z.strictObject({
  id: idSchema,
  /** Generate children from the asset's transcript. Literal `<Caption>` children override this. */
  src: assetRefSchema.optional(),
  /** Caption styling, or the name of a theme captions preset. */
  style: z.union([idSchema, captionStyleSchema]).optional(),
  animation: zCaptionAnimation.default("none"),
  /** Generation limits: a cue breaks at a sentence end, a long pause, or when one of these would be exceeded. */
  /** Left out: as many as fit one line at the caption size on this frame (at most 42). */
  maxChars: z.number().int().positive().optional(),
  maxDuration: z.number().positive().default(5),
  maxGap: z.number().nonnegative().default(0.8),
});

export const captionSchema = z.strictObject({
  id: idSchema,
  start: timeRefSchema,
  end: timeRefSchema,
  text: z.string(),
  words: z.array(z.strictObject({ text: z.string(), start: z.number().nonnegative(), end: z.number().nonnegative() })).optional(),
});
