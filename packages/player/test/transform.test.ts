import { childrenOf, makeState } from "./helpers/state";
import { animatedBox, animatedTransform, cssTransform, fitRect, layoutRect, matrixToCss, placeBox } from "./internal";

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

describe("placeBox", () => {
  const src = { width: 400, height: 300 };

  it("with no box, is the fit in the whole frame", () => {
    for (const fit of ["contain", "cover", "stretch", "none"] as const)
      expect(placeBox(comp, src, fit)).toEqual({ rect: fitRect(comp, src, fit) });
  });

  it("a box with no size takes the size its content has in the frame, placed by its origin", () => {
    expect(placeBox(comp, src, "contain", { x: 0, y: 0 }).rect).toEqual({ x: 0, y: 0, w: 1440, h: 1080 });
    expect(placeBox(comp, src, "none", { x: 960, y: 540, origin: "center" }).rect).toEqual({
      x: 760,
      y: 390,
      w: 400,
      h: 300,
    });
    // An axis left out is centred.
    expect(placeBox(comp, src, "none", { y: 0 }).rect).toEqual({ x: 760, y: 0, w: 400, h: 300 });
  });

  it("a box with a size is filled as object-fit fills it, centred", () => {
    const box = { x: 100, y: 100, width: 800, height: 300 };
    expect(placeBox(comp, src, "contain", box).rect).toEqual({ x: 300, y: 100, w: 400, h: 300 });
    expect(placeBox(comp, src, "stretch", box).rect).toEqual({ x: 100, y: 100, w: 800, h: 300 });
    expect(placeBox(comp, src, "none", box).rect).toEqual({ x: 300, y: 100, w: 400, h: 300 });
    // Only a width: the height follows the content's shape.
    expect(placeBox(comp, src, "contain", { x: 0, y: 0, width: 200 }).rect).toEqual({ x: 0, y: 0, w: 200, h: 150 });
  });

  it("cover fills a box with a size and crops what falls outside it", () => {
    const placed = placeBox(comp, src, "cover", { x: 100, y: 100, width: 800, height: 300 });
    expect(placed.rect).toEqual({ x: 100, y: 100, w: 800, h: 300 });
    // Scaled by 2 to 800 × 600: the middle half of its height shows.
    expect(placed.crop).toEqual({ x: 0, y: 0.25, w: 1, h: 0.5 });
    const layout = layoutRect(comp, src, "cover", {}, { x: 100, y: 100, width: 800, height: 300 });
    expect(layout.crop).toEqual({ x: 0, y: 75, w: 400, h: 150 });
  });
});

describe("layoutRect", () => {
  it("maps local pixels through the box, scale and rotation about the anchor", () => {
    const l = layoutRect(
      comp,
      { width: 1920, height: 1080 },
      "contain",
      { scale: 2, rotation: 90 },
      { x: 970, y: 560, origin: "center" },
    );
    const m = l.matrix;
    const centre = { x: m.a * 960 + m.c * 540 + m.e, y: m.b * 960 + m.d * 540 + m.f };
    expect(centre.x).toBeCloseTo(970);
    expect(centre.y).toBeCloseTo(560);
    const corner = { x: m.a * 0 + m.c * 0 + m.e, y: m.b * 0 + m.d * 0 + m.f };
    expect(corner.x).toBeCloseTo(970 + 540 * 2);
    expect(corner.y).toBeCloseTo(560 - 960 * 2);
  });

  it("crops in source pixels and fits the cropped box", () => {
    const l = layoutRect(comp, { width: 1000, height: 1000 }, "contain", {
      crop: { x: 0.25, y: 0, width: 0.5, height: 0.5 },
    });
    expect(l.crop).toEqual({ x: 250, y: 0, w: 500, h: 500 });
    expect(l.rect).toEqual({ x: 420, y: 0, w: 1080, h: 1080 });
    expect(l.opacity).toBe(1);
  });

  it("places the box's origin point at x and y, from the frame's top left", () => {
    const src = { width: 100, height: 50 };
    const at = (box: Parameters<typeof layoutRect>[4]) => {
      const m = layoutRect(comp, src, "none", {}, box).matrix;
      return { x: m.e + m.a * 0, y: m.f };
    };
    // The top left by default.
    expect(at({ x: 40, y: 30 })).toEqual({ x: 40, y: 30 });
    expect(at({ x: 40, y: 30, origin: "center" })).toEqual({ x: -10, y: 5 });
    expect(at({ x: 1920, y: 1080, origin: "bottomRight" })).toEqual({ x: 1820, y: 1030 });
    expect(at({ x: 960, y: 0, origin: "top" })).toEqual({ x: 910, y: 0 });
    // An axis left out stays centred.
    expect(at({ y: 0 })).toEqual({ x: 910, y: 0 });
    expect(at(undefined)).toEqual({ x: 910, y: 515 });
  });

  it("formats the same matrix for CSS", () => {
    const l = layoutRect(comp, { width: 100, height: 100 }, "none", {}, { x: 965, y: 540, origin: "center" });
    expect(cssTransform(l)).toBe(matrixToCss(l.matrix));
    expect(cssTransform(l)).toBe("matrix(1, 0, 0, 1, 915, 490)");
  });
});

describe("animatedBox", () => {
  const children = [
    { id: "k1", kind: "keyframe", props: { property: "box.x", at: 0, value: 0 } },
    { id: "k2", kind: "keyframe", props: { property: "box.x", at: 2, value: 100 } },
  ] as never;

  it("evaluates box.x and box.y keys, keeping the rest of the box", () => {
    expect(animatedBox({ y: 40, origin: "center" }, children, 1)).toEqual({ x: 50, y: 40, origin: "center" });
    expect(animatedBox(undefined, children, 1)).toMatchObject({ x: 50 });
  });

  it("returns the box untouched without keys", () => {
    const box = { x: 1, y: 2 };
    expect(animatedBox(box, [], 1)).toBe(box);
    expect(animatedBox(undefined, [], 1)).toBeUndefined();
  });
});

describe("animatedTransform", () => {
  const state = makeState({
    tracks: [
      {
        id: "main",
        items: [
          {
            id: "c1",
            kind: "clip",
            source: { in: 0, out: 5, asset: "a" },
            props: { transform: { scale: 1.5 } },
            children: [
              { id: "k1", kind: "keyframe", props: { property: "box.x", at: 0, value: 0 } },
              { id: "k2", kind: "keyframe", props: { property: "box.x", at: 2, value: 100 } },
              { id: "k3", kind: "keyframe", props: { property: "transform.opacity", at: 0, value: 0.5 } },
            ],
          },
          { id: "c2", kind: "clip", source: { in: 0, out: 5, asset: "a" }, props: { transform: { rotation: 10 } } },
        ],
      },
    ],
  });

  it("evaluates keyframes against the base transform", () => {
    const c1 = state.items.get("c1")!;
    const t = animatedTransform(c1.props.transform as never, childrenOf(state, "c1"), 1);
    expect(t.scale).toEqual({ x: 1.5, y: 1.5 });
    expect(t.opacity).toBe(0.5);
  });

  it("returns the base transform untouched without keyframes", () => {
    const c2 = state.items.get("c2")!;
    expect(animatedTransform(c2.props.transform as never, [], 1)).toEqual({ rotation: 10 });
  });
});
