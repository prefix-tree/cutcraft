import { z } from "zod";

import { Shape, Title } from "../jsx/elements";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

export const badgeSchema = timingSchema.extend({
  /** The component's id; each of its parts' ids starts with it. */
  id: z.string(),
  /** The word on the pill; the pill widens to fit it. */
  text: z.string(),
  /** The pill's centre, in pixels from the frame's centre. */
  x: z.number().default(0),
  /** The pill's centre, in pixels below the frame's centre. */
  y: z.number().default(0),
  /** Letter height in pixels; the pill scales with it. */
  size: z.number().positive().default(30),
  /** The pill's colour. */
  color: z.string().default("$accent"),
  /** The letters' colour. */
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
