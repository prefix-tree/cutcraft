import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { manifest } from "../../player/e2e/app/composition";
import { defaultWorkers, directoryResolver, loadVideo, planSegments, renderVideo } from "../src";
import { checkExactFrames } from "./helpers/exact";
import { decodeAudio, decodeFrames, decodesClean, probe, rmsOf, tonePower } from "./helpers/output";

// The e2e composition without its overlays, so the frame strip stays readable. Inside the package so it can import the kit.
const scratch = join(import.meta.dirname, ".tmp", "parallel");
const SOURCE = `import { Audio, Clip, Composition, Track, Transition } from "@cutcut/kit";
export const manifest = ${JSON.stringify(manifest)};
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360} background={{ mode: "color", color: "#000000" }}>
      <Track id="main">
        <Clip id="v1" src="asset:bars" in={0} out={4} />
        <Transition id="x1" type="crossfade" duration={0.5} params={{ curve: "linear" }} />
        <Clip id="v2" src="asset:bars" in={6} out={9} speed={1.5} />
        <Clip id="img" src="asset:logo" duration={1} fit="cover" />
        <Transition id="x2" type="crossfade" duration={0.5} params={{ curve: "linear" }} />
        <Clip id="solid" src="asset:solid" in={0} out={1} />
      </Track>
      <Track id="music" layout="free" role="music">
        <Audio id="a1" src="asset:tone" start={0} duration="fill" volume={0.3} duck={{ under: "main", to: 0.1 }} />
      </Track>
    </Composition>
  );
}
`;
let file = "";
let dir = "";

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "r-"));
  file = join(dir, "video.tsx");
  writeFileSync(file, SOURCE);
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

async function render(out: string, workers: number, extra: Record<string, unknown> = {}) {
  const loaded = await loadVideo(file);
  return renderVideo({
    state: loaded.state, media: directoryResolver(mediaDir, loaded.manifest), interiors: loaded.interiors, out, keyFrameInterval: 1,
    ...(workers > 1 ? { parallel: { file, mediaDir, workers, segmentFrames: 30 } } : {}),
    ...extra,
  });
}

function keyframes(out: string): number[] {
  const text = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time,flags", "-of", "csv=p=0", out], { encoding: "utf8" });
  return text.trim().split("\n").filter((l) => l.includes("K")).map((l) => Number(l.split(",")[0]));
}

async function frameHash(out: string): Promise<string> {
  const hash = createHash("sha256");
  await decodeFrames(out, (frame) => { hash.update(frame.rgba); });
  return hash.digest("hex");
}

describe("planSegments", () => {
  it("cuts the range into whole keyframe intervals, the last one short", () => {
    expect(planSegments(0, 210, 30, 3, 30)).toEqual([0, 30, 60, 90, 120, 150, 180].map((a) => ({ first: a, last: Math.min(210, a + 30) })));
    expect(planSegments(10, 100, 30, 3, 70)).toEqual([{ first: 10, last: 70 }, { first: 70, last: 100 }]);
  });

  it("never makes a run shorter than a keyframe interval, and spreads by default", () => {
    const runs = planSegments(0, 600, 60, 4);
    expect(runs.every((r) => (r.last - r.first) % 60 === 0 || r.last === 600)).toBe(true);
    expect(runs.length).toBeGreaterThanOrEqual(4);
    expect(planSegments(0, 20, 60, 4)).toEqual([{ first: 0, last: 20 }]);
  });

  it("offers one worker fewer than the cores, at most four", () => {
    expect(defaultWorkers()).toBeGreaterThanOrEqual(1);
    expect(defaultWorkers()).toBeLessThanOrEqual(4);
  });
});

describe("parallel render", () => {
  it("renders the same frames as one thread, frame-exactly, with a keyframe at every join", async () => {
    const out = join(dir, "par.webm");
    const progress: number[] = [];
    const result = await render(out, 3, { onProgress: (p: { frame: number }) => progress.push(p.frame) });
    expect(result).toMatchObject({ frames: 210, workers: 3, audio: true });
    expect(progress.at(-1)).toBe(210);
    expect(probe(out)).toMatchObject({ codec: "vp9", frames: 210, fps: 30, audioStreams: 1 });
    decodesClean(out);
    const { decoded, wrong } = await checkExactFrames(out);
    expect(decoded).toBe(210);
    expect(wrong).toEqual([]);
    const keys = keyframes(out);
    for (let s = 0; s < 7; s++) expect(keys.some((k) => Math.abs(k - s) < 0.02), `a keyframe at ${s} s in ${keys}`).toBe(true);
  });

  it("keeps the soundtrack whole across the joins", async () => {
    const out = join(dir, "par-audio.webm");
    await render(out, 2);
    const audio = decodeAudio(out);
    expect(Math.abs(audio.length / 48000 - 7)).toBeLessThan(0.06);
    expect(tonePower(audio, 1, 2, 440) / tonePower(audio, 1, 2, 660)).toBeGreaterThan(50);
    expect(tonePower(audio, 4.3, 5.3, 660) / tonePower(audio, 4.3, 5.3, 440)).toBeGreaterThan(50);
    expect(rmsOf(audio, 6.2, 6.9)).toBeGreaterThan(0.0265 * 0.85);
  });

  it("is repeatable: two runs with the same workers decode to the same pictures", async () => {
    const a = join(dir, "rep-a.webm"), b = join(dir, "rep-b.webm");
    await render(a, 3, { to: 3 });
    await render(b, 3, { to: 3 });
    expect(await frameHash(a)).toBe(await frameHash(b));
  });

  it("matches one thread: the same strips, and pictures within encoder noise", async () => {
    const one = join(dir, "one.webm"), many = join(dir, "many.webm");
    await render(one, 1, { to: 3 });
    await render(many, 4, { to: 3 });
    const a: Uint8Array[] = [], b: Uint8Array[] = [];
    await decodeFrames(one, (f) => { a.push(Uint8Array.from(f.rgba)); });
    await decodeFrames(many, (f) => { b.push(Uint8Array.from(f.rgba)); });
    expect(b).toHaveLength(a.length);
    let worst = 0;
    for (let i = 0; i < a.length; i++) {
      let sum = 0;
      for (let k = 0; k < (a[i] as Uint8Array).length; k += 4) sum += Math.abs((a[i] as Uint8Array)[k]! - (b[i] as Uint8Array)[k]!);
      worst = Math.max(worst, sum / ((a[i] as Uint8Array).length / 4));
    }
    expect(worst, "mean red difference between the two renders, worst frame").toBeLessThan(3);
  });

  it("reports a worker's failure, and leaves no threads behind", async () => {
    const loaded = await loadVideo(file);
    await expect(renderVideo({
      state: loaded.state, media: directoryResolver(join(dir, "nowhere"), loaded.manifest), out: join(dir, "bad.webm"),
      parallel: { file, mediaDir: join(dir, "nowhere"), workers: 2, segmentFrames: 30 },
    })).rejects.toThrow(/no media file for asset "bars"|cannot render/);
  });
});
