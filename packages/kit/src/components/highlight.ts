import { z } from "zod";

import { Svg } from "../jsx/elements";
import { centre, centreOf, h, parse, svgIn, timing, timingOf, timingSchema } from "./shared";

export const highlightSchema = timingSchema.extend({
  /** The id of the element it draws. */
  id: z.string(),
  /** `underline` under it, `marker` behind it, `circle` round it, `strike` through it. */
  variant: z.enum(["underline", "marker", "circle", "strike"]).default("underline"),
  /** Where the marked box's centre sits, in pixels from the frame's top left. Left out: centred on the frame. */
  box: centre(),
  /** The marked box's width in pixels. */
  width: z.number().positive(),
  /** The marked box's height in pixels; a marker stroke is about as thick. */
  height: z.number().positive(),
  /** The mark's colour; a marker stroke is drawn see-through. */
  color: z.string().default("$accent"),
});

/** A hand-drawn mark on something already in the frame: an underline, a marker stroke, a circle or a strike. */
export function Highlight(props: z.input<typeof highlightSchema>) {
  const p = parse("Highlight", highlightSchema, props);
  const c = centreOf(p.box);
  const t = timingOf(p);
  const l = c.x - p.width / 2;
  const r = c.x + p.width / 2;
  const top = c.y - p.height / 2;
  const bottom = c.y + p.height / 2;
  const pad = 24;
  const box = { minX: l - pad * 2, minY: top - pad * 2, width: p.width + pad * 4, height: p.height + pad * 4 };
  const line = (w: number, extra = "") =>
    `stroke="${p.color}" stroke-width="${w}" stroke-linecap="round" fill="none"${extra}`;
  // A slight wobble, so the mark reads as drawn by hand.
  const body = {
    underline: `<path d="M${l} ${bottom + 10} Q${c.x} ${bottom + 22} ${r} ${bottom + 6}" ${line(8)}/>`,
    strike: `<path d="M${l - 8} ${c.y + 4} Q${c.x} ${c.y - 6} ${r + 8} ${c.y}" ${line(8)}/>`,
    marker: `<path d="M${l - 6} ${c.y} L${r + 6} ${c.y - 2}" ${line(p.height * 0.9, ' stroke-opacity="0.45"')}/>`,
    circle: `<path d="M${c.x + p.width * 0.1} ${top - 14} C${r + 40} ${top - 18} ${r + 44} ${bottom + 20} ${c.x} ${bottom + 16} C${l - 44} ${bottom + 14} ${l - 40} ${top - 22} ${c.x + p.width * 0.18} ${top - 6}" ${line(6)}/>`,
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
