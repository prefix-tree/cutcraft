import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import generateMedia, { mediaDir } from "../../player/e2e/gen-media";
import { manifest } from "../../player/e2e/app/composition";
import { directoryResolver, loadVideo, renderVideo } from "../src";
import { decodeFrames, decodesClean, probe, readStrip } from "./helpers/output";

// bars.webm: 640x360 at 30 fps, VP9, a keyframe every 30 frames, its frame number painted in a strip.
const scratch = join(import.meta.dirname, ".tmp", "copy");
let dir = "";

function source(body: string, comp = 'fps={30} width={640} height={360}'): string {
  return `import { Clip, Composition, Title, Track } from "@cutcraft/kit";
export const manifest = ${JSON.stringify(manifest)};
export default function Video() {
  return (
    <Composition ${comp}>
      ${body}
    </Composition>
  );
}
`;
}

let n = 0;
async function render(body: string, extra: Record<string, unknown> = {}, comp?: string) {
  const file = join(dir, `v${n++}.tsx`);
  writeFileSync(file, source(body, comp));
  const loaded = await loadVideo(file);
  const out = join(dir, `out${n}.webm`);
  const result = await renderVideo({ state: loaded.state, media: directoryResolver(mediaDir, loaded.manifest), interiors: loaded.interiors, out, keyFrameInterval: 1, bitrate: 4_000_000, silent: true, ...extra });
  return { result, out };
}

function packets(file: string): { size: number; key: boolean }[] {
  const text = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=size,flags", "-of", "csv=p=0", file], { encoding: "utf8" });
  return text.trim().split("\n").map((l) => { const [size, flags] = l.split(","); return { size: Number(size), key: (flags ?? "").includes("K") }; });
}

async function strips(file: string): Promise<number[]> {
  const out: number[] = [];
  await decodeFrames(file, (frame) => { out.push(readStrip(frame)); });
  return out;
}

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "c-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const CLIP = '<Track id="main"><Clip id="c" src="asset:bars" in={2.2} out={6.1} /></Track>';

describe("smart copy", () => {
  it("copies whole groups of pictures and renders the ends, with every frame right", async () => {
    const { result, out } = await render(CLIP, { smartCopy: true });
    // Source frames 66-182 are shown; the keyframes at 90 and 180 bound the copy: output frames 24-113.
    expect(result.copiedFrames).toBe(90);
    expect(probe(out)).toMatchObject({ codec: "vp9", frames: 117, fps: 30 });
    decodesClean(out);
    expect(await strips(out)).toEqual(Array.from({ length: 117 }, (_, k) => 66 + k));
  });

  it("copies the packets as they are", async () => {
    const { out } = await render(CLIP, { smartCopy: true });
    const copied = packets(out).slice(24, 114);
    const original = packets(join(mediaDir, "bars.webm")).slice(90, 180);
    expect(copied).toEqual(original);
    expect(packets(out)[24]?.key).toBe(true);
  });

  it("renders the same pictures as a render without copying", async () => {
    const plain = await render(CLIP, { smartCopy: false });
    expect(plain.result.copiedFrames).toBe(0);
    expect(await strips(plain.out)).toEqual(Array.from({ length: 117 }, (_, k) => 66 + k));
  });

  it("copies around a title: only the stretches nothing is drawn over", async () => {
    const { result, out } = await render(`<Track id="main"><Clip id="c" src="asset:bars" in={2.2} out={6.1} /></Track><Track id="o"><Title id="t" anchor="c" offset={1} duration={1} size={30}>Hi</Title></Track>`, { smartCopy: true });
    // The title covers output frames 30-59. Source keyframes at 150 and 180 bound a copy of output frames 84-113.
    expect(result.copiedFrames).toBe(30);
    expect(probe(out).frames).toBe(117);
    decodesClean(out);
    expect(await strips(out)).toEqual(Array.from({ length: 117 }, (_, k) => 66 + k));
  });

  it("joins several cuts, copying inside each", async () => {
    const { result, out } = await render('<Track id="main"><Clip id="a" src="asset:bars" in={1} out={3} /><Clip id="b" src="asset:bars" in={5.5} out={8} /></Track>', { smartCopy: true });
    // a: source 30-89 is two whole groups, copied. b: 165-239 has keyframes at 180 and 210: copy 180-209, 210-239 ends at the clip's end.
    expect(result.copiedFrames).toBe(60 + 60);
    expect(await strips(out)).toEqual([...Array.from({ length: 60 }, (_, k) => 30 + k), ...Array.from({ length: 75 }, (_, k) => 165 + k)]);
    decodesClean(out);
  });

  it("falls back to rendering when the picture is touched", async () => {
    const touched = [
      '<Track id="main"><Clip id="c" src="asset:bars" in={1} out={4} transform={{ scale: 1.1 }} /></Track>',
      '<Track id="main"><Clip id="c" src="asset:bars" in={1} out={4} speed={2} /></Track>',
      '<Track id="main"><Clip id="c" src="asset:bars" in={1} out={4} transform={{ opacity: 0.9 }} /></Track>',
      '<Track id="main"><Clip id="c" src="asset:bars" in={1} out={4} fit="contain" transform={{ crop: { x: 0, y: 0, width: 0.5, height: 1 } }} /></Track>',
    ];
    for (const body of touched) expect((await render(body, { smartCopy: true })).result.copiedFrames, body).toBe(0);
  });

  it("does not copy a source of another frame rate or size", async () => {
    const body = '<Track id="main"><Clip id="c" src="asset:bars" in={1} out={4} /></Track>';
    expect((await render(body, { smartCopy: true, to: 1 }, 'fps={60} width={640} height={360}')).result.copiedFrames).toBe(0);
    expect((await render(body, { smartCopy: true, to: 1 }, 'fps={30} width={320} height={180}')).result.copiedFrames).toBe(0);
  });

  it("does not copy into a codec the source is not in", async () => {
    expect((await render(CLIP, { smartCopy: true, videoCodec: "vp8", to: 2 })).result.copiedFrames).toBe(0);
  });

  it("works together with workers", async () => {
    const file = join(dir, "par.tsx");
    writeFileSync(file, source('<Track id="main"><Clip id="a" src="asset:bars" in={1} out={3} /><Clip id="b" src="asset:bars" in={5.5} out={8} /></Track><Track id="o"><Title id="t" anchor="b" offset={0.5} duration={1} size={30}>Hi</Title></Track>'));
    const loaded = await loadVideo(file);
    const out = join(dir, "par-copy.webm");
    const result = await renderVideo({ state: loaded.state, media: directoryResolver(mediaDir, loaded.manifest), interiors: loaded.interiors, out, keyFrameInterval: 1, bitrate: 4_000_000, silent: true, smartCopy: true, parallel: { file, mediaDir, workers: 2, segmentFrames: 30 } });
    expect(result.copiedFrames).toBeGreaterThan(0);
    expect(await strips(out)).toEqual([...Array.from({ length: 60 }, (_, k) => 30 + k), ...Array.from({ length: 75 }, (_, k) => 165 + k)]);
    decodesClean(out);
  });
});

