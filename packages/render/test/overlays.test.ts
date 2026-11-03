import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createElement as h, type ReactElement } from "react";
import type { Canvas, CanvasRenderingContext2D } from "skia-canvas";

import {
  type AssetManifest,
  Caption,
  Captions,
  Composition,
  collect,
  Layer,
  Motion,
  resolve,
  Shape,
  Sticker,
  Svg,
  Three,
  Title,
  Track,
  useT,
} from "@cutcraft/kit";
import { indexLayerInteriors } from "@cutcraft/player/overlays";

import { manifest } from "../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { createCanvas, directoryResolver, OverlayPlane, safeSvgFonts, treeKey } from "../src";

type Rgb = readonly [number, number, number];

const green =
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#00ff00"/></svg>';

function element() {
  const at = (x: number, y: number) => ({ position: { x, y } });
  return h(
    Composition,
    { fps: 30, width: 640, height: 360 },
    h(
      Track,
      { id: "a", layout: "free" },
      h(Shape, {
        id: "red",
        shape: "rectangle",
        width: 100,
        height: 100,
        fill: "#ff0000",
        start: 0,
        duration: 2,
        transform: at(-200, -100),
      }),
      h(Shape, {
        id: "disc",
        shape: "circle",
        width: 100,
        height: 100,
        fill: "#0000ff",
        stroke: { color: "#ffffff", width: 20 },
        start: 0,
        duration: 2,
        transform: at(200, -100),
      }),
      h(Shape, {
        id: "bar",
        shape: "rectangle",
        width: 100,
        height: 40,
        fill: "#ff00ff",
        start: 0,
        duration: 2,
        transform: { position: { x: 0, y: 100 }, rotation: 90 },
      }),
      h(Svg, { id: "svg", content: green, start: 0, duration: 2, transform: at(-250, 100) }),
      h(Sticker, { id: "pack", src: "pack:smile", name: "ok", start: 0, duration: 2, transform: at(250, 100) }),
      h(Sticker, { id: "logo", src: "asset:logo", start: 0, duration: 2, transform: at(0, -130) }),
      h(
        Title,
        {
          id: "hi",
          start: 0,
          duration: 2,
          size: 60,
          color: "#ffff00",
          stroke: { color: "#000000", width: 2 },
          shadow: { color: "#000000", blur: 4, x: 2, y: 2 },
        },
        "Hi",
      ),
      h(Shape, {
        id: "half",
        shape: "rectangle",
        width: 60,
        height: 60,
        fill: "#ffffff",
        start: 0,
        duration: 2,
        transform: { position: { x: -120, y: 100 }, opacity: 0.5 },
      }),
      h(Shape, {
        id: "under",
        shape: "rectangle",
        width: 60,
        height: 60,
        fill: "#ff0000",
        start: 0,
        duration: 2,
        transform: at(120, 100),
      }),
      h(Shape, {
        id: "mult",
        shape: "rectangle",
        width: 60,
        height: 60,
        fill: "#00ff00",
        start: 0,
        duration: 2,
        blend: "multiply",
        transform: at(120, 100),
      }),
    ),
    h(
      Captions,
      { id: "caps", style: { position: "bottom", size: 30 } },
      h(Caption, { id: "k1", start: 0, end: 2, text: "Hello world" }),
    ),
  );
}

const el = element();
const state = resolve(collect(el), manifest);
const warnings: string[] = [];
const plane = new OverlayPlane({
  state,
  media: directoryResolver(mediaDir, manifest),
  interiors: indexLayerInteriors(el),
  warn: (m) => warnings.push(m),
});
const canvas = createCanvas(640, 360) as unknown as Canvas;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function px(x: number, y: number): Rgb {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return [d[0] as number, d[1] as number, d[2] as number];
}
function near(c: Rgb, want: Rgb, tol = 12): boolean {
  return c.every((v, i) => Math.abs(v - (want[i] as number)) <= tol);
}

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
    for (let y = 150; y < 210; y++)
      for (let x = 280; x < 360; x++) {
        const [r, g, b] = px(x, y);
        if (r > 200 && g > 200 && b < 80) yellow++;
      }
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
    let white = 0,
      lit = 0;
    for (let y = 290; y < 345; y++)
      for (let x = 100; x < 540; x++) {
        const [r, g, b] = px(x, y);
        if (r > 220 && g > 220 && b > 220) white++;
        if (r + g + b > 0) lit++;
      }
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

describe("layout reuse", () => {
  function Steady() {
    return h(
      "div",
      { style: { position: "absolute", left: 20, top: 20, color: "#ffffff", fontSize: 40 } },
      "same every frame",
    );
  }
  function Ticking() {
    const t = useT();
    return h(
      "div",
      { style: { position: "absolute", left: 20, top: 20, color: "#ffffff", fontSize: 40 } },
      String(Math.round(t * 100)),
    );
  }

  function planeFor(...children: ReactElement[]) {
    const el = h(Composition, { fps: 30, width: 640, height: 360 }, h(Track, { id: "a", layout: "free" }, ...children));
    const st = resolve(collect(el), manifest);
    return new OverlayPlane({
      state: st,
      media: directoryResolver(mediaDir, manifest),
      interiors: indexLayerInteriors(el),
      warn: () => undefined,
    });
  }

  async function frames(plane: OverlayPlane, times: number[]): Promise<void> {
    const c = createCanvas(640, 360) as unknown as Canvas;
    const context = c.getContext("2d") as CanvasRenderingContext2D;
    for (const t of times) {
      context.clearRect(0, 0, 640, 360);
      await plane.draw(context, t);
    }
  }

  it("lays a still title out once, however many frames show it", async () => {
    const plane = planeFor(h(Title, { id: "e", start: 0, duration: 4, size: 50 }, "Still"));
    await frames(plane, [0.1, 0.5, 1, 2, 3]);
    expect(plane.stats).toEqual({ layouts: 1, reused: 4 });
    // A picture from the cache is the picture a fresh layout would give.
    const cached = createCanvas(640, 360) as unknown as Canvas,
      fresh = createCanvas(640, 360) as unknown as Canvas;
    await plane.draw(cached.getContext("2d") as CanvasRenderingContext2D, 2.5);
    const other = planeFor(h(Title, { id: "e", start: 0, duration: 4, size: 50 }, "Still"));
    await other.draw(fresh.getContext("2d") as CanvasRenderingContext2D, 2.5);
    expect(
      Buffer.from((cached.getContext("2d") as CanvasRenderingContext2D).getImageData(0, 0, 640, 360).data).equals(
        Buffer.from((fresh.getContext("2d") as CanvasRenderingContext2D).getImageData(0, 0, 640, 360).data),
      ),
    ).toBe(true);
    plane.dispose();
    other.dispose();
  });

  it("lays an animated title out again only while it animates", async () => {
    const plane = planeFor(
      h(
        Title,
        { id: "e", start: 0, duration: 4, size: 50, animation: { preset: "fade", in: 0.5, out: 0.5 } },
        "Fading",
      ),
    );
    await frames(plane, [0.1, 0.3, 1, 2, 3]);
    expect(plane.stats.layouts).toBe(3);
    expect(plane.stats.reused).toBe(2);
    plane.dispose();
  });

  it("lays out a layer that reads the clock on every frame, and one that does not only once", async () => {
    const ticking = planeFor(h(Layer, { id: "e", start: 0, duration: 4 }, h(Ticking)));
    await frames(ticking, [0.5, 1, 1.5]);
    expect(ticking.stats).toEqual({ layouts: 3, reused: 0 });
    ticking.dispose();
    const steady = planeFor(h(Layer, { id: "e", start: 0, duration: 4 }, h(Steady)));
    await frames(steady, [0.5, 1, 1.5, 2]);
    expect(steady.stats).toEqual({ layouts: 1, reused: 3 });
    steady.dispose();
  });

  it("reuses a picture only for the same content", () => {
    const tree = (text: string) => h("div", { style: { color: "#fff", fontSize: 20 } }, text);
    expect(treeKey(tree("a"))).toBe(treeKey(tree("a")));
    expect(treeKey(tree("a"))).not.toBe(treeKey(tree("b")));
    expect(treeKey(h("div", { style: { color: "#fff" } }, "a"))).not.toBe(
      treeKey(h("div", { style: { color: "#000" } }, "a")),
    );
    expect(treeKey(h(Steady))).toBeNull();
  });
});

describe("SVG in the export", () => {
  const icon =
    '<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="#2080ff"/><rect x="2.5" y="2.5" width="5" height="5" fill="#ffffff"/></svg>';
  const scratch = mkdtempSync(join(tmpdir(), "cutcut-svg-"));
  writeFileSync(join(scratch, "badge.svg"), icon);
  const svgManifest: AssetManifest = {
    assets: { ...manifest.assets, badge: { id: "badge", kind: "image", duration: 0, width: 10, height: 10 } },
  };
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  function Inline() {
    return h(
      "div",
      { style: { display: "flex", position: "absolute", left: 300, top: 100 } },
      h("svg", { width: 40, height: 40, viewBox: "0 0 10 10" }, h("rect", { width: 10, height: 10, fill: "#00ff00" })),
    );
  }

  async function draw(...children: ReactElement[]) {
    const el = h(Composition, { fps: 30, width: 640, height: 360 }, h(Track, { id: "a", layout: "free" }, ...children));
    const st = resolve(collect(el), svgManifest);
    expect(st.errors).toEqual([]);
    const seen: string[] = [];
    const plane = new OverlayPlane({
      state: st,
      media: directoryResolver(scratch, svgManifest),
      interiors: indexLayerInteriors(el),
      warn: (m) => seen.push(m),
    });
    const c = createCanvas(640, 360) as unknown as Canvas;
    const context = c.getContext("2d") as CanvasRenderingContext2D;
    await plane.draw(context, 1);
    plane.dispose();
    const at = (x: number, y: number): Rgb => {
      const d = context.getImageData(x, y, 1, 1).data;
      return [d[0] as number, d[1] as number, d[2] as number];
    };
    return { at, seen };
  }

  it("draws SVG text in a bundled font, and in sans-serif (with a warning) for a font it lacks", async () => {
    // Skia aborts the process on SVG text in a family it has no font for; reaching the assertions is the test.
    const text = (family: string) =>
      `<svg width="300" height="80"><text x="10" y="60" font-family="${family}" font-size="56" fill="#ffffff">Hamburg</text></svg>`;
    const { at, seen } = await draw(
      h(Svg, {
        id: "known",
        content: text("Playfair Display, serif"),
        start: 0,
        duration: 2,
        transform: { position: { x: 0, y: -100 } },
      }),
      h(Svg, {
        id: "unknown",
        content: text("Comic Neue"),
        start: 0,
        duration: 2,
        transform: { position: { x: 0, y: 60 } },
      }),
      h(Svg, {
        id: "styled",
        content:
          '<svg width="300" height="80"><style>text { font: 40px "Nope"; font-family: Nope, \'Also Nope\' }</style><text x="10" y="60" style="font-family: &quot;Nope&quot;" fill="#fff">Hi</text></svg>',
        start: 0,
        duration: 2,
        transform: { position: { x: 200, y: 140 } },
      }),
    );
    expect(seen.filter((m) => m.includes("svg") || m.includes("SVG"))).toEqual([
      'SVG text in font "Comic Neue" is drawn in sans-serif; the export has no such font',
      'SVG text in font "Nope" is drawn in sans-serif; the export has no such font',
      'SVG text in font "Also Nope" is drawn in sans-serif; the export has no such font',
    ]);
    let ink = 0;
    for (let x = 180; x < 460; x++) for (let y = 40; y < 110; y += 3) if (at(x, y)[0] > 128) ink++;
    expect(ink).toBeGreaterThan(50);
  });

  it("plays SMIL on the element's own clock", async () => {
    const pulse =
      '<svg width="100" height="100"><rect width="100" height="100" fill="#ff0000"><animate attributeName="fill" values="#ff0000;#0000ff" dur="2s" fill="freeze"/></rect></svg>';
    const svgAt = async (t: number) => {
      const el = h(
        Composition,
        { fps: 30, width: 640, height: 360 },
        h(Track, { id: "a", layout: "free" }, h(Svg, { id: "p", content: pulse, start: 1, duration: 4 })),
      );
      const st = resolve(collect(el), svgManifest);
      const plane = new OverlayPlane({
        state: st,
        media: directoryResolver(scratch, svgManifest),
        warn: () => undefined,
      });
      const c = createCanvas(640, 360) as unknown as Canvas;
      const context = c.getContext("2d") as CanvasRenderingContext2D;
      await plane.draw(context, t);
      plane.dispose();
      const d = context.getImageData(320, 180, 1, 1).data;
      return [d[0] as number, d[1] as number, d[2] as number] as Rgb;
    };
    expect(near(await svgAt(1), [255, 0, 0])).toBe(true); // the element's own time 0
    expect(near(await svgAt(2), [128, 0, 128])).toBe(true); // halfway through the 2 s animation
    expect(near(await svgAt(4), [0, 0, 255])).toBe(true); // frozen at its end
  });

  it("narrows SVG font lists to a family skia knows", () => {
    const known = (f: string) => f === "Inter" || f === "sans-serif" || f === "serif";
    expect(safeSvgFonts('<text font-family="Foo, Inter">x</text>', known)).toEqual({
      svg: '<text font-family="Inter">x</text>',
      replaced: [],
    });
    expect(safeSvgFonts("<text font-family='Foo'>x</text>", known)).toEqual({
      svg: "<text font-family='sans-serif'>x</text>",
      replaced: ["Foo"],
    });
    expect(safeSvgFonts('<text style="font: bold 12px Foo; fill: red">font: kept</text>', known).svg).toBe(
      '<text style=" fill: red">font: kept</text>',
    );
    const plain = '<svg><rect width="1" height="1"/></svg>';
    expect(safeSvgFonts(plain, known).svg).toBe(plain);
  });

  it("draws an SVG at the size it asks for, or fitted to the frame", async () => {
    const { at } = await draw(
      h(Svg, {
        id: "small",
        content: icon.replace('viewBox="0 0 10 10"', 'width="40" height="40" viewBox="0 0 10 10"'),
        start: 0,
        duration: 2,
        transform: { position: { x: -200, y: 0 } },
      }),
      h(Svg, {
        id: "big",
        content: icon,
        fit: "contain",
        start: 0,
        duration: 2,
        transform: { position: { x: 140, y: 0 } },
      }),
    );
    // "small" is 40 px, centred 200 px left of the middle: blue edge at x=105, white centre at 120.
    expect(near(at(105, 180), [32, 128, 255])).toBe(true);
    expect(near(at(120, 180), [255, 255, 255])).toBe(true);
    expect(near(at(95, 180), [0, 0, 0])).toBe(true);
    // "big" fills the frame's height (360 px square), moved 140 px right: x from 280 to 640.
    expect(near(at(300, 20), [32, 128, 255])).toBe(true);
    expect(near(at(460, 180), [255, 255, 255])).toBe(true);
  });

  it("replaces every colour with the tint, or tints keeping the shading", async () => {
    const { at } = await draw(
      h(Svg, {
        id: "rep",
        content: icon,
        start: 0,
        duration: 2,
        fit: "contain",
        transform: { scale: 0.3, position: { x: -200, y: 0 } },
        color: { mode: "replace", tint: "#ff0000" },
      }),
      h(Svg, {
        id: "tin",
        content: icon,
        start: 0,
        duration: 2,
        fit: "contain",
        transform: { scale: 0.3 },
        color: { mode: "tint", tint: "#ff0000" },
      }),
      h(Svg, {
        id: "half",
        content: icon,
        start: 0,
        duration: 2,
        fit: "contain",
        transform: { scale: 0.3, position: { x: 200, y: 0 } },
        color: { mode: "replace", tint: "#ff0000", opacity: 0.5 },
      }),
    );
    expect(near(at(120 - 45, 180), [255, 0, 0])).toBe(true);
    expect(near(at(120, 180), [255, 0, 0])).toBe(true);
    // Tint: the white centre turns full red, the blue edge a darker red (its luminance).
    expect(near(at(320, 180), [255, 0, 0])).toBe(true);
    const [r, g, b] = at(320 - 45, 180);
    expect(r).toBeGreaterThan(100);
    expect(r).toBeLessThan(200);
    expect(g + b).toBe(0);
    // Half replace: halfway between the blue edge (32, 128, 255) and red.
    expect(near(at(520 - 45, 180), [144, 64, 128], 6)).toBe(true);
  });

  it("reads an SVG asset as markup", async () => {
    const { at, seen } = await draw(h(Svg, { id: "file", src: "asset:badge", start: 0, duration: 2, fit: "contain" }));
    expect(seen).toEqual([]);
    expect(near(at(320, 180), [255, 255, 255])).toBe(true);
    expect(near(at(160, 180), [32, 128, 255])).toBe(true);
  });

  it("warns once about what it removed from the markup", async () => {
    const { seen } = await draw(
      h(Svg, { id: "bad", content: '<svg viewBox="0 0 1 1"><script>x()</script></svg>', start: 0, duration: 2 }),
    );
    expect(seen).toEqual(['svg "bad": <script> is not drawn and was removed']);
  });

  it("draws an inline <svg> inside a Layer, which Satori hands over as an embedded image", async () => {
    const { at } = await draw(h(Layer, { id: "l", start: 0, duration: 2 }, h(Inline)));
    expect(near(at(320, 120), [0, 255, 0])).toBe(true);
    expect(near(at(290, 120), [0, 0, 0])).toBe(true);
  });
});

describe("OverlayPlane and engine layers", () => {
  it("leaves <Three> and <Motion> out with a warning, since they need a browser", async () => {
    const tree = h(
      Composition,
      { fps: 30, width: 640, height: 360 },
      h(
        Track,
        { id: "fx", layout: "free" },
        h(Three, { id: "cube", start: 0, duration: 2, setup: () => undefined }),
        h(Motion, { id: "words", start: 0, duration: 2, sequence: [["h1", { opacity: [0, 1] }]] }, h("h1", null, "Hi")),
      ),
    );
    const engineState = resolve(collect(tree), manifest);
    expect(engineState.errors).toEqual([]);
    const said: string[] = [];
    const engines = new OverlayPlane({
      state: engineState,
      media: directoryResolver(mediaDir, manifest),
      interiors: indexLayerInteriors(tree),
      warn: (m) => said.push(m),
    });
    const c = createCanvas(640, 360) as unknown as Canvas;
    await engines.draw(c.getContext("2d") as CanvasRenderingContext2D, 1);
    engines.dispose();
    expect(said).toEqual([
      expect.stringContaining("three engine, which needs a browser"),
      expect.stringContaining("motion engine, which needs a browser"),
    ]);
  });
});
