import { z } from "zod";
import { defineKind } from "../types";
import { color, el, length, lengthOf, n, px, roundRect, svg } from "../util";

export const cornerBrackets = defineKind({
  kind: "corner-brackets",
  title: "Corner brackets",
  category: "frames",
  description: "Four corner marks framing a region, like a viewfinder. Size it to the region it frames.",
  shape: { color: color("$primary"), thickness: px(8, 100), length: z.number().min(0).max(0.5).default(0.16) },
  example: {},
  size: () => ({ width: 640, height: 360 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      t = p.thickness,
      h = t / 2,
      L = Math.min(W, H) * p.length;
    const d = `M${n(h)} ${n(h + L)}V${n(h)}H${n(h + L)}M${n(W - h - L)} ${n(h)}H${n(W - h)}V${n(h + L)}M${n(W - h)} ${n(H - h - L)}V${n(H - h)}H${n(W - h - L)}M${n(h + L)} ${n(H - h)}H${n(h)}V${n(H - h - L)}`;
    return {
      svg: svg(
        W,
        H,
        el("path", { d, fill: "none", stroke: ctx.value(p.color), "stroke-width": t, "stroke-linecap": "square" }),
      ),
      labels: [],
    };
  },
});

export const frame = defineKind({
  kind: "frame",
  title: "Frame",
  category: "frames",
  description: "A rounded border around a region, solid or dashed.",
  shape: {
    color: color("$primary"),
    thickness: px(6, 100),
    radius: length("$radius"),
    dashed: z.boolean().default(false),
  },
  example: { dashed: true },
  size: () => ({ width: 640, height: 360 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      t = p.thickness;
    const d = roundRect(t / 2, t / 2, W - t, H - t, lengthOf(p.radius, ctx));
    const dash = p.dashed ? { "stroke-dasharray": `${n(t * 3)} ${n(t * 2)}`, "stroke-linecap": "round" } : {};
    return {
      svg: svg(W, H, el("path", { d, fill: "none", stroke: ctx.value(p.color), "stroke-width": t, ...dash })),
      labels: [],
    };
  },
});

export const deviceFrame = defineKind({
  kind: "device-frame",
  title: "Device frame",
  category: "frames",
  description: "A phone or a browser window drawn around an open screen; put footage under it on a lower track.",
  shape: { device: z.enum(["phone", "browser"]).default("browser"), color: color("$surface"), detail: color("$muted") },
  example: { device: "phone" },
  size: (p) => (p.device === "phone" ? { width: 390, height: 800 } : { width: 960, height: 600 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      body = ctx.value(p.color),
      detail = ctx.value(p.detail);
    if (p.device === "phone") {
      const r = W * 0.16,
        bezel = W * 0.045,
        ir = r - bezel;
      const d = roundRect(0, 0, W, H, r) + roundRect(bezel, bezel, W - bezel * 2, H - bezel * 2, ir);
      const notch = el("path", {
        d: roundRect(W * 0.34, bezel + W * 0.03, W * 0.32, W * 0.085, W * 0.0425),
        fill: body,
      });
      const edge = el("path", {
        d: roundRect(1, 1, W - 2, H - 2, r - 1),
        fill: "none",
        stroke: detail,
        "stroke-width": 2,
        opacity: 0.6,
      });
      return { svg: svg(W, H, el("path", { d, fill: body, "fill-rule": "evenodd" }) + notch + edge), labels: [] };
    }
    const bar = Math.max(36, H * 0.07),
      r = 14,
      edge = 3;
    const d = `${roundRect(0, 0, W, H, r)}M${n(edge)} ${n(bar)}H${n(W - edge)}V${n(H - edge)}H${n(edge)}Z`;
    let art = el("path", { d, fill: body, "fill-rule": "evenodd" });
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      art += el("circle", { cx: bar * 0.55 + i * bar * 0.5, cy: bar / 2, r: bar * 0.15, fill: c });
    });
    art += el("path", {
      d: roundRect(W * 0.25, bar * 0.2, W * 0.5, bar * 0.6, bar * 0.3),
      fill: detail,
      opacity: 0.35,
    });
    return { svg: svg(W, H, art), labels: [] };
  },
});
