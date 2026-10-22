import { animatedTransform, cssTransform, fitRect, layoutRect, matrixToCss } from "@cut/player";
import { childrenOf, makeState } from "./helpers/state";

const comp = { width: 1920, height: 1080 };

describe("fitRect", () => {
  it("contains, covers, stretches and leaves alone", () => {
    expect(fitRect(comp, { width: 640, height: 360 }, "contain")).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(fitRect(comp, { width: 400, height: 300 }, "contain")).toEqual({ x: 240, y: 0, w: 1440, h: 1080 });
    expect(fitRect(comp, { width: 400, height: 300 }, "cover")).toEqual({ x: 0, y: -180, w: 1920, h: 1440 });
    expect(fitRect(comp, { width: 400, height: 300 }, "stretch")).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(fitRect(comp, { width: 400, height: 300 }, "none")).toEqual({ x: 760, y: 390, w: 400, h: 300 });
  });
});

describe("layoutRect", () => {
  it("maps local pixels through position, scale and rotation about the anchor", () => {
    const l = layoutRect(comp, { width: 1920, height: 1080 }, "contain", { position: { x: 10, y: 20 }, scale: 2, rotation: 90 });
    const m = l.matrix;
    const centre = { x: m.a * 960 + m.c * 540 + m.e, y: m.b * 960 + m.d * 540 + m.f };
    expect(centre.x).toBeCloseTo(970);
    expect(centre.y).toBeCloseTo(560);
    const corner = { x: m.a * 0 + m.c * 0 + m.e, y: m.b * 0 + m.d * 0 + m.f };
    expect(corner.x).toBeCloseTo(970 + 540 * 2);
    expect(corner.y).toBeCloseTo(560 - 960 * 2);
  });

  it("crops in source pixels and fits the cropped box", () => {
    const l = layoutRect(comp, { width: 1000, height: 1000 }, "contain", { crop: { x: 0.25, y: 0, width: 0.5, height: 0.5 } });
    expect(l.crop).toEqual({ x: 250, y: 0, w: 500, h: 500 });
    expect(l.rect).toEqual({ x: 420, y: 0, w: 1080, h: 1080 });
    expect(l.opacity).toBe(1);
  });

  it("formats the same matrix for CSS", () => {
    const l = layoutRect(comp, { width: 100, height: 100 }, "none", { position: { x: 5, y: 0 } });
    expect(cssTransform(l)).toBe(matrixToCss(l.matrix));
    expect(cssTransform(l)).toBe("matrix(1, 0, 0, 1, 915, 490)");
  });
});

describe("animatedTransform", () => {
  const state = makeState({ tracks: [{ id: "main", items: [
    { id: "c1", kind: "clip", source: { in: 0, out: 5, asset: "a" }, props: { transform: { scale: 1.5 } }, children: [
      { id: "k1", kind: "keyframe", props: { property: "transform.position.x", at: 0, value: 0 } },
      { id: "k2", kind: "keyframe", props: { property: "transform.position.x", at: 2, value: 100 } },
    ] },
    { id: "c2", kind: "clip", source: { in: 0, out: 5, asset: "a" }, props: { transform: { rotation: 10 } } },
  ] }] });

  it("evaluates keyframes against the base transform", () => {
    const c1 = state.items.get("c1")!;
    const t = animatedTransform(c1.props.transform as never, childrenOf(state, "c1"), 1);
    expect(t.position).toEqual({ x: 50, y: 0 });
    expect(t.scale).toEqual({ x: 1.5, y: 1.5 });
    expect(t.opacity).toBe(1);
  });

  it("returns the base transform untouched without keyframes", () => {
    const c2 = state.items.get("c2")!;
    expect(animatedTransform(c2.props.transform as never, [], 1)).toEqual({ rotation: 10 });
  });
});
