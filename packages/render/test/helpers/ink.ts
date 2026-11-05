import { readImage } from "./output";

/** How wide the light pixels (text, here) spread across an image: rightmost minus leftmost column. */
export function inkWidth(png: string): number {
  const { width, height, rgba: data } = readImage(png);
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if ((data[i] ?? 0) > 128 && (data[i + 1] ?? 0) > 128 && (data[i + 2] ?? 0) > 128) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  return right - left;
}
