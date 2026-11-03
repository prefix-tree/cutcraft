import { visiblePlacements } from "@cutcraft/player";

import { fixtureState, makeState } from "./helpers/state";

describe("visiblePlacements", () => {
  const state = makeState({
    tracks: [
      {
        id: "main",
        items: [
          { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
          { id: "x1", kind: "transition", duration: 1, props: { type: "crossfade", params: { curve: "linear" } } },
          { id: "c2", kind: "clip", source: { in: 0, out: 4, asset: "b" } },
        ],
      },
      { id: "over", items: [{ id: "t1", kind: "title", start: 0, duration: 2 }], layout: "free" },
      { id: "hidden", hidden: true, items: [{ id: "h1", kind: "clip", source: { in: 0, out: 4, asset: "a" } }] },
    ],
  });

  it("orders the first track first and skips hidden tracks", () => {
    const ids = visiblePlacements(state, 1).map((v) => v.placement.id);
    expect(ids).toEqual(["c1", "t1"]);
  });

  it("is end-exclusive except at the composition end", () => {
    expect(visiblePlacements(state, 2).map((v) => v.placement.id)).toEqual(["c1"]);
    expect(state.composition.duration).toBe(7);
    expect(visiblePlacements(state, 7).map((v) => v.placement.id)).toEqual(["c2"]);
    expect(visiblePlacements(state, 7.5)).toEqual([]);
  });

  it("marks transition roles with progress", () => {
    const at = visiblePlacements(state, 3.25);
    expect(at.map((v) => v.placement.id)).toEqual(["c1", "c2"]);
    expect(at[0]!.transition).toMatchObject({ role: "out", progress: 0.25 });
    expect(at[1]!.transition).toMatchObject({ role: "in", progress: 0.25 });
    expect(visiblePlacements(state, 2.5)[0]!.transition).toBeUndefined();
  });

  it("reads the kit fixture", () => {
    const s = fixtureState();
    const ids = visiblePlacements(s, 1).map((v) => v.placement.id);
    expect(ids).toContain("c1");
    expect(ids).toContain("t1");
    expect(ids).not.toContain("c2");
    expect(ids).not.toContain("mc1.cu1");
    expect(ids.indexOf("c1")).toBeLessThan(ids.indexOf("t1"));
  });
});
