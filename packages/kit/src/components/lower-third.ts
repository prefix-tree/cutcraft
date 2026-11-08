import { z } from "zod";

import { Shape, Title } from "../jsx/elements";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

export const lowerThirdSchema = timingSchema.extend({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  /** `card`: on a surface card; `bar`: the words beside an accent bar, straight over the picture. */
  variant: z.enum(["card", "bar"]).default("card"),
  /** The card's centre, in pixels from the frame's centre. */
  x: z.number().default(-560),
  y: z.number().default(330),
  width: z.number().positive().default(640),
  accent: z.string().default("$primary"),
});

/**
 * A name and a role in the lower third of the frame: a surface card (or nothing) with an accent bar, the name in the
 * heading face and the role under it, sliding in.
 */
export function LowerThird(props: z.input<typeof lowerThirdSchema>) {
  const p = parse("LowerThird", lowerThirdSchema, props);
  const t = timingOf(p);
  const height = p.role ? 132 : 96;
  const left = p.x - p.width / 2;
  const textX = p.x + 18;
  const textWidth = p.width - 72;
  return [
    p.variant === "card" &&
      h(Shape, {
        id: `${p.id}-card`,
        ...timing(t),
        shape: "rectangle",
        width: p.width,
        height,
        fill: "$surface",
        cornerRadius: "$radius",
        transform: { position: { x: p.x, y: p.y } },
        enter: { type: "slide-up", duration: 0.45, easing: "easeOutCubic" },
        exit: { type: "fade", duration: 0.3 },
      }),
    h(Shape, {
      id: `${p.id}-bar`,
      ...timing(t, 0.1),
      shape: "rectangle",
      width: 8,
      height: height - 36,
      fill: p.accent,
      transform: { position: { x: left + 28, y: p.y } },
      enter: { type: "wipe-down", duration: 0.35 },
      exit: { type: "fade", duration: 0.3 },
    }),
    h(
      Title,
      {
        id: `${p.id}-name`,
        ...timing(t, 0.15),
        font: "$heading",
        size: 44,
        weight: 700,
        color: "$text",
        align: "left",
        width: textWidth,
        transform: { position: { x: textX, y: p.y - (p.role ? 20 : 0) } },
        enter: { type: "slide-right", duration: 0.45, easing: "easeOutCubic" },
        exit: { type: "fade", duration: 0.3 },
      },
      p.name,
    ),
    p.role &&
      h(
        Title,
        {
          id: `${p.id}-role`,
          ...timing(t, 0.3),
          font: "$body",
          size: 26,
          weight: 500,
          color: "$muted",
          align: "left",
          width: textWidth,
          transform: { position: { x: textX, y: p.y + 30 } },
          enter: { type: "fade", duration: 0.4 },
          exit: { type: "fade", duration: 0.3 },
        },
        p.role,
      ),
  ].filter(Boolean);
}
