import { z } from "zod";

import { Shape, Svg, Title } from "../jsx/elements";
import { centre, centreOf, h, parse, pointSchema, svgIn, timing, timingOf, timingSchema } from "./shared";

export const calloutSchema = timingSchema.extend({
  /** The component's id; each of its parts' ids starts with it. */
  id: z.string(),
  /** The note, in the body face; the box grows taller to fit it. */
  text: z.string(),
  /** Where the box's centre sits, in pixels from the frame's top left. Left out: `{ x: 1280, y: 320 }`, set for a 1920 by 1080 frame (give it a box on another size). */
  box: centre(1280, 320),
  /** The box's width in pixels. */
  width: z.number().positive().default(420),
  /** What it points at; without it, the box stands alone. */
  to: pointSchema.optional(),
  /** The colour of the box's border, the line and its dot. */
  color: z.string().default("$accent"),
  /** The note's size in pixels; the box's height grows with it. */
  size: z.number().positive().default(30),
});

/** A note on a surface box, with a line drawn from it to the thing it is about. */
export function Callout(props: z.input<typeof calloutSchema>) {
  const p = parse("Callout", calloutSchema, props);
  const c = centreOf(p.box);
  const t = timingOf(p);
  // The box was measured for a 30 px note; `k` keeps its padding and line height in proportion at any size.
  const k = p.size / 30;
  const lines = Math.max(1, Math.ceil((p.text.length * 17 * k) / (p.width - 56)));
  const height = (40 + lines * 40) * k;
  const parts = [
    h(Shape, {
      id: `${p.id}-box`,
      ...timing(t),
      type: "rectangle",
      width: p.width,
      height,
      fill: "$surface",
      cornerRadius: "$radius",
      stroke: { color: p.color, thickness: 3 },
      box: { x: c.x, y: c.y, origin: "center" },
      enter: { type: "scale", duration: 0.35, easing: "easeOutBack" },
      exit: { type: "fade", duration: 0.3 },
    }),
    h(
      Title,
      {
        id: `${p.id}-text`,
        ...timing(t, 0.1),
        style: { font: "$body", size: p.size, weight: 600, color: "$text" },
        box: { x: c.x, y: c.y, width: p.width - 56, origin: "center" },
        enter: { type: "fade", duration: 0.35 },
        exit: { type: "fade", duration: 0.3 },
      },
      p.text,
    ),
  ];
  if (!p.to) return parts;
  // The line leaves the box's edge facing the target and ends on a dot.
  const dx = p.to.x - c.x;
  const dy = p.to.y - c.y;
  const edge = Math.min(Math.abs(p.width / 2 / (dx || 1e-6)), Math.abs(height / 2 / (dy || 1e-6)));
  const from = { x: c.x + dx * Math.min(1, edge), y: c.y + dy * Math.min(1, edge) };
  const pad = 16;
  const box = {
    minX: Math.min(from.x, p.to.x) - pad,
    minY: Math.min(from.y, p.to.y) - pad,
    width: Math.abs(p.to.x - from.x) + 2 * pad,
    height: Math.abs(p.to.y - from.y) + 2 * pad,
  };
  return [
    h(Svg, {
      id: `${p.id}-line`,
      ...timing(t, 0.2),
      ...svgIn(
        box,
        `<path d="M${from.x} ${from.y} L${p.to.x} ${p.to.y}" stroke="${p.color}" stroke-width="4" stroke-linecap="round" fill="none"/>` +
          `<circle cx="${p.to.x}" cy="${p.to.y}" r="9" fill="${p.color}"/>`,
      ),
      enter: { type: "draw", duration: 0.5 },
      exit: { type: "fade", duration: 0.3 },
    }),
    ...parts,
  ];
}
