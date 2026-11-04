import type { CSSProperties } from "react";

import type { FitMode, Placement, ResolvedState, Transform } from "@cutcraft/kit";

import { filterString } from "../model/effects";
import { blendOf } from "../model/frame-plan";
import { type ClipRect, combine, type GraphicAnimation, type Motion, motionAt, STILL } from "../model/motion";
import { declaredEffects } from "../model/shaders";
import {
  animatedTransform,
  type Box,
  layoutRect,
  type Matrix2D,
  matrixToCss,
  multiply,
  translate,
} from "../model/transform";
import { transitionLook } from "../model/transition";
import type { TransitionRole } from "../model/visible";

/** Placement kinds drawn above the canvas plane, besides captions. */
export { OVERLAY_KINDS } from "../model/backdrop";

export interface ElementProps {
  readonly placement: Placement;
  readonly children: readonly Placement[];
  readonly state: ResolvedState;
  /** Composition time. */
  readonly time: number;
  /** The transition the element is in, if any. */
  readonly transition?: TransitionRole | undefined;
}

/** Where and how an overlay of `size` composition pixels is drawn: its box, matrix, opacity, filter, blend and corner radius. */
export interface OverlayLayout {
  readonly rect: { readonly w: number; readonly h: number };
  readonly matrix: Matrix2D;
  readonly opacity: number;
  /** A CSS filter list, or null. */
  readonly filter: string | null;
  /** A canvas compositing operation, or null for normal. */
  readonly blend: GlobalCompositeOperation | null;
  readonly borderRadius: number;
  /** The part shown while an entrance or exit wipes or reveals it, in the element's own pixels; null for all. */
  readonly clip: readonly ClipRect[] | null;
  /** How much of its strokes are drawn (0..1) during a `draw` entrance or exit; null when not drawing. */
  readonly draw: number | null;
}

/**
 * `drawable` elements (shapes, SVG) draw their strokes progressively for a `draw` entrance;
 * others fade instead.
 */
export function overlayLayout(p: ElementProps, size: Box, fit: FitMode = "none", drawable = false): OverlayLayout {
  const rel = p.time - p.placement.start;
  const transform = animatedTransform(p.placement.props.transform as Transform | undefined, p.children, rel);
  const layout = layoutRect(p.state.composition, size, fit, transform);
  const { filter } = filterString(p.children, p.placement.id, rel, declaredEffects(p.state));
  const blend = p.placement.props.blend;
  const props = p.placement.props as { enter?: GraphicAnimation; exit?: GraphicAnimation };
  const motion = combine(
    motionAt(props.enter, props.exit, rel, p.placement.duration, layout.rect.w, layout.rect.h),
    transitionMotion(p.transition, layout.rect.w, layout.rect.h),
  );
  const fadeForDraw = !drawable && motion.draw !== null ? motion.draw : 1;
  return {
    rect: { w: layout.rect.w, h: layout.rect.h },
    matrix: multiply(layout.matrix, motion.matrix),
    opacity: (transform.opacity ?? 1) * motion.opacity * fadeForDraw,
    filter: filter || null,
    blend: blend && blend !== "normal" ? blendOf(blend) : null,
    borderRadius: transform.borderRadius ?? 0,
    clip: motion.clip,
    draw: drawable ? motion.draw : null,
  };
}

/**
 * A transition as an entrance or exit: the footage's look, played across the element's box.
 * shortcut: an overlay slides and wipes across its own box, not the frame, and a dip shows as a fade; fine for full-frame titles, measure against the frame if small overlays need it.
 */
function transitionMotion(t: TransitionRole | undefined, w: number, h: number): Motion {
  if (!t) return STILL;
  const look = transitionLook(t, w, h);
  return {
    opacity: look.opacity * (1 - (look.dip ?? 0)),
    matrix: translate(look.offset?.x ?? 0, look.offset?.y ?? 0),
    clip: look.clip ?? null,
    draw: null,
  };
}

/** A clip as a CSS `path()`: rectangles in the element's own pixels, an empty one when nothing shows. */
export function clipPathCss(clip: readonly ClipRect[]): string {
  const n = (v: number): string => String(Math.round(v * 100) / 100);
  const d = clip.map((r) => `M${n(r.x)} ${n(r.y)}h${n(r.w)}v${n(r.h)}h${n(-r.w)}Z`).join("");
  return `path("${d || "M0 0Z"}")`;
}

/** Position an overlay of `size` composition pixels with its transform, filter and blend as CSS. */
export function overlayStyle(p: ElementProps, size: Box, fit: FitMode = "none", drawable = false): CSSProperties {
  return layoutStyle(overlayLayout(p, size, fit, drawable));
}

/** The CSS that puts an element where its layout says. */
export function layoutStyle(l: OverlayLayout): CSSProperties {
  return {
    position: "absolute",
    left: 0,
    top: 0,
    width: l.rect.w,
    height: l.rect.h,
    transformOrigin: "0 0",
    transform: matrixToCss(l.matrix),
    opacity: l.opacity,
    ...(l.filter ? { filter: l.filter } : {}),
    ...(l.blend ? { mixBlendMode: cssBlend(l.blend) } : {}),
    ...(l.borderRadius ? { borderRadius: l.borderRadius, overflow: "hidden" } : {}),
    ...(l.clip ? { clipPath: clipPathCss(l.clip) } : {}),
    boxSizing: "border-box",
  };
}

function cssBlend(op: GlobalCompositeOperation): CSSProperties["mixBlendMode"] {
  return (op === "source-over" ? "normal" : op === "lighter" ? "plus-lighter" : op) as CSSProperties["mixBlendMode"];
}

export function dataAttrs(p: Placement): Record<string, string> {
  return { "data-el": p.id, "data-kind": p.kind };
}
