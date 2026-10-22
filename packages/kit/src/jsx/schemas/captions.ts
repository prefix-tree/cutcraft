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
  style: captionStyleSchema.optional(),
  animation: zCaptionAnimation.default("none"),
});

export const captionSchema = z.strictObject({
  id: idSchema,
  start: timeRefSchema,
  end: timeRefSchema,
  text: z.string(),
  words: z.array(z.strictObject({ text: z.string(), start: z.number().nonnegative(), end: z.number().nonnegative() })).optional(),
});
