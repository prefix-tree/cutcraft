import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectModule, resolve } from "@cutcut/kit";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import * as file from "../../player/e2e/app/composition";
import { indexLayerInteriors } from "@cutcut/player/overlays";
import { Canvas, loadImage } from "skia-canvas";
import { VideoSample } from "mediabunny";
import { directoryResolver, renderStill, renderVideo } from "../src";
import { FramePipeline } from "../src/pipeline";
import { checkExactFrames } from "./helpers/exact";
import { decodeAudio, decodeFrames, type DecodedFrame, decodesClean, pixel, probe, readStrip, rmsOf, tonePower } from "./helpers/output";

const CRISP = 4_000_000;
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
    // The strip is read back bit by bit, so the picture is encoded generously: this test is about which frame is chosen, not compression.
    const result = await renderVideo({ state, media, out, bitrate: CRISP, onProgress: (p) => progress.push(p.frame) });
    expect(result).toMatchObject({ frames: 210, fps: 30, width: 640, height: 360, audio: true });
    expect(result.errors).toEqual([]);
    expect(progress.at(-1)).toBe(210);
    expect(statSync(out).size).toBeGreaterThan(10_000);

    const info = probe(out);
    expect(info).toMatchObject({ codec: "vp9", width: 640, height: 360, frames: 210, fps: 30, audioStreams: 1 });
    expect(Math.abs(info.duration - 7)).toBeLessThan(1 / 30 + 1e-6);
    decodesClean(out);

    // The source video paints its frame number into a strip; every output frame must show the source frame for its time.
    const { decoded, wrong } = await checkExactFrames(out);
    expect(decoded).toBe(210);
    expect(wrong).toEqual([]);
  });

  it("draws titles and layers above the footage, in the preview's colours and places", async () => {
    const out = join(dir, "overlays.webm");
    const interiors = indexLayerInteriors(file.default());
    const result = await renderVideo({ state, media, out, interiors, to: 3 });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    const lit = (frame: DecodedFrame, test: (r: number, g: number, b: number) => boolean, box: [number, number, number, number]): number => {
      let n = 0;
      for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) { const [r, g, b] = pixel(frame, x, y); if (test(r, g, b)) n++; }
      return n;
    };
    const green = (r: number, g: number, b: number): boolean => g > 230 && r < 40 && b < 40;
    const white = (r: number, g: number, b: number): boolean => r > 220 && g > 220 && b > 220;
    const frames: Record<number, { green: number; white: number }> = {};
    await decodeFrames(out, (frame, n) => {
      // The title (0.5-2.5 s) is green text at the centre; the counter (0-3 s) is white text at the top right.
      if (n === 10 || n === 45) frames[n] = { green: lit(frame, green, [250, 150, 390, 210]), white: lit(frame, white, [596, 8, 640, 36]) };
    });
    expect(frames[10]?.green).toBe(0);
    expect(frames[45]?.green).toBeGreaterThan(150);
    // The strip's last cell is black for these frame numbers, so what is white there is the counter's digits.
    expect(frames[10]?.white).toBeGreaterThan(30);
    expect(frames[45]?.white).toBeGreaterThan(30);
  });

  it("hands a frame that is one picture shown as it is to the encoder as decoded, and paints the rest", async () => {
    const pipeline = new FramePipeline({ state, media, warn: () => undefined });
    try {
      const plain = await pipeline.frame(96, true); // v1 alone, after the title and the layer
      expect(plain).toBeInstanceOf(VideoSample);
      const sample = plain as VideoSample;
      expect([sample.format, sample.codedWidth, sample.codedHeight, sample.colorSpace.matrix, sample.colorSpace.fullRange]).toEqual(["I420", 640, 360, "bt709", false]);
      sample.close();
      expect(await pipeline.frame(112, true)).toBeInstanceOf(Uint8Array); // the crossfade into v2
      expect(await pipeline.frame(180, true)).toBeInstanceOf(Uint8Array); // the logo, a still
    } finally {
      pipeline.dispose();
    }
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

  it("writes ProRes in a MOV, with PCM sound", async () => {
    const out = join(dir, "pro.mov");
    expect(await renderVideo({ state, media, out, to: 1 })).toMatchObject({ frames: 30, audio: true });
    expect(probe(out)).toMatchObject({ codec: "prores", width: 640, height: 360, frames: 30, audioStreams: 1 });
    decodesClean(out);
  });

  it("writes the soundtrack alone to MP3 and WAV", async () => {
    for (const ext of ["mp3", "wav"]) {
      const out = join(dir, `sound.${ext}`);
      expect(await renderVideo({ state, media, out, to: 2 })).toMatchObject({ frames: 0, audio: true });
      expect(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=codec_name", "-of", "csv=p=0", out], { encoding: "utf8" }).trim()).toBe("");
      const sound = decodeAudio(out);
      expect(sound.length / 48000).toBeCloseTo(2, 1);
      expect(rmsOf(sound, 0, 2)).toBeGreaterThan(0.01);
    }
    await expect(renderVideo({ state, media, out: join(dir, "none.mp3"), silent: true })).rejects.toThrow(/holds only the soundtrack/);
  });

  it("rejects a codec the container cannot hold", async () => {
    await expect(renderVideo({ state, media, out: join(dir, "bad.webm"), videoCodec: "prores", to: 1 })).rejects.toThrow(/\.webm file cannot hold prores/);
  });

  it("encodes to a quality preset in place of a bitrate", async () => {
    const low = join(dir, "low.webm"), high = join(dir, "high.webm");
    await renderVideo({ state, media, out: low, quality: "very-low", to: 1, silent: true });
    await renderVideo({ state, media, out: high, quality: "very-high", to: 1, silent: true });
    expect(statSync(high).size).toBeGreaterThan(statSync(low).size * 2);
  });

  it("draws one frame to a PNG: the frame the video shows at that time", async () => {
    const out = join(dir, "still.png");
    expect(await renderStill({ state, media, out, time: 1.5 })).toMatchObject({ frame: 45, width: 640, height: 360 });
    const canvas = new Canvas(640, 360);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(await loadImage(out), 0, 0);
    const rgba = new Uint8Array(ctx.getImageData(0, 0, 640, 360).data.buffer);
    expect(readStrip({ timestamp: 1.5, width: 640, height: 360, rgba })).toBe(45);
    await expect(renderStill({ state, media, out, time: 7 })).rejects.toThrow(/outside the composition/);
  });

  it("writes no audio track when asked to be silent", async () => {
    const out = join(dir, "silent.webm");
    const result = await renderVideo({ state, media, out, silent: true, to: 1 });
    expect(result.audio).toBe(false);
    expect(probe(out).audioStreams).toBe(0);
  });
});
