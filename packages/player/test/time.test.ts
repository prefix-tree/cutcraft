import { frameIndex, frameTime, layerClock, localT, placementSourceTime, timecode } from "@cutcut/player";
import { childrenOf, fixtureState, makeState } from "./helpers/state";

const state = makeState({
  tracks: [{
    id: "main", items: [
      { id: "c1", kind: "clip", source: { in: 2, out: 6, asset: "a" } },
      { id: "c2", kind: "clip", source: { in: 0, out: 8, speed: 2, asset: "b" } },
      { id: "c3", kind: "clip", source: { in: 1, out: 5, asset: "a" }, props: { reverse: true } },
      { id: "c4", kind: "clip", source: { in: 0, out: 10, asset: "b" }, duration: 4, children: [
        { id: "sk1", kind: "speedKey", props: { at: 0, speed: 1 } },
        { id: "sk2", kind: "speedKey", props: { at: 2, speed: 0.5 } },
      ] },
      { id: "c5", kind: "clip", source: { in: 0, out: 10, asset: "b" }, duration: 6, children: [
        { id: "fr1", kind: "freeze", props: { at: 1.5, start: 3, duration: 0.5 } },
      ] },
    ],
  }],
});
const item = (id: string) => state.items.get(id)!;

describe("placementSourceTime", () => {
  it("maps forward with trim", () => {
    expect(placementSourceTime(item("c1"), [], 0)).toBe(2);
    expect(placementSourceTime(item("c1"), [], 1.5)).toBe(3.5);
    expect(placementSourceTime(item("c1"), [], 4)).toBe(6);
    expect(placementSourceTime(item("c1"), [], 99)).toBe(6);
  });

  it("scales by speed", () => {
    const c2 = item("c2");
    expect(c2.start).toBe(4);
    expect(c2.duration).toBe(4);
    expect(placementSourceTime(c2, [], 5)).toBe(2);
    expect(placementSourceTime(c2, [], 8)).toBe(8);
  });

  it("plays reverse from out", () => {
    const c3 = item("c3");
    expect(placementSourceTime(c3, [], c3.start)).toBe(5);
    expect(placementSourceTime(c3, [], c3.start + 1)).toBe(4);
    expect(placementSourceTime(c3, [], c3.end + 5)).toBe(1);
  });

  it("integrates speed keys", () => {
    const c4 = item("c4");
    const kids = childrenOf(state, "c4");
    expect(placementSourceTime(c4, kids, c4.start)).toBe(0);
    expect(placementSourceTime(c4, kids, c4.start + 1)).toBeCloseTo(1 - 0.125, 3);
    expect(placementSourceTime(c4, kids, c4.start + 2)).toBeCloseTo(1.5, 3);
    expect(placementSourceTime(c4, kids, c4.start + 4)).toBeCloseTo(2.5, 3);
  });

  it("holds a freeze and resumes without shifting", () => {
    const c5 = item("c5");
    const kids = childrenOf(state, "c5");
    expect(placementSourceTime(c5, kids, c5.start + 2.9)).toBeCloseTo(2.9);
    expect(placementSourceTime(c5, kids, c5.start + 3)).toBe(1.5);
    expect(placementSourceTime(c5, kids, c5.start + 3.4)).toBe(1.5);
    expect(placementSourceTime(c5, kids, c5.start + 3.5)).toBeCloseTo(3.5);
  });

  it("works on the kit fixture", () => {
    const s = fixtureState();
    const c3 = s.items.get("c3")!;
    expect(placementSourceTime(c3, childrenOf(s, "c3"), 10)).toBe(21);
    expect(placementSourceTime(c3, childrenOf(s, "c3"), 11)).toBeCloseTo(22.2);
  });
});

describe("frames", () => {
  it("rounds frame boundaries", () => {
    expect(frameIndex(0, 30)).toBe(0);
    expect(frameIndex(1 / 30, 30)).toBe(1);
    expect(frameIndex(29 / 30 - 1e-9, 30)).toBe(29);
    expect(frameIndex(0.1 + 0.2, 10)).toBe(3);
    expect(frameTime(45, 30)).toBe(1.5);
    expect(frameIndex(-1, 30)).toBe(0);
  });

  it("localT clamps to 0..1", () => {
    const c1 = item("c1");
    expect(localT(c1, -1)).toBe(0);
    expect(localT(c1, 2)).toBe(0.5);
    expect(localT(c1, 10)).toBe(1);
  });

  it("formats timecode as mm:ss.ff", () => {
    expect(timecode(0, 30)).toBe("00:00.00");
    expect(timecode(0.5, 30)).toBe("00:00.15");
    expect(timecode(65.9, 30)).toBe("01:05.27");
    expect(timecode(-1, 30)).toBe("00:00.00");
    expect(timecode(1, 29.97)).toBe("00:01.00");
  });

  it("layerClock gives progress and real seconds, clamped to the layer", () => {
    const c1 = item("c1");
    expect(layerClock(c1, c1.start + 1, 30)).toEqual({ t: 0.25, elapsed: 1, remaining: 3, duration: 4, time: c1.start + 1, fps: 30 });
    expect(layerClock(c1, c1.start - 2, 30)).toMatchObject({ t: 0, elapsed: 0, remaining: 4 });
    expect(layerClock(c1, c1.end + 2, 30)).toMatchObject({ t: 1, elapsed: 4, remaining: 0 });
  });
});
