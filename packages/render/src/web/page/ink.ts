// Where an element's ink is, from a frame in which only that element is drawn: the box around all of its pixels, and
// the box around them in each cell of a grid laid over that box, so a hollow frame does not count as filled.

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Ink {
  readonly rect: Rect;
  readonly parts: readonly Rect[];
}

/** A pixel with less alpha than this is not ink. */
const INK_ALPHA = 8;
/** Grid cells along the longer side of the ink's box. */
const INK_GRID = 16;

/** The ink in an RGBA picture of `width` × `height`, scaled back to `scale` (composition pixels per picture pixel). */
export function inkOf(data: Uint8ClampedArray, width: number, height: number, scale = 1): Ink | null {
  let x0 = width,
    y0 = height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] as number) <= INK_ALPHA) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  if (x1 < 0) return null;
  const bw = x1 + 1 - x0,
    bh = y1 + 1 - y0;
  const cell = Math.max(bw, bh) / INK_GRID;
  const cols = Math.max(1, Math.ceil(bw / cell)),
    rows = Math.max(1, Math.ceil(bh / cell));
  // Per cell: min x, min y, max x, max y of its ink.
  const cells = new Float64Array(cols * rows * 4).fill(Number.NaN);
  for (let y = y0; y <= y1; y++) {
    const row = Math.min(rows - 1, Math.floor((y - y0) / cell)) * cols;
    for (let x = x0; x <= x1; x++) {
      if ((data[(y * width + x) * 4 + 3] as number) <= INK_ALPHA) continue;
      const c = (row + Math.min(cols - 1, Math.floor((x - x0) / cell))) * 4;
      if (Number.isNaN(cells[c] as number)) {
        cells[c] = x;
        cells[c + 1] = y;
        cells[c + 2] = x;
        cells[c + 3] = y;
        continue;
      }
      if (x < (cells[c] as number)) cells[c] = x;
      if (x > (cells[c + 2] as number)) cells[c + 2] = x;
      if (y > (cells[c + 3] as number)) cells[c + 3] = y;
    }
  }
  const parts: Rect[] = [];
  for (let c = 0; c < cells.length; c += 4) {
    const cx = cells[c] as number;
    if (Number.isNaN(cx)) continue;
    const cy = cells[c + 1] as number;
    parts.push({
      x: cx * scale,
      y: cy * scale,
      w: ((cells[c + 2] as number) + 1 - cx) * scale,
      h: ((cells[c + 3] as number) + 1 - cy) * scale,
    });
  }
  return { rect: { x: x0 * scale, y: y0 * scale, w: bw * scale, h: bh * scale }, parts };
}

/**
 * The frame clips what the capture can see, so ink that reaches an edge of the `width` × `height` frame is taken to
 * run on to the element's laid-out box on that side: the part of the element the frame cuts off.
 */
export function pastEdges(ink: Ink, box: Rect, width: number, height: number): Ink {
  const { x, y, w, h } = ink.rect;
  const left = x <= 0 ? Math.min(x, box.x) : x;
  const top = y <= 0 ? Math.min(y, box.y) : y;
  const right = x + w >= width ? Math.max(x + w, box.x + box.w) : x + w;
  const bottom = y + h >= height ? Math.max(y + h, box.y + box.h) : y + h;
  if (left === x && top === y && right === x + w && bottom === y + h) return ink;
  return { ...ink, rect: { x: left, y: top, w: right - left, h: bottom - top } };
}

/** An element wholly outside the frame draws no ink the capture can see: its laid-out box stands for it. */
export function offFrame(box: Rect, width: number, height: number): Ink | null {
  const outside = box.x >= width || box.y >= height || box.x + box.w <= 0 || box.y + box.h <= 0;
  return outside && box.w > 0 && box.h > 0 ? { rect: box, parts: [box] } : null;
}
