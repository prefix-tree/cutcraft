import { z } from "zod";

import { defineKind, type Label } from "../types";
import { clamp01, color, el, font, formatNumber, n, progress, random, roundRect, svg, text, textWidth } from "../util";

/** Seconds an animation of the kinds below takes; 0 shows the end state from the start. */
const seconds = (fallback: number) => z.number().min(0).max(60).default(fallback).meta({ unit: "s" });

/** The largest font size at which `s` fits `w` wide and `h` tall. */
const fit = (s: string, w: number, h: number): number => Math.max(1, Math.min(h, w / Math.max(textWidth(s, 1), 0.01)));

const label = (
  x: number,
  y: number,
  w: number,
  h: number,
  s: string,
  size: number,
  fontName: string,
  colorValue: string,
  align: Label["align"] = "center",
  weight = 500,
): Label => ({
  x,
  y,
  w,
  h,
  text: s,
  font: fontName,
  size,
  weight,
  color: colorValue,
  align,
  valign: "middle",
  lineHeight: 1.1,
});

export const counter = defineKind({
  kind: "counter",
  title: "Counter",
  category: "data",
  description:
    "A number that counts from `from` to `to` over `countFor` seconds, with an optional prefix, suffix and caption under it.",
  animated: true,
  shape: {
    from: z.number().default(0),
    to: z.number().default(100),
    decimals: z.number().int().min(0).max(4).default(0),
    prefix: text(""),
    suffix: text(""),
    label: text(""),
    countFor: seconds(1.5),
    grouping: z.boolean().default(true),
    color: color("$text"),
    labelColor: color("$muted"),
    font: font("$heading"),
    labelFont: font("$body"),
  },
  example: { to: 1250, suffix: "+", label: "customers" },
  size: () => ({ width: 560, height: 260 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height;
    const shown = (v: number): string => `${p.prefix}${formatNumber(v, p.decimals, p.grouping)}${p.suffix}`;
    // Sized for the longer end, so the text does not change size while it counts.
    const widest = [shown(p.from), shown(p.to)].sort((a, b) => textWidth(b, 1) - textWidth(a, 1))[0]!;
    const numberH = p.label ? H * 0.68 : H;
    const labels = [
      label(
        0,
        0,
        W,
        numberH,
        shown(p.from + (p.to - p.from) * progress(ctx.t, p.countFor)),
        Math.round(fit(widest, W, numberH * 0.85)),
        ctx.value(p.font),
        ctx.value(p.color),
        "center",
        700,
      ),
    ];
    if (p.label)
      labels.push(
        label(
          0,
          numberH,
          W,
          H - numberH,
          p.label,
          Math.round(fit(p.label, W, (H - numberH) * 0.7)),
          ctx.value(p.labelFont),
          ctx.value(p.labelColor),
        ),
      );
    return { svg: svg(W, H, ""), labels };
  },
});

/** A person in a unit box: a head and shoulders. */
const PERSON = "M0.5 0.06a0.17 0.17 0 1 1 0 0.34a0.17 0.17 0 1 1 0-0.34ZM0.14 0.96v-0.18q0-0.3 0.36-0.3t0.36 0.3v0.18Z";

export const unitGrid = defineKind({
  kind: "unit-grid",
  title: "Unit grid",
  category: "data",
  description:
    '`total` units in a grid with `filled` of them coloured, one by one over `fillFor` seconds: "7 in 10". A fractional `filled` colours part of the last unit.',
  animated: true,
  shape: {
    total: z.number().int().min(1).max(400).default(10),
    filled: z.number().min(0).max(400).default(3),
    columns: z.number().int().min(1).max(50).optional(),
    unit: z.enum(["person", "circle", "square"]).default("person"),
    gap: z.number().min(0).max(0.8).default(0.25),
    fillFor: seconds(1),
    label: text(""),
    color: color("$primary"),
    empty: color("$surface"),
    labelColor: color("$text"),
    font: font("$body"),
  },
  example: { total: 10, filled: 7, label: "7 in 10 viewers" },
  size: (p) => {
    const cols = p.columns ?? Math.min(p.total, Math.ceil(Math.sqrt(p.total * 2)));
    return { width: cols * 80, height: Math.ceil(p.total / cols) * 80 + (p.label ? 64 : 0) };
  },
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height;
    const cols = Math.min(p.total, p.columns ?? Math.ceil(Math.sqrt(p.total * 2))),
      rows = Math.ceil(p.total / cols);
    const labelH = p.label ? Math.min(64, H * 0.2) : 0;
    const cell = Math.min(W / cols, (H - labelH) / rows),
      size = cell * (1 - p.gap);
    const x0 = (W - cell * cols) / 2,
      y0 = (H - labelH - cell * rows) / 2;
    const shown = Math.min(p.filled, p.total) * progress(ctx.t, p.fillFor);
    const on = ctx.value(p.color),
      off = ctx.value(p.empty);
    const shape = (x: number, y: number, fill: string, clip?: string): string => {
      const c = clip ? { "clip-path": `url(#${clip})` } : {};
      if (p.unit === "circle") return el("circle", { cx: x + size / 2, cy: y + size / 2, r: size / 2, fill, ...c });
      if (p.unit === "square") return el("path", { d: roundRect(x, y, size, size, size * 0.18), fill, ...c });
      return el("path", { d: PERSON, fill, transform: `translate(${n(x)} ${n(y)}) scale(${n(size)})`, ...c });
    };
    let defs = "",
      body = "";
    for (let i = 0; i < p.total; i++) {
      const x = x0 + (i % cols) * cell + (cell - size) / 2,
        y = y0 + Math.floor(i / cols) * cell + (cell - size) / 2;
      const k = clamp01(shown - i);
      body += shape(x, y, k >= 1 ? on : off);
      if (k > 0 && k < 1) {
        // The person is drawn in its own unit box, so its clip is too.
        defs += el(
          "clipPath",
          { id: `part${i}` },
          p.unit === "person"
            ? el("rect", { width: k, height: 1 })
            : el("rect", { x, y, width: size * k, height: size }),
        );
        body += shape(x, y, on, `part${i}`);
      }
    }
    const labels = p.label
      ? [
          label(
            0,
            H - labelH,
            W,
            labelH,
            p.label,
            Math.round(fit(p.label, W, labelH * 0.6)),
            ctx.value(p.font),
            ctx.value(p.labelColor),
          ),
        ]
      : [];
    return { svg: svg(W, H, body, defs), labels };
  },
});

export const comparison = defineKind({
  kind: "comparison",
  title: "Comparison",
  category: "data",
  description:
    "Bars side by side for a few values, each with its label and value, growing over `growFor` seconds. `max` sets the scale (default: the largest value).",
  animated: true,
  shape: {
    items: z
      .array(
        z.strictObject({
          label: z.string(),
          value: z.number().min(0),
          color: z.string().min(1).optional().meta({ control: "color" }),
        }),
      )
      .min(1)
      .max(8)
      .default([
        { label: "Before", value: 40 },
        { label: "After", value: 75 },
      ]),
    orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
    max: z.number().positive().optional(),
    showValues: z.boolean().default(true),
    decimals: z.number().int().min(0).max(4).default(0),
    prefix: text(""),
    suffix: text(""),
    growFor: seconds(1),
    color: color("$primary"),
    track: color("$surface"),
    labelColor: color("$text"),
    font: font("$body"),
  },
  example: {
    items: [
      { label: "Manual edit", value: 6, color: "$muted" },
      { label: "With cutcut", value: 1.5 },
    ],
    suffix: " h",
    decimals: 1,
  },
  size: (p) =>
    p.orientation === "vertical"
      ? { width: p.items.length * 160, height: 480 }
      : { width: 900, height: p.items.length * 90 },
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height,
      count = p.items.length;
    const max = p.max ?? Math.max(...p.items.map((i) => i.value), Number.MIN_VALUE);
    const k = progress(ctx.t, p.growFor);
    const fontName = ctx.value(p.font),
      ink = ctx.value(p.labelColor),
      track = ctx.value(p.track);
    const valueText = (v: number): string => `${p.prefix}${formatNumber(v, p.decimals)}${p.suffix}`;
    const widestValue = valueText(max);
    let body = "";
    const labels: Label[] = [];
    if (p.orientation === "horizontal") {
      const rowH = H / count,
        barH = rowH * 0.5,
        labelW = W * 0.28,
        valueW = p.showValues ? W * 0.16 : 0,
        barW = W - labelW - valueW;
      const size = Math.round(Math.min(rowH * 0.36, ...p.items.map((i) => fit(i.label, labelW * 0.92, rowH * 0.36))));
      p.items.forEach((item, i) => {
        const y = i * rowH + (rowH - barH) / 2,
          len = barW * clamp01(item.value / max) * k;
        body += el("path", { d: roundRect(labelW, y, barW, barH, barH / 2), fill: track });
        if (len > 0)
          body += el("path", {
            d: roundRect(labelW, y, Math.max(len, barH), barH, barH / 2),
            fill: ctx.value(item.color ?? p.color),
          });
        labels.push(label(0, i * rowH, labelW * 0.92, rowH, item.label, size, fontName, ink, "right"));
        if (p.showValues)
          labels.push(
            label(
              labelW + len + valueW * 0.08,
              i * rowH,
              valueW * 0.92,
              rowH,
              valueText(item.value * k),
              Math.round(Math.min(size, fit(widestValue, valueW * 0.92, rowH * 0.36))),
              fontName,
              ink,
              "left",
              700,
            ),
          );
      });
    } else {
      const colW = W / count,
        barW = colW * 0.56,
        labelH = H * 0.16,
        valueH = p.showValues ? H * 0.12 : 0,
        barH = H - labelH - valueH;
      const size = Math.round(Math.min(labelH * 0.5, ...p.items.map((i) => fit(i.label, colW * 0.92, labelH * 0.5))));
      p.items.forEach((item, i) => {
        const x = i * colW + (colW - barW) / 2,
          len = barH * clamp01(item.value / max) * k,
          top = valueH + barH - len;
        body += el("path", { d: roundRect(x, valueH, barW, barH, Math.min(barW / 2, 12)), fill: track });
        if (len > 0)
          body += el("path", {
            d: roundRect(x, top, barW, len, Math.min(barW / 2, 12, len / 2)),
            fill: ctx.value(item.color ?? p.color),
          });
        labels.push(label(i * colW, H - labelH, colW, labelH, item.label, size, fontName, ink));
        if (p.showValues)
          labels.push(
            label(
              i * colW,
              Math.max(0, top - valueH),
              colW,
              valueH,
              valueText(item.value * k),
              Math.round(fit(widestValue, colW * 0.92, valueH * 0.6)),
              fontName,
              ink,
              "center",
              700,
            ),
          );
      });
    }
    return { svg: svg(W, H, body), labels };
  },
});

/** At most this many dots are drawn; a bigger sample makes each dot stand for several. */
const MAX_DOTS = 1000;

export const sampleSize = defineKind({
  kind: "sample-size",
  title: "Sample size",
  category: "data",
  description:
    "A field of dots for a sample of `n`, with `share` of them highlighted, appearing over `appearFor` seconds. Past 1,000 each dot stands for several (`perDot`), and the note says so. The label may use `{n}` and `{share}`.",
  animated: true,
  shape: {
    n: z.number().int().min(1).max(10_000_000).default(1200),
    share: z.number().min(0).max(1).optional(),
    perDot: z.number().int().min(1).optional(),
    layout: z.enum(["grid", "scatter"]).default("grid"),
    appearFor: seconds(1.5),
    label: text("n = {n}"),
    color: color("$muted"),
    highlight: color("$primary"),
    labelColor: color("$text"),
    font: font("$body"),
  },
  example: { n: 1200, share: 0.38, label: "{share} of {n} said yes" },
  size: () => ({ width: 800, height: 520 }),
  draw: (p, ctx) => {
    const W = ctx.width,
      H = ctx.height;
    // A `perDot` too small for the sample is raised so no more than four times the usual number are drawn.
    const per = Math.max(p.perDot ?? Math.ceil(p.n / MAX_DOTS), Math.ceil(p.n / (MAX_DOTS * 4)), 1);
    const dots = Math.ceil(p.n / per);
    const labelH = p.label || per > 1 ? Math.min(72, H * 0.16) : 0,
      fieldH = H - labelH;
    const cols = Math.max(1, Math.round(Math.sqrt((dots * W) / fieldH))),
      rows = Math.ceil(dots / cols);
    const cell = Math.min(W / cols, fieldH / rows),
      r = cell * 0.36;
    const x0 = (W - cell * cols) / 2,
      y0 = (fieldH - cell * rows) / 2;
    const rnd = random(ctx.seed);
    // The order dots appear in, and where a scattered dot sits in its cell: both fixed by the element's seed.
    const order = Array.from({ length: dots }, (_, i) => i);
    for (let i = dots - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    const rank = new Array<number>(dots);
    order.forEach((d, i) => {
      rank[d] = i;
    });
    const lit = Math.round(dots * (p.share ?? 0));
    const shown = dots * progress(ctx.t, p.appearFor);
    const off = ctx.value(p.color),
      on = ctx.value(p.highlight);
    let body = "";
    for (let i = 0; i < dots; i++) {
      const jx = p.layout === "scatter" ? (rnd() - 0.5) * (cell - 2 * r) : 0,
        jy = p.layout === "scatter" ? (rnd() - 0.5) * (cell - 2 * r) : 0;
      if (rank[i]! >= shown) continue;
      // Grid: the highlighted share fills from the top left; scatter: a random share of the dots.
      const highlighted = p.layout === "grid" ? i < lit : rank[i]! < lit;
      body += el("circle", {
        cx: x0 + ((i % cols) + 0.5) * cell + jx,
        cy: y0 + (Math.floor(i / cols) + 0.5) * cell + jy,
        r,
        fill: highlighted ? on : off,
      });
    }
    const caption = p.label
      .replaceAll("{n}", formatNumber(p.n, 0))
      .replaceAll("{share}", `${formatNumber((p.share ?? 0) * 100, 0)}%`);
    const note = per > 1 ? `1 dot = ${formatNumber(per, 0)}` : "";
    const line = [caption, note].filter(Boolean).join("  ·  ");
    const labels = line
      ? [
          label(
            0,
            fieldH,
            W,
            labelH,
            line,
            Math.round(fit(line, W, labelH * 0.5)),
            ctx.value(p.font),
            ctx.value(p.labelColor),
          ),
        ]
      : [];
    return { svg: svg(W, H, body), labels };
  },
});
