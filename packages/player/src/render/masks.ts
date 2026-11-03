import type { MaskSpec } from "../model/frame-plan";
import type { DrawRect } from "../model/transform";
import type { Ctx2D } from "../types";

/**
 * Trace the mask outline onto the context's current path, in local element
 * pixels. Shape coordinates are fractions of the element box; bezier paths
 * are in pixels with handles. Returns false when the spec has no usable shape.
 */
export function traceMask(ctx: Ctx2D, mask: MaskSpec, rect: DrawRect): boolean {
  const w = rect.w,
    h = rect.h;
  const shape = mask.shape ?? {};
  if ("rect" in shape && shape.rect) {
    const r = shape.rect as { x: number; y: number; width: number; height: number; cornerRadius?: number };
    const x = r.x * w,
      y = r.y * h,
      rw = r.width * w,
      rh = r.height * h;
    if (r.cornerRadius && r.cornerRadius > 0) roundedRect(ctx, x, y, rw, rh, r.cornerRadius);
    else ctx.rect(x, y, rw, rh);
    return true;
  }
  if ("ellipse" in shape && shape.ellipse) {
    const e = shape.ellipse as { cx: number; cy: number; rx: number; ry: number };
    ctx.ellipse(e.cx * w, e.cy * h, e.rx * w, e.ry * h, 0, 0, Math.PI * 2);
    return true;
  }
  if ("polygon" in shape && Array.isArray(shape.polygon)) {
    const pts = shape.polygon as { x: number; y: number }[];
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * w, p.y * h) : ctx.lineTo(p.x * w, p.y * h)));
    ctx.closePath();
    return true;
  }
  if (mask.path && mask.path.points.length >= 2) {
    const pts = mask.path.points;
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i <= (mask.path.closed ? pts.length : pts.length - 1); i++) {
      const a = pts[(i - 1) % pts.length]!,
        b = pts[i % pts.length]!;
      const c1 = a.handleOut ?? a,
        c2 = b.handleIn ?? b;
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
    }
    if (mask.path.closed) ctx.closePath();
    return true;
  }
  return false;
}

export function roundedRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}
