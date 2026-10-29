import type { Placement, RENDERED_EFFECTS } from "@cutcut/kit";
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

/**
 * Levels as `brightness(k) contrast(c)`: out = (in − black) / (white − black), with c = 1 + 2·black·s
 * and k = s/c for s = 1/(white − black). Gamma has no filter form; the lint reports it.
 */
function levels(p: Params): string {
  const black = Math.max(0, Math.min(1, num(p, ["black"], 0))), white = Math.max(0, Math.min(1, num(p, ["white"], 1)));
  if (white <= black) return "";
  const s = 1 / (white - black), c = 1 + 2 * black * s;
  return `brightness(${s / c}) contrast(${c})`;
}

// TODO(sharpen): no CSS filter form; needs a getImageData unsharp-mask pass in the painter (slow on 1080p, preview and export). Until then the not-rendered lint reports it.
/** Effects the painter draws over the element after it (`postEffects`), not as filters. */
const POST_TYPES = ["vignette", "grain"] as const;

/** One filter per rendered effect type: kit's RENDERED_EFFECTS, which the `not-rendered` lint reads, less the post effects. */
const CANVAS_FILTERABLE: Readonly<Record<Exclude<(typeof RENDERED_EFFECTS)[number], (typeof POST_TYPES)[number]>, (p: Params) => string>> = {
  brightness: (p) => `brightness(${1 + num(p, ["amount", "value"], 0) / 100})`,
  contrast: (p) => `contrast(${1 + num(p, ["amount", "value"], 0) / 100})`,
  saturation: (p) => `saturate(${1 + num(p, ["amount", "value"], 0) / 100})`,
  hue: (p) => `hue-rotate(${num(p, ["angle", "amount", "value"], 0)}deg)`,
  blur: (p) => `blur(${num(p, ["radius", "amount", "value"], 4)}px)`,
  grayscale: (p) => `grayscale(${num(p, ["amount", "value"], 100) / 100})`,
  sepia: (p) => `sepia(${num(p, ["amount", "value"], 100) / 100})`,
  invert: (p) => `invert(${num(p, ["amount", "value"], 100) / 100})`,
  temperature: (p) => colorGradeFilters({ temperature: num(p, ["amount", "value"], 0) }).join(" "),
  tint: (p) => colorGradeFilters({ tint: num(p, ["amount", "value"], 0) }).join(" "),
  levels,
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
      if ((POST_TYPES as readonly string[]).includes(type)) continue;
      const make = CANVAS_FILTERABLE[type as keyof typeof CANVAS_FILTERABLE] as ((p: Params) => string) | undefined;
      if (make) {
        const f = make((c.props.params ?? {}) as Params);
        if (f) parts.push(f);
      } else {
        unsupported.push(type);
        devWarn(`effect:${elementId}:${type}`, `effect "${type}" on "${elementId}" is not rendered by the browser player`);
      }
    } else if (c.kind === "colorGrade") {
      parts.push(...colorGradeFilters(c.props));
    }
  }
  return { filter: parts.join(" "), unsupported };
}

export type PostEffect = { readonly type: "vignette"; readonly amount: number } | { readonly type: "grain"; readonly amount: number; readonly seed: number };

/** Vignette and grain, in order, with `amount` on 0..1; grain is seeded by the frame, so a frame always looks the same. */
export function postEffects(children: readonly Placement[], frame: number): PostEffect[] | undefined {
  const out: PostEffect[] = [];
  for (const c of children) {
    if (c.kind !== "effect" || c.props.enabled === false) continue;
    const amount = Math.max(0, Math.min(1, num((c.props.params ?? {}) as Params, ["amount", "intensity", "value"], c.props.type === "grain" ? 20 : 50) / 100));
    if (amount <= 0) continue;
    if (c.props.type === "vignette") out.push({ type: "vignette", amount });
    else if (c.props.type === "grain") out.push({ type: "grain", amount, seed: frame });
  }
  return out.length ? out : undefined;
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
