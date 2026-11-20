import { z } from "zod";

import { Shape, Title } from "../jsx/elements";
import { centre, centreOf, h, parse, timing, timingOf, timingSchema } from "./shared";

export const lowerThirdSchema = timingSchema.extend({
  /** The component's id; each of its parts' ids starts with it. */
  id: z.string(),
  /** The name, in the heading face. */
  name: z.string(),
  /** The line under the name, in the body face. Left out: a shorter card with the name alone. */
  role: z.string().optional(),
  /** `card`: on a surface card; `bar`: the words beside an accent bar, straight over the picture. */
  variant: z.enum(["card", "bar"]).default("card"),
  /** Where the card's centre sits, in pixels from the frame's top left. Left out: `{ x: 400, y: 870 }`, set for a 1920 by 1080 frame (give it a box on another size). */
  box: centre(400, 870),
  /** The card's width in pixels; the words wrap inside it. */
  width: z.number().positive().default(640),
  /** The colour of the bar beside the words. */
  accent: z.string().default("$primary"),
  /** The name's size in pixels; the role, the card and the bar scale with it. */
  size: z.number().positive().default(44),
});

/**
 * A name and a role in the lower third of the frame: a surface card (or nothing) with an accent bar, the name in the
 * heading face and the role under it, sliding in.
 */
export function LowerThird(props: z.input<typeof lowerThirdSchema>) {
  const p = parse("LowerThird", lowerThirdSchema, props);
  const c = centreOf(p.box);
  const t = timingOf(p);
  // Every measure below was drawn for a 44 px name; `k` keeps them in proportion at any size.
  const k = p.size / 44;
  const height = (p.role ? 132 : 96) * k;
  const left = c.x - p.width / 2;
  const textX = c.x + 18 * k;
  const textWidth = p.width - 72 * k;
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
        box: { x: c.x, y: c.y, origin: "center" },
        enter: { type: "slide-up", duration: 0.45, easing: "easeOutCubic" },
        exit: { type: "fade", duration: 0.3 },
      }),
    h(Shape, {
      id: `${p.id}-bar`,
      ...timing(t, 0.1),
      shape: "rectangle",
      width: 8 * k,
      height: height - 36 * k,
      fill: p.accent,
      box: { x: left + 28 * k, y: c.y, origin: "center" },
      enter: { type: "wipe-down", duration: 0.35 },
      exit: { type: "fade", duration: 0.3 },
    }),
    h(
      Title,
      {
        id: `${p.id}-name`,
        ...timing(t, 0.15),
        font: "$heading",
        size: p.size,
        weight: 700,
        color: "$text",
        align: "left",
        width: textWidth,
        box: { x: textX, y: c.y - (p.role ? 20 * k : 0), origin: "center" },
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
          size: Math.round(26 * k),
          weight: 500,
          color: "$muted",
          align: "left",
          width: textWidth,
          box: { x: textX, y: c.y + 30 * k, origin: "center" },
          enter: { type: "fade", duration: 0.4 },
          exit: { type: "fade", duration: 0.3 },
        },
        p.role,
      ),
  ].filter(Boolean);
}
