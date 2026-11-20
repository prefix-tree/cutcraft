import { captionBox, captionPlace, captionPlacement } from "../src/overlays/caption-placement";

const PORTRAIT = { width: 1080, height: 1920 };
const WIDE = { width: 1920, height: 1080 };

describe("captionPlacement", () => {
  it("with no box: the lower safe area, centred, the frame less a margin wide", () => {
    expect(captionBox(WIDE)).toEqual({ x: 960, y: 993.6, width: 1612.8, origin: "bottom" });
    expect(captionPlacement({}, WIDE)).toMatchObject({
      left: 0,
      right: 0,
      paddingLeft: 153.6,
      paddingRight: 153.6,
      bottom: 86.4,
      alignItems: "center",
      textAlign: "center",
    });
    expect(captionPlacement({}, WIDE).transform).toBeUndefined();
    // A vertical video's platform UI covers its right edge and bottom fifth.
    expect(captionPlacement({}, PORTRAIT)).toMatchObject({ paddingLeft: 129.6, paddingRight: 129.6, bottom: 384 });
  });

  it("each field written replaces that one of the default box", () => {
    // What style.position "top" was.
    const top = captionPlacement({ y: 86.4, origin: "top" }, WIDE);
    expect(top).toMatchObject({ top: 86.4, paddingLeft: 153.6, paddingRight: 153.6 });
    expect(top.transform).toBeUndefined();
    // What style.position "center", or a fraction of the height, was.
    expect(captionPlacement({ y: 1152, origin: "center" }, PORTRAIT)).toMatchObject({
      top: 1152,
      transform: "translate(0, -50%)",
    });
    // A width, centred where the default puts the block.
    expect(captionPlacement({ width: 300 }, PORTRAIT)).toMatchObject({
      paddingLeft: 390,
      paddingRight: 390,
      bottom: 384,
    });
  });

  it("places the block's origin at x and y, from the frame's top left", () => {
    expect(captionPlacement({ x: 40, y: 100, width: 300, origin: "topLeft" }, WIDE)).toMatchObject({
      paddingLeft: 40,
      paddingRight: 1580,
      top: 100,
    });
    expect(captionPlacement({ x: 1880, y: 1040, width: 300, origin: "bottomRight" }, WIDE)).toMatchObject({
      paddingLeft: 1580,
      paddingRight: 40,
      bottom: 40,
    });
    // A height fixes the block, so its top is known.
    expect(captionPlacement({ y: 540, height: 200, origin: "center" }, WIDE)).toMatchObject({ top: 440, height: 200 });
  });

  it("a box past the frame's edge is placed by its left and width", () => {
    expect(captionPlacement({ x: -100, width: 600, origin: "topLeft" }, WIDE)).toMatchObject({
      left: -100,
      width: 600,
    });
  });

  it("align is the side the lines sit against", () => {
    expect(captionPlacement({ align: "left" }, WIDE)).toMatchObject({ alignItems: "flex-start", textAlign: "left" });
    expect(captionPlacement({ align: "right" }, WIDE)).toMatchObject({ alignItems: "flex-end", textAlign: "right" });
  });
});

describe("captionPlace", () => {
  it("keeps what is a placement and drops what is not", () => {
    expect(captionPlace({ box: { x: 10, y: "low", width: Number.NaN, origin: "middle" }, align: "middle" })).toEqual({
      x: 10,
    });
    expect(captionPlace({ box: { y: 0, origin: "center", width: 400 }, align: "left" })).toEqual({
      y: 0,
      width: 400,
      origin: "center",
      align: "left",
    });
    // The flat x, y and width of old files are not a placement: the lint fix moves them into box.
    expect(captionPlace({ x: 10, y: 20, width: 300 })).toEqual({});
  });
});
