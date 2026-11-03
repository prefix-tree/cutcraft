/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { GRAPHIC_KINDS, drawGraphic, graphicSize, isIcon, type Label } from "@cutcraft/graphics";
import type { ReactNode } from "react";
import { z } from "zod";
import { overlayLayout, type ElementProps, type OverlayLayout } from "./layout";
import { prepareSvg, type PreparedSvg } from "./svg";

export interface GraphicDrawing {
  readonly layout: OverlayLayout;
  /** The art, sized to the layout's box. */
  readonly prepared: PreparedSvg;
  /** Text above the art, in the box's pixels. */
  readonly labels: readonly Label[];
}

/**
 * How a `<Graphic>` draws at the element's time: the kind's art through the
 * same SVG preparation as `<Svg>` (so `draw` and the theme apply), and its
 * labels, which both surfaces lay out as text the way they lay out titles.
 */
export function graphicDrawing(p: ElementProps): GraphicDrawing {
  const props = p.placement.props as Record<string, unknown>;
  return drawingOf(p, props, graphicSize(props, p.state.composition));
}

const iconShape = z.strictObject(GRAPHIC_KINDS.icon.shape);

/** A sticker whose `src` is `icon:name`, drawn as the icon graphic in the sticker's square. Null for other stickers. */
export function iconStickerDrawing(p: ElementProps, side: number): GraphicDrawing | null {
  const src = String(p.placement.props.src ?? "");
  if (!src.startsWith("icon:") || !isIcon(src.slice(5))) return null;
  const props = { kind: "icon", ...iconShape.parse({ name: src.slice(5) }) };
  return drawingOf(p, props, { width: side, height: side });
}

function drawingOf(
  p: ElementProps,
  props: Readonly<Record<string, unknown>>,
  size: { width: number; height: number },
): GraphicDrawing {
  const layout = overlayLayout(p, size, "none", true);
  const box = { width: layout.rect.w, height: layout.rect.h };
  const drawn = drawGraphic(props, {
    ...box,
    t: p.time - p.placement.start,
    duration: p.placement.duration,
    id: p.placement.id,
    tokens: p.state.theme?.tokens ?? {},
  });
  return {
    layout,
    prepared: prepareSvg(drawn.svg, { box, idPrefix: p.placement.id, draw: layout.draw }),
    labels: drawn.labels,
  };
}

/** A graphic's labels as positioned text, a tree both the DOM and Satori lay out. */
export function graphicLabels(labels: readonly Label[]): ReactNode {
  return labels.map((l, i) => (
    <div
      // biome-ignore lint/suspicious/noArrayIndexKey: a graphic's labels come from one draw, in a fixed order.
      key={i}
      style={{
        position: "absolute",
        left: l.x,
        top: l.y,
        width: l.w,
        height: l.h,
        display: "flex",
        alignItems: l.valign === "top" ? "flex-start" : l.valign === "bottom" ? "flex-end" : "center",
        justifyContent: l.align === "left" ? "flex-start" : l.align === "right" ? "flex-end" : "center",
        textAlign: l.align,
        fontFamily: l.font,
        fontSize: l.size,
        fontWeight: l.weight,
        fontStyle: l.italic ? "italic" : "normal",
        color: l.color,
        lineHeight: l.lineHeight ?? 1.2,
        letterSpacing: l.letterSpacing ?? 0,
        whiteSpace: "pre-wrap",
      }}
    >
      {l.text}
    </div>
  ));
}
