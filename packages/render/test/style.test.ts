// Shape styling, entrances and exits, and gradient backgrounds, as the export draws them.
import { createElement as h, type ReactElement } from "react";
import type { Canvas, CanvasRenderingContext2D } from "skia-canvas";
import { Clip, Composition, Graphic, Shape, Sticker, Svg, THEMES, Title, Track, collect, resolve } from "@cutcraft/kit";
import { indexLayerInteriors } from "@cutcraft/player/overlays";
import { manifest } from "../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { FramePipeline } from "../src/pipeline";
import { OverlayPlane, createCanvas, directoryResolver } from "../src";

type Rgba = readonly [number, number, number, number];
const W = 640, H = 360;

function scene(children: ReactElement[], comp: Record<string, unknown> = {}) {
  return h(Composition, { fps: 30, width: W, height: H, ...comp }, h(Track, { id: "a", layout: "free" }, ...children));
}

async function overlaysAt(t: number, ...children: ReactElement[]) {
  return overlaysWith({}, t, ...children);
}

async function overlaysWith(comp: Record<string, unknown>, t: number, ...children: ReactElement[]) {
  const el = scene(children, comp);
  const state = resolve(collect(el), manifest);
  expect(state.errors).toEqual([]);
  const warnings: string[] = [];
  const plane = new OverlayPlane({ state, media: directoryResolver("/nowhere", manifest), interiors: indexLayerInteriors(el), warn: (m) => warnings.push(m) });
  const c = createCanvas(W, H) as unknown as Canvas;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  await plane.draw(ctx, t);
  plane.dispose();
  const px = (x: number, y: number): Rgba => { const d = ctx.getImageData(x, y, 1, 1).data; return [d[0]!, d[1]!, d[2]!, d[3]!]; };
  return { px, warnings };
}

const close = (a: Rgba, b: Rgba, tol = 14): boolean => a.every((v, i) => Math.abs(v - (b[i] as number)) <= tol);
const box = (id: string, extra: Record<string, unknown>) => h(Shape, { id, shape: "rectangle", width: 200, height: 100, start: 0, duration: 4, fill: "#ff0000", ...extra });

describe("shape styling in the export", () => {
  it("fills with a linear gradient along a CSS angle", async () => {
    const { px } = await overlaysAt(1, box("g", { fill: { type: "gradient", gradient: { type: "linear", angle: 90, stops: [{ offset: 0, color: "#ff0000" }, { offset: 1, color: "#0000ff" }] } } }));
    // The box spans x 220-420: red at its left edge, blue at its right, half and half in the middle.
    expect(close(px(222, 180), [255, 0, 0, 255], 20)).toBe(true);
    expect(close(px(418, 180), [0, 0, 255, 255], 20)).toBe(true);
    expect(close(px(320, 180), [128, 0, 128, 255], 20)).toBe(true);
  });

  it("casts a drop shadow past the box, and leaves room for it", async () => {
    const { px } = await overlaysAt(1, box("s", { shadow: { color: "#00ff00", blur: 0, x: 30, y: 30 } }));
    expect(close(px(320, 180), [255, 0, 0, 255])).toBe(true);
    // Below and right of the box (x 220-420, y 130-230) by 30 px: shadow, outside the box itself.
    expect(close(px(440, 250), [0, 255, 0, 255])).toBe(true);
    expect(px(200, 250)[3]).toBe(0);
  });

  it("rounds each corner by its own radius", async () => {
    const { px } = await overlaysAt(1, box("r", { cornerRadii: { topLeft: 40, topRight: 0, bottomRight: 0, bottomLeft: 0 } }));
    expect(px(223, 133)[3]).toBe(0); // top-left corner cut away
    expect(close(px(417, 133), [255, 0, 0, 255])).toBe(true); // top-right still square
  });

  it("strokes with a gradient, caps and dashes without complaint", async () => {
    const { px, warnings } = await overlaysAt(1, h(Shape, { id: "l", shape: "line", width: 300, height: 40, start: 0, duration: 4,
      stroke: { color: "#ffffff", width: 20, lineCap: "round", dashArray: [40, 20], dashOffset: 0, gradient: { type: "linear", angle: 90, stops: [{ offset: 0, color: "#ffff00" }, { offset: 1, color: "#00ffff" }] } } }));
    expect(warnings).toEqual([]);
    expect(px(185, 180)[3]).toBeGreaterThan(200); // the first dash, under its round cap
  });
});

describe("entrances and exits in the export", () => {
  it("wipes a shape in from the left", async () => {
    const { px } = await overlaysAt(0.25, box("w", { enter: { type: "wipe-right", duration: 0.5, easing: "linear" } }));
    // Halfway: the left half (x 220-320) shows, the right half does not.
    expect(close(px(260, 180), [255, 0, 0, 255])).toBe(true);
    expect(px(380, 180)[3]).toBe(0);
  });

  it("fades and slides a title, and exits at the end", async () => {
    const title = h(Title, { id: "t", start: 0, duration: 4, size: 80, color: "#ffffff", enter: { type: "fade", duration: 1, easing: "linear" }, exit: { type: "fade", duration: 1, easing: "linear" } }, "IN");
    const half = await overlaysAt(0.5, title);
    const full = await overlaysAt(2, title);
    const ink = (p: (x: number, y: number) => Rgba): number => { let m = 0; for (let x = 280; x < 360; x++) m = Math.max(m, p(x, 180)[3]); return m; };
    expect(ink(full.px)).toBeGreaterThan(240);
    expect(Math.abs(ink(half.px) - 128)).toBeLessThan(20);
    expect(ink((await overlaysAt(3.75, title)).px)).toBeLessThan(80);
  });

  it("draws an SVG's strokes before its fills", async () => {
    const icon = '<svg width="200" height="200" viewBox="0 0 200 200"><path d="M20 100 L180 100" stroke="#00ff00" stroke-width="20" fill="none"/><rect x="60" y="140" width="80" height="40" fill="#0000ff"/></svg>';
    const svg = (id: string) => h(Svg, { id, content: icon, start: 0, duration: 4, enter: { type: "draw", duration: 1, easing: "linear" } });
    const { px } = await overlaysAt(0.5, svg("d"));
    // The 200 px SVG sits at x 220-420, y 80-280. Halfway the line is drawn to x 320 (220 + 20 + 80); the fill is not in yet.
    expect(close(px(270, 180), [0, 255, 0, 255])).toBe(true);
    expect(px(370, 180)[3]).toBe(0);
    expect(px(320, 240)[3]).toBe(0);
    const done = await overlaysAt(2, svg("e"));
    expect(close(done.px(370, 180), [0, 255, 0, 255])).toBe(true);
    expect(close(done.px(320, 240), [0, 0, 255, 255])).toBe(true);
  });
});

describe("gradient background", () => {
  it("fills the frame the way CSS fills a box", async () => {
    const el = scene([], { background: { mode: "gradient", gradient: { type: "linear", angle: 180, stops: [{ offset: 0, color: "#ff0000" }, { offset: 1, color: "#0000ff" }] } } });
    const state = resolve(collect(el), manifest);
    expect(state.errors).toEqual([]);
    const pipeline = new FramePipeline({ state: { ...state, composition: { ...state.composition, duration: 1 } }, media: directoryResolver("/nowhere", manifest), warn: () => undefined });
    const rgba = await pipeline.frame(0);
    pipeline.dispose();
    const at = (x: number, y: number): Rgba => { const i = (y * W + x) * 4; return [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!, rgba[i + 3]!]; };
    expect(close(at(320, 1), [255, 0, 0, 255], 6)).toBe(true);
    expect(close(at(320, 358), [0, 0, 255, 255], 6)).toBe(true);
    expect(close(at(320, 180), [128, 0, 127, 255], 6)).toBe(true);
  });
});

describe("themes in the export", () => {
  const hex = (c: string): Rgba => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255];

  it("draws shape presets and svg tokens in the theme's colours", async () => {
    const neon = THEMES.neon.palette;
    const { px, warnings } = await overlaysWith({ theme: { extends: "neon", motion: "none" } }, 1,
      h(Shape, { id: "card", style: "panel", shape: "rectangle", width: 200, height: 100, start: 0, duration: 4, transform: { position: { x: -150, y: 0 } } }),
      h(Svg, { id: "dot", start: 0, duration: 4, transform: { position: { x: 150, y: 0 } }, content: '<svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="$accent"/><rect x="40" y="40" width="20" height="20" fill="var(--cc-secondary)"/></svg>' }),
    );
    expect(warnings).toEqual([]);
    expect(close(px(170, 180), hex(neon.surface))).toBe(true);
    expect(close(px(470, 150), hex(neon.accent))).toBe(true);
    expect(close(px(470, 180), hex(neon.secondary))).toBe(true);
    // The panel's corners take the theme radius (22 px).
    expect(px(72, 132)[3]).toBe(0);
  });

  it("sets titles in the theme's fonts, with no fallback warning", async () => {
    const title = h(Title, { id: "t", start: 0, duration: 4, style: "h2" }, "Hamburgefonts");
    const widthOf = async (theme: string): Promise<number> => {
      const { px, warnings } = await overlaysWith({ theme: { extends: theme, motion: "none" } }, 1, title);
      expect(warnings).toEqual([]);
      let left = W, right = 0;
      for (let y = 140; y < 220; y += 2) for (let x = 0; x < W; x++) if (px(x, y)[3] > 128) { left = Math.min(left, x); right = Math.max(right, x); }
      return right - left;
    };
    const serif = await widthOf("paper"), grotesk = await widthOf("midnight"), sans = await widthOf("pastel");
    expect(serif).toBeGreaterThan(100);
    expect(new Set([serif, grotesk, sans]).size).toBe(3);
  });

  it("plays the motion style's entrance where the element has none", async () => {
    const shape = box("m", { fill: "$primary" });
    const early = await overlaysWith({ theme: { extends: "mono", motion: "editorial" } }, 0.3, shape);
    // Editorial wipes in from the left over 0.6 s: at 0.3 s the right edge is not drawn yet.
    expect(close(early.px(240, 180), hex(THEMES.mono.palette.primary))).toBe(true);
    expect(early.px(400, 180)[3]).toBe(0);
  });
});

describe("graphics in the export", () => {
  const hex = (c: string): Rgba => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255];
  const midnight = THEMES.midnight.palette;

  it("draws a callout's art in theme colours with its text above it", async () => {
    const { px, warnings } = await overlaysWith({ theme: { extends: "midnight", motion: "none" } }, 1,
      h(Graphic, { id: "c", kind: "callout", text: "WWWWWW", size: 40, tail: "none", width: 400, height: 120, start: 0, duration: 4 }));
    expect(warnings).toEqual([]);
    // The box spans x 120-520, y 120-240: surface near its edge, light text ink in the middle.
    expect(close(px(130, 180), hex(midnight.surface))).toBe(true);
    let ink = 0;
    for (let x = 200; x < 440; x++) if (close(px(x, 180), hex(midnight.text), 40)) ink++;
    expect(ink).toBeGreaterThan(20);
  });

  it("fills a progress bar with time", async () => {
    const bar = h(Graphic, { id: "p", kind: "progress-bar", width: 400, height: 20, start: 0, duration: 4 });
    const early = await overlaysWith({ theme: { motion: "none" } }, 1, bar);
    const late = await overlaysWith({ theme: { motion: "none" } }, 3, bar);
    // A quarter filled at 1 s, three quarters at 3 s; x=320 is the middle of the bar (120-520).
    expect(close(early.px(320, 180), hex(midnight.surface))).toBe(true);
    expect(close(late.px(320, 180), hex(midnight.primary))).toBe(true);
  });

  it("draws icon stickers and icon graphics from Lucide", async () => {
    const { px, warnings } = await overlaysWith({}, 1,
      h(Sticker, { id: "s", src: "icon:square", start: 0, duration: 4, transform: { position: { x: -150, y: 0 } } }),
      h(Graphic, { id: "i", kind: "icon", name: "square", color: "#ff0000", strokeWidth: 3, start: 0, duration: 4, transform: { position: { x: 150, y: 0 } } }),
    );
    expect(warnings).toEqual([]);
    // Lucide's square is a rounded rect from 3 to 21 in a 24 box: on a 120 px icon, its left edge is near x=15.
    expect(px(470 - 60 + 15, 180)[0]).toBeGreaterThan(200);
    expect(px(470, 180)[3]).toBe(0);
    // The sticker is 90 px (a quarter of 360) and stroked in the theme's text colour.
    expect(px(170 - 45 + 11, 180)[3]).toBeGreaterThan(150);
  });
});

describe("overlays beneath the footage", () => {
  // The footage and the logo are generated: a clean checkout has none until a test makes them.
  beforeAll(() => generateMedia());

  async function frameOf(...tracks: ReactElement[]) {
    const state = resolve(collect(h(Composition, { fps: 30, width: W, height: H, background: { mode: "color", color: "#0000ff" } }, ...tracks)), manifest);
    expect(state.errors).toEqual([]);
    const pipeline = new FramePipeline({ state, media: directoryResolver(mediaDir, manifest), warn: () => undefined });
    const rgba = await pipeline.frame(15);
    pipeline.dispose();
    return (x: number, y: number): Rgba => { const i = (y * W + x) * 4; return [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!, rgba[i + 3]!]; };
  }

  const backdrop = h(Track, { id: "under", layout: "free" }, h(Shape, { id: "yellow", shape: "rectangle", width: W, height: H, fill: "#ffff00", start: 0, duration: 2 }));
  const footage = h(Track, { id: "main" }, h(Clip, { id: "logo", src: "asset:logo", duration: 2, fit: "none" }));
  const front = h(Track, { id: "over", layout: "free" }, h(Shape, { id: "green", shape: "rectangle", width: 40, height: 40, fill: "#00ff00", start: 0, duration: 2, transform: { position: { x: -280, y: -150 } } }));

  it("draws a track below the footage beneath it, and the rest above", async () => {
    const at = await frameOf(backdrop, footage, front);
    expect(close(at(320, 180), [253, 0, 0, 255])).toBe(true); // the (red) logo, over the backdrop
    expect(close(at(20, 340), [255, 255, 0, 255])).toBe(true); // the yellow backdrop where the logo is not
    expect(close(at(40, 30), [0, 255, 0, 255])).toBe(true); // the front overlay, over both
  });

  it("keeps an overlay above the footage when it comes after it", async () => {
    const at = await frameOf(footage, backdrop);
    expect(close(at(320, 180), [255, 255, 0, 255])).toBe(true);
  });
});
