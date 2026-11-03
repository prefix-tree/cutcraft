import { z } from "zod";

import { defineKind } from "../types";
import { clamp01, color, el, font, n, px, roundRect, svg, unit } from "../util";

export const progressBar = defineKind({
  kind: "progress-bar",
  title: "Progress bar",
  category: "progress",
  description: "A bar that fills from `from` to `to` over the element's duration; give `value` to hold it still.",
  animated: true,
  shape: {
    value: z.number().min(0).max(1).optional(),
    from: unit(0),
    to: unit(1),
    fill: color("$primary"),
    track: color("$surface"),
    rounded: z.boolean().default(true),
  },
  example: { value: 0.62 },
  size: () => ({ width: 800, height: 24 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      r = p.rounded ? H / 2 : 0;
    const k = p.value ?? p.from + (p.to - p.from) * (ctx.duration > 0 ? clamp01(ctx.t / ctx.duration) : 1);
    let body = el("path", { d: roundRect(0, 0, W, H, r), fill: ctx.value(p.track) });
    if (k > 0) body += el("path", { d: roundRect(0, 0, Math.max(r * 2, W * k), H, r), fill: ctx.value(p.fill) });
    return { svg: svg(W, H, body), labels: [] };
  },
});

export const countdown = defineKind({
  kind: "countdown",
  title: "Countdown",
  category: "progress",
  description:
    "A ring that empties over the element's duration around the seconds left, counting down from `from` (default: the duration).",
  animated: true,
  shape: {
    from: z.number().int().min(0).max(3600).optional(),
    color: color("$primary"),
    track: color("$surface"),
    textColor: color("$text"),
    font: font("$heading"),
    thickness: px(14, 200),
  },
  example: { from: 5 },
  size: () => ({ width: 200, height: 200 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      t = p.thickness,
      R = Math.min(W, H) / 2 - t / 2,
      cx = W / 2,
      cy = H / 2;
    const k = ctx.duration > 0 ? clamp01(ctx.t / ctx.duration) : 1;
    const from = p.from ?? Math.round(ctx.duration);
    const left = Math.max(0, Math.ceil(from * (1 - k) - 1e-9));
    const L = 2 * Math.PI * R;
    // Start at 12 o'clock, empty clockwise.
    const ring =
      el("circle", { cx, cy, r: R, fill: "none", stroke: ctx.value(p.track), "stroke-width": t }) +
      (k < 1
        ? el("circle", {
            cx,
            cy,
            r: R,
            fill: "none",
            stroke: ctx.value(p.color),
            "stroke-width": t,
            "stroke-linecap": "round",
            "stroke-dasharray": `${n(L * (1 - k))} ${n(L)}`,
            transform: `rotate(-90 ${n(cx)} ${n(cy)})`,
          })
        : "");
    const size = Math.round(R * 0.95);
    return {
      svg: svg(W, H, ring),
      labels: [
        {
          x: 0,
          y: 0,
          w: W,
          h: H,
          text: String(left),
          font: ctx.value(p.font),
          size,
          weight: 700,
          color: ctx.value(p.textColor),
          align: "center",
          valign: "middle",
          lineHeight: 1,
        },
      ],
    };
  },
});

export const steps = defineKind({
  kind: "steps",
  title: "Step dots",
  category: "progress",
  description: "A row of dots for steps in a sequence, the `active` one (1-based) filled and larger.",
  shape: {
    count: z.number().int().min(2).max(20).default(5),
    active: z.number().int().min(0).max(20).default(1),
    color: color("$primary"),
    inactive: color("$muted"),
    line: z.boolean().default(true),
  },
  example: { count: 4, active: 2 },
  size: (p) => ({ width: p.count * 64, height: 40 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      gap = W / p.count,
      r = Math.min(H / 2, gap / 4),
      cy = H / 2;
    const on = ctx.value(p.color),
      off = ctx.value(p.inactive);
    let body = p.line
      ? el("path", {
          d: `M${n(gap / 2)} ${n(cy)}H${n(W - gap / 2)}`,
          stroke: off,
          "stroke-width": Math.max(2, r / 3),
          opacity: 0.6,
        })
      : "";
    for (let i = 0; i < p.count; i++) {
      const done = i + 1 <= p.active;
      body += el("circle", { cx: gap / 2 + i * gap, cy, r: i + 1 === p.active ? r : r * 0.7, fill: done ? on : off });
    }
    return { svg: svg(W, H, body), labels: [] };
  },
});

export const divider = defineKind({
  kind: "divider",
  title: "Divider",
  category: "dividers",
  description: "A rule between things: a line, a dotted line, a line with a diamond, or a line that fades at its ends.",
  shape: {
    variant: z.enum(["line", "dots", "diamond", "fade"]).default("line"),
    color: color("$muted"),
    thickness: px(4, 100),
  },
  example: { variant: "diamond" },
  size: () => ({ width: 600, height: 24 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      t = p.thickness,
      c = ctx.value(p.color),
      y = H / 2;
    if (p.variant === "dots") {
      return {
        svg: svg(
          W,
          H,
          el("path", {
            d: `M${n(t)} ${n(y)}H${n(W - t)}`,
            stroke: c,
            "stroke-width": t,
            "stroke-linecap": "round",
            "stroke-dasharray": `0 ${n(t * 3)}`,
          }),
        ),
        labels: [],
      };
    }
    if (p.variant === "fade") {
      const defs = el(
        "linearGradient",
        { id: "fade", x1: 0, x2: W, y1: 0, y2: 0, gradientUnits: "userSpaceOnUse" },
        el("stop", { offset: 0, "stop-color": c, "stop-opacity": 0 }) +
          el("stop", { offset: 0.5, "stop-color": c }) +
          el("stop", { offset: 1, "stop-color": c, "stop-opacity": 0 }),
      );
      return {
        svg: svg(W, H, el("rect", { y: y - t / 2, width: W, height: t, fill: "url(#fade)" }), defs),
        labels: [],
      };
    }
    let body = el("rect", { y: y - t / 2, width: W, height: t, fill: c });
    if (p.variant === "diamond") {
      const s = Math.min(H / 2, t * 3);
      body =
        el("rect", { y: y - t / 2, width: W / 2 - s * 1.6, height: t, fill: c }) +
        el("rect", { x: W / 2 + s * 1.6, y: y - t / 2, width: W / 2 - s * 1.6, height: t, fill: c }) +
        el("path", {
          d: `M${n(W / 2)} ${n(y - s)}L${n(W / 2 + s)} ${n(y)}L${n(W / 2)} ${n(y + s)}L${n(W / 2 - s)} ${n(y)}Z`,
          fill: c,
        });
    }
    return { svg: svg(W, H, body), labels: [] };
  },
});
