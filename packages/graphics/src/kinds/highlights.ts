import { z } from "zod";

import { defineKind } from "../types";
import { clamp01, color, easeOut, el, handPath, n, px, random, svg, unit } from "../util";

const stroke = (c: string, t: number) => ({
  stroke: c,
  "stroke-width": t,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  fill: "none",
});

export const underline = defineKind({
  kind: "underline",
  title: "Underline scribble",
  category: "highlights",
  description: "A hand-drawn underline to put under a word. The `draw` entrance writes it on.",
  shape: { color: color("$accent"), thickness: px(8, 100), wobble: px(4, 40), double: z.boolean().default(false) },
  example: {},
  size: (p) => ({ width: 400, height: Math.max(40, p.thickness * (p.double ? 7 : 4)) }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      t = p.thickness,
      rnd = random(ctx.seed);
    const line = (y: number, from: number, to: number) =>
      handPath(
        [
          [from, y + (rnd() - 0.5) * t],
          [W / 2, y + (rnd() - 0.5) * t],
          [to, y - t * 0.4],
        ],
        p.wobble,
        rnd,
      );
    let body = el("path", { d: line(p.double ? H * 0.35 : H / 2, t, W - t), ...stroke(ctx.value(p.color), t) });
    if (p.double) body += el("path", { d: line(H * 0.7, W * 0.08, W * 0.9), ...stroke(ctx.value(p.color), t * 0.8) });
    return { svg: svg(W, H, body), labels: [] };
  },
});

export const circleScribble = defineKind({
  kind: "circle-scribble",
  title: "Circle scribble",
  category: "highlights",
  description: "A loose hand-drawn loop around something, overshooting where it closes.",
  shape: { color: color("$accent"), thickness: px(7, 100), wobble: px(6, 60) },
  example: {},
  size: () => ({ width: 360, height: 200 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      t = p.thickness,
      rnd = random(ctx.seed);
    const rx = W / 2 - t * 1.5,
      ry = H / 2 - t * 1.5,
      pts: [number, number][] = [];
    // A little more than one turn, drifting outward, so the ends overlap like a pen loop.
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI * 0.8 + (i / 12) * Math.PI * 2,
        grow = 0.94 + (i / 14) * 0.08;
      pts.push([W / 2 + Math.cos(a) * rx * grow, H / 2 + Math.sin(a) * ry * grow]);
    }
    return {
      svg: svg(W, H, el("path", { d: handPath(pts, p.wobble, rnd), ...stroke(ctx.value(p.color), t) })),
      labels: [],
    };
  },
});

export const marker = defineKind({
  kind: "marker",
  title: "Marker highlight",
  category: "highlights",
  description:
    "A translucent highlighter stroke with ragged ends that sweeps across in `sweep` seconds (0 to show it at once). Put it under a title on a lower track.",
  animated: true,
  shape: { color: color("$accent"), opacity: unit(0.45), sweep: z.number().min(0).max(30).default(0.5) },
  example: { sweep: 0 },
  size: () => ({ width: 420, height: 70 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      rnd = random(ctx.seed);
    const k = p.sweep > 0 ? easeOut(clamp01(ctx.t / p.sweep)) : 1;
    const x1 = Math.max(H * 0.2, W * k);
    const jag = (x: number) => `L${n(x + (rnd() - 0.5) * H * 0.16)} ${n(H * 0.08)}`;
    let d = `M${n(H * 0.1)} ${n(H * 0.12)}`;
    for (let x = H * 0.4; x < x1; x += H * 0.6) d += jag(x);
    d += `L${n(x1)} ${n(H * 0.06)}L${n(x1 - H * 0.12)} ${n(H * 0.94)}`;
    for (let x = x1 - H * 0.6; x > H * 0.2; x -= H * 0.6) d += `L${n(x + (rnd() - 0.5) * H * 0.16)} ${n(H * 0.92)}`;
    d += `L${n(0)} ${n(H * 0.88)}Z`;
    return { svg: svg(W, H, el("path", { d, fill: ctx.value(p.color), opacity: p.opacity })), labels: [] };
  },
});

export const strike = defineKind({
  kind: "strike",
  title: "Strike-through",
  category: "highlights",
  description: "A hand-drawn line through a word, slightly rising, to cross it out.",
  shape: { color: color("$accent"), thickness: px(8, 100), wobble: px(3, 40) },
  example: {},
  size: () => ({ width: 400, height: 60 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      t = p.thickness,
      rnd = random(ctx.seed);
    const d = handPath(
      [
        [t, H * 0.62],
        [W / 2, H * 0.5],
        [W - t, H * 0.36],
      ],
      p.wobble,
      rnd,
    );
    return { svg: svg(W, H, el("path", { d, ...stroke(ctx.value(p.color), t) })), labels: [] };
  },
});
