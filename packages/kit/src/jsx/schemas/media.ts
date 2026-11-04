import { z } from "zod";

import { assetRefSchema, audioProps, timedProps, timeRefSchema, visualProps } from "./common";

const sourceProps = {
  src: assetRefSchema,
  in: timeRefSchema.optional(),
  out: timeRefSchema.optional(),
  speed: z.number().min(0.1).max(20).default(1),
  reverse: z.boolean().default(false),
};

export const clipSchema = z.strictObject({
  ...timedProps,
  ...sourceProps,
  ...visualProps,
  ...audioProps,
  /** Reframe to the composition's aspect: the resolver writes `transform.crop` from the source size and this focus, unless a crop is written. */
  frame: z
    .strictObject({
      focus: z
        .union([
          z.enum(["left", "center", "right"]),
          z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1).optional() }),
        ])
        .default("center"),
    })
    .optional(),
});

/** `<Audio>` is `<Clip>` for audio-only assets: the same schema, no visual props accepted. */
export const audioSchema = z.strictObject({
  ...timedProps,
  ...sourceProps,
  ...audioProps,
});

export type ClipProps = z.input<typeof clipSchema>;
