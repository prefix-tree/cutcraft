import { z } from "zod";

import { Layer } from "../jsx/elements";
import { useLayer } from "../jsx/use-t";
import { arrive, boxProps, css, cueProps, cueTiming } from "./card";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

const markSchema = z.object({
  /** The phrase to mark, as it is written in the card's `text`. */
  text: z.string().min(1),
  color: z.string().optional(),
  ...cueProps,
});

export const quoteCardSchema = timingSchema.extend({
  id: z.string(),
  ...boxProps,
  width: z.number().positive().default(860),
  /** Where the words come from, in small type above them. */
  source: z.string().optional(),
  text: z.string(),
  size: z.number().positive().default(40),
  fill: z.string().default("#ffffff"),
  color: z.string().default("#16161a"),
  /** The marker's colour, for highlights that do not name their own. */
  accent: z.string().default("$accent"),
  highlights: z.array(markSchema).default([]),
});

/** A colour thinned to a marker's wash. */
const wash = (color: string): string => `color-mix(in srgb, ${css(color)} 42%, transparent)`;

interface Look {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly source?: string | undefined;
  readonly text: string;
  readonly size: number;
  readonly fill: string;
  readonly color: string;
}

/**
 * The card, laid out as a whole. As the card itself it draws the paper and the words; as a mark it draws only the
 * marker behind one phrase, sweeping in from the left, with that phrase again on top of it.
 */
export function QuoteCardPart(p: Look & { readonly mark?: { readonly text: string; readonly color: string } }) {
  const { elapsed } = useLayer();
  const q = arrive(elapsed, p.mark ? 0.35 : 0.3);
  const at = p.mark ? p.text.indexOf(p.mark.text) : -1;
  const ink = p.mark ? "transparent" : css(p.color);
  const words = p.mark
    ? [
        p.text.slice(0, at),
        h(
          "span",
          {
            key: "mark",
            style: {
              color: css(p.color),
              // A marker is a wash of its colour, so the words stay readable through any accent.
              backgroundImage: `linear-gradient(${wash(p.mark.color)}, ${wash(p.mark.color)})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${q * 100}% 100%`,
              borderRadius: "0.14em",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            },
          },
          p.mark.text,
        ),
        p.text.slice(at + p.mark.text.length),
      ]
    : [p.text];
  return h(
    "div",
    {
      style: {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: p.width,
        boxSizing: "border-box",
        padding: `${p.size * 0.9}px ${p.size * 1.1}px`,
        transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
        borderRadius: p.size * 0.45,
        ...(p.mark
          ? {}
          : {
              background: css(p.fill),
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.1)",
              opacity: q,
              marginTop: (1 - q) * p.size * 0.4,
            }),
        color: ink,
        font: `500 ${p.size}px var(--cc-body, Inter), sans-serif`,
        lineHeight: 1.5,
      },
    },
    p.source !== undefined &&
      h(
        "div",
        { style: { fontSize: "0.72em", fontWeight: 700, opacity: 0.6, marginBottom: "0.5em", lineHeight: 1.2 } },
        p.source,
      ),
    h("div", { style: { whiteSpace: "pre-wrap" } }, ...words),
  );
}

/**
 * A passage on a paper card with its source above it, and a marker that sweeps across the phrases that matter, each
 * at its own moment.
 */
export function QuoteCard(props: z.input<typeof quoteCardSchema>) {
  const p = parse("QuoteCard", quoteCardSchema, props);
  const missing = p.highlights.find((m) => !p.text.includes(m.text));
  if (missing) throw new Error(`QuoteCard: highlights "${missing.text}" is not in the text`);
  const t = timingOf(p);
  const { x, y, width, source, text, size, fill, color } = p;
  const look: Look = { x, y, width, source, text, size, fill, color };
  const card = `${p.id}-card`;
  const exit = { exit: { type: "fade", duration: 0.2 } };
  return [
    h(Layer, { id: card, ...timing(t), ...exit }, h(QuoteCardPart, { ...look })),
    ...p.highlights.map((m, i) =>
      h(
        Layer,
        { id: `${p.id}-mark-${i + 1}`, ...cueTiming("QuoteCard", t, card, m), ...exit },
        h(QuoteCardPart, { ...look, mark: { text: m.text, color: m.color ?? p.accent } }),
      ),
    ),
  ];
}
