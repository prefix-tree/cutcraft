import { z } from "zod";

import { defineKind } from "../types";
import { color, el, handPath, n, px, random, svg } from "../util";

const headStyle = z.enum(["triangle", "open", "none"]).default("triangle");

/** An arrowhead at (x, y) pointing along `angle` (radians). */
function head(
  x: number,
  y: number,
  angle: number,
  size: number,
  style: "triangle" | "open" | "none",
  stroke: string,
  thickness: number,
): string {
  if (style === "none") return "";
  const back = (a: number) => [x - size * Math.cos(angle + a), y - size * Math.sin(angle + a)] as const;
  const [lx, ly] = back(Math.PI / 6.5),
    [rx, ry] = back(-Math.PI / 6.5);
  const d = `M${n(lx)} ${n(ly)}L${n(x)} ${n(y)}L${n(rx)} ${n(ry)}`;
  return style === "triangle"
    ? el("path", { d: `${d}Z`, fill: stroke, stroke, "stroke-width": thickness, "stroke-linejoin": "round" })
    : el("path", {
        d,
        fill: "none",
        stroke,
        "stroke-width": thickness,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      });
}

export const arrow = defineKind({
  kind: "arrow",
  title: "Arrow",
  category: "arrows",
  description: "A straight arrow across its box, pointing right; turn it with `transform.rotation`.",
  shape: {
    color: color("$primary"),
    thickness: px(10, 200),
    head: headStyle,
    tail: z.enum(["none", "dot"]).default("none"),
  },
  example: { thickness: 12 },
  size: (p) => ({ width: 320, height: Math.max(60, p.thickness * 5) }),
  draw: (p, ctx) => {
    const c = ctx.value(p.color),
      t = p.thickness,
      y = ctx.height / 2;
    const size = Math.min(t * 3.2, ctx.height / 1.6),
      x0 = t,
      x1 = ctx.width - t;
    const end = p.head === "triangle" ? x1 - size * 0.8 : x1;
    let body = el("path", {
      d: `M${n(x0)} ${n(y)}H${n(end)}`,
      stroke: c,
      "stroke-width": t,
      "stroke-linecap": "round",
      fill: "none",
    });
    body += head(x1, y, 0, size, p.head, c, t);
    if (p.tail === "dot") body += el("circle", { cx: x0, cy: y, r: t * 1.2, fill: c });
    return { svg: svg(ctx.width, ctx.height, body), labels: [] };
  },
});

export const curvedArrow = defineKind({
  kind: "curved-arrow",
  title: "Curved arrow",
  category: "arrows",
  description: "An arrow that arcs from the bottom left to the bottom right of its box; `flip` arcs it downward.",
  shape: {
    color: color("$primary"),
    thickness: px(8, 200),
    bend: z.number().min(0).max(1).default(0.7),
    flip: z.boolean().default(false),
    head: headStyle,
  },
  example: {},
  size: () => ({ width: 360, height: 180 }),
  draw: (p, ctx) => {
    const c = ctx.value(p.color),
      t = p.thickness,
      w = ctx.width,
      h = ctx.height;
    const pad = t * 2.5;
    const y0 = p.flip ? pad : h - pad;
    const cy = p.flip ? pad + (h - 2 * pad) * p.bend * 2 : h - pad - (h - 2 * pad) * p.bend * 2;
    const x0 = pad,
      x1 = w - pad,
      cx = w / 2;
    // The tangent at the end of a quadratic points from the control point to the end.
    const angle = Math.atan2(y0 - cy, x1 - cx);
    const size = Math.min(t * 3.2, h / 2.5);
    const body =
      el("path", {
        d: `M${n(x0)} ${n(y0)}Q${n(cx)} ${n(cy)} ${n(x1)} ${n(y0)}`,
        stroke: c,
        "stroke-width": t,
        "stroke-linecap": "round",
        fill: "none",
      }) + head(x1, y0, angle, size, p.head === "triangle" ? "open" : p.head, c, t);
    return { svg: svg(w, h, body), labels: [] };
  },
});

export const handArrow = defineKind({
  kind: "hand-arrow",
  title: "Hand-drawn arrow",
  category: "arrows",
  description: "A loose, marker-drawn arrow with a slight curve. The `draw` entrance traces it.",
  shape: { color: color("$accent"), thickness: px(7, 200), wobble: px(5, 50) },
  example: {},
  size: () => ({ width: 340, height: 140 }),
  draw: (p, ctx) => {
    const c = ctx.value(p.color),
      t = p.thickness,
      w = ctx.width,
      h = ctx.height,
      rnd = random(ctx.seed);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 4; i++) {
      const k = i / 4;
      pts.push([t * 2 + k * (w - t * 4), h * 0.72 - Math.sin(k * Math.PI) * h * 0.38 + (k - 0.5) * h * 0.1]);
    }
    const [ex, ey] = pts[4]!,
      [px0, py0] = pts[3]!;
    const angle = Math.atan2(ey - py0, ex - px0),
      size = Math.min(t * 4, h / 2.5);
    const stroke = {
      stroke: c,
      "stroke-width": t,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      fill: "none",
    };
    const wing = (a: number) =>
      handPath(
        [
          [ex, ey],
          [ex - size * Math.cos(angle + a), ey - size * Math.sin(angle + a)],
        ],
        p.wobble / 3,
        rnd,
      );
    const body =
      el("path", { d: handPath(pts, p.wobble, rnd), ...stroke }) +
      el("path", { d: wing(0.55), ...stroke }) +
      el("path", { d: wing(-0.55), ...stroke });
    return { svg: svg(w, h, body), labels: [] };
  },
});
