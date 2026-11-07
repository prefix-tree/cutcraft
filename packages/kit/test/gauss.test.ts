import { describe, expect, it } from "vitest";

import { gaussScale, gaussSources, gaussSteps } from "@cutcraft/kit";

describe("the shared Gaussian", () => {
  it("draws a blur of 4 px or more at half size, and of 8 px or more at a quarter", () => {
    expect([0, 3.9, 4, 7.9, 8, 200].map(gaussScale)).toEqual([1, 1, 0.5, 0.5, 0.25, 0.25]);
    expect(gaussSteps(2, "rgba").map((s) => s.scale)).toEqual([1, 1]);
    expect(gaussSteps(5, "rgba").map((s) => s.scale)).toEqual([0.5, 0.5, 0.5]);
    expect(gaussSteps(20, "rgba").map((s) => s.scale)).toEqual([0.5, 0.25, 0.25, 0.25]);
  });

  it("reads the plain picture one tap per pixel at full size, and in linear pairs once it is premultiplied", () => {
    const [, , xPlain, xPremultiplied, y] = gaussSources("rgba");
    expect(gaussSteps(2, "rgba").map((s) => s.source)).toEqual([xPlain, y]);
    expect(gaussSteps(5, "rgba")[1]?.source).toBe(xPremultiplied);
    expect(xPlain).toContain("i++");
    expect(xPremultiplied).toContain("i += 2");
    expect(y).toContain("i += 2");
  });

  it("covers, with a box, what each next step reads: the box, then as far as the blur reaches", () => {
    const box = [0.4, 0.4, 0.2, 0.2] as const;
    const margins = gaussSteps(10, "rgba", "radius", "clamp", box).map((s) => s.region?.margin);
    // σ 10 reaches 30 px; at a quarter a texel is 4 px, and 4 texels more cover the linear reads.
    expect(margins).toEqual([76, 76, 46, 16]);
    expect(gaussSteps(10, "rgba").every((s) => !s.region)).toBe(true);
  });

  it("reads its σ from the param it is given", () => {
    expect(gaussSources("alpha", "size").every((s) => !s.includes("params.radius"))).toBe(true);
    expect(gaussSources("alpha", "size").some((s) => s.includes("params.size"))).toBe(true);
  });
});
