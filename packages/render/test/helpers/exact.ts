import { decodeFrames, pixel, readStrip } from "./output";

/**
 * Checks a render of the e2e composition (minus its overlays) frame by frame. The source video paints its frame
 * number into a strip, so every output frame must show the source frame for its time, exactly.
 * Timeline: v1 bars[0,4) 0-4 s, crossfade, v2 bars[6,9) at 1.5x 3.5-5.5 s, logo 5.5-6.5 s, solid blue 6-7 s.
 */
export async function checkExactFrames(file: string): Promise<{ decoded: number; wrong: string[] }> {
  const wrong: string[] = [];
  const decoded = await decodeFrames(file, (frame, n) => {
    const t = n / 30;
    if (t < 3.5) {
      if (readStrip(frame) !== n) wrong.push(`t=${t.toFixed(3)} strip ${readStrip(frame)} expected ${n}`);
    } else if (t >= 4.0 && t < 5.5) {
      const st = 6 + (t - 3.5) * 1.5;
      const expected = Math.floor(st * 30 + 0.03);
      if (readStrip(frame) !== expected) wrong.push(`t=${t.toFixed(3)} strip ${readStrip(frame)} expected ${expected}`);
    } else if (n === 170) {
      const [r, g, b] = pixel(frame, 320, 180);
      if (!(r > 200 && g < 60 && b < 60)) wrong.push(`t=${t.toFixed(3)} logo centre is ${r},${g},${b}`);
    } else if (n === 207) {
      const [r, g, b] = pixel(frame, 320, 180);
      if (!(b > 200 && r < 60 && g < 60)) wrong.push(`t=${t.toFixed(3)} solid centre is ${r},${g},${b}`);
    }
  });
  return { decoded, wrong };
}
