import { z } from "zod";

import { Layer, Title } from "../jsx/elements";
import { useLayer } from "../jsx/use-t";
import { h, parse, timing, timingOf, timingSchema } from "./shared";

export const counterSchema = timingSchema.extend({
  id: z.string(),
  from: z.number().default(0),
  to: z.number(),
  decimals: z.number().int().min(0).max(4).default(0),
  prefix: z.string().default(""),
  suffix: z.string().default(""),
  label: z.string().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
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
        transform: `translate(${props.x}px, ${props.y}px)`,
        font: `800 ${props.size}px var(--cc-heading, Inter), sans-serif`,
        color: "var(--cc-text, #ffffff)",
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
  const { from, to, decimals, prefix, suffix, x, y, size, countFor } = p;
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
          transform: { position: { x, y: y + size * 0.72 } },
          enter: { type: "fade", duration: 0.4 },
          exit: { type: "fade", duration: 0.3 },
        },
        p.label,
      ),
  ].filter(Boolean);
}
