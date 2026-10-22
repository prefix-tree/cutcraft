import type { Placement } from "@cutcut/kit";
import { devWarn } from "../warn";

export interface FilterResult { readonly filter: string; readonly unsupported: readonly string[] }

type Params = Readonly<Record<string, unknown>>;

function num(params: Params, keys: readonly string[], fallback: number): number {
  for (const k of keys) {
    const v = params[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return fallback;
}

const CANVAS_FILTERABLE: Readonly<Record<string, (p: Params) => string>> = {
  brightness: (p) => `brightness(${1 + num(p, ["amount", "value"], 0) / 100})`,
  contrast: (p) => `contrast(${1 + num(p, ["amount", "value"], 0) / 100})`,
  saturation: (p) => `saturate(${1 + num(p, ["amount", "value"], 0) / 100})`,
  hue: (p) => `hue-rotate(${num(p, ["angle", "amount", "value"], 0)}deg)`,
  blur: (p) => `blur(${num(p, ["radius", "amount", "value"], 4)}px)`,
  grayscale: (p) => `grayscale(${num(p, ["amount", "value"], 100) / 100})`,
  sepia: (p) => `sepia(${num(p, ["amount", "value"], 100) / 100})`,
  invert: (p) => `invert(${num(p, ["amount", "value"], 100) / 100})`,
  shadow: (p) => `drop-shadow(${num(p, ["x"], 0)}px ${num(p, ["y"], 4)}px ${num(p, ["blur"], 8)}px ${typeof p.color === "string" ? p.color : "rgba(0,0,0,0.5)"})`,
};

/** A single canvas/CSS `filter` string for an element's effect and colour-grade children; unsupported types are listed. */
export function filterString(children: readonly Placement[], elementId: string): FilterResult {
  const parts: string[] = [];
  const unsupported: string[] = [];
  for (const c of children) {
    if (c.kind === "effect") {
      if (c.props.enabled === false) continue;
      const type = String(c.props.type);
      const make = CANVAS_FILTERABLE[type];
      if (make) parts.push(make((c.props.params ?? {}) as Params));
      else {
        unsupported.push(type);
        devWarn(`effect:${elementId}:${type}`, `effect "${type}" on "${elementId}" is not rendered by the browser player`);
      }
    } else if (c.kind === "colorGrade") {
      parts.push(...colorGradeFilters(c.props));
    }
  }
  return { filter: parts.join(" "), unsupported };
}

/**
 * Temperature and tint approximated with CSS filters: warm pulls toward
 * sepia, cool toward a slight hue rotation; tint rotates hue. Wheels, curves,
 * LUTs and HSL bands are not rendered by the browser player.
 */
function colorGradeFilters(props: Readonly<Record<string, unknown>>): string[] {
  const out: string[] = [];
  const temperature = typeof props.temperature === "number" ? props.temperature : 0;
  const tint = typeof props.tint === "number" ? props.tint : 0;
  if (temperature > 0) out.push(`sepia(${(temperature / 100) * 0.5})`);
  else if (temperature < 0) out.push(`hue-rotate(${-temperature / 10}deg) saturate(${1 + -temperature / 200})`);
  if (tint !== 0) out.push(`hue-rotate(${tint / 4}deg)`);
  return out;
}
