import { z } from "zod";

import { Svg } from "../jsx/elements";
import { h, parse, svgIn, timing, timingOf, timingSchema } from "./shared";

export const highlightSchema = timingSchema.extend({
  id: z.string(),
  /** `underline` under it, `marker` behind it, `circle` round it, `strike` through it. */
  variant: z.enum(["underline", "marker", "circle", "strike"]).default("underline"),
  /** What it marks: a box's centre and size, in pixels from the frame's centre. */
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().default("$accent"),
});

/** A hand-drawn mark on something already in the frame: an underline, a marker stroke, a circle or a strike. */
export function Highlight(props: z.input<typeof highlightSchema>) {
  const p = parse("Highlight", highlightSchema, props);
  const t = timingOf(p);
  const l = p.x - p.width / 2;
  const r = p.x + p.width / 2;
  const top = p.y - p.height / 2;
  const bottom = p.y + p.height / 2;
  const pad = 24;
  const box = { minX: l - pad * 2, minY: top - pad * 2, width: p.width + pad * 4, height: p.height + pad * 4 };
  const line = (w: number, extra = "") =>
    `stroke="${p.color}" stroke-width="${w}" stroke-linecap="round" fill="none"${extra}`;
  // A slight wobble, so the mark reads as drawn by hand.
  const body = {
    underline: `<path d="M${l} ${bottom + 10} Q${p.x} ${bottom + 22} ${r} ${bottom + 6}" ${line(8)}/>`,
    strike: `<path d="M${l - 8} ${p.y + 4} Q${p.x} ${p.y - 6} ${r + 8} ${p.y}" ${line(8)}/>`,
    marker: `<path d="M${l - 6} ${p.y} L${r + 6} ${p.y - 2}" ${line(p.height * 0.9, ' stroke-opacity="0.45"')}/>`,
    circle: `<path d="M${p.x + p.width * 0.1} ${top - 14} C${r + 40} ${top - 18} ${r + 44} ${bottom + 20} ${p.x} ${bottom + 16} C${l - 44} ${bottom + 14} ${l - 40} ${top - 22} ${p.x + p.width * 0.18} ${top - 6}" ${line(6)}/>`,
  }[p.variant];
  return [
    h(Svg, {
      id: p.id,
      ...timing(t),
      ...svgIn(box, body),
      enter: { type: "draw", duration: p.variant === "circle" ? 0.7 : 0.45 },
      exit: { type: "fade", duration: 0.3 },
    }),
  ];
}
