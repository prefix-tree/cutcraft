// `renderLook`: many frames from one browser start, on one sheet, each cell the frame a still draws at that time.
// Needs a Chrome or Chromium 153+ in CUTCRAFT_CHROMIUM.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { manifest as mediaManifest } from "../../../player/e2e/app/composition";
import generateMedia, { mediaDir } from "../../../player/e2e/gen-media";
import { directoryResolver, loadVideo, MAX_LOOK_CELLS, renderLook, renderStill } from "../../src";
import { readImage } from "../helpers/output";

const scratch = join(import.meta.dirname, "..", ".tmp", "look");
let dir = "";

beforeAll(() => {
  generateMedia();
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "l-"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const W = 320,
  H = 180,
  GAP = 8,
  BAND = 44;

/** A two-clip cut with a crossfade, a title over the first clip and an effect on it; parts can be left out. */
const video = (
  options: { effect?: boolean; title?: boolean; words?: string } = {},
) => `import { Clip, Composition, Effect, Title, Track, Transition } from "@cutcraft/kit";
export const manifest = ${JSON.stringify({ assets: mediaManifest.assets })};
export default function Video() {
  return (
    <Composition fps={30} width={${W}} height={${H}} background={{ mode: "color", color: "#000000" }}>
      <Track id="main">
        <Clip id="bars" src="asset:bars" in={0} out={2} fit="cover">
          ${options.effect === false ? "" : `<Effect id="invert" type="invert" params={{ amount: 1 }} />`}
        </Clip>
        <Transition id="x1" type="crossfade" duration={0.4} />
        <Clip id="solid" src="asset:solid" in={0} out={1.4} fit="cover" />
      </Track>
      <Track id="text" layout="free">
        ${options.title === false ? "" : `<Title id="point" start={0.2} duration={1} size={40} enter={{ type: "none" }} exit={{ type: "none" }}>${options.words ?? "Point"}</Title>`}
      </Track>
    </Composition>
  );
}
`;

async function load(name: string, source: string) {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(file, source);
  const loaded = await loadVideo(file);
  expect(loaded.state.errors).toEqual([]);
  return { ...loaded, media: directoryResolver(mediaDir, loaded.manifest) };
}

async function still(name: string, source: string, time: number) {
  const v = await load(name, source);
  const out = join(dir, `${name}-${time}.png`);
  await renderStill({ state: v.state, source: v.source, media: v.media, out, time });
  return readImage(out);
}

type Image = ReturnType<typeof readImage>;

/** The share of channel values of a sheet's cell that are off a frame by more than 2, and the largest difference. */
function cellDifference(sheet: Image, column: number, row: number, frame: Image): { off: number; max: number } {
  const x0 = GAP + column * (W + GAP),
    y0 = GAP + row * (H + BAND + GAP);
  let off = 0,
    max = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      for (let c = 0; c < 3; c++) {
        const d = Math.abs(
          (sheet.rgba[((y0 + y) * sheet.width + x0 + x) * 4 + c] as number) -
            (frame.rgba[(y * W + x) * 4 + c] as number),
        );
        if (d > 2) off++;
        if (d > max) max = d;
      }
  return { off: off / (W * H * 3), max };
}
const same = (d: { off: number; max: number }) => d.off <= 0.002 && d.max <= 32;

it("draws each moment as the still at that time, and says what each cell is", async () => {
  const v = await load("plain", video());
  const out = join(dir, "plain.png");
  const result = await renderLook({
    state: v.state,
    source: v.source,
    media: v.media,
    out,
    at: "0.5,point.end,2.5",
    cell: W,
  });
  expect(result.errors).toEqual([]);
  expect(result).toMatchObject({ sheet: out, columns: 3, width: 3 * W + 4 * GAP, height: H + BAND + 2 * GAP });
  expect(result.cells.map((c) => [c.index, c.row, c.column, c.label, c.frame, c.seen])).toEqual([
    [0, 0, 0, "0.5", 15, ["point", "bars"]],
    [1, 0, 1, "point.end", 35, ["point", "bars"]],
    [2, 0, 2, "2.5", 75, ["solid"]],
  ]);
  const sheet = readImage(out);
  expect([sheet.width, sheet.height]).toEqual([result.width, result.height]);
  for (const cell of result.cells)
    expect({
      cell: cell.label,
      same: same(cellDifference(sheet, cell.column, 0, await still("plain", video(), cell.time))),
    }).toEqual({
      cell: cell.label,
      same: true,
    });
});

it("draws a frame with and without an effect, side by side", async () => {
  const v = await load("fx", video());
  const out = join(dir, "fx.png");
  const result = await renderLook({
    state: v.state,
    source: v.source,
    media: v.media,
    out,
    at: "0.5",
    without: "invert",
    cell: W,
  });
  expect(result.cells.map((c) => [c.column, c.variant])).toEqual([
    [0, "with"],
    [1, "without"],
  ]);
  const sheet = readImage(out);
  // With: the file as written. Without: the same file with the effect deleted.
  expect(same(cellDifference(sheet, 0, 0, await still("fx", video(), 0.5)))).toBe(true);
  expect(same(cellDifference(sheet, 1, 0, await still("fx-none", video({ effect: false }), 0.5)))).toBe(true);
  expect(cellDifference(sheet, 1, 0, await still("fx", video(), 0.5)).max).toBeGreaterThan(64);
});

it("draws a frame with and without an overlay, and leaves it out of what the cell sees", async () => {
  const v = await load("title", video());
  const out = join(dir, "title.png");
  const result = await renderLook({
    state: v.state,
    source: v.source,
    media: v.media,
    out,
    at: "point",
    without: "point",
    cell: W,
  });
  expect(result.cells.map((c) => c.seen)).toEqual([["point", "bars"], ["bars"]]);
  const sheet = readImage(out);
  expect(same(cellDifference(sheet, 0, 0, await still("title", video(), 0.7)))).toBe(true);
  expect(same(cellDifference(sheet, 1, 0, await still("title-none", video({ title: false }), 0.7)))).toBe(true);
});

it("looks around a transition: before, across and after it, and writes each frame when asked", async () => {
  const v = await load("around", video());
  const frames = join(dir, "frames");
  const result = await renderLook({
    state: v.state,
    source: v.source,
    media: v.media,
    out: join(dir, "around.png"),
    around: "x1",
    frames,
  });
  expect(result.cells.map((c) => [c.label, c.frame])).toEqual([
    ["x1.before", 47],
    ["x1.start", 48],
    ["x1.mid", 54],
    ["x1.end", 59],
    ["x1.after", 60],
  ]);
  expect(result.columns).toBe(4);
  expect(result.cells[4]).toMatchObject({ row: 1, column: 0 });
  const first = result.cells[0]?.file as string;
  expect(first.endsWith("00-f47.png")).toBe(true);
  const kept = readImage(first);
  expect([kept.width, kept.height]).toEqual([W, H]);
});

it("with nothing asked, skims the cut: each clip's first frame, both sides of the cut, each overlay", async () => {
  const v = await load("skim", video());
  const result = await renderLook({ state: v.state, source: v.source, media: v.media, out: join(dir, "skim.png") });
  expect(result.cells.map((c) => c.label)).toEqual(["bars.start", "point.mid", "x1.before", "x1.mid", "x1.after"]);
});

it("draws the moments it can and reports the ones it cannot", async () => {
  const v = await load("part", video());
  const out = join(dir, "part.png");
  const result = await renderLook({ state: v.state, source: v.source, media: v.media, out, at: "1,nope" });
  expect(result.cells).toHaveLength(1);
  expect(result.errors).toEqual(['nope: the file has no element with the id "nope"']);
  expect(existsSync(out)).toBe(true);
});

it("refuses what it cannot draw, before starting a browser", async () => {
  const v = await load("refuse", video());
  const base = { state: v.state, source: { ...v.source, executablePath: "/nonexistent/chrome" }, media: v.media };
  const out = join(dir, "refuse.png");
  await expect(renderLook({ ...base, out, without: "bars" })).rejects.toThrow(
    "a clip cannot be left out without moving the cut",
  );
  await expect(renderLook({ ...base, out, without: "nope" })).rejects.toThrow('no element with the id "nope"');
  await expect(renderLook({ ...base, out, at: "0..3/0.04" })).rejects.toThrow(`at most ${MAX_LOOK_CELLS}`);
  await expect(renderLook({ ...base, out, at: "1", around: "x1" })).rejects.toThrow("--at or --around, not both");
  const none = await renderLook({ ...base, out, at: "nope" });
  expect(none.sheet).toBeNull();
  expect(existsSync(out)).toBe(false);
});

describe("with a cache folder", () => {
  it("draws a sheet once: the same look again reads every cell, and gives the same sheet", async () => {
    const v = await load("cache", video());
    const cacheDir = join(dir, "cache-a");
    const base = { state: v.state, source: v.source, media: v.media, at: "0.5,point.end,2.5", cell: W };
    const first = await renderLook({ ...base, out: join(dir, "c1.png"), cacheDir });
    expect(first.cached).toBe(0);
    const second = await renderLook({ ...base, out: join(dir, "c2.png"), cacheDir });
    expect(second.cached).toBe(3);
    expect(readFileSync(join(dir, "c2.png")).equals(readFileSync(join(dir, "c1.png")))).toBe(true);
    // And it is the sheet drawn with no cache at all.
    const plain = await renderLook({ ...base, out: join(dir, "c3.png") });
    expect(plain.cached).toBe(0);
    expect(readFileSync(join(dir, "c3.png")).equals(readFileSync(join(dir, "c1.png")))).toBe(true);
    expect(second.cells).toEqual(first.cells);
  });

  it("after an edit, draws again only the cells the edit changed, and never shows a stale one", async () => {
    const cacheDir = join(dir, "cache-b");
    const look = async (name: string, source: string) => {
      const v = await load(name, source);
      const out = join(dir, `${name}.png`);
      const result = await renderLook({
        state: v.state,
        source: v.source,
        media: v.media,
        out,
        cacheDir,
        at: "0.5,2.5",
        cell: W,
      });
      return { result, sheet: readImage(out) };
    };
    await look("edit-before", video());
    // The title's words change: the cell under the title is drawn again, the cell after it is not.
    const after = await look("edit-after", video({ words: "Other" }));
    expect(after.result.cached).toBe(1);
    expect(same(cellDifference(after.sheet, 0, 0, await still("edit-after", video({ words: "Other" }), 0.5)))).toBe(
      true,
    );
    expect(same(cellDifference(after.sheet, 0, 0, await still("edit-before", video(), 0.5)))).toBe(false);
    // Back to the first file: both cells are still there from the first look.
    expect((await look("edit-back", video())).result.cached).toBe(2);
  });

  it("keeps full frames too when they are asked for", async () => {
    const v = await load("frames-cache", video());
    const cacheDir = join(dir, "cache-c");
    const base = { state: v.state, source: v.source, media: v.media, at: "0.5", cell: W, cacheDir };
    const first = await renderLook({ ...base, out: join(dir, "f1.png"), frames: join(dir, "f1") });
    const second = await renderLook({ ...base, out: join(dir, "f2.png"), frames: join(dir, "f2") });
    expect([first.cached, second.cached]).toEqual([0, 1]);
    expect(readFileSync(second.cells[0]?.file as string).equals(readFileSync(first.cells[0]?.file as string))).toBe(
      true,
    );
    // A cell kept without its frame is drawn again when the frame is wanted.
    await renderLook({ ...base, at: "2.5", out: join(dir, "f3.png") });
    const wanted = await renderLook({ ...base, at: "2.5", out: join(dir, "f4.png"), frames: join(dir, "f4") });
    expect(wanted.cached).toBe(0);
  });

  it("a still is read back the same way, and drawn again when its frame changes", async () => {
    const cacheDir = join(dir, "cache-d");
    const draw = async (name: string, source: string) => {
      const v = await load(name, source);
      const out = join(dir, `${name}-still.png`);
      const result = await renderStill({ state: v.state, source: v.source, media: v.media, out, time: 0.5, cacheDir });
      return { cached: result.cached, bytes: readFileSync(out) };
    };
    const first = await draw("s1", video());
    const second = await draw("s2", video());
    expect([first.cached, second.cached]).toEqual([false, true]);
    expect(second.bytes.equals(first.bytes)).toBe(true);
    const edited = await draw("s3", video({ words: "Other" }));
    expect(edited.cached).toBe(false);
    expect(edited.bytes.equals(first.bytes)).toBe(false);
  });
});

it("writes a sheet as a PNG only", async () => {
  const v = await load("jpg", video());
  await expect(
    renderLook({ state: v.state, source: v.source, media: v.media, out: join(dir, "sheet.jpg") }),
  ).rejects.toThrow("a sheet is a PNG");
});

describe("--listen", () => {
  const LISTEN = 132;
  // bars carries a 440 Hz tone and plays from 0 to 2 s; solid has no sound and plays to 3 s.
  const spoken = (volume?: number) => {
    const assets = {
      ...mediaManifest.assets,
      bars: {
        ...mediaManifest.assets.bars,
        transcript: {
          words: [
            { i: 0, text: "one", start: 0.2, end: 0.6 },
            { i: 1, text: "two", start: 1, end: 1.4 },
            { i: 2, text: "late", start: 5, end: 5.4 },
          ],
        },
      },
    };
    return video()
      .replace(JSON.stringify({ assets: mediaManifest.assets }), JSON.stringify({ assets }))
      .replace(`fit="cover">`, `fit="cover"${volume === undefined ? "" : ` volume={${volume}}`}>`);
  };
  const listen = async (name: string, source: string, stretch: string, more: { cacheDir?: string } = {}) => {
    const v = await load(name, source);
    const out = join(dir, `${name}.png`);
    const result = await renderLook({
      state: v.state,
      source: v.source,
      media: v.media,
      out,
      at: "0.5,2.5",
      cell: W,
      listen: stretch,
      ...more,
    });
    expect(result.errors).toEqual([]);
    return { result, out };
  };

  it("puts the sound of the stretch under the cells, and says how loud it is and where it is silent", async () => {
    const { result, out } = await listen("hear", spoken(), "all");
    const cellsHeight = H + BAND + 2 * GAP;
    expect(result.height).toBe(cellsHeight + LISTEN + GAP);
    expect(result.listen).toMatchObject({
      from: 0,
      to: 3,
      strip: { x: GAP, y: cellsHeight, width: 2 * W + GAP, height: LISTEN },
    });
    const heard = result.listen as NonNullable<typeof result.listen>;
    // The words the cut plays, not the one after the clip's out point.
    expect(heard.words.map((w) => [w.i, w.text, w.start, w.clip])).toEqual([
      [0, "one", 0.2, "bars"],
      [1, "two", 1, "bars"],
    ]);
    expect(heard.peakDb).toBeGreaterThan(-30);
    expect(heard.peakDb).toBeLessThanOrEqual(0);
    expect(heard.rmsDb).toBeLessThan(heard.peakDb as number);
    // The tone ends with its clip; what follows is silent to the end.
    expect(heard.silences).toHaveLength(1);
    const [from, to] = heard.silences[0] as readonly [number, number];
    expect(from).toBeGreaterThan(1.5);
    expect(from).toBeLessThan(2.1);
    expect(to).toBeCloseTo(3, 1);
    // The strip is drawn: its rows are not all the sheet's ground.
    const sheet = readImage(out);
    expect([sheet.width, sheet.height]).toEqual([result.width, result.height]);
    const colours = new Set<number>();
    for (let y = heard.strip.y; y < heard.strip.y + LISTEN; y++)
      for (let x = GAP; x < GAP + heard.strip.width; x += 3) {
        const o = (y * sheet.width + x) * 4;
        colours.add(
          ((sheet.rgba[o] as number) << 16) | ((sheet.rgba[o + 1] as number) << 8) | (sheet.rgba[o + 2] as number),
        );
      }
    expect(colours.size).toBeGreaterThan(4);
  });

  it("hears a quieter clip as quieter", async () => {
    const full = (await listen("loud", spoken(), "0..1.5")).result.listen;
    const half = (await listen("quiet", spoken(0.5), "0..1.5")).result.listen;
    expect(full?.silences).toEqual([]);
    expect((full?.peakDb as number) - (half?.peakDb as number)).toBeCloseTo(6.02, 0);
    expect((full?.rmsDb as number) - (half?.rmsDb as number)).toBeCloseTo(6.02, 0);
  });

  it("takes an element's id for the time it is on, and reports a silent stretch as silent", async () => {
    const heard = (await listen("part", spoken(), "solid")).result.listen;
    expect(heard).toMatchObject({ from: 1.6, to: 3, words: [] });
    const quiet = (await listen("mute", spoken(), "2.2..3")).result.listen;
    expect(quiet).toMatchObject({ peakDb: null, rmsDb: null, silences: [[2.2, 3]] });
  });

  it("refuses a stretch it cannot find", async () => {
    const v = await load("bad", spoken());
    const run = (stretch: string) =>
      renderLook({ state: v.state, source: v.source, media: v.media, out: join(dir, "bad.png"), listen: stretch });
    await expect(run("nothing")).rejects.toThrow('no element with the id "nothing"');
    await expect(run("2..9")).rejects.toThrow("outside the video");
    await expect(run("1.5")).rejects.toThrow("not a stretch");
  });

  it("keeps the strip in the cache, and hears again when the file changes", async () => {
    const cacheDir = join(dir, "cache-listen");
    const first = await listen("k1", spoken(), "all", { cacheDir });
    const names = () =>
      readdirSync(cacheDir)
        .filter((n) => n.startsWith("listen-"))
        .sort();
    const kept = names();
    expect(kept).toHaveLength(2);
    const second = await listen("k2", spoken(), "all", { cacheDir });
    expect(second.result.cached).toBe(2);
    expect(second.result.listen).toEqual(first.result.listen);
    expect(readFileSync(second.out).equals(readFileSync(first.out))).toBe(true);
    expect(names()).toEqual(kept);
    const quieter = await listen("k3", spoken(0.5), "all", { cacheDir });
    expect(names()).toHaveLength(4);
    expect(quieter.result.listen?.peakDb).toBeLessThan(first.result.listen?.peakDb as number);
  });
});
