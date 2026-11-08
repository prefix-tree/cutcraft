import { z } from "zod";

import { Keyframe, Shape } from "../jsx/elements";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

export const progressBarSchema = timingSchema.extend({
  id: z.string(),
  /** How full it ends, 0 to 1. */
  value: z.number().min(0).max(1).default(1),
  x: z.number().default(0),
  y: z.number().default(440),
  width: z.number().positive().default(1200),
  height: z.number().positive().default(14),
  color: z.string().default("$primary"),
  /** Seconds it takes to fill. */
  fillFor: z.number().positive().default(1.2),
});

/** A bar that fills from the left to its value: a track and a fill keyed in width, its left edge held still. */
export function ProgressBar(props: z.input<typeof progressBarSchema>) {
  const p = parse("ProgressBar", progressBarSchema, props);
  const t = timingOf(p);
  const left = p.x - p.width / 2;
  const radius = p.height / 2;
  const easing = "easeInOutCubic";
  return [
    h(Shape, {
      id: `${p.id}-track`,
      ...timing(t),
      shape: "rectangle",
      width: p.width,
      height: p.height,
      cornerRadius: radius,
      fill: { type: "solid", color: "$muted", opacity: 0.35 },
      transform: { position: { x: p.x, y: p.y } },
      enter: { type: "fade", duration: 0.3 },
      exit: { type: "fade", duration: 0.3 },
    }),
    // The fill is the whole bar scaled in x about its centre; its centre moves with it, so the left edge stays put.
    h(
      Shape,
      {
        id: `${p.id}-fill`,
        ...timing(t),
        shape: "rectangle",
        width: p.width,
        height: p.height,
        cornerRadius: radius,
        fill: p.color,
        transform: { position: { x: left, y: p.y }, scale: { x: 0, y: 1 } },
        exit: { type: "fade", duration: 0.3 },
      },
      h(Keyframe, { id: `${p.id}-fill-x0`, property: "transform.position.x", at: 0, value: left }),
      h(Keyframe, {
        id: `${p.id}-fill-x1`,
        property: "transform.position.x",
        at: p.fillFor,
        value: left + (p.width * p.value) / 2,
        easing,
      }),
      h(Keyframe, { id: `${p.id}-fill-s0`, property: "transform.scale.x", at: 0, value: 0 }),
      h(Keyframe, { id: `${p.id}-fill-s1`, property: "transform.scale.x", at: p.fillFor, value: p.value, easing }),
    ),
  ];
}
