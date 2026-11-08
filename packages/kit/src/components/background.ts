import { z } from "zod";

import { Svg } from "../jsx/elements";
import { h, parse, svgIn, timing, timingOf, timingSchema } from "./shared";

export const backgroundSchema = timingSchema.extend({
  id: z.string(),
  /** `gradient` from one colour to the other, `dots` or `grid` in the second colour over the first. */
  variant: z.enum(["gradient", "dots", "grid"]).default("gradient"),
  /** The frame's size: a background covers it. */
  width: z.number().positive().default(1920),
  height: z.number().positive().default(1080),
  colors: z.tuple([z.string(), z.string()]).default(["$background", "$primary"]),
  /** The dots' or the grid's spacing, in pixels. */
  spacing: z.number().positive().default(48),
});

/** A full-frame backdrop to put on a track beneath everything: a gradient, dots or a grid. */
export function Background(props: z.input<typeof backgroundSchema>) {
  const p = parse("Background", backgroundSchema, props);
  const t = timingOf(p);
  const [a, b] = p.colors;
  const box = { minX: -p.width / 2, minY: -p.height / 2, width: p.width, height: p.height };
  const s = p.spacing;
  const pattern = {
    gradient: "",
    dots: `<pattern id="${p.id}-p" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 12}" fill="${b}" fill-opacity="0.5"/></pattern>`,
    grid: `<pattern id="${p.id}-p" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><path d="M${s} 0H0V${s}" stroke="${b}" stroke-opacity="0.35" stroke-width="1.5" fill="none"/></pattern>`,
  }[p.variant];
  const fill =
    p.variant === "gradient"
      ? `<defs><linearGradient id="${p.id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect x="${box.minX}" y="${box.minY}" width="${p.width}" height="${p.height}" fill="url(#${p.id}-g)"/>`
      : `<defs>${pattern}</defs><rect x="${box.minX}" y="${box.minY}" width="${p.width}" height="${p.height}" fill="${a}"/><rect x="${box.minX}" y="${box.minY}" width="${p.width}" height="${p.height}" fill="url(#${p.id}-p)"/>`;
  return [h(Svg, { id: p.id, ...timing(t), ...svgIn(box, fill) })];
}
