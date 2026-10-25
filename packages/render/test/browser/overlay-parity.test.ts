// Renders the same overlay elements with Chromium's DOM and with the Node overlay plane, and compares where the ink is.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement as h, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium, type Browser } from "@playwright/test";
import { Canvas, loadImage } from "skia-canvas";
import { Caption, Captions, Composition, Graphic, Layer, Shape, Sticker, Svg, Title, Track, collect, installLayerClock, resolve, type ResolvedState } from "@cutcut/kit";
import { visiblePlacements } from "@cutcut/player/engine";
import { indexLayerInteriors, layerClock } from "@cutcut/player/overlays";
import { Captions as DomCaptions } from "../../../player/src/react/elements/Captions";
import { Layer as DomLayerElement } from "../../../player/src/react/elements/Layer";
import { Shape as DomShape } from "../../../player/src/react/elements/Shape";
import { Title as DomTitle } from "../../../player/src/react/elements/Title";
import { Svg as DomSvg } from "../../../player/src/react/elements/Svg";
import { Graphic as DomGraphic } from "../../../player/src/react/elements/Graphic";
import { Sticker as DomSticker } from "../../../player/src/react/elements/Sticker";
import { PlayerContext } from "../../../player/src/react/context";
import { OverlayPlane, directoryResolver } from "../../src";
import { BUNDLED_FONTS, BUNDLED_FONT_WEIGHTS, useT } from "@cutcut/kit";

const W = 640, H = 360, T = 1;
const manifest = { assets: {} };
const require = createRequire(import.meta.url);
/** The bundled families as data-URL faces, so the DOM sets text in the files the export reads. */
function fontFaces(): string {
  const faces: string[] = [];
  for (const font of BUNDLED_FONTS) {
    const dir = require.resolve(`@fontsource/${font.id}/package.json`).replace(/package\.json$/, "files/");
    for (const weight of BUNDLED_FONT_WEIGHTS) {
      for (const style of font.italic ? ["normal", "italic"] : ["normal"]) {
        const data = readFileSync(`${dir}${font.id}-latin-${weight}-${style}.woff`).toString("base64");
        faces.push(`@font-face{font-family:"${font.family}";font-weight:${weight};font-style:${style};src:url(data:font/woff;base64,${data}) format("woff")}`);
      }
    }
  }
  return faces.join("");
}

function Counter() {
  const t = useT();
  return h("div", { style: { position: "absolute", left: 40, top: 30, color: "#fff", fontSize: 48, fontWeight: 700 } }, String(Math.round(1200 * t)));
}

const BADGE = '<svg width="120" height="120" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#ffd400"/><path d="M5 10 L9 14 L15 6" stroke="#111" stroke-width="2" fill="none"/></svg>';

function InlineSvg() {
  return h("div", { style: { position: "absolute", left: 200, top: 80, display: "flex" } }, h("svg", { width: 160, height: 160, viewBox: "0 0 20 20" }, h("circle", { cx: 10, cy: 10, r: 9, fill: "#00c853" })));
}

interface Case { readonly name: string; readonly element: ReactElement; readonly dom: (state: ResolvedState) => ReactElement }

function themed(theme: Record<string, unknown>, ...children: ReactElement[]): ReactElement {
  return h(Composition, { fps: 30, width: W, height: H, theme }, h(Track, { id: "a", layout: "free" }, ...children));
}

function scene(...children: ReactElement[]): ReactElement {
  return h(Composition, { fps: 30, width: W, height: H }, h(Track, { id: "a", layout: "free" }, ...children));
}

const cases: Case[] = [
  {
    name: "a centred bold title",
    element: scene(h(Title, { id: "e", start: 0, duration: 2, size: 64, color: "#ffffff" }, "Parity of text")),
    dom: (s) => domOf(s, DomTitle, { text: "Parity of text" }),
  },
  {
    name: "a left-aligned italic title with letter spacing",
    element: scene(h(Title, { id: "e", start: 0, duration: 2, size: 44, weight: "normal", italic: true, align: "left", valign: "top", letterSpacing: 2, color: "#ffd400" }, "Second line of ink")),
    dom: (s) => domOf(s, DomTitle, { text: "Second line of ink" }),
  },
  {
    name: "a title with a text shadow",
    element: scene(h(Title, { id: "e", start: 0, duration: 2, size: 72, color: "#ffffff", shadow: { color: "#000000", blur: 6, x: 4, y: 4 } }, "Shadow")),
    dom: (s) => domOf(s, DomTitle, { text: "Shadow" }),
  },
  {
    name: "a star with a stroke",
    element: scene(h(Shape, { id: "e", shape: "star", width: 160, height: 160, fill: "#ff5a1f", stroke: { color: "#ffffff", width: 8 }, start: 0, duration: 2 })),
    dom: (s) => domOf(s, DomShape, {}),
  },
  {
    name: "a layer with a live counter",
    element: scene(h(Layer, { id: "e", start: 0, duration: 2 }, h(Counter))),
    dom: (s) => domOf(s, DomLayerElement, { interior: indexLayerInteriors(scene(h(Layer, { id: "e", start: 0, duration: 2 }, h(Counter)))).get("e") }),
  },
  {
    name: "an SVG at its own size, colours replaced",
    element: scene(h(Svg, { id: "e", start: 0, duration: 2, content: BADGE, color: { mode: "replace", tint: "#ff5a1f" } })),
    dom: (s) => domOf(s, DomSvg, {}),
  },
  {
    name: "an SVG fitted to the frame with its own viewBox, tinted",
    element: scene(h(Svg, { id: "e", start: 0, duration: 2, content: BADGE, fit: "contain", viewBox: { minX: -2, minY: -2, width: 24, height: 24 }, color: { mode: "tint", tint: "#2080ff" }, transform: { rotation: 15 } })),
    dom: (s) => domOf(s, DomSvg, {}),
  },
  {
    name: "a layer drawing an inline <svg>",
    element: scene(h(Layer, { id: "e", start: 0, duration: 2 }, h(InlineSvg))),
    dom: (s) => domOf(s, DomLayerElement, { interior: indexLayerInteriors(scene(h(Layer, { id: "e", start: 0, duration: 2 }, h(InlineSvg)))).get("e") }),
  },
  {
    name: "a shape with a gradient, a shadow and its own corner radii",
    element: scene(h(Shape, { id: "e", shape: "rectangle", width: 260, height: 140, start: 0, duration: 2, cornerRadii: { topLeft: 40, topRight: 6, bottomRight: 40, bottomLeft: 6 },
      fill: { type: "gradient", gradient: { type: "linear", angle: 135, stops: [{ offset: 0, color: "#ff5a1f" }, { offset: 1, color: "#7c3aed" }] } }, shadow: { color: "#000000", blur: 12, x: 0, y: 14 } })),
    dom: (s) => domOf(s, DomShape, {}),
  },
  {
    name: "a title halfway through a slide entrance",
    element: scene(h(Title, { id: "e", start: 0, duration: 4, size: 64, color: "#ffffff", enter: { type: "slide-up", duration: 2, easing: "linear" } }, "Arriving")),
    dom: (s) => domOf(s, DomTitle, { text: "Arriving" }),
  },
  {
    name: "an SVG halfway through drawing its strokes",
    element: scene(h(Svg, { id: "e", start: 0, duration: 4, content: BADGE, enter: { type: "draw", duration: 2, easing: "linear" } })),
    dom: (s) => domOf(s, DomSvg, {}),
  },
  {
    name: "a shape halfway through a reveal from the edges",
    element: scene(h(Shape, { id: "e", shape: "rectangle", width: 300, height: 120, start: 0, duration: 4, fill: "#16a34a", enter: { type: "reveal-edges", duration: 2, easing: "linear" } })),
    dom: (s) => domOf(s, DomShape, {}),
  },
  {
    name: "a themed title preset in the theme's serif",
    element: themed({ extends: "paper" }, h(Title, { id: "e", start: 0, duration: 2, style: "h2", color: "$primary" }, "Themed")),
    dom: (s) => domOf(s, DomTitle, { text: "Themed" }),
  },
  {
    name: "an SVG filled from theme tokens",
    element: themed({ extends: "neon" }, h(Svg, { id: "e", start: 0, duration: 2, content: '<svg width="160" height="160" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="$primary"/><path d="M5 10 L9 14 L15 6" stroke="var(--cc-text)" stroke-width="2" fill="none"/></svg>' })),
    dom: (s) => domOf(s, DomSvg, {}),
  },
  {
    name: "a callout graphic with its text",
    element: themed({ extends: "midnight", motion: "none" }, h(Graphic, { id: "e", kind: "callout", text: "Try it free", start: 0, duration: 2 })),
    dom: (s) => domOf(s, DomGraphic, {}),
  },
  {
    name: "a lower third card in the paper theme",
    element: themed({ extends: "paper", motion: "none" }, h(Graphic, { id: "e", kind: "lower-third-card", name: "Ada Lovelace", role: "Engineer", size: 36, start: 0, duration: 2 })),
    dom: (s) => domOf(s, DomGraphic, {}),
  },
  {
    name: "a progress bar halfway through filling",
    element: themed({ extends: "neon", motion: "none" }, h(Graphic, { id: "e", kind: "progress-bar", width: 400, height: 30, start: 0, duration: 2 })),
    dom: (s) => domOf(s, DomGraphic, {}),
  },
  {
    name: "an icon sticker",
    element: scene(h(Sticker, { id: "e", src: "icon:rocket", start: 0, duration: 2 })),
    dom: (s) => domOf(s, DomSticker, {}),
  },
  {
    name: "a caption line",
    element: h(Composition, { fps: 30, width: W, height: H }, h(Captions, { id: "e", style: { position: "bottom", size: 30 } }, h(Caption, { id: "k", start: 0, end: 2, text: "Captions follow the clips" }))),
    dom: (s) => h(DomCaptions, { placement: s.items.get("e")!, state: s, time: T }),
  },
];

function domOf(state: ResolvedState, Component: (props: never) => ReactElement | null, extra: Record<string, unknown>): ReactElement {
  const item = visiblePlacements(state, T).find((v) => v.placement.id === "e")!;
  return h(Component as never, { placement: item.placement, children: item.children, state, time: T, transitionOpacity: 1, ...extra });
}

interface Ink { readonly box: readonly [number, number, number, number] | null; readonly coverage: number }

function inkOf(rgba: Uint8ClampedArray | Uint8Array): Ink {
  let x0 = W, y0 = H, x1 = -1, y1 = -1, sum = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = rgba[(y * W + x) * 4 + 3] as number;
      sum += a / 255;
      if (a > 24) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
  }
  return { box: x1 < 0 ? null : [x0, y0, x1, y1], coverage: sum };
}

let browser: Browser;
beforeAll(async () => { browser = await chromium.launch(); }, 60_000);
afterAll(async () => { await browser.close(); });

describe("overlay parity between the browser DOM and the Node renderer", () => {
  it.each(cases)("$name", async ({ element, dom }) => {
    const state = resolve(collect(element), manifest);
    expect(state.errors).toEqual([]);

    // Node: the overlay plane onto a transparent canvas.
    const canvas = new Canvas(W, H);
    const ctx = canvas.getContext("2d");
    const plane = new OverlayPlane({ state, media: directoryResolver("/nowhere", manifest), interiors: indexLayerInteriors(element), warn: () => undefined });
    await plane.draw(ctx, T);
    plane.dispose();
    const node = inkOf(ctx.getImageData(0, 0, W, H).data);

    // Browser: the DOM components, as they are mounted in the player, with the same Inter faces.
    installLayerClock(() => layerClock(state.items.get("e")!, T, 30));
    const markup = renderToStaticMarkup(h(PlayerContext.Provider, { value: {} as never }, dom(state)));
    installLayerClock(null);
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.setContent(`<!doctype html><style>${fontFaces()}html,body{margin:0;background:transparent}#root{position:relative;width:${W}px;height:${H}px;overflow:hidden;font-family:Inter}</style><div id="root">${markup}</div>`);
    await page.evaluate(() => document.fonts.ready);
    const shot = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
    await page.close();
    const image = await loadImage(shot);
    const probeCanvas = new Canvas(W, H);
    const probe = probeCanvas.getContext("2d");
    probe.drawImage(image, 0, 0);
    const browserInk = inkOf(probe.getImageData(0, 0, W, H).data);

    expect(browserInk.box, "the browser drew something").not.toBeNull();
    expect(node.box, "the renderer drew something").not.toBeNull();
    const [a, b] = [node.box!, browserInk.box!];
    for (let i = 0; i < 4; i++) expect(Math.abs(a[i]! - b[i]!), `ink box edge ${i}: node ${a} browser ${b}`).toBeLessThanOrEqual(4);
    const ratio = node.coverage / browserInk.coverage;
    expect(ratio, `ink coverage: node ${node.coverage.toFixed(0)} browser ${browserInk.coverage.toFixed(0)}`).toBeGreaterThan(0.93);
    expect(ratio).toBeLessThan(1.07);
  }, 60_000);
});
