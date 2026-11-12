import { z } from "zod";

import { Shape } from "../jsx/elements";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

export const frameSchema = timingSchema.extend({
  id: z.string(),
  /** The frame's centre from the frame's centre, and its size, in pixels. */
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().default("$accent"),
  thickness: z.number().positive().default(8),
  cornerRadius: z.number().min(0).default(28),
});

/** A rounded border around part of the picture: the speaker under a card, a screen, a detail. */
export function Frame(props: z.input<typeof frameSchema>) {
  const p = parse("Frame", frameSchema, props);
  return [
    h(Shape, {
      id: p.id,
      ...timing(timingOf(p)),
      shape: "rectangle",
      width: p.width,
      height: p.height,
      cornerRadius: p.cornerRadius,
      fill: { type: "none" },
      stroke: { color: p.color, width: p.thickness },
      transform: { position: { x: p.x, y: p.y } },
      enter: { type: "fade", duration: 0.25 },
      exit: { type: "fade", duration: 0.2 },
    }),
  ];
}
