import { describe, expect, it } from "vitest";
import { EASING_FN, interpolate, random, spring } from "@cutcut/kit";

describe("interpolate", () => {
  it("maps across a range, piecewise", () => {
    expect(interpolate(0.5, [0, 1], [10, 20])).toBe(15);
    expect(interpolate(1.5, [0, 1, 3], [0, 1, 0])).toBe(0.75);
    expect(interpolate(3, [0, 1, 3], [0, 1, 0])).toBe(0);
  });

  it("extends past the ends unless clamped", () => {
    expect(interpolate(2, [0, 1], [0, 10])).toBe(20);
    expect(interpolate(-1, [0, 1], [0, 10])).toBe(-10);
    expect(interpolate(2, [0, 1], [0, 10], { extrapolateRight: "clamp" })).toBe(10);
    expect(interpolate(-1, [0, 1], [0, 10], { extrapolateLeft: "clamp" })).toBe(0);
  });

  it("eases inside a segment only", () => {
    expect(interpolate(0.5, [0, 1], [0, 100], { easing: "easeInQuad" })).toBeCloseTo(25);
    expect(interpolate(2, [0, 1], [0, 100], { easing: "easeInQuad" })).toBe(200);
  });

  it("refuses ranges it cannot read", () => {
    expect(() => interpolate(0, [0], [0])).toThrow(/at least two/);
    expect(() => interpolate(0, [0, 1], [0])).toThrow(/same length/);
    expect(() => interpolate(0, [1, 0], [0, 1])).toThrow(/increasing/);
  });
});

describe("spring", () => {
  it("starts at from, overshoots, and settles at to", () => {
    expect(spring({ time: 0, from: 10, to: 20 })).toBe(10);
    const peak = Math.max(...Array.from({ length: 200 }, (_, i) => spring({ time: i / 100 })));
    expect(peak).toBeGreaterThan(1.1);
    expect(spring({ time: 3 })).toBeCloseTo(1, 4);
  });

  it("clamps the overshoot, in either direction", () => {
    for (let i = 0; i < 200; i++) {
      expect(spring({ time: i / 100, overshootClamping: true })).toBeLessThanOrEqual(1);
      expect(spring({ time: i / 100, from: 1, to: 0, overshootClamping: true })).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not overshoot when critically or over-damped", () => {
    for (const damping of [20, 40]) {
      const values = Array.from({ length: 300 }, (_, i) => spring({ time: i / 100, damping }));
      expect(Math.max(...values)).toBeLessThanOrEqual(1);
      expect(values.at(-1)).toBeCloseTo(1, 2);
    }
  });
});

describe("the spring easing", () => {
  it("runs 0 to 1 with an overshoot between", () => {
    expect(EASING_FN.spring(0)).toBe(0);
    expect(EASING_FN.spring(1)).toBe(1);
    expect(EASING_FN.spring(0.99)).toBeCloseTo(1, 2);
    expect(Math.max(...Array.from({ length: 100 }, (_, i) => EASING_FN.spring(i / 100)))).toBeGreaterThan(1.1);
  });
});

describe("random", () => {
  it("is fixed by its seed and spread over [0, 1)", () => {
    expect(random("star-3")).toBe(random("star-3"));
    expect(random(7)).toBe(random(7));
    expect(random("a")).not.toBe(random("b"));
    const values = Array.from({ length: 1000 }, (_, i) => random(i));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    expect(values.reduce((a, b) => a + b, 0) / 1000).toBeCloseTo(0.5, 1);
  });
});
