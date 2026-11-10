import { describe, expect, it } from "vitest";

import {
  type AssetManifest,
  collectModule,
  MAX_RANGE_MOMENTS,
  parseMoment,
  parseMoments,
  playsOf,
  resolve,
  resolveMoments,
} from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const words = Array.from({ length: 40 }, (_, i) => ({ i, text: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 }));
const manifest: AssetManifest = {
  assets: {
    talk: { id: "talk", kind: "video", duration: 20, fps: 30, width: 1920, height: 1080, transcript: { words } },
    broll: {
      id: "broll",
      kind: "video",
      duration: 12,
      fps: 30,
      width: 1920,
      height: 1080,
      shots: [
        { i: 0, start: 0, end: 4 },
        { i: 1, start: 4, end: 9 },
      ],
    },
  },
};

const stateOf = (tracks: string) =>
  resolve(
    collectModule(
      loadModule(`import { Clip, Composition, Freeze, Marker, SpeedKey, Title, Track, Transition } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={1920} height={1080}>${tracks}</Composition>; }`) as never,
    ),
    manifest,
  );

// hook plays words 4..9 (2 s to 4.9 s of the talk) from 0; x1 overlaps it and the b-roll by 0.5 s.
const CUT = `<Marker id="intro" at={1.5} />
<Track id="main">
  <Clip id="hook" src="asset:talk" in="word:4" out="word:9.end" />
  <Transition id="x1" type="crossfade" duration={0.5} />
  <Clip id="broll" src="asset:broll" in="shot:1" out="shot:1.end" />
</Track>
<Track id="text"><Title id="point" anchor="hook" at="word:6" duration={1}>Point</Title></Track>`;

const at = (state: ReturnType<typeof stateOf>, list: string) => resolveMoments(state, parseMoments(list));

describe("moments", () => {
  it("parses each form, and says what is not one", () => {
    expect(parseMoment("4.5")).toMatchObject({ kind: "time", seconds: 4.5 });
    expect(parseMoment("90f")).toMatchObject({ kind: "time", frame: 90 });
    expect(parseMoment("2..6/0.5")).toMatchObject({ kind: "range", from: { seconds: 2 }, step: { seconds: 0.5 } });
    expect(parseMoment("hook.end")).toMatchObject({ kind: "element", id: "hook", point: "end" });
    expect(parseMoment("word:14.end")).toMatchObject({ kind: "ref", ref: "word:14.end" });
    expect(parseMoment("hook@word:14")).toMatchObject({ kind: "ref", clip: "hook", ref: "word:14" });
    expect(parseMoment("marker:intro")).toMatchObject({ kind: "ref", ref: "marker:intro" });
    for (const bad of ["-1", "1..2..3", "hook.left", "word:x", "1/2", "a b"])
      expect(parseMoment(bad).kind, bad).toBe("invalid");
    expect(parseMoments(" 1 , 2f ,,hook ")).toHaveLength(3);
  });

  it("a bare number is seconds, a number with f is a frame, and both report both", () => {
    const { moments, errors } = at(stateOf(CUT), "1.5,45f");
    expect(errors).toEqual([]);
    expect(moments.map((m) => [m.time, m.frame])).toEqual([
      [1.5, 45],
      [1.5, 45],
    ]);
  });

  it("a range gives its two ends, or every step of it", () => {
    const state = stateOf(CUT);
    expect(at(state, "1..3").moments.map((m) => m.time)).toEqual([1, 3]);
    expect(at(state, "1..3/0.5").moments.map((m) => m.time)).toEqual([1, 1.5, 2, 2.5, 3]);
    expect(at(state, "0..30f/10f").moments.map((m) => m.frame)).toEqual([0, 10, 20, 30]);
    expect(at(state, "3..1").errors[0]).toContain("runs forward");
    expect(at(state, "0..7/0.01").errors[0]).toContain(`at most ${MAX_RANGE_MOMENTS}`);
    expect(at(state, "0..1/0").errors[0]).toContain("more than 0");
  });

  it("an element is its middle, its start, or the last frame it is on", () => {
    const state = stateOf(CUT);
    const hook = state.items.get("hook");
    const { moments } = at(state, "hook,hook.start,hook.mid,hook.end");
    expect(moments.map((m) => m.time)).toEqual([1.45, 0, 1.45, Math.round((2.9 - 1 / 30) * 1000) / 1000]);
    expect(moments[3]?.frame).toBe(Math.round((hook?.end ?? 0) * 30) - 1);
    expect(moments[1]?.about).toBe("start of clip hook");
  });

  it("a transition is both sides of its cut", () => {
    const { moments } = at(stateOf(CUT), "x1");
    expect(moments.map((m) => m.label)).toEqual(["x1.before", "x1.after"]);
    expect(moments.map((m) => m.frame)).toEqual([71, 87]);
    expect(moments[0]?.about).toBe("last frame of hook before x1");
    expect(moments[1]?.about).toBe("first frame of broll after x1");
  });

  it("a word, a shot and a marker land where the finished video plays them", () => {
    const { moments, errors } = at(stateOf(CUT), "word:6,word:6.end,shot:1,marker:intro,hook@word:5");
    expect(errors).toEqual([]);
    // Word 6 is at 3 s of the talk, which starts playing at its 2 s; the b-roll's shot 1 starts where the clip does.
    expect(moments.map((m) => m.time)).toEqual([1, 1.4, 2.4, 1.5, 0.5]);
    expect(moments[0]?.about).toBe('word 6 "w6" in hook');
  });

  it("a word two clips play needs the clip named", () => {
    const state = stateOf(`<Track id="main">
  <Clip id="a" src="asset:talk" in="word:4" out="word:9.end" />
  <Clip id="b" src="asset:talk" in="word:6" out="word:12.end" />
</Track>`);
    const both = at(state, "word:7");
    expect(both.moments).toEqual([]);
    expect(both.errors[0]).toContain("2 clips play it; name one: a@word:7, b@word:7");
    expect(at(state, "a@word:7,b@word:7").moments.map((m) => m.time)).toEqual([1.5, 3.4]);
    expect(playsOf(state, "asset:talk").map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("follows a speed change and a freeze", () => {
    const fast = stateOf(
      `<Track id="main"><Clip id="a" src="asset:talk" in="word:4" out="word:9.end" speed={2} /></Track>`,
    );
    expect(at(fast, "word:6").moments[0]?.time).toBe(0.5);
    const held = stateOf(`<Track id="main"><Clip id="a" src="asset:talk" in="word:4" out="word:9.end">
  <Freeze id="f" at={0.5} start={0.5} duration={2} />
</Clip></Track>`);
    expect(at(held, "word:6").moments[0]?.time).toBe(3);
  });

  it("says why a moment cannot be found, and still returns the others", () => {
    const { moments, errors } = at(stateOf(CUT), "1,nope,word:99,hook@shot:1,main@word:5,marker:none,99,what?");
    expect(moments.map((m) => m.label)).toEqual(["1"]);
    expect(errors).toEqual([
      'nope: the file has no element with the id "nope"',
      "word:99: no asset the timeline plays has it in the manifest",
      "hook@shot:1: no asset the timeline plays has it in the manifest",
      'main@word:5: "main" is not a clip or audio that plays an asset',
      'marker:none: the file has no marker "none"',
      expect.stringContaining("99: 99 s is outside the video"),
      expect.stringContaining('"what?" is not a moment'),
    ]);
  });

  it("a word the cut left out is not on the timeline", () => {
    expect(at(stateOf(CUT), "word:20").errors).toEqual(["word:20: no clip on the timeline plays it"]);
  });
});
