import type { ElementBox, FitMode, Transform } from "@uberscene/kit/schema";
import type { Placement } from "@uberscene/sdk/resolver";

import { placeBox } from "./box";
import { keyframedValue } from "./keyframes";

export interface DrawRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Row-major 2D affine matrix in the canvas/CSS `matrix(a, b, c, d, e, f)` convention. */
export interface Matrix2D {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

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
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

export const translate = (x: number, y: number): Matrix2D => ({ ...IDENTITY, e: x, f: y });
export const scaleM = (sx: number, sy: number): Matrix2D => ({ ...IDENTITY, a: sx, d: sy });
export function rotate(deg: number): Matrix2D {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r),
    sin = Math.sin(r);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

export function matrixToCss(m: Matrix2D): string {
  const n = (v: number): string => (Math.abs(v) < 1e-9 ? "0" : String(Math.round(v * 1e6) / 1e6));
  return `matrix(${n(m.a)}, ${n(m.b)}, ${n(m.c)}, ${n(m.d)}, ${n(m.e)}, ${n(m.f)})`;
}

export interface Box {
  readonly width: number;
  readonly height: number;
}

/**
 * Lay out a source of `src` pixels in the composition: crop, place it by `box` and `fit` (`placeBox`, the one rule
 * every element is placed by), then the element transform (scale and rotation about the anchor).
 */
export function layoutRect(
  comp: Box,
  src: Box,
  fit: FitMode,
  transform?: Transform | undefined,
  box?: ElementBox | undefined,
): Layout {
  const t = transform ?? {};
  let crop: DrawRect | undefined;
  let effective: Box = src;
  if (t.crop && t.crop.width > 0 && t.crop.height > 0) {
    crop = {
      x: t.crop.x * src.width,
      y: t.crop.y * src.height,
      w: t.crop.width * src.width,
      h: t.crop.height * src.height,
    };
    effective = { width: crop.w, height: crop.h };
  }
  const placed = placeBox(comp, effective, fit, box);
  if (placed.crop) {
    // The box's crop is of what the transform's crop left: in source pixels, one inside the other.
    const from = crop ?? { x: 0, y: 0, w: src.width, h: src.height };
    crop = {
      x: from.x + placed.crop.x * from.w,
      y: from.y + placed.crop.y * from.h,
      w: placed.crop.w * from.w,
      h: placed.crop.h * from.h,
    };
  }
  const rect = placed.rect;
  const matrix = transformMatrix(rect, t);
  return { rect, matrix, ...(crop ? { crop } : {}), opacity: t.opacity ?? 1 };
}

/** The matrix mapping an element's local pixels to the composition, given its untransformed rect. */
export function transformMatrix(rect: DrawRect, t: Transform | undefined): Matrix2D {
  const tr = t ?? {};
  const anchor = tr.anchor ?? { x: 0.5, y: 0.5 };
  const ox = rect.x + anchor.x * rect.w,
    oy = rect.y + anchor.y * rect.h;
  const sx = typeof tr.scale === "number" ? tr.scale : (tr.scale?.x ?? 1);
  const sy = typeof tr.scale === "number" ? tr.scale : (tr.scale?.y ?? 1);
  let m = translate(ox, oy);
  if (tr.rotation) m = multiply(m, rotate(tr.rotation));
  if (sx !== 1 || sy !== 1) m = multiply(m, scaleM(sx, sy));
  m = multiply(m, translate(-ox, -oy));
  return multiply(m, translate(rect.x, rect.y));
}

/** The upright box around `rect` after `m`: where a rectangle of an element's local pixels lands in the composition. */
export function boundsOf(rect: DrawRect, m: Matrix2D): DrawRect {
  const xs = [rect.x, rect.x + rect.w, rect.x, rect.x + rect.w],
    ys = [rect.y, rect.y, rect.y + rect.h, rect.y + rect.h];
  const px = xs.map((x, i) => m.a * x + m.c * ys[i]! + m.e),
    py = xs.map((x, i) => m.b * x + m.d * ys[i]! + m.f);
  const x = Math.min(...px),
    y = Math.min(...py);
  return { x, y, w: Math.max(...px) - x, h: Math.max(...py) - y };
}

/** The transform with its keyframed properties evaluated at element-relative time `rel`. */
export function animatedTransform(base: Transform | undefined, children: readonly Placement[], rel: number): Transform {
  if (!children.some((c) => c.kind === "keyframe")) return base ?? {};
  const t: Record<string, unknown> = { ...(base ?? {}) };
  const num = (prop: string, fallback: number): number => Number(keyframedValue(children, prop, rel, fallback));
  const scl = typeof base?.scale === "number" ? { x: base.scale, y: base.scale } : (base?.scale ?? { x: 1, y: 1 });
  const anc = base?.anchor ?? { x: 0.5, y: 0.5 };
  const crop = base?.crop ?? { x: 0, y: 0, width: 1, height: 1 };
  t.scale = { x: num("transform.scale.x", scl.x), y: num("transform.scale.y", scl.y) };
  t.rotation = num("transform.rotation", base?.rotation ?? 0);
  t.opacity = num("transform.opacity", base?.opacity ?? 1);
  t.anchor = { x: num("transform.anchor.x", anc.x), y: num("transform.anchor.y", anc.y) };
  t.borderRadius = num("transform.borderRadius", base?.borderRadius ?? 0);
  if (
    base?.crop ||
    ["x", "y", "width", "height"].some((k) =>
      children.some((c) => c.kind === "keyframe" && c.props.property === `transform.crop.${k}`),
    )
  ) {
    t.crop = {
      x: num("transform.crop.x", crop.x),
      y: num("transform.crop.y", crop.y),
      width: num("transform.crop.width", crop.width),
      height: num("transform.crop.height", crop.height),
    };
  }
  return t as Transform;
}

/** The box with `box.x` and `box.y` evaluated at element-relative time `rel`; an axis with no value and no keys stays out. */
export function animatedBox(
  base: ElementBox | undefined,
  children: readonly Placement[],
  rel: number,
): ElementBox | undefined {
  const keyed = (axis: "x" | "y"): boolean =>
    children.some((c) => c.kind === "keyframe" && c.props.property === `box.${axis}`);
  if (!keyed("x") && !keyed("y")) return base;
  const value = (axis: "x" | "y"): number | undefined => {
    const v = Number(keyframedValue(children, `box.${axis}`, rel, base?.[axis] ?? Number.NaN));
    return Number.isFinite(v) ? v : undefined;
  };
  const x = value("x"),
    y = value("y");
  return {
    ...(base?.origin ? { origin: base.origin } : {}),
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
  };
}

/** CSS for a DOM element laid out like `layoutRect` does: it sits at the origin with `transform-origin: 0 0`. */
export function cssTransform(layout: Layout): string {
  return matrixToCss(layout.matrix);
}
