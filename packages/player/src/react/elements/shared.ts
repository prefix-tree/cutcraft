import type { Placement, ResolvedState, Transform } from "@cut/kit";
import type { CSSProperties } from "react";
import { filterString } from "../../model/effects";
import { animatedTransform, layoutRect, matrixToCss, type Box } from "../../model/transform";
import { blendOf } from "../../model/frame-plan";

export interface ElementProps {
  readonly placement: Placement;
  readonly children: readonly Placement[];
  readonly state: ResolvedState;
  /** Composition time. */
  readonly time: number;
  /** Transition opacity factor, 1 when none. */
  readonly transitionOpacity: number;
}

/** Position an overlay of `size` composition pixels with its transform, filter and blend as CSS. */
export function overlayStyle(p: ElementProps, size: Box, fit: "contain" | "none" = "none"): CSSProperties {
  const rel = p.time - p.placement.start;
  const transform = animatedTransform(p.placement.props.transform as Transform | undefined, p.children, rel);
  const layout = layoutRect(p.state.composition, size, fit, transform);
  const { filter } = filterString(p.children, p.placement.id);
  const blend = p.placement.props.blend;
  const opacity = (transform.opacity ?? 1) * p.transitionOpacity;
  return {
    position: "absolute",
    left: 0,
    top: 0,
    width: layout.rect.w,
    height: layout.rect.h,
    transformOrigin: "0 0",
    transform: matrixToCss(layout.matrix),
    opacity,
    ...(filter ? { filter } : {}),
    ...(blend && blend !== "normal" ? { mixBlendMode: cssBlend(blendOf(blend)) } : {}),
    ...(transform.borderRadius ? { borderRadius: transform.borderRadius, overflow: "hidden" } : {}),
    boxSizing: "border-box",
  };
}

function cssBlend(op: GlobalCompositeOperation): CSSProperties["mixBlendMode"] {
  return (op === "source-over" ? "normal" : op === "lighter" ? "plus-lighter" : op) as CSSProperties["mixBlendMode"];
}

export function dataAttrs(p: Placement): Record<string, string> {
  return { "data-el": p.id, "data-kind": p.kind };
}
