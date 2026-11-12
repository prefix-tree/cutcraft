// What the cards share. A card's text is laid out by the browser inside a Layer, because only the browser knows how
// wide a word is. Each line (or mark) is a Layer of its own, so each has its own place on the timeline and can start
// at a word; every one lays out the whole card and shows only its own part, so the parts line up exactly.
import { z } from "zod";

import { type Timing, timing } from "./shared";

/** Where a card sits: its centre from the frame's centre, and its size. */
export const boxProps = {
  x: z.number().default(0),
  y: z.number().default(0),
};

/** When one part of a card comes in: at a word of the card's anchor, or seconds after the card. */
export const cueProps = {
  /** A word, shot or silence of the card's `anchor` (`word:12`): the part comes in when it is played. */
  at: z.string().optional(),
  /** Seconds after the card starts, or after `at`. */
  offset: z.number().optional(),
};
export interface Cue {
  readonly at?: string | undefined;
  readonly offset?: number | undefined;
}

/** A colour for CSS inside a Layer: `$accent` reads the theme there, anything else is used as written. */
export function css(color: string): string {
  return /^\$[A-Za-z][\w-]*$/.test(color) ? `var(--cc-${color.slice(1)})` : color;
}

/**
 * The timing of one part of a card: it starts at its own cue and lasts until the card ends, so every part leaves
 * together however late it came in.
 */
export function cueTiming(name: string, card: Timing, cardId: string, cue: Cue): Record<string, unknown> {
  const until = { duration: { until: cardId } };
  if (cue.at === undefined) {
    const { duration: _, ...start } = timing(card, cue.offset ?? 0);
    return { ...start, ...until };
  }
  if (card.anchor === undefined)
    throw new Error(`${name}: at="${cue.at}" needs the card's anchor, the clip that plays that word`);
  return { anchor: card.anchor, at: cue.at, ...(cue.offset !== undefined ? { offset: cue.offset } : {}), ...until };
}

/** 0 to 1 over the first `seconds` of a part's life, eased out. */
export function arrive(elapsed: number, seconds: number): number {
  const q = Math.min(1, Math.max(0, elapsed / seconds));
  return 1 - (1 - q) ** 3;
}
