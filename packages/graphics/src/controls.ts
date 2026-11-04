import { z } from "zod";

import { graphicKind } from "./index";

interface ControlBase {
  /** The prop it edits. */
  readonly name: string;
  readonly label: string;
  /** The value the kind uses when the prop is not written. */
  readonly default?: unknown;
  /** The prop may be left out (no default): clearing the control removes it. */
  readonly optional?: true;
}

/**
 * What an editor shows for one prop of a graphic kind, read from its schema: a number (a slider when it has both
 * bounds), a colour, a font, a line of text, a switch, a choice, or a list of items with their own controls.
 */
export type GraphicControl =
  | (ControlBase & {
      readonly type: "number";
      readonly min?: number;
      readonly max?: number;
      readonly step: number;
      readonly unit?: string;
    })
  | (ControlBase & { readonly type: "color" | "font" | "text" | "boolean" })
  | (ControlBase & { readonly type: "choice"; readonly options: readonly string[] })
  | (ControlBase & {
      readonly type: "list";
      readonly fields: readonly GraphicControl[];
      readonly min?: number;
      readonly max?: number;
    });

/**
 * The controls for a kind's own props (`graphicControls("counter")`), in the order the kind declares them; props an
 * editor cannot show are left out, and an unknown kind has none.
 * @deprecated Goes with the `<Graphic>` kinds.
 */
export function graphicControls(kindName: string): GraphicControl[] {
  const kind = graphicKind(kindName);
  if (!kind) return [];
  return Object.entries(kind.shape).flatMap(([name, schema]) => {
    const c = controlOf(name, schema as z.ZodType);
    return c ? [c] : [];
  });
}

type Meta = { control?: string; unit?: string };

function controlOf(name: string, schema: z.ZodType): GraphicControl | null {
  let s = schema,
    def: unknown,
    optional = false;
  const meta: Meta = { ...(z.globalRegistry.get(s) as Meta | undefined) };
  // Peel defaults and optionals, keeping the default and any marks on the way.
  for (;;) {
    if (s instanceof z.ZodDefault) def = s.def.defaultValue;
    else if (s instanceof z.ZodOptional) optional = true;
    else break;
    s = s.def.innerType as z.ZodType;
    Object.assign(meta, z.globalRegistry.get(s) as Meta | undefined);
  }
  const base = {
    name,
    label: labelOf(name),
    ...(def !== undefined ? { default: def } : {}),
    ...(optional && def === undefined ? { optional: true as const } : {}),
  };
  if (s instanceof z.ZodNumber) {
    // An integer schema carries the safe-integer range as its bounds: that is no bound to show.
    const bound = (v: number | null): number | undefined =>
      v !== null && Number.isFinite(v) && Math.abs(v) < Number.MAX_SAFE_INTEGER ? v : undefined;
    const min = bound(s.minValue),
      max = bound(s.maxValue);
    const step = s.isInt ? 1 : min !== undefined && max !== undefined && max - min <= 1 ? 0.01 : 0.1;
    return {
      ...base,
      type: "number",
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      step,
      ...(meta.unit ? { unit: meta.unit } : {}),
    };
  }
  if (s instanceof z.ZodString)
    return { ...base, type: meta.control === "color" ? "color" : meta.control === "font" ? "font" : "text" };
  if (s instanceof z.ZodBoolean) return { ...base, type: "boolean" };
  if (s instanceof z.ZodEnum) return { ...base, type: "choice", options: s.options.map(String) };
  if (s instanceof z.ZodArray && s.element instanceof z.ZodObject) {
    const fields = Object.entries(s.element.shape as Record<string, z.ZodType>).flatMap(([k, v]) => {
      const c = controlOf(k, v);
      return c ? [c] : [];
    });
    const bounds: { min?: number; max?: number } = {};
    for (const check of s.def.checks ?? []) {
      const d = check._zod.def as { check: string; minimum?: number; maximum?: number };
      if (d.check === "min_length" && d.minimum !== undefined) bounds.min = d.minimum;
      if (d.check === "max_length" && d.maximum !== undefined) bounds.max = d.maximum;
    }
    return { ...base, type: "list", fields, ...bounds };
  }
  return null;
}

/** `labelColor` → "Label color". */
function labelOf(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
