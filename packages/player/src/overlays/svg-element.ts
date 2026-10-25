import type { FitMode } from "@cutcut/kit";
import { overlayLayout, type ElementProps, type OverlayLayout } from "./layout";
import { prepareSvg, svgIntrinsicSize, type PreparedSvg, type SvgColor, type SvgViewBox } from "./svg";

export interface SvgDrawing {
  /** The size the SVG asks for, before `fit`. */
  readonly size: { readonly width: number; readonly height: number };
  readonly fit: FitMode;
  readonly layout: OverlayLayout;
  readonly prepared: PreparedSvg;
}

/**
 * How an `<Svg>` element draws its markup: at the size the SVG asks for (or fitted to the
 * composition with `fit`), with its `viewBox`, `preserveAspectRatio` and `color` applied.
 */
export function svgDrawing(p: ElementProps, markup: string, tokens?: Readonly<Record<string, string>>): SvgDrawing {
  const props = p.placement.props as Record<string, unknown>;
  const viewBox = props.viewBox as SvgViewBox | undefined;
  const size = svgIntrinsicSize(markup, viewBox);
  const fit = (props.fit as FitMode | undefined) ?? "none";
  const layout = overlayLayout(p, size, fit);
  const prepared = prepareSvg(markup, {
    box: { width: layout.rect.w, height: layout.rect.h },
    viewBox,
    preserveAspectRatio: props.preserveAspectRatio as string | undefined,
    color: props.color as SvgColor | undefined,
    tokens,
    idPrefix: p.placement.id,
  });
  return { size, fit, layout, prepared };
}
