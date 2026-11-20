// A clip that starts in the middle of an Opus file must sound where the file has it. Chrome's decoder drops the
// pre-skip again after a seek; WebM rounds timestamps to the millisecond. The reference is ffmpeg's straight decode of
// the whole file, sliced at the clip's in-point. Needs Chrome 157 (`uberscene browser install`).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { manifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, renderVideo } from "../../src";
import { decodeAudio } from "../helpers/output";

const RATE = 48000;

/** The file decoded start to end by ffmpeg, mono, at 48 kHz. */
function reference(file: string): Float32Array {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vn", "-ac", "1", "-f", "f32le", "-"], {
    maxBuffer: 1 << 30,
  });
  return new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
}

/** The lag, within ±`span` samples, at which `mix[a..b)` best matches `ref` from `start`, and its peak error there. */
function align(mix: Float32Array, ref: Float32Array, start: number, a: number, b: number, span = 600) {
  let best = { lag: 0, err: Infinity, peak: 0 };
  for (let lag = -span; lag <= span; lag++) {
    let err = 0,
      peak = 0;
    for (let i = a; i < b; i++) {
      const d = (mix[i] as number) - (ref[start + i + lag] as number);
      err += d * d;
      peak = Math.max(peak, Math.abs(d));
    }
    if (err < best.err) best = { lag, err, peak };
  }
  return best;
}

describe("the soundtrack of a clip that starts mid-file", () => {
  let dir = "";
  beforeAll(() => {
    generateMedia();
    dir = mkdtempSync(join(tmpdir(), "uberscene-timing-"));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  // The tones are pure, so a lag is only told apart within half a period: the span stays inside it (440 Hz: 109
  // samples, 660 Hz: 73) and each case starts at in-points that are not a whole period apart.
  it.each([
    ["WebM", "bars", "bars.webm", `<Clip id="c" src="asset:bars" in={IN} out={OUT} />`],
    ["Ogg", "tone", "tone.ogg", `<Audio id="c" src="asset:tone" start={0} in={IN} out={OUT} />`],
  ])("lines up with ffmpeg's decode for %s Opus", async (_name, _asset, file, element) => {
    const ref = reference(join(mediaDir, file));
    for (const at of [0, 2.5, 6, 6.0123]) {
      const sub = mkdtempSync(join(dir, "cut-"));
      writeFileSync(join(sub, "uberscene.json"), JSON.stringify(manifest));
      writeFileSync(
        join(sub, "cut.tsx"),
        `import { Audio, Clip, Composition, Track } from "@uberscene/kit";
export default function Video() {
  return (
    <Composition fps={30} width={64} height={36}>
      <Track id="main">${element.replace("IN", String(at)).replace("OUT", String(at + 1))}</Track>
    </Composition>
  );
}
`,
      );
      const video = await loadVideo(join(sub, "cut.tsx"));
      const out = join(sub, "out.wav");
      await renderVideo({
        state: video.state,
        source: video.source,
        media: directoryResolver(mediaDir, video.manifest),
        out,
      });
      const mix = decodeAudio(out);
      // The mix is the file at full volume, panned centre: compare the shape, scaled to the reference's level.
      let mr = 0,
        rr = 0;
      const s0 = Math.round(at * RATE);
      for (let i = 4800; i < 43200; i++) {
        mr += (mix[i] as number) ** 2;
        rr += (ref[s0 + i] as number) ** 2;
      }
      const k = Math.sqrt(rr / mr);
      const scaled = mix.map((x) => x * k);
      const span = file.endsWith(".ogg") ? 36 : 54;
      const { lag, peak } = align(scaled, ref, s0, 4800, 43200, span);
      expect({ at, lag }).toEqual({ at, lag: 0 });
      expect(peak, `at ${at}`).toBeLessThan(0.01);
    }
  });
});
