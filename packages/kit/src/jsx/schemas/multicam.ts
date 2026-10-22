import { z } from "zod";
import { assetRefSchema, colorSchema, idSchema, timeRefSchema } from "./common";

export const multicamSchema = z.strictObject({
  id: idSchema,
  name: z.string().optional(),
  /** Timeline time at which every angle is aligned (plus each angle's own offset). */
  sync: z.number().nonnegative().default(0),
  activeAngle: idSchema.optional(),
});

export const angleSchema = z.strictObject({
  id: idSchema,
  src: assetRefSchema,
  /** Source-time offset that aligns this angle with the sync point. */
  offset: z.number().default(0),
  color: colorSchema.optional(),
  name: z.string().optional(),
});

export const cutSchema = z.strictObject({
  id: idSchema,
  at: timeRefSchema,
  angle: idSchema,
});
