// @vitest-environment node
import { motionAt, STILL } from "../src/model/motion";
import type { Matrix2D } from "../src/model/transform";

const W = 200,
  H = 100;
const at = (m: Matrix2D, x: number, y: number): [number, number] => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
const fade = { type: "fade", duration: 1, easing: "linear" };

describe("motionAt", () => {
  it("is still with no entrance or exit, and once they are over", () => {
    expect(motionAt(undefined, undefined, 1, 5, W, H)).toBe(STILL);
    expect(motionAt(fade, fade, 2, 5, W, H)).toBe(STILL);
    expect(motionAt({ type: "none" }, undefined, 0, 5, W, H)).toBe(STILL);
  });

  it("fades in and out over each animation's own duration", () => {
    expect(motionAt(fade, undefined, 0.25, 5, W, H).opacity).toBeCloseTo(0.25);
    expect(motionAt(undefined, { ...fade, duration: 2 }, 4.5, 5, W, H).opacity).toBeCloseTo(0.25);
    // A short element plays both at once; the effects multiply.
    expect(motionAt(fade, fade, 0.5, 1, W, H).opacity).toBeCloseTo(0.25);
  });

  it("follows the animation's easing, ease-out by default", () => {
    expect(motionAt({ type: "fade", duration: 1 }, undefined, 0.5, 5, W, H).opacity).toBeGreaterThan(0.6);
    expect(motionAt({ type: "fade", duration: 1, easing: "ease-in" }, undefined, 0.5, 5, W, H).opacity).toBeLessThan(
      0.4,
    );
  });

  it("slides a quarter of the element's size, capped, toward its place", () => {
    const m = motionAt({ type: "slide-left", duration: 1, easing: "linear" }, undefined, 0.5, 5, W, H).matrix;
    expect(at(m, 0, 0)[0]).toBeCloseTo(W * 0.25 * 0.5);
    const up = motionAt({ type: "slide-up", duration: 1, easing: "linear" }, undefined, 0, 5, W, H).matrix;
    expect(at(up, 0, 0)[1]).toBeCloseTo(H * 0.25);
    const wide = motionAt({ type: "slide-right", duration: 1, easing: "linear" }, undefined, 0, 5, 1920, 1080).matrix;
    expect(at(wide, 0, 0)[0]).toBeCloseTo(-160);
  });

  it("scales, rotates, pops and flips about the element's centre", () => {
    for (const type of ["scale", "rotate", "pop", "bounce", "elastic", "flip-horizontal", "flip-vertical"]) {
      const m = motionAt({ type, duration: 1 }, undefined, 0.3, 5, W, H).matrix;
      const [x, y] = at(m, W / 2, H / 2);
      expect(x, type).toBeCloseTo(W / 2);
      expect(y, type).toBeCloseTo(H / 2);
    }
    const pop = motionAt({ type: "pop", duration: 1 }, undefined, 0.6, 5, W, H).matrix;
    expect(pop.a).toBeGreaterThan(1); // overshoots
    const flip = motionAt({ type: "flip-horizontal", duration: 1, easing: "linear" }, undefined, 0.5, 5, W, H).matrix;
    expect(flip.a).toBeCloseTo(Math.SQRT1_2);
    expect(flip.d).toBeCloseTo(1);
  });

  it("wipes and reveals with clip rectangles in the element's pixels", () => {
    const clip = (type: string) => motionAt({ type, duration: 1, easing: "linear" }, undefined, 0.25, 5, W, H).clip;
    expect(clip("wipe-right")).toEqual([{ x: 0, y: 0, w: 50, h: 100 }]);
    expect(clip("wipe-left")).toEqual([{ x: 150, y: 0, w: 50, h: 100 }]);
    expect(clip("wipe-down")).toEqual([{ x: 0, y: 0, w: 200, h: 25 }]);
    expect(clip("wipe-up")).toEqual([{ x: 0, y: 75, w: 200, h: 25 }]);
    expect(clip("reveal-center")).toEqual([{ x: 75, y: 37.5, w: 50, h: 25 }]);
    expect(clip("reveal-edges")).toEqual([
      { x: 0, y: 0, w: 25, h: 100 },
      { x: 175, y: 0, w: 25, h: 100 },
    ]);
    // A wipe in and a wipe out at once show only what both show.
    const both = motionAt(
      { type: "wipe-right", duration: 1, easing: "linear" },
      { type: "wipe-left", duration: 1, easing: "linear" },
      0.5,
      1,
      W,
      H,
    ).clip;
    expect(both).toEqual([{ x: 100, y: 0, w: 0, h: 100 }].filter((r) => r.w > 0));
  });

  it("draws strokes by progress", () => {
    expect(motionAt({ type: "draw", duration: 2, easing: "linear" }, undefined, 0.5, 5, W, H)).toMatchObject({
      draw: 0.25,
      opacity: 1,
    });
  });
});
