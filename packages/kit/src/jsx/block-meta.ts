import { z } from "zod";

/** The frame shapes a block can be laid out for. */
export const BLOCK_ASPECTS = ["9:16", "16:9", "1:1", "4:5"] as const;

/**
 * What a block says about itself, so an agent or a person can choose it without opening it: `uberscene blocks` lists
 * these, and `--for` and `--aspect` filter on them. A block file exports it as `meta` beside its component, its
 * `schema` and its `defaults`.
 */
export const blockMetaSchema = z.object({
  /** A short name for people: "Hundred cells". */
  title: z.string().min(1),
  /** What it shows, in one sentence. */
  what: z.string().min(1),
  /** The jobs it is for, as a person would put them: "count up to a big number". */
  useWhen: z.array(z.string().min(1)).min(1),
  /** When another block or plain code does it better. */
  avoidWhen: z.array(z.string().min(1)).default([]),
  /** Blocks or kit parts it goes well with. */
  pairsWith: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  /** The frame shapes its defaults are laid out for. */
  aspects: z.array(z.enum(BLOCK_ASPECTS)).min(1),
  /** Seconds it takes to play out with its default timing; given more, it holds its last state. */
  length: z.number().positive(),
  /** The props that time its moments, in the order they happen: what to set to lock it to words. */
  beats: z.array(z.string().min(1)).default([]),
  /** The second of its demo that its preview shows: where it reads best. Default two thirds of `length`. */
  poster: z.number().min(0).optional(),
});

export type BlockMeta = z.input<typeof blockMetaSchema>;
