// The native soundtrack (UBERSCENE_CODECS with a native encoder): the mix made in this process from the sound
// `uberscene-codec` decodes must be the mix the export makes from the sound ffmpeg decodes, and the files
// `encode-audio` writes must hold it. Runs against the real binary, without a browser; skipped when it is not built
// (`pnpm native:build`).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildAudioPlan, makeNestedResolver } from "@uberscene/player/engine";

import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { directoryResolver, type LoadedVideo, loadVideo } from "../src";
import { mixPlan, type PcmBuffer, type PcmProvider } from "../src/mixer";
import { codecBinary } from "../src/native/codecs";
import {
  encodePageMix,
  floatWav,
  mixNatively,
  NativePcm,
  NativeSoundUnavailable,
  parseStretch,
} from "../src/native/soundtrack";

const composition = join(import.meta.dirname, "..", "..", "player", "e2e", "app", "composition.tsx");

let binary: string | null = null;
try {
  binary = codecBinary();
} catch {
  binary = null;
}

/** A file's whole first audio track decoded by ffmpeg, as planar float at its own rate. */
function ffmpegPcm(file: string): PcmBuffer {
  const info = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels", "-of", "json", file],
      { encoding: "utf8" },
    ),
  ).streams[0] as { sample_rate: string; channels: number };
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-map", "a:0", "-f", "f32le", "-"], {
    maxBuffer: 1 << 30,
  });
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const n = Math.floor(all.length / info.channels);
  const channels = Array.from({ length: info.channels }, (_, ch) => {
    const plane = new Float32Array(n);
    for (let i = 0; i < n; i++) plane[i] = all[i * info.channels + ch] as number;
    return plane;
  });
  return { sampleRate: Number(info.sample_rate), channels };
}

/** Ranges cut from ffmpeg's decode of each whole file, as `MediabunnyPcm` places them. */
class FfmpegPcm implements PcmProvider {
  private readonly whole = new Map<string, PcmBuffer>();
  constructor(private readonly path: (asset: string) => string) {}
  async range(asset: string, from: number, to: number): Promise<PcmBuffer> {
    let w = this.whole.get(asset);
    if (!w) {
      w = ffmpegPcm(this.path(asset));
      this.whole.set(asset, w);
    }
    const sr = w.sampleRate;
    const length = Math.max(1, Math.ceil((to - from) * sr));
    const first = Math.round(from * sr);
    return {
      sampleRate: sr,
      channels: w.channels.map((c) => {
        const out = new Float32Array(length);
        for (let i = 0; i < length; i++) {
          const j = first + i;
          if (j >= 0 && j < c.length) out[i] = c[j] as number;
        }
        return out;
      }),
    };
  }
}

/** Stereo float of a file decoded by ffmpeg at 48 kHz. */
function decodedStereo(file: string): Float32Array {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-ar", "48000", "-"], {
    maxBuffer: 1 << 30,
  });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}

describe("the native sound header", () => {
  const stretch = (rate: number, channels: number[][]): Uint8Array => {
    const frames = channels[0]?.length ?? 0;
    const out = new Uint8Array(16 + channels.length * frames * 4);
    const view = new DataView(out.buffer);
    out.set([0x55, 0x42, 0x41, 0x31], 0);
    view.setUint32(4, rate, true);
    view.setUint32(8, channels.length, true);
    view.setUint32(12, frames, true);
    channels.forEach((c, ch) => {
      c.forEach((v, i) => {
        view.setFloat32(16 + (ch * frames + i) * 4, v, true);
      });
    });
    return out;
  };

  it("reads each channel in turn", () => {
    const pcm = parseStretch(
      stretch(44100, [
        [0.5, -0.5],
        [0.25, 0],
      ]),
      2 / 44100,
    );
    expect(pcm.sampleRate).toBe(44100);
    expect(pcm.channels.map((c) => [...c])).toEqual([
      [0.5, -0.5],
      [0.25, 0],
    ]);
  });

  it("makes a file with no audio track silence of the stretch's length", () => {
    const pcm = parseStretch(stretch(48000, []), 0.5);
    expect(pcm.channels).toHaveLength(1);
    expect(pcm.channels[0]?.length).toBe(24000);
    expect(pcm.channels[0]?.every((v) => v === 0)).toBe(true);
  });

  it("refuses sound cut short", () => {
    expect(() => parseStretch(stretch(48000, [[1, 2, 3]]).subarray(0, 20), 1)).toThrow(/not 1 channels of 3 frames/);
  });
});

describe("the page's mix as float PCM", () => {
  const wav = (tag: number, bits: number, channels: number, frames: number): Uint8Array => {
    const out = new Uint8Array(44 + frames * channels * (bits / 8));
    const view = new DataView(out.buffer);
    const put = (at: number, s: string): void =>
      out.set(
        [...s].map((c) => c.charCodeAt(0)),
        at,
      );
    put(0, "RIFF");
    view.setUint32(4, out.length - 8, true);
    put(8, "WAVE");
    put(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, tag, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, 44100, true);
    view.setUint16(34, bits, true);
    put(36, "data");
    view.setUint32(40, out.length - 44, true);
    return out;
  };

  it("finds the samples and the rate of a float stereo WAV", () => {
    const { sampleRate, data } = floatWav(wav(3, 32, 2, 10));
    expect(sampleRate).toBe(44100);
    expect(data.length).toBe(80);
  });

  it("refuses a WAV of another format", () => {
    expect(() => floatWav(wav(1, 16, 2, 10))).toThrow(/32-bit float stereo/);
    expect(() => floatWav(wav(3, 32, 1, 10))).toThrow(/32-bit float stereo/);
    expect(() => floatWav(new Uint8Array(8))).toThrow(/not a WAV/);
  });
});

describe.skipIf(!binary)("the native soundtrack", () => {
  let loaded: LoadedVideo;
  let media: ReturnType<typeof directoryResolver>;
  let dir = "";
  const pathOf = async (asset: string): Promise<string> => {
    const h = await media.resolve(asset);
    if (h.kind !== "path") throw new Error(`${asset} is not a file`);
    return h.path;
  };

  beforeAll(async () => {
    generateMedia();
    dir = mkdtempSync(join(tmpdir(), "uberscene-native-audio-"));
    loaded = await loadVideo(composition);
    media = directoryResolver(mediaDir, loaded.manifest);
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("decodes an asset's sound as ffmpeg does, wherever the range starts", async () => {
    const pcm = new NativePcm(binary as string, media);
    const reference = new FfmpegPcm(() => join(mediaDir, "tone.ogg"));
    for (const [from, to] of [
      [0, 1],
      [2.37, 3.1],
      [-0.25, 0.5],
      [19.5, 21],
    ] as const) {
      const ours = await pcm.range("tone", from, to);
      const theirs = await reference.range("tone", from, to);
      expect(ours.sampleRate).toBe(theirs.sampleRate);
      expect(ours.channels[0]?.length).toBe(theirs.channels[0]?.length);
      let worst = 0;
      (ours.channels[0] as Float32Array).forEach((v, i) => {
        worst = Math.max(worst, Math.abs(v - ((theirs.channels[0] as Float32Array)[i] as number)));
      });
      expect(worst, `[${from}, ${to})`).toBeLessThan(1e-3);
    }
  });

  it("says when an asset is not a file it can read", async () => {
    const remote = { resolve: async () => ({ kind: "url" as const, url: "https://example.com/a.mp3" }) };
    await expect(new NativePcm(binary as string, remote).range("x", 0, 1)).rejects.toBeInstanceOf(
      NativeSoundUnavailable,
    );
    const broken = join(dir, "broken.m4a");
    writeFileSync(broken, "not sound");
    const local = { resolve: async () => ({ kind: "path" as const, path: broken }) };
    await expect(new NativePcm(binary as string, local).range("x", 0, 1)).rejects.toBeInstanceOf(
      NativeSoundUnavailable,
    );
  });

  it("mixes the composition as the export's mixer does from ffmpeg's decode: speed, ducking and all", async () => {
    const { state } = loaded;
    const from = 0;
    const to = state.composition.duration;
    const result = await mixNatively({
      binary: binary as string,
      state,
      media,
      from,
      to,
      container: "mov",
      bitrate: 128_000,
    });
    expect(result.warnings).toEqual([]);
    const file = join(dir, "mix.wav");
    writeFileSync(file, result.bytes as Uint8Array);
    const ours = decodedStereo(file);

    const plan = buildAudioPlan(
      state,
      from,
      to,
      makeNestedResolver(() => state),
    );
    const paths = new Map<string, string>();
    for (const o of plan) paths.set(o.asset, await pathOf(o.asset));
    const reference: number[] = [];
    for await (const block of mixPlan(plan, new FfmpegPcm((a) => paths.get(a) as string), {
      sampleRate: 48000,
      from,
      to,
      clamp: true,
    }))
      for (let i = 0; i < block.left.length; i++) reference.push(block.left[i] as number, block.right[i] as number);

    expect(ours.length).toBe(reference.length);
    let worst = 0,
      power = 0;
    for (let i = 0; i < ours.length; i++) {
      worst = Math.max(worst, Math.abs((ours[i] as number) - (reference[i] as number)));
      power += (reference[i] as number) ** 2;
    }
    expect(Math.sqrt(power / reference.length), "the mix has sound").toBeGreaterThan(0.01);
    // 24-bit PCM, and two decoders of the same Opus.
    expect(worst).toBeLessThan(2e-3);
  });

  it("writes AAC in an M4A for an MP4, as long as the range", async () => {
    const { state } = loaded;
    const result = await mixNatively({
      binary: binary as string,
      state,
      media,
      from: 1,
      to: 3,
      container: "mp4",
      bitrate: 128_000,
    });
    const file = join(dir, "mix.m4a");
    writeFileSync(file, result.bytes as Uint8Array);
    const stream = JSON.parse(
      execFileSync(
        "ffprobe",
        ["-v", "error", "-show_entries", "stream=codec_name,channels,sample_rate", "-of", "json", file],
        {
          encoding: "utf8",
        },
      ),
    ).streams[0];
    expect(stream).toMatchObject({ codec_name: "aac", channels: 2, sample_rate: "48000" });
    expect(decodedStereo(file).length / 2).toBeCloseTo(96000, -3);
  });

  it("encodes the page's mix when the page mixed it", async () => {
    const frames = 4800;
    const wav = new Uint8Array(44 + frames * 8);
    const view = new DataView(wav.buffer);
    const put = (at: number, s: string): void =>
      wav.set(
        [...s].map((c) => c.charCodeAt(0)),
        at,
      );
    put(0, "RIFF");
    view.setUint32(4, wav.length - 8, true);
    put(8, "WAVE");
    put(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 3, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, 48000, true);
    view.setUint16(34, 32, true);
    put(36, "data");
    view.setUint32(40, frames * 8, true);
    for (let i = 0; i < frames; i++) {
      const v = Math.sin((i / 48000) * 440 * 2 * Math.PI) * 0.5;
      view.setFloat32(44 + i * 8, v, true);
      view.setFloat32(48 + i * 8, -v, true);
    }
    const bytes = await encodePageMix({ binary: binary as string, wav, container: "wav", bitrate: 128_000 });
    const file = join(dir, "page.wav");
    writeFileSync(file, bytes);
    const out = decodedStereo(file);
    expect(out.length).toBe(frames * 2);
    expect(out[200]).toBeCloseTo(Math.sin((100 / 48000) * 440 * 2 * Math.PI) * 0.5, 3);
    expect(out[201]).toBeCloseTo(-(out[200] as number), 3);
  });
});
