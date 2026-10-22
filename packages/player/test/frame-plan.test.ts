import type { ResolvedState } from "@cutcut/kit";
import { buildFramePlan, captureWarnings } from "@cutcut/player";
import { fixtureState, makeState } from "./helpers/state";

const state = makeState({
  width: 1920, height: 1080,
  tracks: [
    { id: "main", items: [
      { id: "c1", kind: "clip", source: { in: 0, out: 4, asset: "a" }, children: [
        { id: "e2", kind: "effect", props: { type: "vignette", params: { amount: 30 } } },
        { id: "e3", kind: "effect", props: { type: "blur", params: { radius: 2 } } },
      ] },
      { id: "x1", kind: "transition", duration: 1, props: { type: "crossfade", params: { curve: "linear" } } },
      { id: "c2", kind: "clip", source: { in: 0, out: 4, asset: "img" }, duration: 4, props: { transform: { opacity: 0.5 } } },
      { id: "x2", kind: "transition", duration: 1, props: { type: "dipToBlack", params: {} } },
      { id: "c3", kind: "clip", source: { in: 0, out: 4, asset: "b" } },
    ] },
    { id: "fx", layout: "free", items: [{ id: "adj", kind: "adjustment", start: 0, duration: 10, children: [{ id: "e1", kind: "effect", props: { type: "blur", params: { radius: 4 } } }] }] },
  ],
});

describe("buildFramePlan", () => {
  beforeEach(() => captureWarnings(() => {}));
  afterEach(() => captureWarnings(null));

  it("is deterministic", () => {
    expect(buildFramePlan(state, 2.2)).toEqual(buildFramePlan(state, 2.2));
  });

  it("orders ops bottom-up and puts the adjustment after what it affects", () => {
    const plan = buildFramePlan(state, 1);
    expect(plan.ops.map((o) => [o.id, o.kind])).toEqual([["c1", "video"], ["adj", "adjustment"]]);
    expect(plan.ops[1]!.filter).toBe("blur(4px)");
    expect(plan.frame).toBe(30);
    expect(plan.background).toBe("#000000");
  });

  it("fades the incoming clip over an opaque outgoing one and multiplies element opacity", () => {
    const plan = buildFramePlan(state, 3.25);
    const [a, b] = plan.ops;
    expect(a!.id).toBe("c1");
    expect(b!.id).toBe("c2");
    expect(a!.opacity).toBe(1);
    expect(b!.opacity).toBeCloseTo(0.25 * 0.5);
    expect(b!.kind).toBe("image");
    expect(b!.blend).toBe("source-over");
  });

  it("falls back to a crossfade for other transition types with a warning", () => {
    const plan = buildFramePlan(state, 6.5);
    expect(plan.ops.map((o) => o.id)).toEqual(["c2", "c3", "adj"]);
    expect(plan.warnings.some((w) => w.includes("dipToBlack"))).toBe(true);
  });

  it("builds filters and lists unsupported effects", () => {
    const plan = buildFramePlan(state, 0.5);
    expect(plan.ops[0]!.filter).toBe("blur(2px)");
  });

  it("maps source time through speed and resolves nested compositions", () => {
    const inner = makeState({ width: 640, height: 360, tracks: [{ id: "i", items: [{ id: "ic", kind: "clip", source: { in: 0, out: 3, asset: "a" } }] }] });
    const outer = makeState({ tracks: [{ id: "main", items: [
      { id: "n", kind: "nested", source: { in: 1, out: 3, speed: 2, asset: "nested" }, duration: 1, props: { of: () => null } },
    ] }] });
    const plan = buildFramePlan(outer, 0.5, (p) => (p.id === "n" ? inner : null) as ResolvedState | null);
    expect(plan.ops[0]).toMatchObject({ id: "n", kind: "nested", nested: { time: 2 } });
    expect(buildFramePlan(outer, 0.5).ops[0]!.kind).toBe("error");
  });

  it("omits multicam clips on hidden tracks in the fixture and finds c1 with its mask", () => {
    const plan = buildFramePlan(fixtureState(), 1);
    expect(plan.ops.map((o) => o.id)).toEqual(["c1", "adj1"]);
    expect(plan.ops[0]!.mask).toMatchObject({ feather: 12, inverted: false });
    expect(plan.ops[0]!.sourceTime).toBe(3);
    expect(plan.ops[0]!.opacity).toBe(1);
  });
});
