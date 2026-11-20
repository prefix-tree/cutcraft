import { z } from "zod";

import { Keyframe, Shape } from "../jsx/elements";
import { centre, centreOf, h, parse, timing, timingOf, timingSchema } from "./shared";

export const progressBarSchema = timingSchema.extend({
  /** The component's id; each of its parts' ids starts with it. */
  id: z.string(),
  /** How full it ends, 0 to 1. */
  value: z.number().min(0).max(1).default(1),
  /** Where the bar's centre sits, in pixels from the frame's top left. Left out: centred across the frame, and at `y: 980`, set for a 1920 by 1080 frame. */
  box: centre(undefined, 980),
  /** The full bar's length in pixels. */
  width: z.number().positive().default(1200),
  /** The bar's thickness in pixels; its ends are rounded. */
  height: z.number().positive().default(14),
  /** The fill's colour; the track under it is a faint `$muted`. */
  color: z.string().default("$primary"),
  /** Seconds it takes to fill. */
  fillFor: z.number().positive().default(1.2),
});

/** A bar that fills from the left to its value: a track and a fill keyed in width, its left edge held still. */
export function ProgressBar(props: z.input<typeof progressBarSchema>) {
  const p = parse("ProgressBar", progressBarSchema, props);
  const c = centreOf(p.box);
  const t = timingOf(p);
  const left = c.x - p.width / 2;
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
      box: { x: c.x, y: c.y, origin: "center" },
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
        box: { x: left, y: c.y, origin: "center" },
        transform: { scale: { x: 0, y: 1 } },
        exit: { type: "fade", duration: 0.3 },
      },
      // A segment eases by the key it leaves, so the easing sits on the first key of each move.
      h(Keyframe, { id: `${p.id}-fill-x0`, property: "box.x", at: 0, value: left, easing }),
      h(Keyframe, {
        id: `${p.id}-fill-x1`,
        property: "box.x",
        at: p.fillFor,
        value: left + (p.width * p.value) / 2,
      }),
      h(Keyframe, { id: `${p.id}-fill-s0`, property: "transform.scale.x", at: 0, value: 0, easing }),
      h(Keyframe, { id: `${p.id}-fill-s1`, property: "transform.scale.x", at: p.fillFor, value: p.value }),
    ),
  ];
}
