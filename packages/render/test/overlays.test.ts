import { createElement as h } from "react";
import type { Canvas, CanvasRenderingContext2D } from "skia-canvas";
import { Caption, Captions, Composition, Shape, Sticker, Svg, Title, Track, collect, resolve } from "@cutcut/kit";
import { indexLayerInteriors } from "@cutcut/player/overlays";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { manifest } from "../../player/e2e/app/composition";
import { OverlayPlane, createCanvas, directoryResolver, toSvg } from "../src";

type Rgb = readonly [number, number, number];

const green = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#00ff00"/></svg>';

function element() {
  const at = (x: number, y: number) => ({ position: { x, y } });
  return h(Composition, { fps: 30, width: 640, height: 360 },
    h(Track, { id: "a", layout: "free" },
      h(Shape, { id: "red", shape: "rectangle", width: 100, height: 100, fill: "#ff0000", start: 0, duration: 2, transform: at(-200, -100) }),
      h(Shape, { id: "disc", shape: "circle", width: 100, height: 100, fill: "#0000ff", stroke: { color: "#ffffff", width: 20 }, start: 0, duration: 2, transform: at(200, -100) }),
      h(Shape, { id: "bar", shape: "rectangle", width: 100, height: 40, fill: "#ff00ff", start: 0, duration: 2, transform: { position: { x: 0, y: 100 }, rotation: 90 } }),
      h(Svg, { id: "svg", content: green, start: 0, duration: 2, transform: at(-250, 100) }),
      h(Sticker, { id: "pack", src: "pack:smile", name: "ok", start: 0, duration: 2, transform: at(250, 100) }),
      h(Sticker, { id: "logo", src: "asset:logo", start: 0, duration: 2, transform: at(0, -130) }),
      h(Title, { id: "hi", start: 0, duration: 2, size: 60, color: "#ffff00", stroke: { color: "#000000", width: 2 }, shadow: { color: "#000000", blur: 4, x: 2, y: 2 } }, "Hi"),
      h(Shape, { id: "half", shape: "rectangle", width: 60, height: 60, fill: "#ffffff", start: 0, duration: 2, transform: { position: { x: -120, y: 100 }, opacity: 0.5 } }),
      h(Shape, { id: "under", shape: "rectangle", width: 60, height: 60, fill: "#ff0000", start: 0, duration: 2, transform: at(120, 100) }),
      h(Shape, { id: "mult", shape: "rectangle", width: 60, height: 60, fill: "#00ff00", start: 0, duration: 2, blend: "multiply", transform: at(120, 100) }),
    ),
    h(Captions, { id: "caps", style: { position: "bottom", size: 30 } }, h(Caption, { id: "k1", start: 0, end: 2, text: "Hello world" })),
  );
}

const el = element();
const state = resolve(collect(el), manifest);
const warnings: string[] = [];
const plane = new OverlayPlane({ state, media: directoryResolver(mediaDir, manifest), interiors: indexLayerInteriors(el), warn: (m) => warnings.push(m) });
const canvas = createCanvas(640, 360) as unknown as Canvas;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function px(x: number, y: number): Rgb {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return [d[0] as number, d[1] as number, d[2] as number];
}
function near(c: Rgb, want: Rgb, tol = 12): boolean { return c.every((v, i) => Math.abs(v - (want[i] as number)) <= tol); }

beforeAll(async () => {
  generateMedia();
  expect(state.errors).toEqual([]);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 640, 360);
  await plane.draw(ctx, 1);
});
afterAll(() => plane.dispose());

describe("OverlayPlane", () => {
  it("draws a shape at its offset from the centre", () => {
    expect(near(px(120, 80), [255, 0, 0])).toBe(true);
    expect(near(px(60, 80), [0, 0, 0])).toBe(true);
  });

  it("keeps a stroke that reaches past the shape's box", () => {
    expect(near(px(520, 80), [0, 0, 255])).toBe(true);
    // The disc has radius 50 and a 20 px stroke centred on its edge, so white runs from 40 to 60.
    expect(near(px(575, 80), [255, 255, 255])).toBe(true);
    expect(near(px(520, 80 - 57), [255, 255, 255])).toBe(true);
    expect(near(px(520, 80 - 65), [0, 0, 0])).toBe(true);
  });

  it("rotates a shape about its centre", () => {
    expect(near(px(320, 235), [255, 0, 255])).toBe(true);
    expect(near(px(350, 280), [0, 0, 0])).toBe(true);
  });

  it("draws inline SVG and image stickers", () => {
    expect(near(px(70, 280), [0, 255, 0])).toBe(true);
    expect(near(px(320, 50), [255, 0, 0], 30)).toBe(true);
  });

  it("draws a labelled box for a sticker without media, and says so once", () => {
    expect(near(px(540, 240), [51, 51, 51])).toBe(true);
    expect(warnings.filter((w) => w.includes("pack:smile"))).toHaveLength(1);
  });

  it("sets a title in Inter over the footage", () => {
    let yellow = 0;
    for (let y = 150; y < 210; y++) for (let x = 280; x < 360; x++) { const [r, g, b] = px(x, y); if (r > 200 && g > 200 && b < 80) yellow++; }
    expect(yellow).toBeGreaterThan(150);
  });

  it("applies opacity and blend modes from the element's layout", () => {
    const [r, g, b] = px(200, 280);
    expect(r).toBeGreaterThan(110);
    expect(r).toBeLessThan(146);
    expect(Math.abs(r - g) + Math.abs(g - b)).toBeLessThan(6);
    // Green multiplied over red is black; drawn normally it would be green.
    expect(near(px(440, 280), [0, 0, 0])).toBe(true);
  });

  it("draws the active caption in the captions style", () => {
    let white = 0, lit = 0;
    for (let y = 290; y < 345; y++) for (let x = 100; x < 540; x++) { const [r, g, b] = px(x, y); if (r > 220 && g > 220 && b > 220) white++; if (r + g + b > 0) lit++; }
    expect(white).toBeGreaterThan(100);
    expect(lit).toBeGreaterThan(white);
  });

  it("draws nothing for an element that is not showing", async () => {
    ctx.clearRect(0, 0, 640, 360);
    await plane.draw(ctx, 5);
    const data = ctx.getImageData(0, 0, 640, 360).data;
    expect(data.every((v: number) => v === 0)).toBe(true);
  });
});

describe("toSvg", () => {
  it("writes a standalone document with room around the shape", () => {
    const svg = toSvg(h("svg", { width: 10, height: 20, viewBox: "0 0 10 20", style: { display: "block" } }, h("rect", { x: 0, y: 0, width: 10, height: 20, fillOpacity: 0.5, fill: "#fff" })), 3);
    expect(svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="26" viewBox="-3 -3 16 26"><rect x="0" y="0" width="10" height="20" fill-opacity="0.5" fill="#fff"/></svg>');
  });
});
