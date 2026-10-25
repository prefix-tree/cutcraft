import type { FitMode, Placement, ResolvedState, Transform } from "@cutcut/kit";
import type { CSSProperties } from "react";
import { filterString } from "../model/effects";
import { animatedTransform, layoutRect, matrixToCss, type Box, type Matrix2D } from "../model/transform";
import { blendOf } from "../model/frame-plan";

/** Placement kinds drawn above the canvas plane, besides captions. */
export const OVERLAY_KINDS: ReadonlySet<string> = new Set(["title", "shape", "svg", "sticker", "layer", "adjustment"]);

export interface ElementProps {
  readonly placement: Placement;
  readonly children: readonly Placement[];
  readonly state: ResolvedState;
  /** Composition time. */
  readonly time: number;
  /** Transition opacity factor, 1 when none. */
  readonly transitionOpacity: number;
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
}

export function overlayLayout(p: ElementProps, size: Box, fit: FitMode = "none"): OverlayLayout {
  const rel = p.time - p.placement.start;
  const transform = animatedTransform(p.placement.props.transform as Transform | undefined, p.children, rel);
  const layout = layoutRect(p.state.composition, size, fit, transform);
  const { filter } = filterString(p.children, p.placement.id);
  const blend = p.placement.props.blend;
  return {
    rect: { w: layout.rect.w, h: layout.rect.h },
    matrix: layout.matrix,
    opacity: (transform.opacity ?? 1) * p.transitionOpacity,
    filter: filter || null,
    blend: blend && blend !== "normal" ? blendOf(blend) : null,
    borderRadius: transform.borderRadius ?? 0,
  };
}

/** Position an overlay of `size` composition pixels with its transform, filter and blend as CSS. */
export function overlayStyle(p: ElementProps, size: Box, fit: FitMode = "none"): CSSProperties {
  const l = overlayLayout(p, size, fit);
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
    boxSizing: "border-box",
  };
}

function cssBlend(op: GlobalCompositeOperation): CSSProperties["mixBlendMode"] {
  return (op === "source-over" ? "normal" : op === "lighter" ? "plus-lighter" : op) as CSSProperties["mixBlendMode"];
}

export function dataAttrs(p: Placement): Record<string, string> {
  return { "data-el": p.id, "data-kind": p.kind };
}
