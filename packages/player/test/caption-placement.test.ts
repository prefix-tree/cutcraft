import { captionPlace, captionPlacement } from "../src/overlays/caption-placement";

const PORTRAIT = { width: 1080, height: 1920 };
const WIDE = { width: 1920, height: 1080 };

describe("captionPlacement", () => {
  it("with nothing given: across the frame less a margin, above the bottom, centred", () => {
    expect(captionPlacement({}, PORTRAIT)).toMatchObject({
      left: 0,
      right: 0,
      padding: "0 12%",
      bottom: 384,
      alignItems: "center",
      textAlign: "center",
    });
    expect(captionPlacement({}, PORTRAIT).transform).toBeUndefined();
    expect(captionPlacement({}, WIDE)).toMatchObject({ padding: "0 8%", bottom: 86.4 });
  });

  it("the style's position: an edge, the centre, or a fraction of the height", () => {
    expect(captionPlacement({ position: "top" }, WIDE)).toMatchObject({ top: 86.4 });
    expect(captionPlacement({ position: "top" }, WIDE).transform).toBeUndefined();
    expect(captionPlacement({ position: "center" }, WIDE)).toMatchObject({
      top: "50%",
      transform: "translate(0, -50%)",
    });
    expect(captionPlacement({ position: 0.6 }, PORTRAIT)).toMatchObject({
      top: "60%",
      transform: "translate(0, -50%)",
    });
  });

  it("y is the middle's height from the centre and takes the place of the position", () => {
    const placed = captionPlacement({ y: 192, position: "top" }, PORTRAIT);
    expect(placed).toMatchObject({ top: "calc(50% + 192px)", transform: "translate(0, -50%)" });
    expect(placed.bottom).toBeUndefined();
    expect(captionPlacement({ y: -40 }, PORTRAIT).top).toBe("calc(50% - 40px)");
  });

  it("x moves the block sideways, with or without a width, in the one transform", () => {
    expect(captionPlacement({ x: -80 }, PORTRAIT).transform).toBe("translate(-80px, 0)");
    expect(captionPlacement({ x: 40, y: 0 }, PORTRAIT).transform).toBe("translate(40px, -50%)");
    expect(captionPlacement({ width: 300 }, PORTRAIT)).toMatchObject({
      left: "50%",
      width: 300,
      transform: "translate(-50%, 0)",
    });
    expect(captionPlacement({ width: 300, x: 100, y: 10 }, PORTRAIT).transform).toBe(
      "translate(calc(-50% + 100px), -50%)",
    );
    // A width replaces the frame's margins.
    expect(captionPlacement({ width: 300 }, PORTRAIT).padding).toBeUndefined();
  });

  it("align is the side the lines sit against", () => {
    expect(captionPlacement({ align: "left" }, WIDE)).toMatchObject({ alignItems: "flex-start", textAlign: "left" });
    expect(captionPlacement({ align: "right" }, WIDE)).toMatchObject({ alignItems: "flex-end", textAlign: "right" });
  });
});

describe("captionPlace", () => {
  it("keeps what is a placement and drops what is not", () => {
    expect(captionPlace({ x: 10, y: "low", width: Number.NaN, align: "middle", id: "c" }, { position: 0.6 })).toEqual({
      x: 10,
      position: 0.6,
    });
    expect(captionPlace({ y: 0, width: 400, align: "left" }, {})).toEqual({ y: 0, width: 400, align: "left" });
  });
});
