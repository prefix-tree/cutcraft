import { z } from "zod";

import { assetRefSchema, colorSchema, idSchema } from "./common";

export const multicamSchema = z.strictObject({
  /** The group's name. */
  id: idSchema,
  /** A label for the editor. */
  name: z.string().optional(),
  /** Timeline time at which every angle is aligned (plus each angle's own offset). */
  sync: z.number().nonnegative().default(0),
});

export const angleSchema = z.strictObject({
  /** The angle's name: `<Cut angle>` picks it by this. */
  id: idSchema,
  /** The camera's footage, as `asset:<id>`. */
  src: assetRefSchema,
  /** Source-time offset that aligns this angle with the sync point. */
  offset: z.number().default(0),
  /** Its colour in the editor. */
  color: colorSchema.optional(),
  /** A label for the editor. */
  name: z.string().optional(),
});

export const cutSchema = z.strictObject({
  /** The cut's name. */
  id: idSchema,
  /** Seconds into the multicam where it switches. */
  at: z.number().nonnegative(),
  /** The angle it switches to. */
  angle: idSchema,
});
