// The native codecs behind UBERSCENE_CODECS: the export decodes footage and encodes pictures with `uberscene-codec`
// instead of WebCodecs, and must show the same frames. Needs Chrome 157 and the binary (`pnpm native:build`);
// skipped without the binary.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, type LoadedVideo, loadVideo, renderVideo } from "../../src";
import { codecBinary } from "../../src/native/codecs";
import { checkExactFrames } from "../helpers/exact";
import { type DecodedFrame, decodeFrames, decodesClean, pixel, probe } from "../helpers/output";

const CRISP = 4_000_000;
const composition = join(import.meta.dirname, "..", "..", "..", "player", "e2e", "app", "composition.tsx");

let built = true;
try {
  codecBinary();
} catch {
  built = false;
}

/** Runs `fn` with UBERSCENE_CODECS set, as the CLI would see it. */
async function withCodecs<T>(value: string, fn: () => Promise<T>): Promise<T> {
  const before = process.env.UBERSCENE_CODECS;
  process.env.UBERSCENE_CODECS = value;
  try {
    return await fn();
  } finally {
    if (before === undefined) delete process.env.UBERSCENE_CODECS;
    else process.env.UBERSCENE_CODECS = before;
  }
}

describe.skipIf(!built)("native codecs", () => {
  let loaded: LoadedVideo;
  let base: Pick<Parameters<typeof renderVideo>[0], "state" | "source" | "media">;
  let dir = "";

  beforeAll(async () => {
    generateMedia();
    dir = mkdtempSync(join(tmpdir(), "uberscene-native-"));
    loaded = await loadVideo(composition);
    base = { state: loaded.state, source: loaded.source, media: directoryResolver(mediaDir, loaded.manifest) };
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("decodes the footage natively and still shows the right source frame at every time", async () => {
    const out = join(dir, "native-decode.webm");
    const result = await withCodecs("native-decode", () => renderVideo({ ...base, out, bitrate: CRISP }));
    expect(result).toMatchObject({ frames: 210, codecs: { decode: "native", encode: "browser" } });
    expect(result.warnings.filter((w) => w.includes("native decoder"))).toEqual([]);
    decodesClean(out);
    const { decoded, wrong } = await checkExactFrames(out);
    expect(decoded).toBe(210);
    expect(wrong).toEqual([]);
  });

  it("draws the same pictures as the browser's decoder, within the encoders' differences", async () => {
    const browser = join(dir, "browser.webm");
    const native = join(dir, "native.webm");
    await renderVideo({ ...base, out: browser, to: 1, bitrate: CRISP, silent: true });
    await withCodecs("native-decode", () => renderVideo({ ...base, out: native, to: 1, bitrate: CRISP, silent: true }));
    const frames = async (file: string): Promise<DecodedFrame[]> => {
      const all: DecodedFrame[] = [];
      await decodeFrames(file, (f) => all.push(f));
      return all;
    };
    const [a, b] = [await frames(browser), await frames(native)];
    expect(b).toHaveLength(a.length);
    for (const n of [0, 12, 29]) {
      const [fa, fb] = [a[n] as DecodedFrame, b[n] as DecodedFrame];
      let sum = 0;
      for (let i = 0; i < fa.rgba.length; i++) sum += Math.abs((fa.rgba[i] as number) - (fb.rgba[i] as number));
      expect(sum / fa.rgba.length, `frame ${n}`).toBeLessThan(4);
    }
  });

  it("draws HEVC and ProRes footage, which Chrome cannot decode without hardware", async () => {
    for (const [name, args] of [
      ["clip.mp4", ["-pix_fmt", "yuv420p10le", "-c:v", "libx265", "-x265-params", "log-level=error", "-tag:v", "hvc1"]],
      ["clip.mov", ["-c:v", "prores_ks", "-profile:v", "3"]],
    ] as const) {
      const sub = mkdtempSync(join(dir, "src-"));
      // Red on the left, blue on the right: a decoded frame is far from the grey of a clip that could not be read.
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=red:size=160x180:rate=30:duration=1[l];color=blue:size=160x180:rate=30:duration=1[r];[l][r]hstack",
        ...args,
        join(sub, name),
      ]);
      writeFileSync(
        join(sub, "uberscene.json"),
        JSON.stringify({
          assets: { clip: { id: "clip", kind: "video", duration: 1, fps: 30, width: 320, height: 180 } },
        }),
      );
      writeFileSync(
        join(sub, "cut.tsx"),
        `import { Clip, Composition, Track } from "@uberscene/kit";
export default function Video() {
  return (
    <Composition fps={30} width={320} height={180}>
      <Track id="main"><Clip id="c" src="asset:clip" /></Track>
    </Composition>
  );
}
`,
      );
      const video = await loadVideo(join(sub, "cut.tsx"));
      const out = join(sub, "out.webm");
      await withCodecs("native-decode", () =>
        renderVideo({
          state: video.state,
          source: video.source,
          media: directoryResolver(sub, video.manifest),
          out,
          to: 0.5,
          silent: true,
        }),
      );
      await decodeFrames(out, (f, n) => {
        if (n !== 7) return;
        const [r1, , b1] = pixel(f, 60, 90);
        const [r2, , b2] = pixel(f, 260, 90);
        expect(r1, name).toBeGreaterThan(180);
        expect(b1, name).toBeLessThan(80);
        expect(b2, name).toBeGreaterThan(180);
        expect(r2, name).toBeLessThan(80);
      });
    }
  });

  it("encodes H.264 natively, in pieces on several pages, with the sound", async () => {
    const out = join(dir, "native.mp4");
    const result = await withCodecs("native-encode", () => renderVideo({ ...base, out, to: 3, tabs: 3 }));
    expect(result).toMatchObject({ frames: 90, audio: true, codecs: { decode: "browser", encode: "native" } });
    expect(probe(out)).toMatchObject({ codec: "h264", width: 640, height: 360, frames: 90, audioStreams: 1 });
    decodesClean(out);
    const { wrong } = await checkExactFrames(out);
    expect(wrong).toEqual([]);
  });

  it("writes ProRes to a .mov", async () => {
    const out = join(dir, "native.mov");
    const result = await withCodecs("native", () => renderVideo({ ...base, out, to: 1, quality: "low" }));
    expect(result).toMatchObject({ frames: 30, audio: true });
    expect(probe(out)).toMatchObject({ codec: "prores", width: 640, height: 360, frames: 30, audioStreams: 1 });
    decodesClean(out);
  });

  it("makes the soundtrack natively, and it sounds as the browser's does", async () => {
    // The browser's mix, the page's mix encoded natively, and the mix made in Node from the native decoder's sound.
    const files = { browser: "", "native-encode": "", native: "" };
    for (const codecs of Object.keys(files) as (keyof typeof files)[]) {
      const out = join(dir, `sound-${codecs}.wav`);
      await withCodecs(codecs, () => renderVideo({ ...base, out }));
      files[codecs] = out;
    }
    const decoded = (file: string): Float32Array => {
      const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "2", "-"], {
        maxBuffer: 1 << 28,
      });
      return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
    };
    const reference = decoded(files.browser);
    expect(reference.length / 2).toBe(7 * 48000);
    // The page's mix encoded natively: the same 16-bit samples, give or take one step.
    const pageMix = decoded(files["native-encode"]);
    expect(pageMix.length).toBe(reference.length);
    let worst = 0;
    for (let i = 0; i < pageMix.length; i++)
      worst = Math.max(worst, Math.abs((pageMix[i] as number) - (reference[i] as number)));
    expect(worst).toBeLessThan(1e-4);
    // The mix made from the native decoder's sound, the whole of it: v2 starts 6 s into its WebM, where a block's time
    // is rounded to the millisecond, so this also checks that both place a clip read from the middle where the file has it.
    const nodeMix = decoded(files.native);
    expect(nodeMix.length).toBe(reference.length);
    worst = 0;
    for (let i = 0; i < nodeMix.length; i++)
      worst = Math.max(worst, Math.abs((nodeMix[i] as number) - (reference[i] as number)));
    // 16-bit PCM, and two decoders of the same Opus.
    expect(worst).toBeLessThan(3e-3);

    // A MOV carries 24-bit PCM, an MP4 AAC.
    const audioCodec = (file: string): string =>
      execFileSync(
        "ffprobe",
        ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", file],
        { encoding: "utf8" },
      ).trim();
    const mov = join(dir, "sound.mov");
    await withCodecs("native", () => renderVideo({ ...base, out: mov, to: 1, quality: "low" }));
    expect(audioCodec(mov)).toBe("pcm_s24le");
    expect(probe(mov).audioDuration).toBeCloseTo(1, 2);
    const mp4 = join(dir, "sound.mp4");
    await withCodecs("native", () => renderVideo({ ...base, out: mp4, to: 1 }));
    expect(audioCodec(mp4)).toBe("aac");
    expect(probe(mp4).audioDuration).toBeCloseTo(1, 1);
  });

  it("refuses what the native encoder does not write", async () => {
    await expect(
      withCodecs("native-encode", () => renderVideo({ ...base, out: join(dir, "x.webm"), to: 0.2 })),
    ).rejects.toThrow(/writes H.264 \(.mp4\) and ProRes \(.mov\), not vp9/);
    await expect(renderVideo({ ...base, out: join(dir, "x.mov"), to: 0.2 })).rejects.toThrow(
      /UBERSCENE_CODECS=native-encode/,
    );
  });
});
