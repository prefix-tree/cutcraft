// An easing name in free code is a string a model or a person types: a wrong one eases linearly (or with the helper's
// own default), and never reaches a function every object inherits.
import { describe, expect, it } from "vitest";

import { progress } from "../src/diagram/progress";
import { ease, easingCurve } from "../src/easing";
import { interpolate } from "../src/jsx/animate";

const INHERITED = ["toString", "constructor", "valueOf", "hasOwnProperty", "__proto__"];

describe("easing names", () => {
  it("are no easing when inherited from Object", () => {
    for (const name of INHERITED) expect(easingCurve(name)).toBeUndefined();
  });

  it("ease() is linear for an inherited or unknown name", () => {
    for (const name of [...INHERITED, "power2.out", "bounce"]) expect(ease(name, 0.25)).toBe(0.25);
  });

  it("interpolate() is linear for them", () => {
    for (const name of [...INHERITED, "power2.out"])
      expect(interpolate(0.5, [0, 1], [0, 100], { easing: name as never })).toBe(50);
  });

  it("progress() keeps its own easeInOut for them", () => {
    const clock = { time: 0.1, elapsed: 0.1 };
    const expected = progress(clock, { over: 0.4 });
    for (const name of [...INHERITED, "power2.out"]) {
      const value = progress(clock, { over: 0.4, easing: name as never });
      expect(typeof value).toBe("number");
      expect(value).toBe(expected);
    }
  });

  it("still eases with a real name", () => {
    expect(ease("easeOut", 0.5)).toBeGreaterThan(0.5);
    expect(interpolate(0.5, [0, 1], [0, 100], { easing: "easeIn" })).toBeLessThan(50);
  });
});
