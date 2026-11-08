import { z } from "zod";

import { Shape, Title } from "../jsx/elements";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

export const badgeSchema = timingSchema.extend({
  id: z.string(),
  text: z.string(),
  x: z.number().default(0),
  y: z.number().default(0),
  size: z.number().positive().default(30),
  color: z.string().default("$accent"),
  textColor: z.string().default("$background"),
});

/** A short word on a pill that pops in: "New", "Live", "−40%". */
export function Badge(props: z.input<typeof badgeSchema>) {
  const p = parse("Badge", badgeSchema, props);
  const t = timingOf(p);
  const height = Math.round(p.size * 1.9);
  const width = Math.round(p.text.length * p.size * 0.62 + p.size * 1.6);
  const motion = { enter: { type: "pop", duration: 0.4 }, exit: { type: "fade", duration: 0.25 } };
  return [
    h(Shape, {
      id: `${p.id}-pill`,
      ...timing(t),
      shape: "rectangle",
      width,
      height,
      cornerRadius: height / 2,
      fill: p.color,
      transform: { position: { x: p.x, y: p.y } },
      ...motion,
    }),
    h(
      Title,
      {
        id: `${p.id}-text`,
        ...timing(t),
        font: "$heading",
        size: p.size,
        weight: 700,
        color: p.textColor,
        transform: { position: { x: p.x, y: p.y } },
        ...motion,
      },
      p.text,
    ),
  ];
}
