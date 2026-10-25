import { z } from "zod";
import { zCaptionAnimation } from "../enums";
import { zCaptionPosition } from "./enums-local";
import { assetRefSchema, colorSchema, idSchema, timeRefSchema } from "./common";

export const captionStyleSchema = z.strictObject({
  font: z.string().optional(),
  size: z.number().min(1).max(1000).optional(),
  color: colorSchema.optional(),
  background: colorSchema.optional(),
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
  maxChars: z.number().int().positive().default(42),
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
