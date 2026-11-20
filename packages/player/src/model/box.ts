import { BOX_ORIGIN_POINT, type ElementBox, type FitMode } from "@uberscene/kit/schema";

import type { Box, DrawRect } from "./transform";

/**
 * Where a box starts on one axis: at `at` its origin point sits `origin` of the way along its `size`; with no `at`,
 * the box is centred in the frame's `frame` pixels.
 */
export function placeAxis(frame: number, size: number, at: number | undefined, origin: number): number {
  return at === undefined || !Number.isFinite(at) ? (frame - size) / 2 : at - origin * size;
}

/** Where an element's content lands: the rectangle it is drawn in, and the part of its source that shows. */
export interface Placed {
  /** Composition pixels, before the element's transform. */
  readonly rect: DrawRect;
  /** The part of the content drawn into `rect`, as fractions of it, when `fit: "cover"` overflows the box. */
  readonly crop?: DrawRect;
}

/**
 * The one rule every element that draws is placed by. `box` is the rectangle the element occupies, the whole frame
 * when it is left out; `fit` decides how its `content` (its own size in pixels) fills that rectangle, as CSS
 * `object-fit` does inside a box, centred. A box with no `width` or `height` takes the size its content has when
 * fitted to the frame, so its content fills it exactly; an `x` or `y` left out centres it on that axis. `cover`
 * crops what falls outside a box given a size; `none` larger than its box overflows it.
 */
export function placeBox(frame: Box, content: Box, fit: FitMode, box?: ElementBox): Placed {
  const fitted = fitRect(frame, content, fit);
  if (!box) return { rect: fitted };
  const o = BOX_ORIGIN_POINT[box.origin ?? "topLeft"];
  const aspect = fitted.h > 0 ? fitted.w / fitted.h : 1;
  const w = box.width ?? (box.height !== undefined ? box.height * aspect : fitted.w);
  const h = box.height ?? (box.width !== undefined ? box.width / aspect : fitted.h);
  const area = { x: placeAxis(frame.width, w, box.x, o.x), y: placeAxis(frame.height, h, box.y, o.y), w, h };
  if (box.width === undefined && box.height === undefined) return { rect: area };
  const inner = fitRect({ width: w, height: h }, content, fit);
  const rect = { x: area.x + inner.x, y: area.y + inner.y, w: inner.w, h: inner.h };
  if (fit !== "cover" || (inner.w <= w + 1e-9 && inner.h <= h + 1e-9)) return { rect };
  // Cover overflows the box: draw only the part of the content inside it, as the box's own crop.
  return {
    rect: area,
    crop: { x: 0 - inner.x / inner.w, y: 0 - inner.y / inner.h, w: w / inner.w, h: h / inner.h },
  };
}

/** The fitted rectangle of a source inside a frame, centred. */
export function fitRect(comp: Box, src: Box, fit: FitMode): DrawRect {
  const W = comp.width,
    H = comp.height;
  const w = src.width > 0 ? src.width : W,
    h = src.height > 0 ? src.height : H;
  if (fit === "stretch") return { x: 0, y: 0, w: W, h: H };
  let s = 1;
  if (fit === "contain") s = Math.min(W / w, H / h);
  else if (fit === "cover") s = Math.max(W / w, H / h);
  const dw = w * s,
    dh = h * s;
  return { x: (W - dw) / 2, y: (H - dh) / 2, w: dw, h: dh };
}
