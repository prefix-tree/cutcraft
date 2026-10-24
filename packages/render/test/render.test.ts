import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectModule, resolve } from "@cutcut/kit";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import * as file from "../../player/e2e/app/composition";
import { directoryResolver, renderVideo } from "../src";
import { decodeAudio, decodeFrames, decodesClean, pixel, probe, readStrip, rmsOf, tonePower } from "./helpers/output";

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
    expect(result).toMatchObject({ frames: 210, fps: 30, width: 640, height: 360, audio: true });
    expect(result.errors).toEqual([]);
    expect(progress.at(-1)).toBe(210);
    expect(statSync(out).size).toBeGreaterThan(10_000);

    const info = probe(out);
    expect(info).toMatchObject({ codec: "vp9", width: 640, height: 360, frames: 210, fps: 30, audioStreams: 1 });
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
    await expect(renderVideo({ state, media: directoryResolver(join(dir, "nowhere"), file.manifest), out })).rejects.toThrow(/no media file for asset "bars"/);
  });

  it("mixes the soundtrack from the plan: clip audio, speed-shifted pitch, a bed that ducks under it", async () => {
    const out = join(dir, "audio.webm");
    const result = await renderVideo({ state, media, out });
    expect(result.audio).toBe(true);
    const audio = decodeAudio(out);
    expect(Math.abs(audio.length / 48000 - 7)).toBeLessThan(0.06);
    // 1.0-2.0 s: bars at 440 Hz alone (the bed is ducked to 3% of its level).
    expect(tonePower(audio, 1, 2, 440) / tonePower(audio, 1, 2, 660)).toBeGreaterThan(50);
    // 4.3-5.3 s: the second clip plays at 1.5x, so the same sine is heard at 660 Hz.
    expect(tonePower(audio, 4.3, 5.3, 660) / tonePower(audio, 4.3, 5.3, 440)).toBeGreaterThan(50);
    // 6.2-6.9 s: only the bed is left, at 0.3 of a 0.125 sine, no longer ducked.
    expect(rmsOf(audio, 6.2, 6.9)).toBeGreaterThan(0.0265 * 0.85);
    expect(rmsOf(audio, 6.2, 6.9)).toBeLessThan(0.0265 * 1.15);
    // While the clips play the bed sits at a tenth of that.
    expect(rmsOf(audio, 1, 2)).toBeGreaterThan(0.125 * Math.SQRT1_2 * 0.85);
  });

  it("writes no audio track when asked to be silent", async () => {
    const out = join(dir, "silent.webm");
    const result = await renderVideo({ state, media, out, silent: true, to: 1 });
    expect(result.audio).toBe(false);
    expect(probe(out).audioStreams).toBe(0);
  });
});
