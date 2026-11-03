import { z } from "zod";

import { defineKind } from "../types";
import { color, el, n, px, random, svg, unit } from "../util";

const frameSize = (_p: unknown, frame: { width: number; height: number }) => ({
  width: frame.width,
  height: frame.height,
});

export const gradientBackground = defineKind({
  kind: "gradient-background",
  title: "Gradient background",
  category: "backgrounds",
  description: "A full-frame linear or radial gradient between two colours. Put it on the lowest track.",
  shape: {
    from: color("$background"),
    to: color("$primary"),
    type: z.enum(["linear", "radial"]).default("linear"),
    angle: z.number().default(135),
  },
  example: {},
  size: frameSize,
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      from = ctx.value(p.from),
      to = ctx.value(p.to);
    const stops = el("stop", { offset: 0, "stop-color": from }) + el("stop", { offset: 1, "stop-color": to });
    let defs: string;
    if (p.type === "radial") {
      defs = el(
        "radialGradient",
        { id: "g", cx: W / 2, cy: H / 2, r: Math.hypot(W, H) / 2, gradientUnits: "userSpaceOnUse" },
        stops,
      );
    } else {
      // CSS angles: 0 points up, 90 right; the line spans the box the way CSS spans it.
      const a = (p.angle * Math.PI) / 180,
        dx = Math.sin(a),
        dy = -Math.cos(a),
        half = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
      defs = el(
        "linearGradient",
        {
          id: "g",
          x1: W / 2 - dx * half,
          y1: H / 2 - dy * half,
          x2: W / 2 + dx * half,
          y2: H / 2 + dy * half,
          gradientUnits: "userSpaceOnUse",
        },
        stops,
      );
    }
    return { svg: svg(W, H, el("rect", { width: W, height: H, fill: "url(#g)" }), defs), labels: [] };
  },
});

export const dotsBackground = defineKind({
  kind: "dots-background",
  title: "Dot grid background",
  category: "backgrounds",
  description: "A full-frame grid of small dots on a solid colour; `drift` scrolls it (pixels per second).",
  animated: true,
  shape: {
    background: color("$background"),
    color: color("$muted"),
    gap: px(40, 400),
    radius: px(3, 100),
    opacity: unit(0.5),
    drift: z.number().min(-1000).max(1000).default(0),
  },
  example: {},
  size: frameSize,
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      g = Math.max(8, p.gap),
      off = (((ctx.t * p.drift) % g) + g) % g;
    const defs = el(
      "pattern",
      { id: "dots", width: g, height: g, patternUnits: "userSpaceOnUse", x: off, y: off },
      el("circle", { cx: g / 2, cy: g / 2, r: p.radius, fill: ctx.value(p.color), opacity: p.opacity }),
    );
    return {
      svg: svg(
        W,
        H,
        el("rect", { width: W, height: H, fill: ctx.value(p.background) }) +
          el("rect", { width: W, height: H, fill: "url(#dots)" }),
        defs,
      ),
      labels: [],
    };
  },
});

export const gridBackground = defineKind({
  kind: "grid-background",
  title: "Grid background",
  category: "backgrounds",
  description: "A full-frame grid of thin lines on a solid colour, like graph paper.",
  shape: {
    background: color("$background"),
    color: color("$muted"),
    gap: px(80, 800),
    thickness: px(1, 20),
    opacity: unit(0.25),
  },
  example: {},
  size: frameSize,
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      g = Math.max(8, p.gap);
    let d = "";
    for (let x = g; x < W; x += g) d += `M${n(x)} 0V${n(H)}`;
    for (let y = g; y < H; y += g) d += `M0 ${n(y)}H${n(W)}`;
    const body =
      el("rect", { width: W, height: H, fill: ctx.value(p.background) }) +
      el("path", { d, stroke: ctx.value(p.color), "stroke-width": p.thickness, opacity: p.opacity });
    return { svg: svg(W, H, body), labels: [] };
  },
});

export const wavesBackground = defineKind({
  kind: "waves-background",
  title: "Waves background",
  category: "backgrounds",
  description:
    "Three soft waves in the palette's colours across the bottom of the frame, rising to `level` (a fraction of the height) and drifting at `speed`.",
  animated: true,
  shape: {
    background: color("$background"),
    colors: z.array(z.string().min(1)).min(1).max(6).default(["$primary", "$secondary", "$accent"]),
    level: unit(0.45),
    speed: z.number().min(0).max(10).default(0.3),
  },
  example: {},
  size: frameSize,
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height;
    let body = el("rect", { width: W, height: H, fill: ctx.value(p.background) });
    p.colors.forEach((c, i) => {
      const base = H * (1 - p.level) + (H * p.level * i) / (p.colors.length + 0.5),
        amp = H * 0.04 * (1 + i * 0.3);
      const phase = ctx.t * p.speed * (i % 2 === 0 ? 1 : -1) * 2 + i * 1.7;
      let d = `M0 ${n(H)}L0 ${n(base)}`;
      for (let x = 0; x <= W; x += W / 32)
        d += `L${n(x)} ${n(base + Math.sin((x / W) * Math.PI * 2 * (1 + i * 0.25) + phase) * amp)}`;
      body += el("path", { d: `${d}L${n(W)} ${n(H)}Z`, fill: ctx.value(c), opacity: 0.55 + i * 0.15 });
    });
    return { svg: svg(W, H, body), labels: [] };
  },
});

export const blobsBackground = defineKind({
  kind: "blobs-background",
  title: "Blobs background",
  category: "backgrounds",
  description:
    "Large blurred colour fields that drift slowly: a soft, modern backdrop. `seed` picks another arrangement.",
  animated: true,
  shape: {
    background: color("$background"),
    colors: z.array(z.string().min(1)).min(1).max(6).default(["$primary", "$secondary", "$accent"]),
    blur: px(120, 400),
    speed: z.number().min(0).max(10).default(0.2),
    seed: z.number().int().optional(),
  },
  example: {},
  size: frameSize,
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      rnd = random(p.seed ?? ctx.seed),
      m = Math.min(W, H);
    const pad = p.blur * 3;
    const defs = el(
      "filter",
      { id: "soft", x: -pad, y: -pad, width: W + pad * 2, height: H + pad * 2, filterUnits: "userSpaceOnUse" },
      el("feGaussianBlur", { stdDeviation: p.blur }),
    );
    let blobs = "";
    p.colors.forEach((c) => {
      const x = rnd() * W,
        y = rnd() * H,
        r = m * (0.25 + rnd() * 0.2),
        a = rnd() * Math.PI * 2,
        k = ctx.t * p.speed;
      blobs += el("circle", {
        cx: x + Math.cos(a + k) * m * 0.08,
        cy: y + Math.sin(a + k) * m * 0.08,
        r,
        fill: ctx.value(c),
        opacity: 0.8,
      });
    });
    return {
      svg: svg(
        W,
        H,
        el("rect", { width: W, height: H, fill: ctx.value(p.background) }) + el("g", { filter: "url(#soft)" }, blobs),
        defs,
      ),
      labels: [],
    };
  },
});
