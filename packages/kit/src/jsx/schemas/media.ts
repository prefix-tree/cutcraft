import { z } from "zod";
import { zInterpolation, zStabilizeCrop } from "./enums-local";
import { assetRefSchema, audioProps, colorSchema, timedProps, timeRefSchema, visualProps } from "./common";

export const chromaKeySchema = z.strictObject({
  enabled: z.boolean().default(true),
  color: colorSchema.default("#00ff00"),
  tolerance: z.number().min(0).max(1).default(0.3),
  edgeSoftness: z.number().min(0).max(1).default(0.1),
  spillSuppression: z.number().min(0).max(1).default(0.5),
});

export const stabilizeSchema = z.strictObject({
  enabled: z.boolean().default(true),
  strength: z.number().min(0).max(1).default(0.5),
  crop: zStabilizeCrop.default("auto"),
});

const sourceProps = {
  src: assetRefSchema,
  in: timeRefSchema.optional(),
  out: timeRefSchema.optional(),
  speed: z.number().min(0.1).max(20).default(1),
  reverse: z.boolean().default(false),
  pitchCorrection: z.boolean().default(false),
  audioTrack: z.number().int().nonnegative().default(0),
};

export const clipSchema = z.strictObject({
  ...timedProps,
  ...sourceProps,
  ...visualProps,
  ...audioProps,
  /** Reframe to the composition's aspect: the resolver writes `transform.crop` from the source size and this focus, unless a crop is written. */
  frame: z.strictObject({ focus: z.union([z.enum(["left", "center", "right"]), z.strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1).optional() })]).default("center") }).optional(),
  smoothSlowMo: z.boolean().default(false),
  interpolation: zInterpolation.optional(),
  stabilize: stabilizeSchema.optional(),
  chromaKey: chromaKeySchema.optional(),
  behindSubject: z.boolean().default(false),
});

/** `<Audio>` is `<Clip>` for audio-only assets: the same schema, no visual props accepted. */
export const audioSchema = z.strictObject({
  ...timedProps,
  ...sourceProps,
  ...audioProps,
});

export type ClipProps = z.input<typeof clipSchema>;
