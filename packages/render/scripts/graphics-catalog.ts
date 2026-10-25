import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h } from "react";
import { z } from "zod";
import { GRAPHIC_KINDS, GRAPHIC_KIND_NAMES, graphicSize } from "@cutcut/graphics";
import { Composition, Graphic, THEMES, Track, collect, resolve, type ThemeName } from "@cutcut/kit";
import { OverlayPlane, createCanvas, directoryResolver } from "../src/index";

/**
 * Pictures for the graphics catalog: each kind drawn by the export (`OverlayPlane`)
 * from its example props, one second into a three-second element, and a contact
 * sheet of all of them. Not checked by CI (skia's anti-aliasing differs between
 * machines); run `pnpm docs:graphics` after changing a kind.
 *
 *   pnpm docs:graphics [--theme midnight] [--out docs/public/graphics]   (from the repository root)
 */
const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1]! : fallback; };
const theme = flag("theme", "midnight") as ThemeName;
const out = join(import.meta.dirname, "..", "..", "..", flag("out", "docs/public/graphics"));
mkdirSync(out, { recursive: true });

const TILE = { width: 480, height: 300 };
const FRAME = { width: 1920, height: 1080 };
const background = THEMES[theme].palette.background;
type Canvas = ReturnType<typeof canvas>;
const canvas = (w: number, h: number) => createCanvas(w, h) as unknown as import("skia-canvas").Canvas;
const tiles: { name: string; canvas: Canvas }[] = [];

for (const name of GRAPHIC_KIND_NAMES) {
  const kind = GRAPHIC_KINDS[name];
  const props = { kind: name, ...kind.example };
  // Draw each kind at its own size in a frame just large enough, then scale that into the tile.
  const size = graphicSize({ kind: name, ...(z.strictObject(kind.shape).parse(kind.example) as Record<string, unknown>) }, FRAME);
  const pad = Math.round(Math.max(size.width, size.height) * 0.12);
  const width = Math.min(FRAME.width, size.width + pad * 2), height = Math.min(FRAME.height, size.height + pad * 2);
  const el = h(Composition, { fps: 30, width, height, theme: { extends: theme, motion: "none" } },
    h(Track, { id: "a", layout: "free" }, h(Graphic, { id: `g-${name}`, ...props, start: 0, duration: 3 } as never)));
  const state = resolve(collect(el), { assets: {} });
  if (state.errors.length) throw new Error(`${name}: ${state.errors.map((e) => e.message).join("; ")}`);
  const plane = new OverlayPlane({ state, media: directoryResolver("/nowhere", { assets: {} }), warn: (m) => console.warn(`${name}: ${m}`) });
  const frame = canvas(width, height);
  const ctx = frame.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  await plane.draw(ctx as never, 1);
  plane.dispose();

  const tile = canvas(TILE.width, TILE.height);
  const t = tile.getContext("2d");
  t.fillStyle = background;
  t.fillRect(0, 0, TILE.width, TILE.height);
  const k = Math.min(TILE.width / width, TILE.height / height);
  t.drawImage(frame, (TILE.width - width * k) / 2, (TILE.height - height * k) / 2, width * k, height * k);
  writeFileSync(join(out, `${name}.png`), await tile.toBuffer("png"));
  tiles.push({ name, canvas: tile });
}

const cols = 5, label = 34, gap = 8;
const sheet = canvas(cols * (TILE.width + gap) + gap, Math.ceil(tiles.length / cols) * (TILE.height + label + gap) + gap);
const s = sheet.getContext("2d");
s.fillStyle = "#000000";
s.fillRect(0, 0, sheet.width, sheet.height);
tiles.forEach(({ name, canvas }, i) => {
  const x = gap + (i % cols) * (TILE.width + gap), y = gap + Math.floor(i / cols) * (TILE.height + label + gap);
  s.drawImage(canvas, x, y);
  s.fillStyle = "#ffffff";
  s.font = "22px Inter, sans-serif";
  s.fillText(name, x + 6, y + TILE.height + 25);
});
writeFileSync(join(out, "sheet.png"), await sheet.toBuffer("png"));
console.log(`${tiles.length} kinds → ${out}`);
