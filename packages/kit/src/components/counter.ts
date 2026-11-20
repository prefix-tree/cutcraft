import { z } from "zod";

import { Layer, Title } from "../jsx/elements";
import { useLayer } from "../jsx/use-t";
import { centre, h, parse, timing, timingOf, timingSchema } from "./shared";

export const counterSchema = timingSchema.extend({
  /** The component's id; each of its parts' ids starts with it. */
  id: z.string(),
  /** The number it counts from. */
  from: z.number().default(0),
  /** The number it counts to and then holds. */
  to: z.number(),
  /** How many digits show after the decimal point. */
  decimals: z.number().int().min(0).max(4).default(0),
  /** Text before the number, such as `$`. */
  prefix: z.string().default(""),
  /** Text after the number, such as `%`. */
  suffix: z.string().default(""),
  /** A line under the number, in the body face and the muted colour. Left out: the number alone. */
  label: z.string().optional(),
  /** Where the number's centre sits, in pixels from the frame's top left. Left out: `{ x: 960, y: 540 }`, on a 1920 by 1080 frame. */
  box: centre(960, 540),
  /** The number's letter height in pixels; the label is about a fifth of it. */
  size: z.number().positive().default(140),
  /** Seconds the count takes; it then holds. */
  countFor: z.number().positive().default(1.5),
});

/** The number itself, drawn each frame inside the counter's Layer: eased from `from` to `to`, then held. */
export function CounterValue(props: {
  from: number;
  to: number;
  decimals: number;
  prefix: string;
  suffix: string;
  x: number;
  y: number;
  size: number;
  countFor: number;
}) {
  const { elapsed } = useLayer();
  const q = Math.min(1, elapsed / props.countFor);
  const eased = 1 - (1 - q) ** 3;
  const value = props.from + (props.to - props.from) * eased;
  const text = `${props.prefix}${value.toLocaleString("en-US", {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  })}${props.suffix}`;
  return h(
    "div",
    {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `translate(calc(${props.x}px - 50%), calc(${props.y}px - 50%))`,
        font: `800 ${props.size}px var(--us-heading, Inter), sans-serif`,
        color: "var(--us-text, #ffffff)",
        fontVariantNumeric: "tabular-nums",
      },
    },
    text,
  );
}

/** A number that counts up (or down) to its value, with a label under it. */
export function Counter(props: z.input<typeof counterSchema>) {
  const p = parse("Counter", counterSchema, props);
  const t = timingOf(p);
  const { from, to, decimals, prefix, suffix, size, countFor } = p;
  const { x, y } = p.box;
  return [
    h(
      Layer,
      {
        id: `${p.id}-value`,
        ...timing(t),
        enter: { type: "fade", duration: 0.3 },
        exit: { type: "fade", duration: 0.3 },
      },
      h(CounterValue, { from, to, decimals, prefix, suffix, x, y, size, countFor }),
    ),
    p.label &&
      h(
        Title,
        {
          id: `${p.id}-label`,
          ...timing(t, 0.2),
          font: "$body",
          size: Math.round(size * 0.22),
          weight: 500,
          color: "$muted",
          box: { x, y: y + size * 0.72, origin: "center" },
          enter: { type: "fade", duration: 0.4 },
          exit: { type: "fade", duration: 0.3 },
        },
        p.label,
      ),
  ].filter(Boolean);
}
