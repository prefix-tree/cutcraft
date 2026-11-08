import { z } from "zod";

import { Shape, Svg, Title } from "../jsx/elements";
import { h, parse, pointSchema, svgIn, timing, timingOf, timingSchema } from "./shared";

export const calloutSchema = timingSchema.extend({
  id: z.string(),
  text: z.string(),
  /** The box's centre, in pixels from the frame's centre. */
  x: z.number().default(320),
  y: z.number().default(-220),
  width: z.number().positive().default(420),
  /** What it points at; without it, the box stands alone. */
  to: pointSchema.optional(),
  color: z.string().default("$accent"),
});

/** A note on a surface box, with a line drawn from it to the thing it is about. */
export function Callout(props: z.input<typeof calloutSchema>) {
  const p = parse("Callout", calloutSchema, props);
  const t = timingOf(p);
  const lines = Math.max(1, Math.ceil((p.text.length * 17) / (p.width - 56)));
  const height = 40 + lines * 40;
  const parts = [
    h(Shape, {
      id: `${p.id}-box`,
      ...timing(t),
      shape: "rectangle",
      width: p.width,
      height,
      fill: "$surface",
      cornerRadius: "$radius",
      stroke: { color: p.color, width: 3 },
      transform: { position: { x: p.x, y: p.y } },
      enter: { type: "scale", duration: 0.35, easing: "easeOutBack" },
      exit: { type: "fade", duration: 0.3 },
    }),
    h(
      Title,
      {
        id: `${p.id}-text`,
        ...timing(t, 0.1),
        font: "$body",
        size: 30,
        weight: 600,
        color: "$text",
        width: p.width - 56,
        transform: { position: { x: p.x, y: p.y } },
        enter: { type: "fade", duration: 0.35 },
        exit: { type: "fade", duration: 0.3 },
      },
      p.text,
    ),
  ];
  if (!p.to) return parts;
  // The line leaves the box's edge facing the target and ends on a dot.
  const dx = p.to.x - p.x;
  const dy = p.to.y - p.y;
  const edge = Math.min(Math.abs(p.width / 2 / (dx || 1e-6)), Math.abs(height / 2 / (dy || 1e-6)));
  const from = { x: p.x + dx * Math.min(1, edge), y: p.y + dy * Math.min(1, edge) };
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
