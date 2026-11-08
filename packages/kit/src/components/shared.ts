// What every ready-made component shares: the timing props it passes to each of its parts, a later start for parts
// that come in after the first, and a short way to make an element without JSX (the kit has no JSX build step).
import { createElement, type ReactElement } from "react";
import { z } from "zod";

/** The timing props a component takes and hands to each of its parts, as any element takes them. */
export const timingSchema = z.object({
  start: z.number().min(0).optional(),
  anchor: z.string().optional(),
  at: z.string().optional(),
  offset: z.number().optional(),
  duration: z.union([z.number().positive(), z.literal("fill")]).optional(),
});
export type Timing = z.infer<typeof timingSchema>;

/** A point in pixels from the frame's centre, as every element's `transform.position`. */
export const pointSchema = z.object({ x: z.number(), y: z.number() });

/** The timing a part gets: the component's own, starting `delay` seconds later and ending with the rest. */
export function timing(t: Timing, delay = 0): Timing {
  const duration = typeof t.duration === "number" ? Math.max(0.1, t.duration - delay) : t.duration;
  const out: Timing = { ...(duration !== undefined ? { duration } : {}) };
  if (t.anchor !== undefined)
    return {
      ...out,
      anchor: t.anchor,
      ...(t.at !== undefined ? { at: t.at } : {}),
      ...(t.offset !== undefined || delay ? { offset: (t.offset ?? 0) + delay } : {}),
    };
  return { ...out, start: (t.start ?? 0) + delay };
}

/** Only the timing props of a component's props. */
export function timingOf(props: Record<string, unknown>): Timing {
  return timingSchema.parse(Object.fromEntries(Object.entries(props).filter(([k]) => k in timingSchema.shape)));
}

// biome-ignore lint/suspicious/noExplicitAny: element components take their own typed props.
export const h = (type: any, props: Record<string, unknown>, ...children: unknown[]): ReactElement =>
  createElement(type, props, ...(children as never[]));

/** A component's own props parsed against its schema, so defaults apply and a wrong value says which. */
export function parse<S extends z.ZodTypeAny>(name: string, schema: S, props: unknown): z.infer<S> {
  const result = schema.safeParse(props);
  if (!result.success)
    throw new Error(
      `${name}: ${result.error.issues.map((i) => `${i.path.join(".") || "props"} ${i.message}`).join("; ")}`,
    );
  return result.data;
}

/** A box in pixels from the frame's centre: its top-left corner and its size. */
export interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * `<Svg>` props for a drawing whose coordinates are pixels from the frame's centre, like every element's position:
 * the markup's viewBox is the box, and the element sits at the box's centre.
 */
export function svgIn(box: Box, body: string): { content: string; transform: { position: { x: number; y: number } } } {
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r(box.minX)} ${r(box.minY)} ${r(box.width)} ${r(box.height)}">${body}</svg>`,
    transform: { position: { x: r(box.minX + box.width / 2), y: r(box.minY + box.height / 2) } },
  };
}
