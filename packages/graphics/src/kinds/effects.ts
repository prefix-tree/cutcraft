import { z } from "zod";

import { defineKind } from "../types";
import { el, n, random, svg } from "../util";

const palette = z.array(z.string().min(1)).min(1).max(8).default(["$primary", "$secondary", "$accent"]);

export const confetti = defineKind({
  kind: "confetti",
  title: "Confetti",
  category: "effects",
  description:
    "Confetti thrown up from the bottom centre that tumbles down across the frame over the element's duration.",
  animated: true,
  shape: {
    colors: palette,
    count: z.number().int().min(1).max(400).default(90),
    spread: z.number().min(0).max(1).default(0.7),
    seed: z.number().int().optional(),
  },
  example: {},
  size: (_p, frame) => ({ width: frame.width, height: frame.height }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      rnd = random(p.seed ?? ctx.seed),
      t = ctx.t,
      g = H * 1.6;
    let body = "";
    for (let i = 0; i < p.count; i++) {
      const angle = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * p.spread,
        speed = H * (1.2 + rnd() * 0.9);
      const delay = rnd() * 0.25,
        s = Math.max(0, t - delay);
      const drag = 1 / (1 + s * 1.2);
      const x = W / 2 + Math.cos(angle) * speed * s * drag + Math.sin(s * 3 + i) * 12;
      const y = H + Math.sin(angle) * speed * s * drag + 0.5 * g * s * s * 0.35;
      if (s === 0 || y > H + 40) continue;
      const scale = Math.max(1, Math.min(W, H) / 540);
      const w = (8 + rnd() * 10) * scale,
        h = (5 + rnd() * 6) * scale,
        spin = (rnd() - 0.5) * 900 * s;
      const c = ctx.value(p.colors[i % p.colors.length]!);
      // Tumbling: the piece's height swings through zero as it turns.
      const flip = Math.abs(Math.cos(s * (4 + rnd() * 6)));
      body += el("rect", {
        x: -w / 2,
        y: (-h * flip) / 2,
        width: w,
        height: Math.max(0.5, h * flip),
        fill: c,
        transform: `translate(${n(x)} ${n(y)}) rotate(${n(spin)})`,
      });
    }
    return { svg: svg(W, H, body), labels: [] };
  },
});

export const sparkles = defineKind({
  kind: "sparkles",
  title: "Sparkles",
  category: "effects",
  description:
    "Four-pointed stars that twinkle in and out across the box. Size the box to the area that should sparkle.",
  animated: true,
  shape: {
    colors: palette.default(["#ffffff", "$accent"]),
    count: z.number().int().min(1).max(200).default(14),
    size: z.number().min(2).max(400).default(28),
    speed: z.number().min(0).max(10).default(1.2),
    seed: z.number().int().optional(),
  },
  example: {},
  size: () => ({ width: 480, height: 270 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      rnd = random(p.seed ?? ctx.seed);
    let body = "";
    for (let i = 0; i < p.count; i++) {
      const x = rnd() * W,
        y = rnd() * H,
        phase = rnd() * Math.PI * 2,
        s = p.size * (0.4 + rnd() * 0.8);
      const k = Math.max(0, Math.sin(ctx.t * p.speed * Math.PI + phase));
      if (k < 0.02) continue;
      const r = s * k,
        q = r * 0.22;
      const d = `M${n(x)} ${n(y - r)}Q${n(x + q)} ${n(y - q)} ${n(x + r)} ${n(y)}Q${n(x + q)} ${n(y + q)} ${n(x)} ${n(y + r)}Q${n(x - q)} ${n(y + q)} ${n(x - r)} ${n(y)}Q${n(x - q)} ${n(y - q)} ${n(x)} ${n(y - r)}Z`;
      body += el("path", { d, fill: ctx.value(p.colors[i % p.colors.length]!), opacity: 0.4 + k * 0.6 });
    }
    return { svg: svg(W, H, body), labels: [] };
  },
});
