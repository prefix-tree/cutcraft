import { z } from "zod";

import { defineKind, type GraphicContext, type Label } from "../types";
import { color, el, font, length, lengthOf, n, px, roundRect, svg, text, textWidth, unit, weight } from "../util";

const textProps = {
  text: text("Look here"),
  color: color("$text"),
  font: font("$body"),
  size: px(36, 400),
  weight: weight(700),
};

function label(
  x: number,
  y: number,
  w: number,
  h: number,
  p: { text: string; font: string; size: number; weight: number; color: string },
  ctx: GraphicContext,
): Label {
  return {
    x,
    y,
    w,
    h,
    text: p.text,
    font: ctx.value(p.font),
    size: p.size,
    weight: p.weight,
    color: ctx.value(p.color),
    align: "center",
    valign: "middle",
    lineHeight: 1.15,
  };
}

const TAIL = 28;

export const callout = defineKind({
  kind: "callout",
  title: "Callout",
  category: "callouts",
  description:
    "Text in a rounded box with a pointer on one side; `tailAt` slides the pointer along that side (0 to 1).",
  shape: {
    ...textProps,
    fill: color("$surface"),
    border: color("none"),
    borderWidth: px(0, 50),
    radius: length("$radius"),
    tail: z.enum(["bottom", "top", "left", "right", "none"]).default("bottom"),
    tailAt: unit(0.5),
  },
  example: { text: "New in 2.0", tail: "bottom" },
  size: (p) => {
    const pad = p.size * 0.7;
    const w = Math.max(160, textWidth(p.text, p.size) + pad * 2),
      h = p.size * 1.3 + pad * 1.4;
    const side = p.tail === "left" || p.tail === "right";
    return {
      width: Math.ceil(w + (side ? TAIL : 0)),
      height: Math.ceil(h + (p.tail === "top" || p.tail === "bottom" ? TAIL : 0)),
    };
  },
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      b = p.borderWidth;
    const x = (p.tail === "left" ? TAIL : 0) + b / 2,
      y = (p.tail === "top" ? TAIL : 0) + b / 2;
    const w = W - (p.tail === "left" || p.tail === "right" ? TAIL : 0) - b,
      h = H - (p.tail === "top" || p.tail === "bottom" ? TAIL : 0) - b;
    const r = Math.min(lengthOf(p.radius, ctx), w / 2, h / 2);
    let d = roundRect(x, y, w, h, r);
    if (p.tail !== "none") {
      const half = TAIL * 0.75;
      const along = (len: number) => Math.max(r + half, Math.min(len - r - half, len * p.tailAt));
      if (p.tail === "bottom") {
        const c = x + along(w);
        d += `M${n(c - half)} ${n(y + h - 1)}L${n(c)} ${n(y + h + TAIL - b)}L${n(c + half)} ${n(y + h - 1)}Z`;
      }
      if (p.tail === "top") {
        const c = x + along(w);
        d += `M${n(c - half)} ${n(y + 1)}L${n(c)} ${n(y - TAIL + b)}L${n(c + half)} ${n(y + 1)}Z`;
      }
      if (p.tail === "left") {
        const c = y + along(h);
        d += `M${n(x + 1)} ${n(c - half)}L${n(x - TAIL + b)} ${n(c)}L${n(x + 1)} ${n(c + half)}Z`;
      }
      if (p.tail === "right") {
        const c = y + along(h);
        d += `M${n(x + w - 1)} ${n(c - half)}L${n(x + w + TAIL - b)} ${n(c)}L${n(x + w - 1)} ${n(c + half)}Z`;
      }
    }
    const border = ctx.value(p.border);
    const body = el("path", {
      d,
      fill: ctx.value(p.fill),
      ...(b > 0 && border !== "none" ? { stroke: border, "stroke-width": b, "stroke-linejoin": "round" } : {}),
    });
    return { svg: svg(W, H, body), labels: [label(x, y, w, h, p, ctx)] };
  },
});

export const speechBubble = defineKind({
  kind: "speech-bubble",
  title: "Speech bubble",
  category: "callouts",
  description: "A round comic-style bubble with a tail to one side below it.",
  shape: {
    ...textProps,
    text: text("Hi there!"),
    fill: color("#ffffff"),
    color: color("#111111"),
    border: color("#111111"),
    borderWidth: px(4, 50),
    tail: z.enum(["left", "right"]).default("left"),
  },
  example: { text: "Hi there!" },
  size: (p) => ({
    width: Math.ceil(Math.max(220, textWidth(p.text, p.size) * 1.35 + p.size * 2)),
    height: Math.ceil(p.size * 3.6 + TAIL),
  }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      b = p.borderWidth;
    const rx = W / 2 - b,
      ry = (H - TAIL) / 2 - b,
      cx = W / 2,
      cy = ry + b;
    const sx = p.tail === "left" ? cx - rx * 0.45 : cx + rx * 0.45,
      dir = p.tail === "left" ? -1 : 1;
    const tail = `M${n(sx - 18)} ${n(cy + ry * 0.75)}L${n(sx + dir * 30)} ${n(H - b)}L${n(sx + 22)} ${n(cy + ry * 0.8)}Z`;
    const stroke = ctx.value(p.border),
      fill = ctx.value(p.fill);
    const outline =
      b > 0 && stroke !== "none"
        ? { stroke, "stroke-width": b * 2, "stroke-linejoin": "round" }
        : ({} as Record<string, string | number>);
    // Outline both parts first, then fill them, so the seam between ellipse and tail does not show.
    const shapes = (attrs: Record<string, string | number>) =>
      el("ellipse", { cx, cy, rx, ry, ...attrs }) + el("path", { d: tail, ...attrs });
    const body = (Object.keys(outline).length ? shapes({ fill, ...outline }) : "") + shapes({ fill });
    return { svg: svg(W, H, body), labels: [label(cx - rx * 0.78, cy - ry * 0.7, rx * 1.56, ry * 1.4, p, ctx)] };
  },
});

export const badge = defineKind({
  kind: "badge",
  title: "Badge",
  category: "callouts",
  description: "A round badge with a short word or two, and a ring inside its edge.",
  shape: {
    ...textProps,
    text: text("NEW"),
    fill: color("$accent"),
    color: color("$onPrimary"),
    font: font("$heading"),
    size: px(40, 400),
    ring: z.boolean().default(true),
  },
  example: { text: "NEW" },
  size: (p) => {
    const d = Math.ceil(Math.max(140, textWidth(p.text, p.size) + p.size * 1.6));
    return { width: d, height: d };
  },
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      r = Math.min(W, H) / 2;
    const c = ctx.value(p.color);
    let body = el("circle", { cx: W / 2, cy: H / 2, r, fill: ctx.value(p.fill) });
    if (p.ring)
      body += el("circle", {
        cx: W / 2,
        cy: H / 2,
        r: r * 0.86,
        fill: "none",
        stroke: c,
        "stroke-width": Math.max(2, r * 0.035),
        "stroke-dasharray": `${n(r * 0.05)} ${n(r * 0.05)}`,
        opacity: 0.6,
      });
    return { svg: svg(W, H, body), labels: [label(W / 2 - r * 0.8, H / 2 - r * 0.6, r * 1.6, r * 1.2, p, ctx)] };
  },
});

export const pill = defineKind({
  kind: "pill",
  title: "Pill",
  category: "callouts",
  description: "A fully rounded label, with an optional dot before the text (a live indicator, a status).",
  shape: {
    ...textProps,
    text: text("Live"),
    fill: color("$primary"),
    color: color("$onPrimary"),
    size: px(28, 400),
    dot: color("none"),
  },
  example: { text: "Live", dot: "#ff3b30" },
  size: (p) => {
    const dot = p.dot !== "none" ? p.size * 0.9 : 0;
    return { width: Math.ceil(textWidth(p.text, p.size) + p.size * 1.6 + dot), height: Math.ceil(p.size * 1.9) };
  },
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      dotColor = ctx.value(p.dot);
    const dot = dotColor !== "none" ? p.size * 0.9 : 0;
    let body = el("path", { d: roundRect(0, 0, W, H, H / 2), fill: ctx.value(p.fill) });
    if (dot) body += el("circle", { cx: H / 2 + p.size * 0.1, cy: H / 2, r: p.size * 0.26, fill: dotColor });
    return { svg: svg(W, H, body), labels: [label(dot, 0, W - dot, H, p, ctx)] };
  },
});

export const burst = defineKind({
  kind: "burst",
  title: "Burst",
  category: "callouts",
  description: "A starburst sticker with a word on it, for prices, offers and shouts.",
  shape: {
    ...textProps,
    text: text("SALE"),
    fill: color("$accent"),
    color: color("$onPrimary"),
    font: font("$heading"),
    size: px(44, 400),
    points: z.number().int().min(5).max(48).default(18),
    depth: unit(0.16),
  },
  example: { text: "-50%" },
  size: (p) => {
    const d = Math.ceil(Math.max(180, textWidth(p.text, p.size) * 1.5 + p.size * 2));
    return { width: d, height: d };
  },
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      R = Math.min(W, H) / 2,
      r = R * (1 - p.depth);
    let d = "";
    for (let i = 0; i < p.points * 2; i++) {
      const a = (Math.PI * i) / p.points - Math.PI / 2,
        k = i % 2 === 0 ? R : r;
      d += `${i === 0 ? "M" : "L"}${n(W / 2 + k * Math.cos(a))} ${n(H / 2 + k * Math.sin(a))}`;
    }
    return {
      svg: svg(W, H, el("path", { d: `${d}Z`, fill: ctx.value(p.fill), "stroke-linejoin": "round" })),
      labels: [label(W / 2 - r * 0.75, H / 2 - r * 0.6, r * 1.5, r * 1.2, p, ctx)],
    };
  },
});
