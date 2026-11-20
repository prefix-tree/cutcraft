import { z } from "zod";

import { zCaptionAnimation } from "../enums";
import { assetRefSchema, boxSchema, colorSchema, idSchema, textShadowSchema, timeRefSchema } from "./common";
import { zTextAlign } from "./enums-local";

const captionStyleSchema = z.strictObject({
  font: z.string().optional(),
  size: z.number().min(1).max(1000).optional(),
  weight: z.union([z.number().int().min(100).max(900).multipleOf(100), z.enum(["normal", "bold"])]).optional(),
  color: colorSchema.optional(),
  background: colorSchema.optional(),
  shadow: textShadowSchema.optional(),
  /** An outline around the letters, drawn under them. */
  stroke: z.strictObject({ color: colorSchema, width: z.number().min(0).max(40) }).optional(),
  highlight: colorSchema.optional(),
  /** A filled, rounded box behind the word being said. `highlight` stays the colour of its letters. */
  highlightBox: colorSchema.optional(),
  upcoming: colorSchema.optional(),
});

export const captionsSchema = z.strictObject({
  /** The captions' name. */
  id: idSchema,
  /** Generate children from the asset's transcript. Literal `<Caption>` children override this. */
  src: assetRefSchema.optional(),
  /** Caption styling, or the name of a theme captions preset. */
  style: z.union([idSchema, captionStyleSchema]).optional(),
  /** How the words appear: all at once, the word being said highlighted, word by word, karaoke or typewriter. */
  animation: zCaptionAnimation.default("none"),
  /**
   * The rectangle the caption block sits in, from the frame's top left as on any element. Left out, the lower safe
   * area: centred, as wide as the frame less a margin at each side, its bottom a margin above the frame's bottom
   * (`origin: "bottom"`). Each field written replaces that one of the default, so a box with only `y: 1150` and
   * `origin: "center"` puts the block's middle at 1150 and keeps the default width. Without a `height`, the block is as
   * tall as its lines.
   */
  box: boxSchema.optional(),
  /** Which side of that width the lines sit against. Left out: `center`. */
  align: zTextAlign.optional(),
  // Generation limits: a cue breaks at a sentence end, a long pause, or when one of these would be exceeded.
  /** The most characters on a generated cue's line. Left out: as many as fit at the caption size on this frame (at most 42). */
  maxChars: z.number().int().positive().optional(),
  /** The longest a generated cue may stay on screen, in seconds. */
  maxDuration: z.number().positive().default(5),
  /** A pause longer than this, in seconds, starts a new cue. */
  maxGap: z.number().nonnegative().default(0.8),
  /** Words a generated cue always ends after, as `word:N` refs on `src`: `breakAfter={["word:5", "word:12"]}`. */
  breakAfter: z.array(z.string().regex(/^word:\d+$/, 'a word ref such as "word:12"')).optional(),
});

export const captionSchema = z.strictObject({
  /** The cue's name. */
  id: idSchema,
  /** When it appears: seconds, or a word of the captions' source (`word:12`). */
  start: timeRefSchema,
  /** When it goes, as `start`. */
  end: timeRefSchema,
  /** What it says. */
  text: z.string(),
  /** Each word and its time in the video, in seconds, which the word animations highlight; left out, the cue shows as plain text. */
  words: z
    .array(z.strictObject({ text: z.string(), start: z.number().nonnegative(), end: z.number().nonnegative() }))
    .optional(),
});
