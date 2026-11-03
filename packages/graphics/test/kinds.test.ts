import { z } from "zod";

import {
  drawGraphic,
  GRAPHIC_BASE_PROPS,
  GRAPHIC_KIND_NAMES,
  GRAPHIC_KINDS,
  graphicControls,
  graphicSize,
  iconNames,
  isIcon,
} from "../src";

const tokens = {
  primary: "#6c8cff",
  secondary: "#22d3ee",
  accent: "#ffb020",
  background: "#0b1020",
  surface: "#161d33",
  text: "#f5f7ff",
  muted: "#9aa3c0",
  onPrimary: "#ffffff",
  heading: "Space Grotesk",
  body: "Inter",
  mono: "JetBrains Mono",
  radius: 16,
};
const frame = { width: 1920, height: 1080 };

function parsed(name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const kind = GRAPHIC_KINDS[name as keyof typeof GRAPHIC_KINDS];
  return {
    kind: name,
    ...(z.strictObject(kind.shape).parse({ ...kind.example, ...extra }) as Record<string, unknown>),
  };
}

function draw(name: string, t = 1, extra: Record<string, unknown> = {}) {
  const props = parsed(name, extra);
  const size = graphicSize(props, frame);
  return { size, ...drawGraphic(props, { ...size, t, duration: 3, id: `g-${name}`, tokens }) };
}

describe("graphic kinds", () => {
  it.each(GRAPHIC_KIND_NAMES)("%s draws clean SVG and labels inside its box", (name) => {
    const { size, svg, labels } = draw(name);
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`width="${size.width}" height="${size.height}"`);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    expect(svg).not.toMatch(/="\$/); // every token resolved
    expect(svg).not.toContain("<text"); // text is a label, laid out by the renderers
    for (const l of labels) {
      expect(l.x).toBeGreaterThanOrEqual(-0.5);
      expect(l.y).toBeGreaterThanOrEqual(-0.5);
      expect(l.x + l.w).toBeLessThanOrEqual(size.width + 0.5);
      expect(l.y + l.h).toBeLessThanOrEqual(size.height + 0.5);
      expect(l.color.startsWith("$")).toBe(false);
      expect(l.font.startsWith("$")).toBe(false);
    }
    expect(svg).toMatchSnapshot();
  });

  // Settings that make a kind move where its example holds still.
  const moving: Record<string, Record<string, unknown>> = {
    "progress-bar": { value: undefined },
    "dots-background": { drift: 30 },
    marker: { sweep: 1 },
  };

  it.each(GRAPHIC_KIND_NAMES.filter((k) => GRAPHIC_KINDS[k].animated))("%s moves with time", (name) => {
    const look = (t: number) => {
      const d = draw(name, t, moving[name]);
      return JSON.stringify([d.svg, d.labels]);
    };
    expect(look(0.3)).not.toBe(look(1.7));
  });

  it("leaves the props every graphic takes to the element", () => {
    for (const name of GRAPHIC_KIND_NAMES) {
      expect(
        Object.keys(GRAPHIC_KINDS[name].shape).filter((k) => (GRAPHIC_BASE_PROPS as readonly string[]).includes(k)),
      ).toEqual([]);
    }
  });

  it("holds a progress bar at its value", () => {
    expect(draw("progress-bar", 0.1).svg).toBe(draw("progress-bar", 2.9).svg);
    expect(draw("progress-bar", 0.1, { value: undefined }).svg).not.toBe(
      draw("progress-bar", 2.9, { value: undefined }).svg,
    );
  });

  it("counts down whole seconds", () => {
    expect(draw("countdown", 0, { from: 3 }).labels[0]?.text).toBe("3");
    expect(draw("countdown", 1.5, { from: 3 }).labels[0]?.text).toBe("2");
    expect(draw("countdown", 3, { from: 3 }).labels[0]?.text).toBe("0");
  });

  it("scatters the same way for the same id and differently for another", () => {
    const props = parsed("confetti");
    const at = (id: string) => drawGraphic(props, { width: 640, height: 360, t: 1, duration: 3, id, tokens }).svg;
    expect(at("a")).toBe(at("a"));
    expect(at("a")).not.toBe(at("b"));
  });

  it("sizes text boxes from their text and honours an explicit size", () => {
    expect(draw("callout", 1, { text: "A much longer callout text" }).size.width).toBeGreaterThan(
      draw("callout", 1, { text: "Hi" }).size.width,
    );
    expect(graphicSize({ ...parsed("callout"), width: 500, height: 90 }, frame)).toEqual({ width: 500, height: 90 });
    expect(graphicSize(parsed("gradient-background"), frame)).toEqual(frame);
  });

  describe("data kinds", () => {
    const fills = (svg: string, color: string) => svg.split(`fill="${color}"`).length - 1;

    it("counts to the number, grouped, at a size that holds still", () => {
      const at = (t: number) => draw("counter", t, { countFor: 1.5 }).labels;
      expect(at(0)[0]!.text).toBe("0+");
      expect(at(0.75)[0]!.text).toMatch(/^1,\d{3}\+$/);
      expect(at(2)[0]!.text).toBe("1,250+");
      expect(at(0.2)[0]!.size).toBe(at(2)[0]!.size);
      expect(at(2)[1]).toMatchObject({ text: "customers", color: tokens.muted });
      expect(
        draw("counter", 2, { to: 12.3456, decimals: 2, prefix: "$", suffix: "", label: "" }).labels.map((l) => l.text),
      ).toEqual(["$12.35"]);
    });

    it("fills a unit grid one by one, part of the last unit for a fraction", () => {
      expect(fills(draw("unit-grid", 0).svg, tokens.primary)).toBe(0);
      expect(fills(draw("unit-grid", 2).svg, tokens.primary)).toBe(7);
      const part = draw("unit-grid", 2, { filled: 2.5, unit: "square" }).svg;
      expect(fills(part, tokens.primary)).toBe(3);
      expect(part).toContain('<clipPath id="part2"><rect');
    });

    it("scales comparison bars to the largest value, or to max", () => {
      // A rounded bar's path runs M(x + r) … H(x + w − r) A r …: its width is the straight part plus both corners.
      const widths = (extra: Record<string, unknown>) =>
        [...draw("comparison", 2, extra).svg.matchAll(/<path d="M([\d.]+) [\d.]+H([\d.]+)A([\d.]+)/g)].map(
          (m) => Number(m[2]) - Number(m[1]) + 2 * Number(m[3]),
        );
      const [trackA, barA, trackB, barB] = widths({});
      expect(trackA).toBe(trackB);
      expect(barA! / barB!).toBeCloseTo(6 / 1.5, 0);
      expect(widths({ max: 12 })[1]! / trackA!).toBeLessThan(0.55);
      expect(draw("comparison", 2).labels.map((l) => l.text)).toEqual([
        "Manual edit",
        "6.0 h",
        "With CutCraft",
        "1.5 h",
      ]);
      expect(
        draw("comparison", 0, { orientation: "vertical" })
          .labels.filter((l) => l.text.endsWith(" h"))
          .map((l) => l.text),
      ).toEqual(["0.0 h", "0.0 h"]);
    });

    it("draws a sample as dots, a share highlighted, each dot standing for several past 1,000", () => {
      const end = draw("sample-size", 2);
      // 1,200 people at 2 a dot: 600 dots, 228 of them the 38%.
      expect(fills(end.svg, tokens.primary)).toBe(228);
      expect(fills(end.svg, tokens.muted)).toBe(372);
      expect(end.labels[0]!.text).toBe("38% of 1,200 said yes  ·  1 dot = 2");
      expect(fills(draw("sample-size", 0).svg, tokens.muted)).toBe(0);
      expect(draw("sample-size", 0.7).svg).toBe(draw("sample-size", 0.7).svg);
      expect(
        fills(draw("sample-size", 2, { n: 10_000_000, perDot: 1 }).svg, tokens.muted) +
          fills(draw("sample-size", 2, { n: 10_000_000, perDot: 1 }).svg, tokens.primary),
      ).toBeLessThanOrEqual(4000);
    });
  });

  describe("graphicControls", () => {
    it("gives every kind controls for its props, in their order, colours and fonts marked", () => {
      for (const name of GRAPHIC_KIND_NAMES) {
        const shape = Object.keys(GRAPHIC_KINDS[name].shape);
        const controls = graphicControls(name);
        expect(controls.map((c) => c.name)).toEqual(shape.filter((k) => controls.some((c) => c.name === k)));
      }
      expect(graphicControls("progress-bar").find((c) => c.name === "fill")).toMatchObject({
        type: "color",
        default: "$primary",
      });
      expect(graphicControls("countdown").find((c) => c.name === "font")).toMatchObject({ type: "font" });
    });

    it("reads bounds, steps, units, choices and list items from the schema", () => {
      const byName = (kind: keyof typeof GRAPHIC_KINDS) =>
        Object.fromEntries(graphicControls(kind).map((c) => [c.name, c]));
      const counter = byName("counter");
      expect(counter.decimals).toEqual({
        name: "decimals",
        label: "Decimals",
        default: 0,
        type: "number",
        min: 0,
        max: 4,
        step: 1,
      });
      expect(counter.countFor).toMatchObject({ label: "Count for", min: 0, max: 60, unit: "s" });
      expect(counter.labelColor).toMatchObject({ label: "Label color", type: "color" });
      const sample = byName("sample-size");
      expect(sample.share).toMatchObject({ type: "number", min: 0, max: 1, step: 0.01, optional: true });
      expect(sample.perDot).toEqual({
        name: "perDot",
        label: "Per dot",
        type: "number",
        min: 1,
        step: 1,
        optional: true,
      });
      expect(sample.layout).toMatchObject({ type: "choice", options: ["grid", "scatter"] });
      expect(graphicControls("no-such-kind")).toEqual([]);
      expect(byName("comparison").items).toMatchObject({
        type: "list",
        min: 1,
        max: 8,
        fields: [
          { name: "label", type: "text" },
          { name: "value", type: "number", min: 0 },
          { name: "color", type: "color", optional: true },
        ],
      });
    });
  });

  it("knows Lucide's icons by kebab-case name", () => {
    expect(isIcon("arrow-right")).toBe(true);
    expect(isIcon("no-such-icon")).toBe(false);
    expect(iconNames()).toContain("circle-check");
    expect(
      z.strictObject(GRAPHIC_KINDS.icon.shape).safeParse({ name: "no-such-icon" }).error?.issues[0]?.message,
    ).toMatch(/^no Lucide icon "no-such-icon"/);
    expect(draw("icon", 1, { name: "check" }).svg).toContain('d="M20 6 9 17l-5-5"');
  });
});
