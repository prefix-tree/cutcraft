import { describe, expect, it } from "vitest";
import { z } from "zod";

import { builtInShader, builtInTransition, EFFECTS, isNeutral } from "@cutcraft/kit";

import { colorTransform, maskTransition } from "../src/effects/shapes";

describe("the shapes built-ins share", () => {
  it("colorTransform wraps a function of colour alone, keeps alpha, and keeps the function for fusing", () => {
    const def = colorTransform({
      name: "warm",
      params: z.object({ amount: z.number().default(0) }),
      rgb: "  return c + vec3(params.amount, 0.0, 0.0);",
      neutral: { amount: 0 },
    });
    expect(def.colour.fn).toBe("cc_warm");
    expect(def.colour.code).toContain("vec3 cc_warm(vec3 c) {");
    expect(def.passes[0]).toContain("return vec4(cc_warm(c.rgb), c.a);");
    expect(def.neutral).toEqual({ amount: 0 });
  });

  it("the colour built-ins are colour transforms, and shadowsHighlights is not", () => {
    for (const type of ["levels", "lut", "exposure", "vibrance", "whiteBalance", "duotone", "curves"])
      expect([type, "colour" in (builtInShader(type) ?? {})]).toEqual([type, true]);
    expect("colour" in (builtInShader("shadowsHighlights") ?? {})).toBe(false);
  });

  it("maskTransition blends the two clips by its mask", () => {
    const def = maskTransition({ name: "half", params: z.object({}), mask: "  return step(0.5, uv.x);" });
    expect(def.passes[0]).toContain("float cc_mask(vec2 uv) {");
    expect(def.passes[0]).toContain("return mix(texture(from, uv), texture(to, uv), cc_mask(uv));");
    for (const type of ["iris", "clockWipe", "blinds", "pixelDissolve"])
      expect([type, builtInTransition(type)?.passes[0]?.includes("cc_mask(uv)")]).toEqual([type, true]);
  });
});

describe("neutral params", () => {
  it("are declared on the built-ins that have them, and checked item by item", () => {
    expect(isNeutral("exposure", { stops: 0 })).toBe(true);
    expect(isNeutral("exposure", { stops: 0.1 })).toBe(false);
    expect(isNeutral("levels", { black: 0, white: 1, gamma: 1 })).toBe(true);
    expect(isNeutral("levels", { black: 0, white: 0.9, gamma: 1 })).toBe(false);
    const line = [
      [0, 0],
      [1, 1],
    ];
    expect(isNeutral("curves", { rgb: line, red: line, green: line, blue: line })).toBe(true);
    expect(
      isNeutral("curves", {
        rgb: [
          [0, 0.1],
          [1, 1],
        ],
        red: line,
        green: line,
        blue: line,
      }),
    ).toBe(false);
  });

  it("are never claimed for a type that declares none, or is not built in", () => {
    expect(isNeutral("colorKey", {})).toBe(false);
    expect(isNeutral("outline", { width: 0 })).toBe(false);
    expect(isNeutral("nope", {})).toBe(false);
  });

  it("are params each effect actually takes", () => {
    for (const [type, entry] of Object.entries(EFFECTS)) {
      const neutral = (entry as { neutral?: Record<string, unknown> }).neutral;
      if (!neutral) continue;
      const shape = entry.params.shape as Record<string, unknown>;
      expect([type, Object.keys(neutral).every((k) => k in shape)]).toEqual([type, true]);
    }
  });
});
