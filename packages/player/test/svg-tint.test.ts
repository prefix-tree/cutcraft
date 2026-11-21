// An SVG's tint reads its colour as CSS does: a name, percentages in rgb() and hsl() give the colour they name, not
// grey, dark red or white.
import { afterEach, describe, expect, it } from "vitest";

import { prepareSvg } from "../src/overlays/svg";

const svg = '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
const box = { width: 100, height: 100 };
const tinted = (tint: string) => prepareSvg(svg, { box, color: { type: "tint", tint }, idPrefix: "s" }).markup;

/** The page's canvas, which writes any CSS colour back as hex: here only the ones this test names. */
class Canvas {
  getContext() {
    let style = "#000000";
    const known: Record<string, string> = {
      red: "#ff0000",
      "hsl(0, 100%, 50%)": "#ff0000",
      rebeccapurple: "#663399",
    };
    return {
      get fillStyle() {
        return style;
      },
      set fillStyle(v: string) {
        style = known[v] ?? (v.startsWith("#") ? v : style);
      },
    };
  }
}
const original = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
afterEach(() => {
  (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = original;
});

describe("an SVG tint", () => {
  it("reads rgb() percentages as fractions of full", () => {
    expect(tinted("rgb(100%, 0%, 0%)")).toBe(tinted("#ff0000"));
    expect(tinted("rgb(100% 0% 0%)")).toBe(tinted("#ff0000"));
  });

  it("reads names and hsl() through the page's canvas", () => {
    (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas = Canvas;
    expect(tinted("red")).toBe(tinted("#ff0000"));
    expect(tinted("hsl(0, 100%, 50%)")).toBe(tinted("#ff0000"));
    expect(tinted("rebeccapurple")).toBe(tinted("#663399"));
    expect(tinted("rebeccapurple")).not.toBe(tinted("#ffffff"));
  });
});
