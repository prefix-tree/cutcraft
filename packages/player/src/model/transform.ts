import type { FitMode, Placement, Transform } from "@cutcut/kit";
import { keyframedValue } from "./keyframes";

export interface DrawRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Row-major 2D affine matrix in the canvas/CSS `matrix(a, b, c, d, e, f)` convention. */
export interface Matrix2D { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number }

export interface Layout {
  /** Where the element lands in composition pixels before its transform. */
  readonly rect: DrawRect;
  /** Maps local element coordinates (0..rect.w, 0..rect.h) to composition coordinates. */
  readonly matrix: Matrix2D;
  /** Source sub-rectangle in source pixels, when cropped. */
  readonly crop?: DrawRect;
  readonly opacity: number;
}

export const IDENTITY: Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function multiply(m: Matrix2D, n: Matrix2D): Matrix2D {
  return {
    a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f,
  };
}

export const translate = (x: number, y: number): Matrix2D => ({ ...IDENTITY, e: x, f: y });
export const scaleM = (sx: number, sy: number): Matrix2D => ({ ...IDENTITY, a: sx, d: sy });
export function rotate(deg: number): Matrix2D {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

export function matrixToCss(m: Matrix2D): string {
  const n = (v: number): string => (Math.abs(v) < 1e-9 ? "0" : String(Math.round(v * 1e6) / 1e6));
  return `matrix(${n(m.a)}, ${n(m.b)}, ${n(m.c)}, ${n(m.d)}, ${n(m.e)}, ${n(m.f)})`;
}

export interface Box { readonly width: number; readonly height: number }

/** The fitted rectangle of a source inside the composition, centred. */
export function fitRect(comp: Box, src: Box, fit: FitMode): DrawRect {
  const W = comp.width, H = comp.height;
  const w = src.width > 0 ? src.width : W, h = src.height > 0 ? src.height : H;
  if (fit === "stretch") return { x: 0, y: 0, w: W, h: H };
  let s = 1;
  if (fit === "contain") s = Math.min(W / w, H / h);
  else if (fit === "cover") s = Math.max(W / w, H / h);
  const dw = w * s, dh = h * s;
  return { x: (W - dw) / 2, y: (H - dh) / 2, w: dw, h: dh };
}

/**
 * Lay out a source of `src` pixels in the composition: crop, fit, then the
 * element transform (position offset, scale, rotation about the anchor).
 */
export function layoutRect(comp: Box, src: Box, fit: FitMode, transform?: Transform | undefined): Layout {
  const t = transform ?? {};
  let crop: DrawRect | undefined;
  let effective: Box = src;
  if (t.crop && t.crop.width > 0 && t.crop.height > 0) {
    crop = { x: t.crop.x * src.width, y: t.crop.y * src.height, w: t.crop.width * src.width, h: t.crop.height * src.height };
    effective = { width: crop.w, height: crop.h };
  }
  const rect = fitRect(comp, effective, fit);
  const matrix = transformMatrix(rect, t);
  return { rect, matrix, ...(crop ? { crop } : {}), opacity: t.opacity ?? 1 };
}

/** The matrix mapping an element's local pixels to the composition, given its untransformed rect. */
export function transformMatrix(rect: DrawRect, t: Transform | undefined): Matrix2D {
  const tr = t ?? {};
  const anchor = tr.anchor ?? { x: 0.5, y: 0.5 };
  const ox = rect.x + anchor.x * rect.w, oy = rect.y + anchor.y * rect.h;
  const sx = typeof tr.scale === "number" ? tr.scale : tr.scale?.x ?? 1;
  const sy = typeof tr.scale === "number" ? tr.scale : tr.scale?.y ?? 1;
  const px = tr.position?.x ?? 0, py = tr.position?.y ?? 0;
  let m = translate(px + ox, py + oy);
  if (tr.rotation) m = multiply(m, rotate(tr.rotation));
  if (sx !== 1 || sy !== 1) m = multiply(m, scaleM(sx, sy));
  m = multiply(m, translate(-ox, -oy));
  return multiply(m, translate(rect.x, rect.y));
}

/** The transform with its keyframed properties evaluated at element-relative time `rel`. */
export function animatedTransform(base: Transform | undefined, children: readonly Placement[], rel: number): Transform {
  if (!children.some((c) => c.kind === "keyframe")) return base ?? {};
  const t: Record<string, unknown> = { ...(base ?? {}) };
  const num = (prop: string, fallback: number): number => Number(keyframedValue(children, prop, rel, fallback));
  const pos = (base?.position ?? { x: 0, y: 0 });
  const scl = typeof base?.scale === "number" ? { x: base.scale, y: base.scale } : (base?.scale ?? { x: 1, y: 1 });
  const anc = base?.anchor ?? { x: 0.5, y: 0.5 };
  const crop = base?.crop ?? { x: 0, y: 0, width: 1, height: 1 };
  t.position = { x: num("transform.position.x", pos.x), y: num("transform.position.y", pos.y) };
  t.scale = { x: num("transform.scale.x", scl.x), y: num("transform.scale.y", scl.y) };
  t.rotation = num("transform.rotation", base?.rotation ?? 0);
  t.opacity = num("transform.opacity", base?.opacity ?? 1);
  t.anchor = { x: num("transform.anchor.x", anc.x), y: num("transform.anchor.y", anc.y) };
  t.borderRadius = num("transform.borderRadius", base?.borderRadius ?? 0);
  if (base?.crop || ["x", "y", "width", "height"].some((k) => children.some((c) => c.kind === "keyframe" && c.props.property === `transform.crop.${k}`))) {
    t.crop = { x: num("transform.crop.x", crop.x), y: num("transform.crop.y", crop.y), width: num("transform.crop.width", crop.width), height: num("transform.crop.height", crop.height) };
  }
  return t as Transform;
}

/** CSS for a DOM element laid out like `layoutRect` does: it sits at the origin with `transform-origin: 0 0`. */
export function cssTransform(layout: Layout): string {
  return matrixToCss(layout.matrix);
}
