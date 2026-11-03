import { z } from "zod";

import type { GraphicContext } from "./types";

/** A colour or a `$token`; marked so an editor shows a colour control. */
export const color = (fallback: string) => z.string().min(1).default(fallback).meta({ control: "color" });
/** A font family or a `$token`; marked so an editor shows a font control. */
export const font = (fallback: string) => z.string().min(1).default(fallback).meta({ control: "font" });
export const text = (fallback: string) => z.string().default(fallback);
export const px = (fallback: number, max = 4000) => z.number().min(0).max(max).default(fallback);
export const weight = (fallback: number) => z.number().int().min(100).max(900).default(fallback);
export const unit = (fallback: number) => z.number().min(0).max(1).default(fallback);
/** A length in pixels, or a theme token such as `$radius`. */
export const length = (fallback: number | string) =>
  z.union([z.number().min(0), z.string().regex(/^\$[A-Za-z][A-Za-z0-9_-]*$/)]).default(fallback as never);

export function lengthOf(v: number | string, ctx: GraphicContext): number {
  const x = typeof v === "number" ? v : Number(ctx.value(v));
  return Number.isFinite(x) ? x : 0;
}

/** A number formatted for SVG: at most two decimals, no trailing zeros. */
export function n(v: number): string {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** An element: `el("rect", { x: 1, fill: "#fff" })`. Undefined attributes are left out. */
export function el(name: string, attrs: Readonly<Record<string, string | number | undefined>>, children = ""): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${escapeXml(typeof v === "number" ? n(v) : String(v))}"`)
    .join("");
  return children ? `<${name}${a}>${children}</${name}>` : `<${name}${a}/>`;
}

/** The root `<svg>` for a box. */
export function svg(width: number, height: number, body: string, defs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${n(width)} ${n(height)}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
}

/** A deterministic generator in [0, 1) from a seed (mulberry32). */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A string's hash, for seeding from an id. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A generous width of a line of text, to size a box around it before layout:
 * it errs wide (the widest of the bundled faces), since a box that is too
 * narrow wraps the text and one that is a little wide only adds padding.
 */
export function textWidth(s: string, size: number, letterSpacing = 0): number {
  let w = 0;
  for (const ch of s)
    w += /[MW@%]/.test(ch)
      ? 0.92
      : /[A-Z0-9#&]/.test(ch)
        ? 0.72
        : /[il.,:;'|!]/.test(ch)
          ? 0.3
          : ch === " "
            ? 0.32
            : 0.6;
  return w * size + Math.max(0, s.length - 1) * letterSpacing;
}

/** A rectangle with rounded corners as a path, radius clamped to the box. */
export function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  if (k === 0) return `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`;
  return `M${n(x + k)} ${n(y)}H${n(x + w - k)}A${n(k)} ${n(k)} 0 0 1 ${n(x + w)} ${n(y + k)}V${n(y + h - k)}A${n(k)} ${n(k)} 0 0 1 ${n(x + w - k)} ${n(y + h)}H${n(x + k)}A${n(k)} ${n(k)} 0 0 1 ${n(x)} ${n(y + h - k)}V${n(y + k)}A${n(k)} ${n(k)} 0 0 1 ${n(x + k)} ${n(y)}Z`;
}

/**
 * A wobbly line through points, as if drawn by hand: each segment is a cubic
 * whose control points are pushed off the straight line by up to `wobble` px.
 */
export function handPath(points: readonly (readonly [number, number])[], wobble: number, rnd: () => number): string {
  if (points.length === 0) return "";
  const [x0, y0] = points[0]!;
  let d = `M${n(x0)} ${n(y0)}`;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]!;
    const [bx, by] = points[i]!;
    const j = () => (rnd() - 0.5) * 2 * wobble;
    d += `C${n(ax + (bx - ax) / 3 + j())} ${n(ay + (by - ay) / 3 + j())} ${n(ax + (2 * (bx - ax)) / 3 + j())} ${n(ay + (2 * (by - ay)) / 3 + j())} ${n(bx)} ${n(by)}`;
  }
  return d;
}

/** `#rrggbb` (or `#rgb`) mixed toward `toward` by `k`; other colour syntaxes come back unchanged. */
export function mix(c: string, toward: string, k: number): string {
  const a = rgb(c),
    b = rgb(toward);
  if (!a || !b) return c;
  const ch = (i: 0 | 1 | 2) =>
    Math.round(a[i] + (b[i] - a[i]) * k)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

function rgb(c: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const h =
    m[1]!.length === 3
      ? m[1]!
          .split("")
          .map((x) => x + x)
          .join("")
      : m[1]!;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const easeOut = (v: number): number => 1 - (1 - clamp01(v)) ** 3;

/** How far an animation of `seconds` is at `t`, eased out; 1 when it takes no time. */
export const progress = (t: number, seconds: number): number => (seconds > 0 ? easeOut(t / seconds) : 1);

/** A number with `decimals` places, grouped in thousands (`1,234.5`) unless `grouping` is false; the same in every locale. */
export function formatNumber(v: number, decimals: number, grouping = true): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  });
}
