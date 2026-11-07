import { describe, expect, it } from "vitest";
import { z } from "zod";

import { builtInTransition, effect, uniformsOf } from "@cutcraft/kit";

import { glsl, glslModule } from "../src/effects/glsl";

describe("uniforms typed by the schema", () => {
  it("give each param the kind its schema says, once", () => {
    const params = z.object({
      amount: z.number().default(1),
      count: z.number().int().default(3),
      on: z.boolean().default(false),
      at: z.tuple([z.number(), z.number()]).default([0.5, 0.5]),
      box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      tint: z
        .string()
        .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
        .default("#fff"),
      lut: z.string().regex(/^asset:/),
      dir: z.enum(["left", "right"]).default("left"),
      any: z.string(),
      list: z.array(z.number()),
      curve: z.array(z.tuple([z.number(), z.number()])),
    });
    expect(uniformsOf(params)).toEqual([
      { name: "amount", kind: "float" },
      { name: "count", kind: "float" },
      { name: "on", kind: "bool" },
      { name: "at", kind: "vec2" },
      { name: "box", kind: "vec4" },
      { name: "tint", kind: "colour" },
      { name: "lut", kind: "asset" },
      { name: "dir", kind: "enum", options: ["left", "right"] },
      { name: "any", kind: "string" },
      { name: "list", kind: "numbers" },
    ]);
  });

  it("let a shader name an enum's options, and refuse an option it does not have", () => {
    expect(builtInTransition("clockWipe")?.uniforms.find((u) => u.name === "direction")).toEqual({
      name: "direction",
      kind: "enum",
      options: ["clockwise", "counterclockwise", "both"],
    });
    const params = z.object({ dir: z.enum(["left", "right"]).default("left") });
    expect(() =>
      effect({ name: "x", params, shader: "vec4 effect(vec2 uv) { return vec4(params.dir == params.dir.up); }" }),
    ).toThrow('params.dir has no option "up": it has left, right');
  });

  it("refuse a shader that reads a param no uniform can carry", () => {
    const params = z.object({ curve: z.array(z.tuple([z.number(), z.number()])) });
    expect(() => effect({ name: "x", params, shader: "vec4 effect(vec2 uv) { return vec4(params.curve); }" })).toThrow(
      "params.curve cannot reach a shader",
    );
  });
});

describe("GLSL modules", () => {
  it("place each module a source uses, and theirs, once and in order, before its code", () => {
    const a = glslModule("a", "float a() { return 1.0; }\n");
    const b = glslModule("b", "float b() { return a(); }\n", a);
    const c = glslModule("c", "float c() { return a() + b(); }\n", a, b);
    const source = glsl`${c}${b}vec4 effect(vec2 uv) { return vec4(${0.5}); }`;
    expect(source).toBe(
      "float a() { return 1.0; }\nfloat b() { return a(); }\nfloat c() { return a() + b(); }\nvec4 effect(vec2 uv) { return vec4(0.5); }",
    );
  });
});
