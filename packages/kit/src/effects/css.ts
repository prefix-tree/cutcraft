// Effects drawn as a CSS filter, with the filter each one writes, and the CSS fallbacks of the shader effects that have
// one (a painter without WebGL, an overlay without HTML-in-Canvas). Pure string builders; the player applies them.
// Units are today's (percentages, -100..100); RFC 0001 step 4 moves them to fractions.
import { z } from "zod";

type Params = Readonly<Record<string, unknown>>;

/** A param's number, or `fallback` when the params were not filled by the resolver (a renderer's own tests). */
function num(p: Params, key: string, fallback: number): number {
  const v = p[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Temperature and tint approximated with CSS filters: warm pulls toward sepia, cool toward a slight hue rotation; tint
 * rotates hue. Shared by the `temperature` and `tint` effects and `<ColorGrade>`.
 */
export function colorGradeFilters(props: Params): string[] {
  const out: string[] = [];
  const temperature = typeof props.temperature === "number" ? props.temperature : 0;
  const tint = typeof props.tint === "number" ? props.tint : 0;
  if (temperature > 0) out.push(`sepia(${(temperature / 100) * 0.5})`);
  else if (temperature < 0) out.push(`hue-rotate(${-temperature / 10}deg) saturate(${1 + -temperature / 200})`);
  if (tint !== 0) out.push(`hue-rotate(${tint / 4}deg)`);
  return out;
}

const percent = (fallback: number) => z.number().min(-100).max(100).default(fallback);
const share = (fallback: number) => z.number().min(0).max(100).default(fallback);

/** An effect drawn as a CSS filter: its params and the filter it writes. */
export interface CssEffect {
  readonly params: z.ZodObject;
  readonly css: (p: Params) => string;
}

const css = <S extends z.ZodRawShape>(shape: S, write: (p: Params) => string): CssEffect => ({
  params: z.strictObject(shape),
  css: write,
});

export const brightness = css({ amount: percent(0) }, (p) => `brightness(${1 + num(p, "amount", 0) / 100})`);
export const contrast = css({ amount: percent(0) }, (p) => `contrast(${1 + num(p, "amount", 0) / 100})`);
export const saturation = css({ amount: percent(0) }, (p) => `saturate(${1 + num(p, "amount", 0) / 100})`);
export const hue = css({ angle: z.number().default(0) }, (p) => `hue-rotate(${num(p, "angle", 0)}deg)`);
export const blur = css({ radius: z.number().min(0).max(200).default(4) }, (p) => `blur(${num(p, "radius", 4)}px)`);
export const grayscale = css({ amount: share(100) }, (p) => `grayscale(${num(p, "amount", 100) / 100})`);
export const sepia = css({ amount: share(100) }, (p) => `sepia(${num(p, "amount", 100) / 100})`);
export const invert = css({ amount: share(100) }, (p) => `invert(${num(p, "amount", 100) / 100})`);
export const temperature = css({ amount: percent(0) }, (p) =>
  colorGradeFilters({ temperature: num(p, "amount", 0) }).join(" "),
);
export const tint = css({ amount: percent(0) }, (p) => colorGradeFilters({ tint: num(p, "amount", 0) }).join(" "));
export const shadow = css(
  {
    x: z.number().default(0),
    y: z.number().default(4),
    blur: z.number().min(0).max(200).default(8),
    color: z.string().default("rgba(0,0,0,0.5)"),
  },
  (p) =>
    `drop-shadow(${num(p, "x", 0)}px ${num(p, "y", 4)}px ${num(p, "blur", 8)}px ${typeof p.color === "string" ? p.color : "rgba(0,0,0,0.5)"})`,
);

/** The CSS fallbacks of shader effects, used where the shader cannot run. */
export const FALLBACKS = {
  /**
   * Levels as `brightness(k) contrast(c)`: out = (in − black) / (white − black), with c = 1 + 2·black·s and k = s/c
   * for s = 1/(white − black). Gamma has no filter form.
   */
  levels: (p: Params): string => {
    const black = Math.max(0, Math.min(1, num(p, "black", 0))),
      white = Math.max(0, Math.min(1, num(p, "white", 1)));
    if (white <= black) return "";
    const s = 1 / (white - black),
      c = 1 + 2 * black * s;
    return `brightness(${s / c}) contrast(${c})`;
  },
  /** Exposure as brightness of the encoded values. */
  exposure: (p: Params): string => `brightness(${2 ** num(p, "stops", 0)})`,
  /** Vibrance as plain saturation at half strength. */
  vibrance: (p: Params): string => `saturate(${1 + num(p, "amount", 0) / 2})`,
  /** A glow as a coloured shadow under the element, stacked for intensity. */
  glow: (p: Params): string => {
    const colour = typeof p.color === "string" ? p.color : "#ffffff";
    const layer = `drop-shadow(0 0 ${num(p, "radius", 20) / 2}px ${colour})`;
    return Array.from({ length: Math.max(1, Math.min(4, Math.round(num(p, "intensity", 1)))) }, () => layer).join(" ");
  },
};
