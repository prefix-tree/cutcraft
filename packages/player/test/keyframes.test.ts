import { EASING_FN, ease, keyframedValue } from "@cut/player";
import { captureWarnings } from "@cut/player";
import { makeState, childrenOf } from "./helpers/state";

const state = makeState({
  tracks: [{ id: "main", items: [
    { id: "c1", kind: "clip", source: { in: 0, out: 5, asset: "a" }, children: [
      { id: "k1", kind: "keyframe", props: { property: "transform.opacity", at: 0, value: 0, easing: "easeOutCubic" } },
      { id: "k2", kind: "keyframe", props: { property: "transform.opacity", at: 1, value: 1 } },
      { id: "k3", kind: "keyframe", props: { property: "transform.opacity", at: 2, value: 0.5, easing: "linear" } },
      { id: "k4", kind: "keyframe", props: { property: "path", at: 0, value: "M0 0" } },
      { id: "k5", kind: "keyframe", props: { property: "path", at: 1, value: "M1 1" } },
    ] },
  ] }],
});
const kids = childrenOf(state, "c1");

describe("keyframedValue", () => {
  it("holds outside the key range and falls back without keys", () => {
    expect(keyframedValue(kids, "transform.opacity", -1, 9)).toBe(0);
    expect(keyframedValue(kids, "transform.opacity", 5, 9)).toBe(0.5);
    expect(keyframedValue(kids, "transform.rotation", 1, 42)).toBe(42);
  });

  it("eases with the key it leaves", () => {
    expect(keyframedValue(kids, "transform.opacity", 0.5, 0)).toBeCloseTo(EASING_FN.easeOutCubic(0.5));
    expect(keyframedValue(kids, "transform.opacity", 1.5, 0)).toBeCloseTo(0.75);
  });

  it("steps non-numeric values", () => {
    expect(keyframedValue(kids, "path", 0.9, "")).toBe("M0 0");
    expect(keyframedValue(kids, "path", 1, "")).toBe("M1 1");
  });
});

describe("easings", () => {
  it("covers every name and pins the ends", () => {
    for (const [name, fn] of Object.entries(EASING_FN)) {
      expect(fn(0), name).toBeCloseTo(0, 5);
      expect(fn(1), name).toBeCloseTo(1, 5);
    }
    expect(Object.keys(EASING_FN)).toHaveLength(50);
  });

  it("warns once on an unknown easing and uses linear", () => {
    const warnings: string[] = [];
    captureWarnings((m) => warnings.push(m));
    expect(ease("nope", 0.3)).toBe(0.3);
    expect(ease("nope", 0.6)).toBe(0.6);
    expect(warnings).toHaveLength(1);
    captureWarnings(null);
  });
});
