import type { CSSProperties } from "react";

import { BOX_ORIGIN_POINT, BOX_ORIGINS, type BoxOrigin } from "@uberscene/kit/schema";

import { placeAxis } from "../model/box";

/** Where the file puts the captions: the fields of its `box` it writes, and its `align`. */
export interface CaptionPlace {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly origin?: BoxOrigin;
  readonly align?: "left" | "center" | "right";
}

const ITEMS = { left: "flex-start", center: "center", right: "flex-end" } as const;

/** Reads the placement out of an element's props, which arrive untyped: anything that is not a placement is left out. */
export function captionPlace(props: Readonly<Record<string, unknown>>): CaptionPlace {
  const number = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const box = (typeof props.box === "object" && props.box ? props.box : {}) as Record<string, unknown>;
  const out: { -readonly [K in keyof CaptionPlace]: CaptionPlace[K] } = {};
  for (const k of ["x", "y", "width", "height"] as const) {
    const v = number(box[k]);
    if (v !== undefined) out[k] = v;
  }
  if ((BOX_ORIGINS as readonly unknown[]).includes(box.origin)) out.origin = box.origin as BoxOrigin;
  if (props.align === "left" || props.align === "right" || props.align === "center") out.align = props.align;
  return out;
}

/**
 * The captions' default box in a frame: the lower safe area. Centred, as wide as the frame less a margin at each
 * side, its bottom a margin above the frame's bottom. A vertical video's platform UI covers its right edge and its
 * bottom fifth, so there the margins are wider.
 */
export function captionBox(comp: {
  readonly width: number;
  readonly height: number;
}): Required<Omit<CaptionPlace, "height" | "align">> {
  const portrait = comp.height > comp.width;
  const side = portrait ? 0.12 : 0.08;
  return {
    x: comp.width / 2,
    y: comp.height * (1 - (portrait ? 0.2 : 0.08)),
    width: comp.width * (1 - 2 * side),
    origin: "bottom",
  };
}

/**
 * The CSS that puts the caption block in its box, in a frame of the given size: each field the file writes replaces
 * that one of the default box (`captionBox`). Across, the block starts where `placeAxis` puts a box that wide. Down,
 * with no `height` the block is as tall as its lines, so its origin line is pinned by the edge it names: `top` for a
 * top origin, `bottom` for a bottom one, and a pull of its own height between.
 */
export function captionPlacement(
  place: CaptionPlace,
  comp: { readonly width: number; readonly height: number },
): CSSProperties {
  const d = captionBox(comp);
  const x = place.x ?? d.x,
    y = place.y ?? d.y,
    width = place.width ?? d.width;
  const o = BOX_ORIGIN_POINT[place.origin ?? d.origin];
  const n = (v: number): number => Math.round(v * 1000) / 1000;
  const down: CSSProperties =
    place.height !== undefined
      ? { top: n(placeAxis(comp.height, place.height, y, o.y)), height: place.height }
      : o.y === 0
        ? { top: n(y) }
        : o.y === 1
          ? { bottom: n(comp.height - y) }
          : { top: n(y), transform: `translate(0, ${n(-o.y * 100)}%)` };
  const align = place.align ?? "center";
  return {
    position: "absolute",
    left: n(placeAxis(comp.width, width, x, o.x)),
    width: n(width),
    ...down,
    display: "flex",
    flexDirection: "column",
    alignItems: ITEMS[align],
    textAlign: align,
  };
}
