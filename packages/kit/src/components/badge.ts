import { z } from "zod";

import { Shape, Title } from "../jsx/elements";
import { centre, centreOf, h, parse, timing, timingOf, timingSchema } from "./shared";

export const badgeSchema = timingSchema.extend({
  /** The component's id; each of its parts' ids starts with it. */
  id: z.string(),
  /** The word on the pill; the pill widens to fit it. */
  text: z.string(),
  /** Where the pill's centre sits, in pixels from the frame's top left. Left out: centred on the frame. */
  box: centre(),
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
  const c = centreOf(p.box);
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
      box: { x: c.x, y: c.y, origin: "center" },
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
        box: { x: c.x, y: c.y, origin: "center" },
        ...motion,
      },
      p.text,
    ),
  ];
}
