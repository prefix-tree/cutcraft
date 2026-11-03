import { defineKind, type GraphicContext, type Label } from "../types";
import { color, el, font, length, lengthOf, px, roundRect, svg, text, textWidth, weight } from "../util";

const shape = {
  name: text("Jane Doe"),
  role: text("Founder, Shed"),
  accent: color("$primary"),
  fill: color("$surface"),
  color: color("$text"),
  muted: color("$muted"),
  font: font("$heading"),
  roleFont: font("$body"),
  size: px(44, 400),
  weight: weight(700),
};

type Props = { name: string; role: string; font: string; roleFont: string; size: number; weight: number };

function lines(
  p: Props,
  ctx: GraphicContext,
  x: number,
  y: number,
  w: number,
  nameColor: string,
  roleColor: string,
  align: Label["align"] = "left",
): Label[] {
  const roleSize = Math.round(p.size * 0.55);
  const out: Label[] = [
    {
      x,
      y,
      w,
      h: p.size * 1.25,
      text: p.name,
      font: ctx.value(p.font),
      size: p.size,
      weight: p.weight,
      color: nameColor,
      align,
      valign: "middle",
      lineHeight: 1.1,
    },
  ];
  if (p.role)
    out.push({
      x,
      y: y + p.size * 1.25,
      w,
      h: roleSize * 1.5,
      text: p.role,
      font: ctx.value(p.roleFont),
      size: roleSize,
      weight: 400,
      color: roleColor,
      align,
      valign: "middle",
      lineHeight: 1.1,
    });
  return out;
}

function width(p: Props): number {
  return Math.ceil(Math.max(textWidth(p.name, p.size), textWidth(p.role, p.size * 0.55)) + p.size * 1.6);
}

function height(p: Props): number {
  return Math.ceil(p.size * (p.role ? 2.25 : 1.6) + p.size * 0.6);
}

export const lowerThird = defineKind({
  kind: "lower-third",
  title: "Lower third",
  category: "lower thirds",
  description:
    "A name and a role on a panel with an accent bar at its left edge. Place it low on the left with `transform.position`.",
  shape,
  example: {},
  size: (p) => ({ width: Math.max(420, width(p) + 24), height: height(p) }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      bar = Math.max(8, p.size * 0.18),
      pad = p.size * 0.6;
    const body =
      el("rect", { width: W, height: H, fill: ctx.value(p.fill), opacity: 0.94 }) +
      el("rect", { width: bar, height: H, fill: ctx.value(p.accent) });
    return {
      svg: svg(W, H, body),
      labels: lines(p, ctx, bar + pad, pad * 0.5, W - bar - pad * 2, ctx.value(p.color), ctx.value(p.muted)),
    };
  },
});

export const lowerThirdCard = defineKind({
  kind: "lower-third-card",
  title: "Lower third card",
  category: "lower thirds",
  description: "A name and a role on a rounded card, with an accent dot before the name.",
  shape: { ...shape, radius: length("$radius") },
  example: {},
  size: (p) => ({ width: Math.max(440, width(p) + p.size), height: height(p) + 8 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      r = Math.min(lengthOf(p.radius, ctx), H / 2),
      pad = p.size * 0.6,
      dot = p.size * 0.32;
    const body =
      el("path", { d: roundRect(0, 0, W, H, r), fill: ctx.value(p.fill) }) +
      el("circle", { cx: pad + dot, cy: pad * 0.5 + p.size * 0.62, r: dot, fill: ctx.value(p.accent) });
    const x = pad + dot * 2 + pad * 0.6;
    return {
      svg: svg(W, H, body),
      labels: lines(p, ctx, x, pad * 0.5, W - x - pad, ctx.value(p.color), ctx.value(p.muted)),
    };
  },
});

export const lowerThirdSplit = defineKind({
  kind: "lower-third-split",
  title: "Lower third, split",
  category: "lower thirds",
  description: "The name on an accent block and the role on a panel below it, offset to the right.",
  shape: { ...shape, onAccent: color("$onPrimary") },
  example: {},
  size: (p) => ({ width: Math.max(440, width(p) + p.size), height: Math.ceil(p.size * 2.9) }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      pad = p.size * 0.5;
    const top = p.size * 1.6,
      roleSize = Math.round(p.size * 0.55);
    const nameW = Math.min(W, textWidth(p.name, p.size) + pad * 2.5),
      roleW = Math.min(W - pad, textWidth(p.role, roleSize) + pad * 2.5);
    let body = el("rect", { width: nameW, height: top, fill: ctx.value(p.accent) });
    if (p.role) body += el("rect", { x: pad, y: top, width: roleW, height: H - top, fill: ctx.value(p.fill) });
    const labels: Label[] = [
      {
        x: pad,
        y: 0,
        w: nameW - pad * 2,
        h: top,
        text: p.name,
        font: ctx.value(p.font),
        size: p.size,
        weight: p.weight,
        color: ctx.value(p.onAccent),
        align: "left",
        valign: "middle",
        lineHeight: 1.1,
      },
    ];
    if (p.role)
      labels.push({
        x: pad * 2,
        y: top,
        w: roleW - pad * 2,
        h: H - top,
        text: p.role,
        font: ctx.value(p.roleFont),
        size: roleSize,
        weight: 400,
        color: ctx.value(p.color),
        align: "left",
        valign: "middle",
        lineHeight: 1.1,
      });
    return { svg: svg(W, H, body), labels };
  },
});
