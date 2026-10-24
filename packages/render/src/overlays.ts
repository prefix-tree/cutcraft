import { createRequire } from "node:module";
import type { ResolvedState } from "@cutcut/kit";
import { installLayerClock } from "@cutcut/kit";
import { visiblePlacements, type MediaResolver, type VisibleItem } from "@cutcut/player/engine";
import {
  OVERLAY_KINDS, captionsContent, layerClock, layerContent, overlayLayout, shapeContent, shapeSize, stickerPlaceholder, stickerSize, titleContent,
  type ElementProps, type OverlayLayout,
} from "@cutcut/player/overlays";
import { readFileSync } from "node:fs";
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
  /** Fonts beyond the bundled Inter; a title's `font` prop picks one by name. */
  readonly fonts?: readonly OverlayFont[];
  readonly warn: (message: string) => void;
}

const IMAGE_CACHE = 64;

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
  private readonly warned = new Set<string>();

  constructor(private readonly options: OverlayOptions) {
    this.fonts = [...bundledFonts(), ...(options.fonts ?? [])].map((f) => ({ name: f.name, data: f.data, weight: f.weight ?? 400, style: f.style ?? "normal" }));
    this.families = new Set(this.fonts.map((f) => f.name));
  }

  /** Whether anything but footage shows at `t`. */
  hasOverlays(t: number): boolean {
    const { state } = this.options;
    return visiblePlacements(state, t).some((v) => OVERLAY_KINDS.has(v.placement.kind)) || [...state.items.values()].some((p) => p.kind === "captions");
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
    this.assets.clear();
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
        installLayerClock(() => clock);
        const interior = this.options.interiors?.get(placement.id);
        if (interior === undefined) { this.warnOnce(`interior:${placement.id}`, `layer "${placement.id}" has no interior (pass interiors from indexLayerInteriors); it is left out`); return; }
        const tree = layerContent(interior, placement.interior?.props);
        this.place(ctx, layout, await this.layoutImage(tree, layout.rect.w, layout.rect.h));
        return;
      }
      case "shape": {
        const size = shapeSize(props);
        const layout = overlayLayout(props, size);
        const pad = shapeBleed(placement.props);
        const image = await this.vectorImage(toSvg(shapeContent(props), pad));
        this.place(ctx, layout, image, { x: -pad, y: -pad, w: layout.rect.w + 2 * pad, h: layout.rect.h + 2 * pad });
        return;
      }
      case "svg": {
        const layout = overlayLayout(props, full);
        const content = typeof placement.props.content === "string" ? placement.props.content : null;
        const src = typeof placement.props.src === "string" ? placement.props.src : null;
        const image = content ? await this.vectorImage(content) : src ? await this.asset(src) : null;
        if (!image) return;
        const tint = placement.props.color as { mode: string; tint?: string } | undefined;
        this.place(ctx, layout, image, containRect(image, layout.rect.w, layout.rect.h), tint?.mode === "tint" && tint.tint ? `drop-shadow(0 0 0 ${tint.tint})` : null);
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
    const b = box ?? { x: 0, y: 0, w: rect.w, h: rect.h };
    ctx.drawImage(image, b.x, b.y, b.w, b.h);
    ctx.restore();
  }

  /** Satori: a React tree laid out in a `width`×`height` box, as an image. */
  private async layoutImage(tree: ReactNode, width: number, height: number): Promise<Image> {
    const root = createElement("div", { style: { display: "flex", position: "relative", width, height } }, tree);
    const svg = await satori(root as ReactElement, { width, height, fonts: this.fonts });
    return this.vectorImage(svg);
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

/** `object-fit: contain` (or a centred natural size capped to the box, as `max-width: 100%` does) for an image in a box. */
function containRect(image: Image, w: number, h: number, upscale = false): Box {
  const iw = image.width || w, ih = image.height || h;
  const k = Math.min(w / iw, h / ih, upscale ? Infinity : 1);
  const dw = iw * k, dh = ih * k;
  return { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
}

/** How far a shape's stroke reaches past its box. */
function shapeBleed(props: Readonly<Record<string, unknown>>): number {
  const stroke = props.stroke as { width?: number } | undefined;
  return stroke?.width ? Math.ceil(stroke.width / 2) + 1 : 0;
}

/** A tree of plain SVG elements (what `shapeContent` returns) as a standalone document, with `pad` pixels of room on every side. */
export function toSvg(node: ReactNode, pad = 0): string {
  if (!isValidElement(node)) return "";
  const root = node as ReactElement<Record<string, unknown>>;
  const w = Number(root.props.width), h = Number(root.props.height);
  const attrs = { xmlns: "http://www.w3.org/2000/svg", width: w + 2 * pad, height: h + 2 * pad, viewBox: `${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}` };
  return `<svg ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}>${children(root.props.children as ReactNode)}</svg>`;
}

function children(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(children).join("");
  if (typeof node === "string" || typeof node === "number") return escape(String(node));
  if (!isValidElement(node)) return "";
  const el = node as ReactElement<Record<string, unknown>>;
  if (typeof el.type !== "string") return "";
  const { children: kids, style: _style, ...rest } = el.props;
  const attrs = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k === "viewBox" ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${escape(String(v))}"`)
    .join("");
  const inner = children(kids as ReactNode);
  return inner ? `<${el.type}${attrs}>${inner}</${el.type}>` : `<${el.type}${attrs}/>`;
}

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Inter regular and bold, upright and italic, from the `@fontsource/inter` package. */
function bundledFonts(): OverlayFont[] {
  const require = createRequire(import.meta.url);
  const dir = require.resolve("@fontsource/inter/package.json").replace(/package\.json$/, "files/");
  const load = (weight: 400 | 700, style: "normal" | "italic"): OverlayFont => ({ name: "Inter", data: readFileSync(`${dir}inter-latin-${weight}-${style}.woff`), weight, style });
  return [load(400, "normal"), load(700, "normal"), load(400, "italic"), load(700, "italic")];
}
