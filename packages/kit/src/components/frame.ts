import { z } from "zod";

import { Shape } from "../jsx/elements";
import { centre, h, parse, timing, timingOf, timingSchema } from "./shared";

export const frameSchema = timingSchema.extend({
  /** The id of the element it draws. */
  id: z.string(),
  /** Where the border's centre sits, in pixels from the frame's top left. Left out: `{ x: 960, y: 540 }`, on a 1920 by 1080 frame. */
  box: centre(960, 540),
  /** The border's width in pixels. */
  width: z.number().positive(),
  /** The border's height in pixels. */
  height: z.number().positive(),
  /** The border's colour. */
  color: z.string().default("$accent"),
  /** The border's line thickness in pixels. */
  thickness: z.number().positive().default(8),
  /** How round the corners are, in pixels. */
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
      box: { x: p.box.x, y: p.box.y, origin: "center" },
      enter: { type: "fade", duration: 0.25 },
      exit: { type: "fade", duration: 0.2 },
    }),
  ];
}
