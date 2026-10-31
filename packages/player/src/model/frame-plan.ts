import { RENDERED_MASK_TYPES, RENDERED_TRANSITIONS, lookupAsset, type BlendMode, type FitMode, type Placement, type ResolvedState, type Transform } from "@cutcut/kit";
import { devWarn } from "../warn";
import { filterString, postEffects, type PostEffect } from "./effects";
import { frameIndex, nestedSourceTime, placementSourceTime } from "./time";
import type { ClipRect } from "./motion";
import { transitionLook } from "./transition";
import { animatedTransform, layoutRect, multiply, translate, type DrawRect, type Matrix2D } from "./transform";
import { backdropTracks } from "./backdrop";
import { visiblePlacements, type VisibleItem } from "./visible";

export interface MaskSpec {
  readonly shape?: Record<string, unknown> | undefined;
  readonly path?: { points: { x: number; y: number; handleIn?: { x: number; y: number }; handleOut?: { x: number; y: number } }[]; closed: boolean } | undefined;
  readonly feather: number;
  readonly inverted: boolean;
  readonly opacity: number;
}

export interface DrawOp {
  readonly id: string;
  readonly kind: "video" | "image" | "nested" | "error" | "adjustment";
  readonly asset?: string;
  readonly sourceTime?: number;
  readonly nested?: { readonly state: ResolvedState; readonly time: number };
  readonly rect: DrawRect;
  readonly matrix: Matrix2D;
  readonly crop?: DrawRect;
  /** Dimensions used to express crop pixels; decoded proxies can have another resolution. */
  readonly cropReference?: { readonly width: number; readonly height: number };
  readonly fit: FitMode;
  readonly opacity: number;
  readonly blend: GlobalCompositeOperation;
  readonly filter: string;
  readonly borderRadius: number;
  readonly mask?: MaskSpec;
  /** The part shown, in composition pixels (a wipe). */
  readonly clip?: readonly ClipRect[];
  /** Vignette and grain, drawn over the element's own pixels. */
  readonly post?: readonly PostEffect[];
}

/** A composition background gradient, as the schema writes it. CSS angles: 0 points up, 180 (the default) runs down. */
export interface BackgroundGradient {
  readonly type: "linear" | "radial" | "conic";
  readonly angle?: number;
  readonly center?: { readonly x: number; readonly y: number };
  readonly stops: readonly { readonly offset: number; readonly color: string; readonly opacity?: number }[];
}

export interface FramePlan {
  readonly time: number;
  readonly frame: number;
  readonly background: string;
  /** A gradient that fills the frame instead of `background` (which is then its first colour). */
  readonly backgroundGradient?: BackgroundGradient;
  /** The footage goes over a transparent ground: overlays beneath it (see `backdropTracks`) and the background are drawn under the canvas. */
  readonly clear?: true;
  /** `background.mode: "blur"`: this op's picture, blurred to cover the frame, goes under everything. */
  readonly backgroundBlur?: { readonly id: string };
  readonly ops: readonly DrawOp[];
  readonly warnings: readonly string[];
}

export type ResolveNested = (p: Placement) => ResolvedState | null;

const BLEND_TO_CANVAS: Readonly<Record<BlendMode, GlobalCompositeOperation>> = {
  normal: "source-over", multiply: "multiply", screen: "screen", overlay: "overlay", darken: "darken", lighten: "lighten",
  "color-dodge": "color-dodge", "color-burn": "color-burn", "hard-light": "hard-light", "soft-light": "soft-light",
  difference: "difference", exclusion: "exclusion", hue: "hue", saturation: "saturation", color: "color", luminosity: "luminosity",
  add: "lighter", "linear-dodge": "lighter",
};

export function blendOf(value: unknown): GlobalCompositeOperation {
  return BLEND_TO_CANVAS[value as BlendMode] ?? "source-over";
}

/**
 * Everything the painter needs to draw composition time `t`, in draw order.
 * Pure: the same state and time give a deep-equal plan. DOM-rendered kinds
 * (title, shape, svg, sticker, layer, captions) are not in it; the DOM layer
 * reads `visiblePlacements` itself.
 */
export function buildFramePlan(state: ResolvedState, t: number, resolveNested?: ResolveNested): FramePlan {
  const comp = state.composition;
  const warnings: string[] = [];
  const ops: DrawOp[] = [];
  const { background, backgroundGradient: gradient, blur } = compositionBackground(state);
  const clear = backdropTracks(state).size > 0;
  // shortcut: with overlays beneath the footage the background is a CSS ground under the canvas, so blur shows as its colour; paint the blur on that ground to drop this.
  if (blur && clear) warnings.push("background mode blur is drawn as a colour under backdrop overlays");

  for (const item of visiblePlacements(state, t)) {
    const p = item.placement;
    if (p.kind === "clip" || p.kind === "nested") {
      const op = mediaOp(state, item, t, resolveNested, warnings);
      if (op) ops.push(op);
      const dip = item.transition && transitionLook(item.transition, comp.width, comp.height).dip;
      if (op && dip) ops.push(dipOp(item.transition!.placement, dip, comp.width, comp.height));
    } else if (p.kind === "adjustment") {
      if (p.props.enabled === false) continue;
      const { filter } = filterString(item.children, p.id, t - p.start);
      if (ops.length === 0) continue;
      ops.push({
        id: p.id, kind: "adjustment", rect: { x: 0, y: 0, w: comp.width, h: comp.height }, matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        fit: "stretch", opacity: Number(p.props.opacity ?? 1), blend: blendOf(p.props.blend), filter, borderRadius: 0,
      });
    }
  }
  const footage = blur && !clear ? ops.find((o) => o.kind === "video" || o.kind === "image" || o.kind === "nested") : undefined;
  return {
    time: t, frame: frameIndex(t, comp.fps), background, ...(gradient ? { backgroundGradient: gradient } : {}), ...(clear ? { clear: true as const } : {}),
    ...(footage ? { backgroundBlur: { id: footage.id } } : {}), ops, warnings,
  };
}

/** The composition's background as the painter draws it: a colour, or a gradient (whose first colour is `background`). */
export function compositionBackground(state: ResolvedState): { background: string; backgroundGradient?: BackgroundGradient; blur: boolean } {
  const bg = state.items.get(state.composition.id)?.props.background as { mode?: string; color?: string; gradient?: BackgroundGradient } | undefined;
  const gradient = bg?.mode === "gradient" && bg.gradient && bg.gradient.stops.length >= 2 ? bg.gradient : undefined;
  return { background: bg?.color ?? gradient?.stops[0]?.color ?? "#000000", ...(gradient ? { backgroundGradient: gradient } : {}), blur: bg?.mode === "blur" };
}

function mediaOp(state: ResolvedState, item: VisibleItem, t: number, resolveNested: ResolveNested | undefined, warnings: string[]): DrawOp | null {
  const p = item.placement;
  const comp = state.composition;
  const rel = t - p.start;
  const transform = animatedTransform(p.props.transform as Transform | undefined, item.children, rel);
  const fit = (p.props.fit as FitMode | undefined) ?? "contain";
  let opacity = (transform.opacity ?? 1) * (typeof p.props.blendOpacity === "number" ? p.props.blendOpacity : 1);
  let look: ReturnType<typeof transitionLook> | undefined;
  if (item.transition) {
    const x = item.transition.placement;
    const type = String(x.props.type ?? "crossfade");
    if (!(RENDERED_TRANSITIONS as readonly string[]).includes(type)) {
      const key = `transition:${x.id}:${type}`;
      devWarn(key, `transition "${type}" on "${x.id}" is drawn as a crossfade`);
      warnings.push(`transition ${x.id}: ${type} drawn as crossfade`);
    }
    // A crossfade between two clips fades the incoming one over the outgoing one, which stays opaque:
    // (1 − p)·A + p·B. Only an edge transition fades a clip against the background.
    look = transitionLook(item.transition, comp.width, comp.height);
    opacity *= look.opacity;
  }
  const { filter } = filterString(item.children, p.id, rel);
  const mask = maskOf(item.children, warnings);
  const post = postEffects(item.children, frameIndex(t, comp.fps), rel);
  const common = { id: p.id, fit, opacity, blend: blendOf(p.props.blend), filter, borderRadius: transform.borderRadius ?? 0, ...(mask ? { mask } : {}), ...(look?.clip ? { clip: look.clip } : {}), ...(post ? { post } : {}) };
  const shift = (m: Matrix2D): Matrix2D => (look?.offset ? multiply(translate(look.offset.x, look.offset.y), m) : m);

  if (p.kind === "nested") {
    const nested = resolveNested?.(p) ?? null;
    if (!nested) {
      warnings.push(`nested ${p.id}: no resolver`);
      const layout = layoutRect(comp, comp, fit, transform);
      return { ...common, kind: "error", rect: layout.rect, matrix: shift(layout.matrix) };
    }
    const layout = layoutRect(comp, nested.composition, fit, transform);
    return { ...common, kind: "nested", nested: { state: nested, time: nestedSourceTime(p, t) }, rect: layout.rect, matrix: shift(layout.matrix), ...(layout.crop ? { crop: layout.crop } : {}) };
  }
  const src = p.source;
  const asset = src ? lookupAsset(state.manifest, src.asset) : null;
  if (!src || !asset) {
    const layout = layoutRect(comp, comp, "contain", transform);
    return { ...common, kind: "error", ...(src ? { asset: src.asset } : {}), rect: layout.rect, matrix: shift(layout.matrix) };
  }
  const size = { width: asset.width ?? comp.width, height: asset.height ?? comp.height };
  const layout = layoutRect(comp, size, fit, transform);
  return {
    ...common,
    kind: asset.kind === "image" ? "image" : "video",
    asset: asset.id,
    sourceTime: placementSourceTime(p, item.children, t),
    rect: layout.rect, matrix: shift(layout.matrix), ...(layout.crop ? { crop: layout.crop, cropReference: size } : {}),
  };
}

/** A dip to black or white over everything drawn so far: an adjustment that maps the picture to the colour, `amount` of the way. */
function dipOp(x: Placement, amount: number, width: number, height: number): DrawOp {
  return {
    id: x.id, kind: "adjustment", rect: { x: 0, y: 0, w: width, h: height }, matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    fit: "stretch", opacity: amount, blend: "source-over", filter: x.props.type === "dipToWhite" ? "brightness(0) invert(1)" : "brightness(0)", borderRadius: 0,
  };
}

function maskOf(children: readonly Placement[], warnings: string[]): MaskSpec | undefined {
  const m = children.find((c) => c.kind === "mask");
  if (!m) return undefined;
  if (!(RENDERED_MASK_TYPES as readonly unknown[]).includes(m.props.type ?? "shape") || m.props.matte) {
    warnings.push(`mask ${m.id}: matte masks are not rendered`);
    return undefined;
  }
  return {
    shape: m.props.shape as Record<string, unknown> | undefined,
    path: m.props.path as MaskSpec["path"],
    feather: Number(m.props.feather ?? 0),
    inverted: m.props.inverted === true,
    opacity: Number(m.props.opacity ?? 1),
  };
}
