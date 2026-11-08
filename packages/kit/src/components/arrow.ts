import { z } from "zod";

import { Svg } from "../jsx/elements";
import { h, parse, pointSchema, svgIn, timing, timingOf, timingSchema } from "./shared";

export const arrowSchema = timingSchema.extend({
  id: z.string(),
  from: pointSchema,
  to: pointSchema,
  /** How far the line bows to its left, in pixels; 0 is straight. */
  curve: z.number().default(0),
  color: z.string().default("$accent"),
  width: z.number().positive().default(6),
});

/** An arrow drawn from one point to another, straight or bowed, its head at the end. */
export function Arrow(props: z.input<typeof arrowSchema>) {
  const p = parse("Arrow", arrowSchema, props);
  const t = timingOf(p);
  const { from, to } = p;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // The control point sits off the middle, `curve` pixels to the line's left.
  const c = { x: (from.x + to.x) / 2 + (-dy / len) * p.curve, y: (from.y + to.y) / 2 + (dx / len) * p.curve };
  // The head follows the curve's direction at its end.
  const ex = to.x - c.x;
  const ey = to.y - c.y;
  const el = Math.hypot(ex, ey) || 1;
  const ux = ex / el;
  const uy = ey / el;
  const head = p.width * 4;
  const a = { x: to.x - ux * head - uy * head * 0.55, y: to.y - uy * head + ux * head * 0.55 };
  const b = { x: to.x - ux * head + uy * head * 0.55, y: to.y - uy * head - ux * head * 0.55 };
  const pad = head + p.width;
  const xs = [from.x, to.x, c.x];
  const ys = [from.y, to.y, c.y];
  const box = {
    minX: Math.min(...xs) - pad,
    minY: Math.min(...ys) - pad,
    width: Math.max(...xs) - Math.min(...xs) + 2 * pad,
    height: Math.max(...ys) - Math.min(...ys) + 2 * pad,
  };
  const stroke = `stroke="${p.color}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  return [
    h(Svg, {
      id: p.id,
      ...timing(t),
      ...svgIn(
        box,
        `<path d="M${from.x} ${from.y} Q${c.x} ${c.y} ${to.x} ${to.y}" ${stroke}/>` +
          `<path d="M${a.x} ${a.y} L${to.x} ${to.y} L${b.x} ${b.y}" ${stroke}/>`,
      ),
      enter: { type: "draw", duration: 0.6 },
      exit: { type: "fade", duration: 0.3 },
    }),
  ];
}
