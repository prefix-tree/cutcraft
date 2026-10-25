import { createRequire } from "node:module";
import type { ResolvedState } from "@cutcut/kit";
import { BUNDLED_FONTS, BUNDLED_FONT_WEIGHTS, installLayerClock } from "@cutcut/kit";
import { isVisibleAt, visiblePlacements, type MediaResolver, type VisibleItem } from "@cutcut/player/engine";
import {
  OVERLAY_KINDS, captionsContent, parseSvg, serialize, shapeDrawing, svgDrawing, layerClock, layerContent, overlayLayout, stickerPlaceholder, stickerSize, titleContent,
  type ElementProps, type OverlayLayout,
} from "@cutcut/player/overlays";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import satori, { type Font } from "satori";
import { loadImage, type CanvasRenderingContext2D, type Image } from "skia-canvas";

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
  readonly stats: OverlayStats = { layouts: 0, reused: 0 };

  constructor(private readonly options: OverlayOptions) {
    this.fonts = [...bundledFonts(), ...(options.fonts ?? [])].map((f) => ({ name: f.name, data: f.data, weight: f.weight ?? 400, style: f.style ?? "normal" }));
    this.families = new Set(this.fonts.map((f) => f.name));
  }

  /** Whether anything but footage shows at `t`: an overlay element, or a caption line. */
  hasOverlays(t: number): boolean {
    const { state } = this.options;
    if (visiblePlacements(state, t).some((v) => OVERLAY_KINDS.has(v.placement.kind))) return true;
    return [...state.items.values()].some((p) => p.kind === "caption" && isVisibleAt(p, t, state.composition.duration));
  }

  /** Draws every overlay visible at `t` onto `ctx`, tracks in order, captions last. */
  async draw(ctx: CanvasRenderingContext2D, t: number): Promise<void> {
    const { state } = this.options;
    for (const item of visiblePlacements(state, t)) {
      if (!OVERLAY_KINDS.has(item.placement.kind)) continue;
      await this.guard(item.placement.id, () => this.drawItem(ctx, item, t));
    }
    for (const captions of state.items.values()) {
      if (captions.kind !== "captions") continue;
      await this.guard(captions.id, async () => {
        const comp = state.composition;
        const image = await this.layoutImage(captionsContent({ placement: captions, state, time: t }), comp.width, comp.height);
        ctx.drawImage(image, 0, 0, comp.width, comp.height);
      });
    }
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
    const tr = item.transition;
    const transitionOpacity = tr ? (tr.role === "in" ? tr.progress : tr.placement.between ? 1 : 1 - tr.progress) : 1;
    const props: ElementProps = { placement, children: item.children, state, time: t, transitionOpacity };
    const comp = state.composition;
    const full = { width: comp.width, height: comp.height };
    switch (placement.kind) {
      case "title": {
        const layout = overlayLayout(props, full);
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
      case "sticker": {
        const size = stickerSize(props);
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

  /** Draws `image` into `box` (default: the layout rect) under the element's matrix, opacity, filter, blend and corner radius. */
  private place(ctx: CanvasRenderingContext2D, layout: OverlayLayout, image: Image, box?: Box, extraFilter: string | null = null): void {
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
    const image = await loadImage(Buffer.from(svg));
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
