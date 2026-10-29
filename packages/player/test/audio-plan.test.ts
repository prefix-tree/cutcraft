import { buildAudioPlan, buildGainEnvelope, captureWarnings, duckIntervals } from "@cutcut/player";
import { makeState } from "./helpers/state";

const state = makeState({
  tracks: [
    { id: "main", items: [
      { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" }, props: { fade: { in: 1 } } },
      { id: "g", kind: "gap", duration: 2 },
      { id: "c2", kind: "clip", source: { in: 0, out: 6, speed: 1.2, asset: "b" } },
      { id: "c3", kind: "clip", source: { in: 0, out: 2, asset: "silent" } },
    ] },
    { id: "music", layout: "free", items: [
      { id: "bed", kind: "audio", start: 0, source: { in: 0, out: 90, asset: "tone" }, props: { volume: 0.5, duck: { under: "main", to: 0.2 } } },
    ] },
    { id: "muted", layout: "free", muted: true, items: [{ id: "m1", kind: "audio", start: 0, source: { in: 0, out: 5, asset: "tone" } }] },
  ],
});

describe("buildAudioPlan", () => {
  beforeEach(() => captureWarnings(() => {}));
  afterEach(() => captureWarnings(null));

  it("lists chunks overlapping the window and skips muted tracks and silent assets", () => {
    const plan = buildAudioPlan(state, 0, 0.2);
    expect(plan.map((o) => `${o.id}#${o.chunk}`)).toEqual(["c1#0", "bed#0"]);
    expect(plan[0]).toMatchObject({ compStart: 0, compEnd: 4, bufferFrom: 0, bufferTo: 4, speed: 1 });
    expect(buildAudioPlan(state, 50, 60).map((o) => `${o.id}#${o.chunk}`)).toEqual(["bed#1"]);
  });

  it("chunks long sources on stable source boundaries", () => {
    const bed = buildAudioPlan(state, 0, 100).filter((o) => o.id === "bed");
    expect(bed.map((o) => [o.chunk, o.bufferFrom, o.bufferTo, o.compStart, o.compEnd])).toEqual([[0, 0, 30, 0, 30], [1, 30, 60, 30, 60], [2, 60, 90, 60, 90]]);
  });

  it("maps speed into the buffer range", () => {
    const c2 = buildAudioPlan(state, 6, 7).find((o) => o.id === "c2")!;
    expect(c2).toMatchObject({ compStart: 6, compEnd: 11, bufferFrom: 0, bufferTo: 6, speed: 1.2 });
  });

  it("honours solo", () => {
    const solo = makeState({ tracks: [
      { id: "a", solo: true, items: [{ id: "s1", kind: "clip", source: { in: 0, out: 1, asset: "a" } }] },
      { id: "b", items: [{ id: "s2", kind: "clip", source: { in: 0, out: 1, asset: "a" } }] },
    ] });
    expect(buildAudioPlan(solo, 0, 1).map((o) => o.id)).toEqual(["s1"]);
  });

  it("skips hidden tracks, as the picture does", () => {
    const hidden = makeState({ tracks: [
      { id: "a", hidden: true, items: [{ id: "h1", kind: "clip", source: { in: 0, out: 1, asset: "a" } }] },
      { id: "b", items: [{ id: "v1", kind: "clip", source: { in: 0, out: 1, asset: "a" } }] },
    ] });
    expect(buildAudioPlan(hidden, 0, 1).map((o) => o.id)).toEqual(["v1"]);
  });

  it("plays reversed audio from its last chunk first, each chunk's PCM reversed", () => {
    const rev = makeState({ tracks: [{ id: "a", layout: "free", items: [{ id: "r", kind: "audio", start: 0, source: { in: 0, out: 90, speed: 2, asset: "tone" }, props: { reverse: true } }] }] });
    const plan = buildAudioPlan(rev, 0, 45);
    expect(plan.map((o) => [o.chunk, o.bufferFrom, o.bufferTo, o.compStart, o.compEnd, o.reverse])).toEqual([[0, 0, 30, 30, 45, true], [1, 30, 60, 15, 30, true], [2, 60, 90, 0, 15, true]]);
  });

  it("follows a speed-key ramp with a rate envelope", () => {
    // Speed 1 → 2 over 2 s: plays u + u²/4 source seconds, so 3 s of source take 2 s.
    const s = makeState({ tracks: [{ id: "a", items: [{ id: "r", kind: "clip", duration: 2, source: { in: 0, out: 3, asset: "a" }, children: [
      { id: "k1", kind: "speedKey", props: { at: 0, speed: 1 } }, { id: "k2", kind: "speedKey", props: { at: 2, speed: 2 } },
    ] }] }] });
    const [o] = buildAudioPlan(s, 0, 2);
    expect(o).toMatchObject({ compStart: 0, compEnd: 2, bufferFrom: 0, bufferTo: 3 });
    expect(o!.rate![0]).toEqual([0, 1]);
    expect(o!.rate!.find(([t]) => t === 1)).toEqual([1, 1.5]);
    expect(o!.rate![o!.rate!.length - 1]).toEqual([2, 2]);
    expect(o!.rate!.length).toBe(41);
  });

  it("splits at a freeze so the hold is silent, forwards and reversed", () => {
    const freeze = (reverse: boolean) => makeState({ tracks: [{ id: "a", items: [{ id: "f", kind: "clip", duration: 4.5, source: { in: 0, out: 4, asset: "a" }, props: reverse ? { reverse } : {}, children: [
      { id: "fr", kind: "freeze", props: { at: 1, start: 1, duration: 0.5 } },
    ] }] }] });
    const pieces = (reverse: boolean) => buildAudioPlan(freeze(reverse), 0, 5).map((o) => [o.chunk, o.bufferFrom, o.bufferTo, o.compStart, o.compEnd]);
    expect(pieces(false)).toEqual([[0, 0, 1, 0, 1], [1, 1, 4, 1.5, 4.5]]);
    expect(pieces(true)).toEqual([[0, 0, 3, 1.5, 4.5], [1, 3, 4, 0, 1]]);
  });
});

describe("buildGainEnvelope", () => {
  it("fades in", () => {
    const c1 = state.items.get("c1")!;
    const env = buildGainEnvelope(c1, state.tracks[0]!, state, 0, 4);
    expect(env[0]).toEqual([0, 0]);
    expect(env.find(([t]) => t === 1)).toEqual([1, 1]);
    expect(env[env.length - 1]).toEqual([4, 1]);
  });

  it("ducks under a track role and ignores muted clips", () => {
    const s = makeState({ tracks: [
      { id: "talk", role: "dialogue", items: [
        { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
        { id: "broll", kind: "clip", source: { in: 0, out: 3, asset: "b" }, props: { volume: 0 } },
      ] },
      { id: "music", layout: "free", items: [{ id: "bed", kind: "audio", start: 0, source: { in: 0, out: 90, asset: "tone" }, props: { duck: { under: "dialogue", to: 0.2 } } }] },
    ] });
    expect(duckIntervals(s, "dialogue", "bed")).toEqual([[0, 4]]);
    expect(duckIntervals(s, "nothing", "bed")).toEqual([]);
  });

  it("ducks under the main track with attack and release", () => {
    expect(duckIntervals(state, "main", "bed")).toEqual([[0, 4], [6, 11]]);
    const bed = state.items.get("bed")!;
    const env = buildGainEnvelope(bed, state.tracks[1]!, state, 0, 20);
    const at = (t: number) => env.find(([x]) => x === t)?.[1];
    expect(at(0)).toBeCloseTo(0.1);
    expect(at(4)).toBeCloseTo(0.1);
    expect(at(4.3)).toBeCloseTo(0.5);
    expect(at(5.9)).toBeCloseTo(0.5);
    expect(at(6)).toBeCloseTo(0.1);
    expect(at(11.3)).toBeCloseTo(0.5);
    expect(env.some(([t]) => t === 4.15)).toBe(true);
  });

  it("multiplies automation points in", () => {
    const auto = makeState({ tracks: [{ id: "a", items: [{ id: "x", kind: "audio", source: { in: 0, out: 4, asset: "tone" }, props: { volume: 0.5, automation: { volume: [[0, 1], [2, 0]] } } }] }] });
    const x = auto.items.get("x")!;
    const env = buildGainEnvelope(x, auto.tracks[0]!, auto, 0, 4);
    expect(env).toEqual([[0, 0.5], [2, 0], [4, 0]]);
  });

  it("multiplies nested volume into inner occurrences", () => {
    const inner = makeState({ tracks: [{ id: "i", items: [{ id: "ic", kind: "clip", source: { in: 0, out: 4, asset: "a" }, props: { volume: 0.5 } }] }] });
    const outer = makeState({ tracks: [{ id: "main", items: [{ id: "n", kind: "nested", source: { in: 1, out: 3, asset: "nested" }, duration: 2, props: { of: () => null, volume: 0.5 } }] }] });
    const plan = buildAudioPlan(outer, 0, 5, () => inner);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ id: "n/ic", compStart: 0, compEnd: 2, bufferFrom: 0, bufferTo: 4 });
    expect(plan[0]!.gain.every(([, v]) => Math.abs(v - 0.25) < 1e-9)).toBe(true);
  });
});
