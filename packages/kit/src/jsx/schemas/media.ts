import { z } from "zod";

import { animatable, assetRefSchema, audioProps, timedProps, timeRefSchema, visualProps } from "./common";

/** A hold: the source frame at `source` seconds stays on screen from `start` seconds into the element for `duration`. */
const freezeSpecSchema = z.strictObject({
  /** Seconds into the element where the hold starts. */
  start: z.number().nonnegative(),
  /** Seconds the frame is held before it plays on. */
  duration: z.number().positive(),
  /** The source time of the frame held. */
  source: z.number().nonnegative(),
});

const sourceProps = {
  /** The media, as `asset:<id>` from the manifest. */
  src: assetRefSchema,
  /** Where in the source it starts: seconds, or a word, shot or silence of its transcript (`word:12`). */
  in: timeRefSchema.optional(),
  /** Where in the source it ends, as `in`; `word:40.end` ends after the word is said. */
  out: timeRefSchema.optional(),
  /** Playback rate: 2 plays twice as fast and half as long; keys ramp it. */
  speed: animatable(z.number().min(0.1).max(20)).default(1),
  /** Frames held on screen while the clip's time stands still. */
  freezes: z.array(freezeSpecSchema).optional(),
  /** Plays the trimmed source backwards. */
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
