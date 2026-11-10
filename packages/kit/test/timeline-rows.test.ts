import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { collectModule, resolve, timelineRows } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const dir = join(import.meta.dirname, "..", "..", "..", "examples", "launch-recap");
const state = resolve(
  collectModule(loadModule(readFileSync(join(dir, "video.tsx"), "utf8")) as never),
  JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")),
);
const rows = timelineRows(state);

describe("the timeline as rows", () => {
  it("describes the composition with its frames", () => {
    expect(rows.composition).toMatchObject({ fps: 30, width: 1920, height: 1080, duration: 25.6, frames: 768 });
    expect(rows.tracks.map((t) => [t.id, t.layout])).toEqual([
      ["main", "sequence"],
      ["overlays", "sequence"],
      ["music", "free"],
    ]);
    expect(rows.errors).toEqual([]);
  });

  it("gives each element its seconds, its frames and what it plays or says", () => {
    const row = (id: string) => rows.elements.find((e) => e.id === id);
    expect(row("hook")).toEqual({
      id: "hook",
      kind: "clip",
      track: "main",
      parent: "main",
      start: 0,
      end: 5.2,
      duration: 5.2,
      startFrame: 0,
      endFrame: 156,
      asset: "founder",
      in: 5.6,
      out: 10.8,
      speed: 1,
    });
    expect(row("title")).toMatchObject({ kind: "title", text: "Shed", anchor: "start", offset: 0.4, start: 0.4 });
    expect(row("x1")).toMatchObject({ kind: "transition", type: "crossfade", from: "hook", to: "broll" });
    expect(row("cap-2")).toMatchObject({ kind: "caption", parent: "captions", text: "It should take one file." });
    expect(row("m-close")).toMatchObject({ kind: "marker", start: 17.4, label: "close" });
    // Tracks, effects and keyframes are rows of their own, not elements.
    expect(rows.elements.some((e) => ["track", "composition", "keyframe", "effect"].includes(e.kind))).toBe(false);
  });

  it("puts keyframes at the seconds of the finished video", () => {
    expect(rows.keyframes.find((k) => k.id === "broll-sx1")).toEqual({
      id: "broll-sx1",
      element: "broll",
      property: "transform.scale.x",
      at: 10.8,
      frame: 324,
      value: 1.08,
      easing: "linear",
    });
  });

  it("lists the words the timeline plays, where it plays them", () => {
    expect(rows.words).toHaveLength(25);
    expect(rows.words[0]).toEqual({
      asset: "founder",
      clip: "hook",
      i: 12,
      text: "Small",
      start: 0,
      end: 0.3,
      startFrame: 0,
    });
    expect(rows.words.filter((w) => w.clip === "close").map((w) => w.i)).toEqual([
      40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
    ]);
  });

  it("lists the cuts of the footage, with the transition over each", () => {
    expect(rows.cuts).toEqual([
      { time: 4.8, frame: 144, track: "main", from: "hook", to: "broll", transition: "x1" },
      { time: 10.8, frame: 324, track: "main", from: "broll", to: "demo" },
      { time: 17.4, frame: 522, track: "main", from: "demo", to: "close", transition: "x2" },
      { time: 22.6, frame: 678, track: "main", from: "close", to: "outro" },
    ]);
  });

  it("lists effects in the order they run", () => {
    const graded = resolve(
      collectModule(
        loadModule(`import { Clip, Composition, Effect, Track } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:founder" in={0} out={2}>
  <Effect id="expose" type="exposure" params={{ stops: 0.5 }} /><Effect id="warm" type="whiteBalance" params={{ temperature: 0.3 }} />
</Clip></Track></Composition>; }`) as never,
      ),
      state.manifest,
    );
    expect(timelineRows(graded).effects).toEqual([
      { id: "expose", element: "c", type: "exposure", params: { stops: 0.5 }, order: 0 },
      { id: "warm", element: "c", type: "whiteBalance", params: { temperature: 0.3, tint: 0 }, order: 1 },
    ]);
  });
});
