import { z } from "zod";

import { Layer } from "../jsx/elements";
import { useLayer } from "../jsx/use-t";
import { arrive, boxProps, css, cueProps, cueTiming } from "./card";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

const lineSchema = z.object({
  text: z.string(),
  /** Letter height in pixels; the card's `size` when left out. */
  size: z.number().positive().optional(),
  /** `strong` is the card's text colour, `muted` its quiet one. */
  tone: z.enum(["strong", "muted"]).default("strong"),
  /** A filled pill behind the line, in this colour. Its letters then take the theme's background colour, as a badge's do. */
  pill: z.string().optional(),
  /** The letters' colour, when neither the tone nor the pill's default will do. */
  color: z.string().optional(),
  ...cueProps,
  /** Strike the line out: `true` half a second after it comes in, or at a cue of its own. */
  struck: z.union([z.boolean(), z.object(cueProps)]).optional(),
});

export const typeCardSchema = timingSchema.extend({
  id: z.string(),
  ...boxProps,
  /** The card's size in pixels; the whole frame when left out. */
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  fill: z.string().default("$surface"),
  cornerRadius: z.number().min(0).default(0),
  size: z.number().positive().default(120),
  align: z.enum(["left", "center"]).default("center"),
  lines: z.array(lineSchema).min(1),
});

type Line = z.infer<typeof lineSchema>;
interface Look {
  readonly x: number;
  readonly y: number;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly fill: string;
  readonly cornerRadius: number;
  readonly size: number;
  readonly align: "left" | "center";
  readonly lines: readonly Line[];
}

/** The card's place in the frame, the same for every part. */
function boxStyle(p: Look): Record<string, unknown> {
  return p.width === undefined || p.height === undefined
    ? { position: "absolute", inset: 0, transform: `translate(${p.x}px, ${p.y}px)` }
    : {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: p.width,
        height: p.height,
        transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
      };
}

/** The card behind the lines. */
export function TypeCardBack(p: Look) {
  return h("div", { style: { ...boxStyle(p), background: css(p.fill), borderRadius: p.cornerRadius } });
}

/**
 * The card's lines, laid out as a whole with one part showing: line `show` rising into place, or the strike through
 * it drawing from the left.
 */
export function TypeCardLine(p: Look & { readonly show: number; readonly part: "line" | "strike" }) {
  const { elapsed } = useLayer();
  const q = arrive(elapsed, p.part === "line" ? 0.3 : 0.25);
  return h(
    "div",
    {
      style: {
        ...boxStyle(p),
        boxSizing: "border-box",
        padding: "6%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: p.align === "center" ? "center" : "flex-start",
        textAlign: p.align,
        gap: p.size * 0.14,
      },
    },
    ...p.lines.map((line, i) => {
      const mine = i === p.show;
      const size = line.size ?? p.size;
      return h(
        "div",
        {
          key: i,
          style: {
            position: "relative",
            font: `900 ${size}px var(--cc-heading, Inter), sans-serif`,
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            color: line.color
              ? css(line.color)
              : line.pill
                ? "var(--cc-background, #ffffff)"
                : line.tone === "muted"
                  ? "var(--cc-muted, #8a8a93)"
                  : "var(--cc-text, #111114)",
            ...(line.pill ? { background: css(line.pill), borderRadius: "0.16em", padding: "0.1em 0.32em" } : {}),
            visibility: mine && p.part === "line" ? "visible" : "hidden",
            ...(mine && p.part === "line"
              ? { opacity: q, transform: `translateY(${(1 - q) * 0.22}em) scale(${0.94 + 0.06 * q})` }
              : {}),
          },
        },
        line.text,
        mine &&
          p.part === "strike" &&
          h("span", {
            style: {
              visibility: "visible",
              position: "absolute",
              left: "-0.12em",
              right: "-0.12em",
              top: "50%",
              height: "0.1em",
              marginTop: "-0.05em",
              borderRadius: "0.05em",
              background: "currentColor",
              transformOrigin: "left center",
              transform: `scaleX(${q})`,
            },
          }),
      );
    }),
  );
}

/**
 * A card of big type that builds line by line: each line comes in at its own moment (a word of the footage, or
 * seconds after the card), a line can sit on a pill, and a line can be struck out.
 */
export function TypeCard(props: z.input<typeof typeCardSchema>) {
  const p = parse("TypeCard", typeCardSchema, props);
  const t = timingOf(p);
  const { x, y, width, height, fill, cornerRadius, size, align, lines } = p;
  const look: Look = { x, y, width, height, fill, cornerRadius, size, align, lines };
  const card = `${p.id}-card`;
  const exit = { exit: { type: "fade", duration: 0.2 } };
  return [
    h(Layer, { id: card, ...timing(t), enter: { type: "fade", duration: 0.2 }, ...exit }, h(TypeCardBack, { ...look })),
    ...lines.flatMap((line, i) => {
      const struck = line.struck === true ? { ...line, offset: (line.offset ?? 0) + 0.5 } : line.struck;
      return [
        h(
          Layer,
          { id: `${p.id}-line-${i + 1}`, ...cueTiming("TypeCard", t, card, line), ...exit },
          h(TypeCardLine, { ...look, show: i, part: "line" }),
        ),
        struck &&
          h(
            Layer,
            { id: `${p.id}-strike-${i + 1}`, ...cueTiming("TypeCard", t, card, struck), ...exit },
            h(TypeCardLine, { ...look, show: i, part: "strike" }),
          ),
      ];
    }),
  ].filter(Boolean);
}
