import { overlayLayout, type ElementProps, type OverlayLayout } from "./layout";
import { prepareSvg, type PreparedSvg } from "./svg";

/**
 * A `<Shape>` as SVG markup, drawn through `prepareSvg` like any SVG so the
 * preview and the export agree: geometry, solid or gradient fill and stroke,
 * dashes, caps and joins, per-corner radii and drop shadows.
 */

interface Gradient {
  readonly type: "linear" | "radial" | "conic";
  readonly angle?: number;
  readonly center?: { readonly x: number; readonly y: number };
  readonly stops: readonly { readonly offset: number; readonly color: string; readonly opacity?: number }[];
}
type Fill = string | { type: "solid" | "gradient" | "none"; color?: string; gradient?: Gradient; opacity?: number } | undefined;
interface Stroke {
  readonly color: string; readonly width: number; readonly opacity?: number; readonly dashArray?: readonly number[];
  readonly dashOffset?: number; readonly lineCap?: string; readonly lineJoin?: string; readonly gradient?: Gradient;
}
interface Shadow { readonly color: string; readonly blur?: number; readonly x?: number; readonly y?: number; readonly spread?: number; readonly inset?: boolean }
interface Radii { readonly topLeft: number; readonly topRight: number; readonly bottomRight: number; readonly bottomLeft: number }

export interface ShapeMarkup {
  readonly markup: string;
  readonly size: { readonly width: number; readonly height: number };
  /** Pixels the stroke and shadows reach past the box on any side. */
  readonly bleed: number;
  readonly warnings: readonly string[];
}

/** The size a shape draws at, before layout. */
export function shapeSize(p: ElementProps): { width: number; height: number } {
  return { width: Number(p.placement.props.width ?? 200), height: Number(p.placement.props.height ?? 200) };
}

export function shapeMarkup(props: Readonly<Record<string, unknown>>, size: { width: number; height: number }): ShapeMarkup {
  const { width: w, height: h } = size;
  const warnings: string[] = [];
  const defs: string[] = [];
  const attrs: Record<string, string> = {};

  const fill = props.fill as Fill;
  if (typeof fill === "string") attrs.fill = fill;
  else if (!fill) attrs.fill = "#ffffff";
  else if (fill.type === "none") attrs.fill = "none";
  else if (fill.type === "gradient" && fill.gradient) {
    defs.push(gradient("fill", fill.gradient, warnings));
    attrs.fill = "url(#fill)";
  } else attrs.fill = fill.color ?? "#ffffff";
  if (typeof fill === "object" && fill?.opacity !== undefined) attrs["fill-opacity"] = num(fill.opacity);

  const stroke = props.stroke as Stroke | undefined;
  if (stroke) {
    if (stroke.gradient) {
      defs.push(gradient("stroke", stroke.gradient, warnings));
      attrs.stroke = "url(#stroke)";
    } else attrs.stroke = stroke.color;
    attrs["stroke-width"] = num(stroke.width);
    if (stroke.opacity !== undefined) attrs["stroke-opacity"] = num(stroke.opacity);
    if (stroke.dashArray?.length) attrs["stroke-dasharray"] = stroke.dashArray.map(num).join(" ");
    if (stroke.dashOffset !== undefined) attrs["stroke-dashoffset"] = num(stroke.dashOffset);
    if (stroke.lineCap) attrs["stroke-linecap"] = stroke.lineCap;
    if (stroke.lineJoin) attrs["stroke-linejoin"] = stroke.lineJoin;
  }

  const shadows = (props.shadows as Shadow[] | undefined) ?? (props.shadow ? [props.shadow as Shadow] : []);
  const outer = shadows.filter((s) => !s.inset);
  if (outer.length < shadows.length) warnings.push("inset shadows are not drawn");
  const strokeReach = stroke ? stroke.width / 2 + 1 : 0;
  const shadowReach = outer.reduce((m, s) => Math.max(m, Math.max(Math.abs(s.x ?? 0), Math.abs(s.y ?? 0)) + (s.blur ?? 0) * 1.5 + Math.max(0, s.spread ?? 0)), 0);
  const bleed = Math.ceil(Math.max(strokeReach, shadowReach + strokeReach));
  if (outer.length > 0) {
    defs.push(shadowFilter(outer, { x: -bleed, y: -bleed, w: w + 2 * bleed, h: h + 2 * bleed }));
    attrs.filter = "url(#shadow)";
  }

  const shape = String(props.shape ?? "rectangle");
  const body = geometry(shape, w, h, props, attrs);
  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${num(w)}" height="${num(h)}" viewBox="0 0 ${num(w)} ${num(h)}">${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${body}</svg>`;
  return { markup: out, size, bleed, warnings };
}

export interface ShapeDrawing {
  readonly layout: OverlayLayout;
  readonly prepared: PreparedSvg;
  readonly bleed: number;
}

/** How a `<Shape>` element draws at its time: its layout, and the markup with entrance drawing applied. */
export function shapeDrawing(p: ElementProps, tokens?: Readonly<Record<string, string>>): ShapeDrawing {
  const size = shapeSize(p);
  const layout = overlayLayout(p, size, "none", true);
  const shape = shapeMarkup(p.placement.props, size);
  const prepared = prepareSvg(shape.markup, { box: { width: layout.rect.w, height: layout.rect.h }, idPrefix: p.placement.id, draw: layout.draw, bleed: shape.bleed, tokens });
  return { layout, prepared: shape.warnings.length ? { ...prepared, warnings: [...shape.warnings, ...prepared.warnings] } : prepared, bleed: shape.bleed };
}

function geometry(shape: string, w: number, h: number, props: Readonly<Record<string, unknown>>, a: Record<string, string>): string {
  const el = (name: string, own: Record<string, string | number>): string => {
    const all = { ...Object.fromEntries(Object.entries(own).map(([k, v]) => [k, typeof v === "number" ? num(v) : v])), ...a };
    return `<${name}${Object.entries(all).map(([k, v]) => ` ${k}="${escapeXml(v)}"`).join("")}/>`;
  };
  const pts = (list: readonly (readonly [number, number])[]): string => list.map(([x, y]) => `${num(x)},${num(y)}`).join(" ");
  switch (shape) {
    case "circle": return el("circle", { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 });
    case "ellipse": return el("ellipse", { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2 });
    case "triangle": return el("polygon", { points: pts([[w / 2, 0], [w, h], [0, h]]) });
    case "line": {
      if (!a.stroke || a.stroke === "none") { a.stroke = a.fill ?? "#ffffff"; a["stroke-width"] ??= "4"; }
      return el("line", { x1: 0, y1: h / 2, x2: w, y2: h / 2 });
    }
    case "arrow": {
      const head = Math.min(h, w * 0.3);
      return el("polygon", { points: pts([[0, h * 0.35], [w - head, h * 0.35], [w - head, 0], [w, h / 2], [w - head, h], [w - head, h * 0.65], [0, h * 0.65]]) });
    }
    case "polygon": {
      const list = (props.points as { x: number; y: number }[] | undefined) ?? [];
      return el("polygon", { points: pts(list.map((q) => [q.x * w, q.y * h] as const)) });
    }
    case "star": {
      const n = Number(props.starPoints ?? 5), inner = Number(props.innerRadius ?? 0.5);
      const R = Math.min(w, h) / 2;
      const list: [number, number][] = [];
      for (let i = 0; i < n * 2; i++) {
        const rad = i % 2 === 0 ? R : R * inner;
        const angle = -Math.PI / 2 + (i * Math.PI) / n;
        list.push([w / 2 + rad * Math.cos(angle), h / 2 + rad * Math.sin(angle)]);
      }
      return el("polygon", { points: pts(list) });
    }
    case "path": {
      const list = (props.points as { x: number; y: number }[] | undefined) ?? [];
      return el("path", { d: list.map((q, i) => `${i === 0 ? "M" : "L"}${num(q.x * w)} ${num(q.y * h)}`).join(" ") });
    }
    default: {
      const radii = props.cornerRadii as Radii | undefined;
      if (radii) return el("path", { d: roundedRect(w, h, radii) });
      const r = Number(props.cornerRadius ?? 0);
      return el("rect", { x: 0, y: 0, width: w, height: h, ...(r > 0 ? { rx: r, ry: r } : {}) });
    }
  }
}

/** A rectangle with its own radius at each corner, each clamped to half the shorter side. */
function roundedRect(w: number, h: number, r: Radii): string {
  const c = (v: number): number => Math.max(0, Math.min(v, w / 2, h / 2));
  const tl = c(r.topLeft), tr = c(r.topRight), br = c(r.bottomRight), bl = c(r.bottomLeft);
  return [
    `M${num(tl)} 0`, `H${num(w - tr)}`, tr ? `A${num(tr)} ${num(tr)} 0 0 1 ${num(w)} ${num(tr)}` : "",
    `V${num(h - br)}`, br ? `A${num(br)} ${num(br)} 0 0 1 ${num(w - br)} ${num(h)}` : "",
    `H${num(bl)}`, bl ? `A${num(bl)} ${num(bl)} 0 0 1 0 ${num(h - bl)}` : "",
    `V${num(tl)}`, tl ? `A${num(tl)} ${num(tl)} 0 0 1 ${num(tl)} 0` : "", "Z",
  ].filter(Boolean).join(" ");
}

/** CSS angles: 0 points up, 90 right; the default, 180, runs top to bottom. */
function gradient(id: string, g: Gradient, warnings: string[]): string {
  const stops = [...g.stops].sort((a, b) => a.offset - b.offset)
    .map((s) => `<stop offset="${num(s.offset)}" stop-color="${escapeXml(s.color)}"${s.opacity !== undefined ? ` stop-opacity="${num(s.opacity)}"` : ""}/>`).join("");
  if (g.type === "radial") {
    const c = g.center ?? { x: 0.5, y: 0.5 };
    return `<radialGradient id="${id}" cx="${num(c.x)}" cy="${num(c.y)}" r="0.5">${stops}</radialGradient>`;
  }
  if (g.type === "conic") warnings.push("conic gradients are drawn as linear ones on shapes");
  const rad = (((g.angle ?? 180) % 360) * Math.PI) / 180;
  const dx = Math.sin(rad), dy = -Math.cos(rad);
  return `<linearGradient id="${id}" x1="${num(0.5 - dx / 2)}" y1="${num(0.5 - dy / 2)}" x2="${num(0.5 + dx / 2)}" y2="${num(0.5 + dy / 2)}">${stops}</linearGradient>`;
}

/** Drop shadows under the shape, as SVG filter primitives skia and browsers both draw. */
function shadowFilter(shadows: readonly Shadow[], region: { x: number; y: number; w: number; h: number }): string {
  const parts: string[] = [];
  const merged: string[] = [];
  shadows.forEach((s, i) => {
    const src = (s.spread ?? 0) > 0 ? `spread${i}` : "SourceAlpha";
    if ((s.spread ?? 0) > 0) parts.push(`<feMorphology in="SourceAlpha" operator="dilate" radius="${num(s.spread ?? 0)}" result="spread${i}"/>`);
    parts.push(
      `<feGaussianBlur in="${src}" stdDeviation="${num((s.blur ?? 0) / 2)}" result="blur${i}"/>`,
      `<feOffset in="blur${i}" dx="${num(s.x ?? 0)}" dy="${num(s.y ?? 0)}" result="offset${i}"/>`,
      `<feFlood flood-color="${escapeXml(s.color)}" result="colour${i}"/>`,
      `<feComposite in="colour${i}" in2="offset${i}" operator="in" result="shadow${i}"/>`,
    );
    merged.push(`<feMergeNode in="shadow${i}"/>`);
  });
  return `<filter id="shadow" filterUnits="userSpaceOnUse" x="${num(region.x)}" y="${num(region.y)}" width="${num(region.w)}" height="${num(region.h)}" color-interpolation-filters="sRGB">${parts.join("")}<feMerge>${merged.join("")}<feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

function escapeXml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function num(v: number): string {
  return String(Math.round(v * 1000) / 1000);
}
