import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { directoryResolver, loadVideo } from "../src";
import { FrameKeys, readCached, writeCached } from "../src/frame-cache";
import { blankPicture, decodePng, encodePng, paste } from "../src/png";

const scratch = join(import.meta.dirname, ".tmp", "frame-cache");
let dir = "";

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "k-"));
  for (const name of ["a.mp4", "b.mp4", "look.cube"]) writeFileSync(join(dir, name), name);
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const MANIFEST = `export const manifest = { assets: {
  a: { id: "a", kind: "video", duration: 10, fps: 30, width: 640, height: 360 },
  b: { id: "b", kind: "video", duration: 10, fps: 30, width: 640, height: 360 },
} };`;

/** A two-clip cut: a title over the first clip, an effect on the second, and whatever `more` adds to the text track. */
const video = (o: { title?: string; out?: number; stops?: number; more?: string; top?: string; fps?: number } = {}) => `
import { Clip, Composition, Effect, Layer, Title, Track, useLayer } from "@cutcraft/kit";
${MANIFEST}
${o.top ?? ""}
export default function Video() {
  return (
    <Composition fps={${o.fps ?? 30}} width={640} height={360}>
      <Track id="main">
        <Clip id="first" src="asset:a" in={0} out={2} />
        <Clip id="second" src="asset:b" in={0} out={${o.out ?? 2}}>
          <Effect id="lift" type="exposure" params={{ stops: ${o.stops ?? 0.5} }} />
        </Clip>
      </Track>
      <Track id="text" layout="free">
        <Title id="name" start={0.5} duration={1}>${o.title ?? "Hello"}</Title>
        ${o.more ?? ""}
      </Track>
    </Composition>
  );
}`;

let n = 0;
async function keysOf(source: string, frames: readonly number[]): Promise<string[]> {
  const file = join(dir, `v${n++}.tsx`);
  writeFileSync(file, source);
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  const keys = new FrameKeys({
    state: loaded.state,
    source: { ...loaded.source, executablePath: "/chrome" },
    media: directoryResolver(dir, loaded.manifest),
  });
  return Promise.all(frames.map((f) => keys.key(f)));
}

// Frame 6: the first clip alone. Frame 30: the first clip under the title. Frame 90: the second clip.
const FRAMES = [6, 30, 90];
const changed = async (a: string, b: string) => {
  const [x, y] = [await keysOf(a, FRAMES), await keysOf(b, FRAMES)];
  return FRAMES.filter((_, i) => x[i] !== y[i]);
};

describe("frame keys", () => {
  it("are the same for the same file, and differ from frame to frame", async () => {
    const [a, b] = [await keysOf(video(), FRAMES), await keysOf(video(), FRAMES)];
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(3);
    expect(a[0]).toMatch(/^[0-9a-f]{40}$/);
  });

  it("an edit changes the keys of the frames it draws, and no others", async () => {
    // The title's words: only the frame under the title.
    expect(await changed(video(), video({ title: "Goodbye" }))).toEqual([30]);
    // An effect on the second clip: only the second clip's frame.
    expect(await changed(video(), video({ stops: 1 }))).toEqual([90]);
    // The second clip's length: its own frames (its range changed), not the first clip's.
    expect(await changed(video(), video({ out: 3 }))).toEqual([90]);
    // A new overlay later on: no frame before it.
    expect(await changed(video(), video({ more: `<Title id="late" start={3.5} duration={0.4}>Late</Title>` }))).toEqual(
      [],
    );
    // The composition's settings: every frame.
    expect(await changed(video(), video({ fps: 25 }))).toEqual(FRAMES);
  });

  it("a comment or a helper nobody draws changes nothing, until free code is on screen", async () => {
    const helper = "const unused = 1;";
    expect(await changed(video(), video({ top: helper }))).toEqual([]);
    // With a layer up at frame 30, the file's text decides that frame: its code can read anything in the file.
    const layer = `<Layer id="count" start={0.9} duration={0.3}><Count /></Layer>`;
    const count = (label: string) =>
      `function Count() { const { elapsed } = useLayer(); return <div>${label} {elapsed}</div>; }`;
    expect(await changed(video({ more: layer, top: count("a") }), video({ more: layer, top: count("b") }))).toEqual([
      30,
    ]);
    expect(
      await changed(video({ more: layer, top: count("a") }), video({ more: layer, top: `${count("a")}\n${helper}` })),
    ).toEqual([30]);
  });

  it("a media file that was replaced changes the frames that read it", async () => {
    const before = await keysOf(video(), FRAMES);
    utimesSync(join(dir, "b.mp4"), new Date(), new Date(Date.now() + 5000));
    const after = await keysOf(video(), FRAMES);
    expect(FRAMES.filter((_, i) => before[i] !== after[i])).toEqual([90]);
  });

  it("what is stored under a key is part of it", async () => {
    const file = join(dir, "extra.tsx");
    writeFileSync(file, video());
    const loaded = await loadVideo(file);
    const keys = new FrameKeys({
      state: loaded.state,
      source: loaded.source,
      media: directoryResolver(dir, loaded.manifest),
    });
    const [plain, tile, wider] = await Promise.all([
      keys.key(6),
      keys.key(6, { tile: 480 }),
      keys.key(6, { tile: 640 }),
    ]);
    expect(new Set([plain, tile, wider]).size).toBe(3);
  });
});

describe("the cache folder", () => {
  it("gives back what was kept, and nothing for what was not", () => {
    const cache = join(dir, "cache", "deep");
    expect(readCached(cache, "a.png")).toBeNull();
    writeCached(cache, "a.png", Uint8Array.from([1, 2, 3]));
    expect([...(readCached(cache, "a.png") ?? [])]).toEqual([1, 2, 3]);
  });

  it("a folder that cannot be written is not an error", () => {
    writeFileSync(join(dir, "blocked"), "a file, not a folder");
    expect(() => writeCached(join(dir, "blocked", "cache"), "a.png", Uint8Array.from([1]))).not.toThrow();
  });
});

describe("the PNG reader and writer", () => {
  it("round-trips a picture, and pastes one into another", () => {
    const sheet = blankPicture(6, 4, [10, 20, 30]);
    const part = blankPicture(2, 2, [200, 100, 50]);
    paste(sheet, part, 3, 1);
    const back = decodePng(encodePng(sheet));
    expect([back.width, back.height]).toEqual([6, 4]);
    expect([...back.rgba]).toEqual([...sheet.rgba]);
    const at = (x: number, y: number) => [...back.rgba.subarray((y * 6 + x) * 4, (y * 6 + x) * 4 + 4)];
    expect(at(0, 0)).toEqual([10, 20, 30, 255]);
    expect(at(3, 1)).toEqual([200, 100, 50, 255]);
    expect(at(4, 2)).toEqual([200, 100, 50, 255]);
    expect(at(5, 1)).toEqual([10, 20, 30, 255]);
  });

  it("says what it does not read", () => {
    expect(() => decodePng(Uint8Array.from([1, 2, 3]))).toThrow("not a PNG");
  });
});
