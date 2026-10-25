import { z } from "zod";
import { GRAPHIC_BASE_PROPS, GRAPHIC_KINDS, GRAPHIC_KIND_NAMES, drawGraphic, graphicSize, iconNames, isIcon } from "../src";

const tokens = { primary: "#6c8cff", secondary: "#22d3ee", accent: "#ffb020", background: "#0b1020", surface: "#161d33", text: "#f5f7ff", muted: "#9aa3c0", onPrimary: "#ffffff", heading: "Space Grotesk", body: "Inter", mono: "JetBrains Mono", radius: 16 };
const frame = { width: 1920, height: 1080 };

function parsed(name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const kind = GRAPHIC_KINDS[name as keyof typeof GRAPHIC_KINDS];
  return { kind: name, ...(z.strictObject(kind.shape).parse({ ...kind.example, ...extra }) as Record<string, unknown>) };
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
  const moving: Record<string, Record<string, unknown>> = { "progress-bar": { value: undefined }, "dots-background": { drift: 30 }, "marker": { sweep: 1 } };

  it.each(GRAPHIC_KIND_NAMES.filter((k) => GRAPHIC_KINDS[k].animated))("%s moves with time", (name) => {
    expect(draw(name, 0.3, moving[name]).svg).not.toBe(draw(name, 1.7, moving[name]).svg);
  });

  it("leaves the props every graphic takes to the element", () => {
    for (const name of GRAPHIC_KIND_NAMES) {
      expect(Object.keys(GRAPHIC_KINDS[name].shape).filter((k) => (GRAPHIC_BASE_PROPS as readonly string[]).includes(k))).toEqual([]);
    }
  });

  it("holds a progress bar at its value", () => {
    expect(draw("progress-bar", 0.1).svg).toBe(draw("progress-bar", 2.9).svg);
    expect(draw("progress-bar", 0.1, { value: undefined }).svg).not.toBe(draw("progress-bar", 2.9, { value: undefined }).svg);
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
    expect(draw("callout", 1, { text: "A much longer callout text" }).size.width).toBeGreaterThan(draw("callout", 1, { text: "Hi" }).size.width);
    expect(graphicSize({ ...parsed("callout"), width: 500, height: 90 }, frame)).toEqual({ width: 500, height: 90 });
    expect(graphicSize(parsed("gradient-background"), frame)).toEqual(frame);
  });

  it("knows Lucide's icons by kebab-case name", () => {
    expect(isIcon("arrow-right")).toBe(true);
    expect(isIcon("no-such-icon")).toBe(false);
    expect(iconNames()).toContain("circle-check");
    expect(z.strictObject(GRAPHIC_KINDS.icon.shape).safeParse({ name: "no-such-icon" }).error?.issues[0]?.message).toMatch(/^no Lucide icon "no-such-icon"/);
    expect(draw("icon", 1, { name: "check" }).svg).toContain('d="M20 6 9 17l-5-5"');
  });
});
