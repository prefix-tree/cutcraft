import { Canvas, loadImage } from "skia-canvas";

/** How wide the light pixels (text, here) spread across an image: rightmost minus leftmost column. */
export async function inkWidth(png: string): Promise<number> {
  const image = await loadImage(png);
  const { width, height } = image;
  const ctx = new Canvas(width, height).getContext("2d");
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, width, height);
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
