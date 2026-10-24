import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectModule, resolve } from "@cutcut/kit";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import * as file from "../../player/e2e/app/composition";
import { directoryResolver, renderVideo } from "../src";
import { decodeFrames, decodesClean, pixel, probe, readStrip } from "./helpers/output";

const state = resolve(collectModule(file), file.manifest);
const media = directoryResolver(mediaDir, file.manifest);
let dir = "";

beforeAll(() => {
  generateMedia();
  dir = mkdtempSync(join(tmpdir(), "cutcut-render-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("renderVideo", () => {
  it("renders the e2e composition frame-exactly to WebM", async () => {
    const out = join(dir, "exact.webm");
    const progress: number[] = [];
    const result = await renderVideo({ state, media, out, onProgress: (p) => progress.push(p.frame) });
    expect(result).toMatchObject({ frames: 210, fps: 30, width: 640, height: 360 });
    expect(result.errors).toEqual([]);
    expect(progress.at(-1)).toBe(210);
    expect(statSync(out).size).toBeGreaterThan(10_000);

    const info = probe(out);
    expect(info).toMatchObject({ codec: "vp9", width: 640, height: 360, frames: 210, fps: 30 });
    expect(Math.abs(info.duration - 7)).toBeLessThan(1 / 30 + 1e-6);
    decodesClean(out);

    // The source video paints its frame number into a strip; every output frame must show the source frame for its time.
    const wrong: string[] = [];
    let seen = 0;
    const decoded = await decodeFrames(out, (frame, n) => {
      seen++;
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
    expect(decoded).toBe(210);
    expect(seen).toBe(210);
    expect(wrong).toEqual([]);
  });

  it("renders a time range", async () => {
    const out = join(dir, "range.webm");
    const result = await renderVideo({ state, media, out, from: 1, to: 2 });
    expect(result.frames).toBe(30);
    const first: number[] = [];
    await decodeFrames(out, (frame, n) => { if (n === 0 || n === 29) first.push(readStrip(frame)); });
    expect(first).toEqual([30, 59]);
  });

  it("fails instead of drawing a placeholder when an asset is missing", async () => {
    const out = join(dir, "missing.webm");
    await expect(renderVideo({ state, media: directoryResolver(join(dir, "nowhere"), file.manifest), out })).rejects.toThrow(/cannot render: .*bars/);
  });
});
