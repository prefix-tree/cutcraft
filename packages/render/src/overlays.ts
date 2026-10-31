import { createRequire } from "node:module";
import type { ResolvedState } from "@cutcut/kit";
import { BUNDLED_FONTS, BUNDLED_FONT_WEIGHTS, installLayerClock } from "@cutcut/kit";
import { backdropTracks, boundsOf, isVisibleAt, visiblePlacements, type DrawRect, type MediaResolver, type VisibleItem } from "@cutcut/player/engine";
import {
  OVERLAY_KINDS, captionsContent, graphicDrawing, graphicLabels, iconStickerDrawing, parseSvg, serialize, shapeDrawing, svgDrawing, layerClock, layerContent, overlayLayout, stickerPlaceholder, stickerSize, titleBox, titleContent,
  type ElementProps, type GraphicDrawing, type OverlayLayout,
} from "@cutcut/player/overlays";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import satori, { type Font } from "satori";
import { Canvas, FontLibrary, loadImage, type CanvasRenderingContext2D, type Image } from "skia-canvas";

/** A font handed to Satori. Satori reads TTF, OTF and WOFF, not WOFF2. */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface OverlayFont {
  readonly name: string;
  readonly data: Buffer | ArrayBuffer;
  readonly weight?: FontWeight;
  readonly style?: "normal" | "italic";
}

export interface OverlayOptions {
  readonly state: ResolvedState;
  readonly media: MediaResolver;
  /** The children of each `<Layer id>` in the file; see `indexLayerInteriors`. */
  readonly interiors?: ReadonlyMap<string, ReactNode>;
  /** Fonts beyond the bundled families (`BUNDLED_FONTS`); a title's `font` prop picks one by name. */
  readonly fonts?: readonly OverlayFont[];
  readonly warn: (message: string) => void;
}

const IMAGE_CACHE = 64;
const LAYOUT_CACHE = 32;

/** How much layout work the plane did: Satori runs against pictures reused from earlier frames. */
export interface OverlayStats { layouts: number; reused: number }

/** Where an overlay's visible pixels fall at one moment, in composition pixels; it may reach past the frame. */
export interface OverlayBounds {
  readonly id: string;
  readonly kind: string;
  /** The box around all of its ink. */
  readonly rect: DrawRect;
  /** Boxes around its ink cell by cell (square cells, 16 along its longer side), so a hollow frame does not count as filled. */
  readonly parts: readonly DrawRect[];
  /** On a track beneath the footage. */
  readonly backdrop: boolean;
}

/** Below this opacity an element counts as not showing. */
const VISIBLE_OPACITY = 0.1;
/** Pictures are scanned for their ink at most this many pixels on a side: a few pixels of slack at 1080p. */
const INK_SIDE = 512;
const INK_ALPHA = 8;
const INK_GRID = 16;

/** A picture's ink as fractions of its size: the box around all of it, and the box around it in each grid cell that has any. */
interface Ink { readonly box: Box; readonly parts: readonly Box[] }
const inkCache = new WeakMap<Image | Canvas, Ink | null>();

/** The part of a picture that is not transparent; null when it is all transparent. */
function inkOf(image: Image | Canvas): Ink | null {
  const hit = inkCache.get(image);
  if (hit !== undefined) return hit;
  const s = Math.min(1, INK_SIDE / Math.max(image.width, image.height, 1));
  const w = Math.max(1, Math.round(image.width * s)), h = Math.max(1, Math.round(image.height * s));
  const ctx = new Canvas(w, h).getContext("2d");
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  // Per grid cell: min x, min y, max x, max y of its ink pixels; rows run top down, so the first pixel sets min y.
  const cell = Math.max(w, h) / INK_GRID, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  const cells = new Float64Array(cols * rows * 4).fill(Number.NaN);
  for (let y = 0; y < h; y++) {
    const row = Math.min(rows - 1, Math.floor(y / cell)) * cols;
    for (let x = 0; x < w; x++) {
      if ((data[(y * w + x) * 4 + 3] as number) <= INK_ALPHA) continue;
      const c = (row + Math.min(cols - 1, Math.floor(x / cell))) * 4;
      if (Number.isNaN(cells[c]!)) { cells[c] = x; cells[c + 1] = y; cells[c + 2] = x; cells[c + 3] = y; continue; }
      if (x < cells[c]!) cells[c] = x;
      if (x > cells[c + 2]!) cells[c + 2] = x;
      if (y > cells[c + 3]!) cells[c + 3] = y;
    }
  }
  const parts: Box[] = [];
  for (let c = 0; c < cells.length; c += 4) {
    if (!Number.isNaN(cells[c]!)) parts.push({ x: cells[c]! / w, y: cells[c + 1]! / h, w: (cells[c + 2]! + 1 - cells[c]!) / w, h: (cells[c + 3]! + 1 - cells[c + 1]!) / h });
  }
  const ink = parts.length === 0 ? null : { box: union(parts), parts };
  inkCache.set(image, ink);
  return ink;
}

function union(boxes: readonly Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x)), y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

/**
 * The overlay plane in Node: titles, layers and captions are laid out by
 * Satori from the same React trees the browser mounts; shapes and SVG are
 * drawn as vectors; stickers are images. Each element is drawn onto the
 * frame with the layout the DOM would give it (matrix, opacity, filter,
 * blend, corner radius), so what sits above the footage matches the preview.
 */
export class OverlayPlane {
  private readonly fonts: Font[];
  private readonly families: ReadonlySet<string>;
  private readonly images = new Map<string, Image>();
  private readonly assets = new Map<string, Promise<Image | null>>();
  private readonly texts = new Map<string, Promise<string | null>>();
  private readonly warned = new Set<string>();
  private readonly laidOut = new Map<string, Image>();
  /** Layer interiors that never read the clock: one picture serves every frame. */
  private readonly steady = new Set<string>();
  private clockRead = false;
  /** Set while `bounds` runs: `place` records where the element's ink lands instead of drawing it. */
  private measuring: { readonly id: string; readonly kind: string; readonly backdrop: boolean; readonly out: OverlayBounds[] } | null = null;
  readonly stats: OverlayStats = { layouts: 0, reused: 0 };

  constructor(private readonly options: OverlayOptions) {
    this.fonts = [...bundledFonts(), ...(options.fonts ?? [])].map((f) => ({ name: f.name, data: f.data, weight: f.weight ?? 400, style: f.style ?? "normal" }));
    this.families = new Set(this.fonts.map((f) => f.name));
    registerSvgFonts();
  }

  /** Whether anything but footage shows at `t`: an overlay element, or a caption line. */
  hasOverlays(t: number): boolean {
    const { state } = this.options;
    if (visiblePlacements(state, t).some((v) => OVERLAY_KINDS.has(v.placement.kind))) return true;
    return [...state.items.values()].some((p) => p.kind === "caption" && isVisibleAt(p, t, state.composition.duration));
  }

  /**
   * Draws the overlays visible at `t` onto `ctx`, tracks in order, captions last: those beneath the
   * footage (`backdropTracks`) for `"backdrop"`, the rest for `"front"`, all of them by default.
   */
  async draw(ctx: CanvasRenderingContext2D, t: number, layer: "all" | "backdrop" | "front" = "all"): Promise<void> {
    const { state } = this.options;
    const backdrop = backdropTracks(state);
    for (const item of visiblePlacements(state, t)) {
      if (!OVERLAY_KINDS.has(item.placement.kind)) continue;
      if (layer !== "all" && backdrop.has(item.track.id) !== (layer === "backdrop")) continue;
      await this.guard(item.placement.id, () => this.drawItem(ctx, item, t));
    }
    if (layer === "backdrop") return;
    for (const captions of state.items.values()) {
      if (captions.kind !== "captions") continue;
      await this.guard(captions.id, async () => {
        const comp = state.composition;
        const image = await this.layoutImage(captionsContent({ placement: captions, state, time: t }), comp.width, comp.height);
        ctx.drawImage(image, 0, 0, comp.width, comp.height);
      });
    }
  }

  /**
   * Where each overlay visible at `t` shows, captions included: the box around its non-transparent pixels after its
   * layout, entrance or exit, and transform, in composition pixels. Elements fainter than 10% opacity are left out.
   */
  async bounds(t: number): Promise<OverlayBounds[]> {
    const { state } = this.options;
    const comp = state.composition;
    const backdrop = backdropTracks(state);
    const out: OverlayBounds[] = [];
    const scratch = new Canvas(1, 1).getContext("2d");
    for (const item of visiblePlacements(state, t)) {
      if (!OVERLAY_KINDS.has(item.placement.kind)) continue;
      this.measuring = { id: item.placement.id, kind: item.placement.kind, backdrop: backdrop.has(item.track.id), out };
      try {
        await this.guard(item.placement.id, () => this.drawItem(scratch, item, t));
      } finally {
        this.measuring = null;
      }
    }
    for (const captions of state.items.values()) {
      if (captions.kind !== "captions") continue;
      await this.guard(captions.id, async () => {
        const ink = inkOf(await this.layoutImage(captionsContent({ placement: captions, state, time: t }), comp.width, comp.height));
        const scale = (b: Box): Box => ({ x: b.x * comp.width, y: b.y * comp.height, w: b.w * comp.width, h: b.h * comp.height });
        if (ink) out.push({ id: captions.id, kind: "captions", backdrop: false, rect: scale(ink.box), parts: ink.parts.map(scale) });
      });
    }
    return out;
  }

  dispose(): void {
    this.images.clear();
    this.laidOut.clear();
    this.assets.clear();
    this.texts.clear();
    installLayerClock(null);
  }

  private async guard(id: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.warnOnce(`draw:${id}`, `overlay "${id}" could not be drawn and is left out: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private warnOnce(key: string, message: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.options.warn(message);
  }

  private async drawItem(ctx: CanvasRenderingContext2D, item: VisibleItem, t: number): Promise<void> {
    const { state } = this.options;
    const { placement } = item;
    const props: ElementProps = { placement, children: item.children, state, time: t, transition: item.transition };
    const comp = state.composition;
    const full = { width: comp.width, height: comp.height };
    switch (placement.kind) {
      case "title": {
        const layout = overlayLayout(props, titleBox(placement.props, comp));
        const text = state.tree.byId.get(placement.id)?.text ?? "";
        this.checkFont(placement.id, placement.props.font);
        this.place(ctx, layout, await this.layoutImage(titleContent({ ...props, text }), layout.rect.w, layout.rect.h));
        return;
      }
      case "layer": {
        const layout = overlayLayout(props, full);
        const clock = layerClock(placement, t, comp.fps);
        const interior = this.options.interiors?.get(placement.id);
        if (interior === undefined) { this.warnOnce(`interior:${placement.id}`, `layer "${placement.id}" has no interior (pass interiors from indexLayerInteriors); it is left out`); return; }
        // An interior that never asked for the time looks the same on every frame: lay it out once.
        const key = `layer|${placement.id}|${JSON.stringify(placement.interior?.props ?? null)}|${layout.rect.w}x${layout.rect.h}`;
        let image = this.steady.has(key) ? this.laidOut.get(key) : undefined;
        if (image) this.stats.reused++;
        else {
          this.clockRead = false;
          installLayerClock(() => { this.clockRead = true; return clock; });
          image = await this.layoutImage(layerContent(interior, placement.interior?.props), layout.rect.w, layout.rect.h);
          if (!this.clockRead) { this.steady.add(key); this.remember(key, image); }
        }
        this.place(ctx, layout, image);
        return;
      }
      case "shape": {
        const d = shapeDrawing(props);
        for (const w of d.prepared.warnings) this.warnOnce(`shape:${placement.id}:${w}`, `shape "${placement.id}": ${w}`);
        const image = await this.vectorImage(d.prepared.markup);
        this.place(ctx, d.layout, image, { x: -d.bleed, y: -d.bleed, w: d.layout.rect.w + 2 * d.bleed, h: d.layout.rect.h + 2 * d.bleed });
        return;
      }
      case "svg": {
        const content = typeof placement.props.content === "string" ? placement.props.content : null;
        const src = typeof placement.props.src === "string" ? placement.props.src : null;
        const markup = content ?? (src ? await this.assetText(src) : null);
        if (!markup) return;
        const drawing = svgDrawing(props, markup);
        for (const w of drawing.prepared.warnings) this.warnOnce(`svg:${placement.id}:${w}`, `svg "${placement.id}": ${w}`);
        if (!drawing.prepared.markup) return;
        this.place(ctx, drawing.layout, await this.vectorImage(drawing.prepared.markup));
        return;
      }
      case "graphic": {
        await this.drawGraphic(ctx, placement.id, graphicDrawing(props));
        return;
      }
      case "sticker": {
        const size = stickerSize(props);
        const icon = iconStickerDrawing(props, size);
        if (icon) { await this.drawGraphic(ctx, placement.id, icon); return; }
        const layout = overlayLayout(props, { width: size, height: size });
        const src = String(placement.props.src ?? "");
        const image = src.startsWith("asset:") ? await this.asset(src) : null;
        if (image) {
          this.place(ctx, layout, image, containRect(image, layout.rect.w, layout.rect.h, true));
        } else {
          this.warnOnce(`sticker:${placement.id}`, `sticker "${src}" on "${placement.id}" has no media; drawing a placeholder`);
          this.place(ctx, layout, await this.layoutImage(stickerPlaceholder(String(placement.props.name ?? src)), layout.rect.w, layout.rect.h));
        }
        return;
      }
      case "adjustment":
        if (item.children.length > 0) this.warnOnce(`adjustment:${placement.id}`, `adjustment "${placement.id}" filters the footage beneath it; the filter does not reach overlays in an export`);
        return;
      default:
        return;
    }
  }

  /** A graphic's art with its labels laid out by Satori above it, drawn as one picture so fades treat them as one. */
  private async drawGraphic(ctx: CanvasRenderingContext2D, id: string, d: GraphicDrawing): Promise<void> {
    for (const w of d.prepared.warnings) this.warnOnce(`graphic:${id}:${w}`, `graphic "${id}": ${w}`);
    const art = await this.vectorImage(d.prepared.markup);
    if (d.labels.length === 0) { this.place(ctx, d.layout, art); return; }
    for (const l of d.labels) this.checkFont(id, l.font);
    const w = Math.max(1, Math.ceil(d.layout.rect.w)), h = Math.max(1, Math.ceil(d.layout.rect.h));
    const text = await this.layoutImage(graphicLabels(d.labels), w, h);
    const both = new Canvas(w, h);
    const c = both.getContext("2d");
    c.drawImage(art, 0, 0, d.layout.rect.w, d.layout.rect.h);
    c.drawImage(text, 0, 0, w, h);
    this.place(ctx, d.layout, both, { x: 0, y: 0, w, h });
  }

  /** Draws `image` into `box` (default: the layout rect) under the element's matrix, opacity, filter, blend and corner radius. */
  private place(ctx: CanvasRenderingContext2D, layout: OverlayLayout, image: Image | Canvas, box?: Box, extraFilter: string | null = null): void {
    if (this.measuring) { this.record(this.measuring, layout, image, box); return; }
    const { rect, matrix: m } = layout;
    ctx.save();
    ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    ctx.globalAlpha = Math.max(0, Math.min(1, layout.opacity));
    const filter = [layout.filter, extraFilter].filter(Boolean).join(" ");
    ctx.filter = filter || "none";
    ctx.globalCompositeOperation = layout.blend ?? "source-over";
    if (layout.borderRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(0, 0, rect.w, rect.h, layout.borderRadius);
      ctx.clip();
    }
    if (layout.clip) {
      // An entrance or exit that wipes or reveals: only these rectangles show (none at all is allowed).
      ctx.beginPath();
      for (const r of layout.clip) ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
    }
    const b = box ?? { x: 0, y: 0, w: rect.w, h: rect.h };
    ctx.drawImage(image, b.x, b.y, b.w, b.h);
    ctx.restore();
  }

  /** What `place` would draw, as boxes around its ink in composition pixels. */
  private record(m: NonNullable<OverlayPlane["measuring"]>, layout: OverlayLayout, image: Image | Canvas, box?: Box): void {
    if (layout.opacity < VISIBLE_OPACITY) return;
    const ink = inkOf(image);
    if (!ink) return;
    const b = box ?? { x: 0, y: 0, w: layout.rect.w, h: layout.rect.h };
    // A wipe or reveal shows only its clip rectangles: ink outside the box around them does not count.
    if (layout.clip?.length === 0) return;
    const shown = layout.clip ? union(layout.clip) : null;
    const parts: DrawRect[] = [];
    for (const p of ink.parts) {
      let x0 = b.x + p.x * b.w, y0 = b.y + p.y * b.h, x1 = x0 + p.w * b.w, y1 = y0 + p.h * b.h;
      if (shown) [x0, y0, x1, y1] = [Math.max(x0, shown.x), Math.max(y0, shown.y), Math.min(x1, shown.x + shown.w), Math.min(y1, shown.y + shown.h)];
      // shortcut: a rotated part is measured by the upright box around it, a little generous; trace the ink in composition space if that reports false overlaps.
      if (x1 > x0 && y1 > y0) parts.push(boundsOf({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, layout.matrix));
    }
    if (parts.length > 0) m.out.push({ id: m.id, kind: m.kind, backdrop: m.backdrop, rect: union(parts), parts });
  }

  /** Satori: a React tree laid out in a `width`×`height` box, as an image. Trees of plain elements are remembered by content. */
  private async layoutImage(tree: ReactNode, width: number, height: number): Promise<Image> {
    const content = treeKey(tree);
    const key = content === null ? null : `${width}x${height}|${content}`;
    const hit = key === null ? undefined : this.laidOut.get(key);
    if (hit && key !== null) {
      this.laidOut.delete(key);
      this.laidOut.set(key, hit);
      this.stats.reused++;
      return hit;
    }
    const root = createElement("div", { style: { display: "flex", position: "relative", width, height } }, tree);
    const svg = inlineSvgImages(await satori(root as ReactElement, { width, height, fonts: this.fonts }));
    this.stats.layouts++;
    const image = await this.vectorImage(svg);
    if (key !== null) this.remember(key, image);
    return image;
  }

  private remember(key: string, image: Image): void {
    this.laidOut.set(key, image);
    if (this.laidOut.size > LAYOUT_CACHE) this.laidOut.delete(this.laidOut.keys().next().value as string);
  }

  /** An SVG document as an image, cached by its text. */
  private async vectorImage(svg: string): Promise<Image> {
    const hit = this.images.get(svg);
    if (hit) {
      this.images.delete(svg);
      this.images.set(svg, hit);
      return hit;
    }
    const { svg: safe, replaced } = safeSvgFonts(svg, svgFontKnown);
    for (const family of replaced) this.warnOnce(`svg-font:${family}`, `SVG text in font "${family}" is drawn in sans-serif; the export has no such font`);
    const image = await loadImage(Buffer.from(safe));
    this.images.set(svg, image);
    if (this.images.size > IMAGE_CACHE) this.images.delete(this.images.keys().next().value as string);
    return image;
  }

  private assetText(ref: string): Promise<string | null> {
    const id = ref.startsWith("asset:") ? ref.slice(6) : ref;
    let p = this.texts.get(id);
    if (!p) {
      p = this.options.media.resolve(id).then(async (handle) => {
        if (handle.kind === "path") return readFile(handle.path, "utf8");
        if (handle.kind === "blob") return handle.blob.text();
        return (await fetch(handle.url)).text();
      }).catch((error: unknown) => {
        this.warnOnce(`asset:${id}`, `SVG asset "${id}" could not be read: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
      this.texts.set(id, p);
    }
    return p;
  }

  private asset(ref: string): Promise<Image | null> {
    const id = ref.startsWith("asset:") ? ref.slice(6) : ref;
    let p = this.assets.get(id);
    if (!p) {
      p = this.options.media.resolve(id).then(async (handle) => {
        if (handle.kind === "path") return loadImage(handle.path);
        if (handle.kind === "blob") return loadImage(Buffer.from(await handle.blob.arrayBuffer()));
        return loadImage(handle.url);
      }).catch((error: unknown) => {
        this.warnOnce(`asset:${id}`, `image asset "${id}" could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
      this.assets.set(id, p);
    }
    return p;
  }

  private checkFont(id: string, font: unknown): void {
    if (typeof font !== "string" || font === "Inter" || this.families.has(font)) return;
    this.warnOnce(`font:${font}`, `font "${font}" (used by "${id}") is not available to the export; text is set in Inter`);
  }
}

interface Box { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/**
 * Satori embeds an inline `<svg>` (in a Layer, say) as an `<image>` with an SVG data URL, which skia draws as nothing.
 * Each such image becomes a nested `<svg>` with the same box, clip and mask, which skia draws.
 */
export function inlineSvgImages(svg: string): string {
  if (!svg.includes("data:image/svg+xml")) return svg;
  // Satori's masks size themselves to the masked element's bounding box, which skia gets wrong around a nested
  // <svg>; in user space they cover the same pixels, since their content is the element's own box.
  return svg.replace(/<mask (?![^>]*maskUnits)/g, '<mask maskUnits="userSpaceOnUse" ').replace(/<image\b([^>]*?)\s(?:xlink:)?href="data:image\/svg\+xml;(utf8|base64),([^"]*)"([^>]*?)\/?>/g, (whole, before: string, encoding: string, data: string, after: string) => {
    let inner: string;
    try {
      inner = encoding === "base64" ? Buffer.from(data, "base64").toString("utf8") : decodeURIComponent(data);
    } catch {
      return whole;
    }
    const root = parseSvg(inner).root;
    if (!root) return whole;
    const attrs = `${before}${after}`.replace(/\s*\/$/, "");
    // Clip and mask stay on a group in the outer coordinates: skia would read them in the nested viewBox's.
    const outer = [...attrs.matchAll(/\s(clip-path|mask)="[^"]*"/g)].map((m) => m[0]).join("");
    const box = attrs.replace(/\s(clip-path|mask)="[^"]*"/g, "");
    const viewBox = root.attrs.viewBox ?? (root.attrs.width && root.attrs.height ? `0 0 ${parseFloat(root.attrs.width)} ${parseFloat(root.attrs.height)}` : null);
    return `<g${outer}><svg${box}${viewBox ? ` viewBox="${viewBox}"` : ""}>${root.children.map((c) => serialize(c)).join("")}</svg></g>`;
  });
}

/** `object-fit: contain` (or a centred natural size capped to the box, as `max-width: 100%` does) for an image in a box. */
function containRect(image: Image, w: number, h: number, upscale = false): Box {
  const iw = image.width || w, ih = image.height || h;
  const k = Math.min(w / iw, h / ih, upscale ? Infinity : 1);
  const dw = iw * k, dh = ih * k;
  return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
}

/**
 * A string that is the same for two trees that Satori would lay out the same: plain elements, their props and
 * their text. Null for anything else (a component, whose output depends on more than its props).
 */
export function treeKey(node: ReactNode): string | null {
  const out: string[] = [];
  const walk = (n: unknown): boolean => {
    if (n === null || n === undefined || typeof n === "boolean") { out.push("_"); return true; }
    if (typeof n === "string" || typeof n === "number") { out.push(JSON.stringify(n)); return true; }
    if (Array.isArray(n)) {
      out.push("[");
      for (const child of n) if (!walk(child)) return false;
      out.push("]");
      return true;
    }
    if (!isValidElement(n) || typeof n.type !== "string") return false;
    const props = n.props as Record<string, unknown>;
    out.push(`<${n.type}`);
    for (const k of Object.keys(props).sort()) if (k !== "children") out.push(`${k}=${JSON.stringify(props[k])}`);
    out.push(">");
    if (!walk(props.children)) return false;
    out.push("</>");
    return true;
  };
  return walk(node) ? out.join("") : null;
}

const GENERIC_FAMILIES: ReadonlySet<string> = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"]);

function svgFontKnown(family: string): boolean {
  return GENERIC_FAMILIES.has(family.toLowerCase()) || FontLibrary.has(family);
}

/**
 * Font families in SVG text that skia cannot find, replaced with `sans-serif`.
 * Skia aborts the whole process (not an exception) when SVG text names a family
 * it has no font for, so every family list is narrowed to its first known
 * family before the markup reaches `loadImage`. The CSS `font` shorthand is
 * dropped for the same reason.
 */
export function safeSvgFonts(svg: string, known: (family: string) => boolean): { svg: string; replaced: string[] } {
  if (!/font(-family)?\s*[:=]/.test(svg)) return { svg, replaced: [] };
  const replaced = new Set<string>();
  const pick = (list: string): string => {
    const families = list.split(",").map((f) => f.trim().replace(/^(["'])(.*)\1$/, "$2").replace(/&quot;|&apos;/g, "")).filter(Boolean);
    const found = families.find(known);
    // Unquoted: skia takes a quoted name for an unknown family, and aborts.
    if (found) return found;
    for (const f of families) replaced.add(f);
    return "sans-serif";
  };
  const css = (text: string): string => text
    .replace(/font-family\s*:\s*([^;}]+)/g, (_m, list: string) => `font-family: ${pick(list)}`)
    .replace(/(^|[;{\s])font\s*:[^;}]*;?/g, "$1");
  const out = svg
    .replace(/font-family=(["'])(.*?)\1/g, (_m, q: string, list: string) => `font-family=${q}${pick(list)}${q}`)
    .replace(/\sstyle=(["'])(.*?)\1/g, (_m, q: string, text: string) => {
      return ` style=${q}${css(text.replace(/&quot;/g, ""))}${q}`;
    })
    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, open: string, text: string, close: string) => `${open}${css(text)}${close}`);
  return { svg: out, replaced: [...replaced] };
}

let svgFontsRegistered = false;
/** The bundled families, made known to skia's SVG text as well as to Satori. */
function registerSvgFonts(): void {
  if (svgFontsRegistered) return;
  svgFontsRegistered = true;
  const require = createRequire(import.meta.url);
  for (const font of BUNDLED_FONTS) {
    const dir = require.resolve(`@fontsource/${font.id}/package.json`).replace(/package\.json$/, "files/");
    const files = BUNDLED_FONT_WEIGHTS.flatMap((w) => (font.italic ? ["normal", "italic"] : ["normal"]).map((st) => `${dir}${font.id}-latin-${w}-${st}.woff`));
    FontLibrary.use(font.family, files);
  }
}

/** The bundled families (see `BUNDLED_FONTS`), regular and bold, upright and italic where the family has one. Read once. */
let bundled: OverlayFont[] | null = null;
function bundledFonts(): OverlayFont[] {
  if (bundled) return bundled;
  const require = createRequire(import.meta.url);
  const out: OverlayFont[] = [];
  for (const font of BUNDLED_FONTS) {
    const dir = require.resolve(`@fontsource/${font.id}/package.json`).replace(/package\.json$/, "files/");
    for (const weight of BUNDLED_FONT_WEIGHTS) {
      for (const style of font.italic ? ["normal", "italic"] as const : ["normal"] as const) {
        out.push({ name: font.family, data: readFileSync(`${dir}${font.id}-latin-${weight}-${style}.woff`), weight, style });
      }
    }
  }
  return (bundled = out);
}
