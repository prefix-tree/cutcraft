import { collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";
import { buildFramePlan } from "@cutcraft/player";

import { declare, fragmentSource, uniformValue } from "../src/render/shaders";

const manifest = {
  assets: { city: { id: "city", kind: "video" as const, duration: 10, fps: 30, width: 640, height: 360 } },
};
const stateOf = (body: string, declarations: string) =>
  resolve(
    collectModule(
      loadModule(`import { z } from "zod";
import { Adjustment, Clip, Composition, effect, transition, Effect, Keyframe, Track, Transition } from "@cutcraft/kit";
${declarations}
export default function V() { return <Composition fps={30} width={640} height={360}>${body}</Composition>; }`) as never,
    ),
    manifest,
  );

const GLOW = `const glow = effect({ name: "soft-glow", params: z.object({ amount: z.number().default(0.5), tint: z.string().default("#ff8800") }), shader: "vec4 effect(vec2 uv) { return texture(image, uv) * params.amount; }" });`;
const SWEEP = `const sweep = transition({ name: "sweep", shader: "vec4 transition(vec2 uv) { return uv.x < progress ? texture(to, uv) : texture(from, uv); }" });`;

describe("declared shaders in the frame plan", () => {
  it("attach a clip's declared effects, with keyframed params and the element's clock, after its CSS ones in file order", () => {
    const state = stateOf(
      `<Track id="t"><Clip id="c" src="asset:city" in={0} out={4}>
        <Effect id="b" type="sepia" params={{ amount: 0.5 }} />
        <Effect id="g" type={glow}>
          <Keyframe id="k1" param="amount" at={0} value={0} />
          <Keyframe id="k2" param="amount" at={2} value={1} />
        </Effect>
      </Clip></Track>`,
      GLOW,
    );
    expect(state.errors).toEqual([]);
    const op = buildFramePlan(state, 1).ops[0]!;
    expect(op.filter).toBe("");
    expect(op.fallbackFilter).toBe("sepia(0.5)");
    expect(op.shaders?.[0]).toMatchObject({ name: "css:sepia", builtIn: true });
    expect(op.shaders?.slice(1)).toEqual([
      {
        name: "soft-glow",
        sources: [expect.stringContaining("vec4 effect")],
        params: { amount: 0.5, tint: "#ff8800" },
        uniforms: [
          { name: "amount", kind: "float" },
          { name: "tint", kind: "string" },
        ],
        time: 1,
      },
    ]);
  });

  it("run a built-in shader effect as a pass after the CSS one before it, with the CSS look kept for a painter without WebGL", () => {
    const state = stateOf(
      `<Track id="t"><Clip id="c" src="asset:city" in={0} out={4}>
        <Effect id="b" type="grayscale" params={{ amount: 0.5 }} />
        <Effect id="l" type="levels" params={{ black: 0.2, gamma: 2 }} />
      </Clip></Track>`,
      "",
    );
    expect(state.errors).toEqual([]);
    const op = buildFramePlan(state, 1).ops[0]!;
    expect(op.filter).toBe("");
    expect(op.shaders?.map((p) => [p.name, p.builtIn, p.sources.length])).toEqual([
      ["css:grayscale", true, 1],
      ["levels", true, 1],
    ]);
    expect(op.shaders?.[1]?.params).toEqual({ black: 0.2, white: 1, gamma: 2 });
    expect(op.fallbackFilter).toMatch(/^grayscale\(0\.5\) brightness\([\d.]+\) contrast\([\d.]+\)$/);
  });

  it("give exposure, vibrance and white balance a CSS fallback, and curves none", () => {
    const state = stateOf(
      `<Track id="t"><Clip id="c" src="asset:city" in={0} out={4}>
        <Effect id="e" type="exposure" params={{ stops: 1 }} />
        <Effect id="v" type="vibrance" params={{ amount: 0.4 }} />
        <Effect id="w" type="whiteBalance" params={{ temperature: 0.3 }} />
        <Effect id="k" type="curves" />
      </Clip></Track>`,
      "",
    );
    expect(state.errors).toEqual([]);
    const op = buildFramePlan(state, 1).ops[0]!;
    expect(op.filter).toBe("");
    expect(op.fallbackFilter).toBe("brightness(2) saturate(1.2) sepia(0.15)");
    expect(op.shaders?.map((p) => p.name)).toEqual(["exposure", "vibrance", "whiteBalance", "curves"]);
    expect(op.shaders?.[3]?.tables?.(op.shaders[3].params).curve?.width).toBe(256);
  });

  it("move a keyframed box element by element, and step a value that is not a number list", () => {
    const state = stateOf(
      `<Track id="t"><Clip id="c" src="asset:city" in={0} out={4}>
        <Effect id="b" type="regionBlur">
          <Keyframe id="k1" param="box" at={0} value={[0, 0, 0.2, 0.4]} />
          <Keyframe id="k2" param="box" at={2} value={[0.6, 0.2, 0.2, 0.4]} />
        </Effect>
        <Effect id="k" type="colorKey">
          <Keyframe id="k3" param="color" at={0} value="#00ff00" />
          <Keyframe id="k4" param="color" at={2} value="#0000ff" />
        </Effect>
      </Clip></Track>`,
      "",
    );
    expect(state.errors).toEqual([]);
    const passes = buildFramePlan(state, 1).ops[0]!.shaders!;
    const box = passes[0]?.params.box as number[];
    [0.3, 0.1, 0.2, 0.4].forEach((v, i) => expect(box[i]).toBeCloseTo(v, 6));
    // Its 7 px blur at half size, over the box's part of the frame only, then the mask at full size over all of it.
    expect(passes[0]?.steps?.map((s) => [s.scale ?? 1, s.region !== undefined])).toEqual([
      [0.5, true],
      [0.5, true],
      [0.5, true],
      [1, false],
    ]);
    expect(passes[1]?.params.color).toBe("#00ff00");
  });

  it("give glow a CSS fallback, stacked for intensity, and outline none", () => {
    const state = stateOf(
      `<Track id="t"><Clip id="c" src="asset:city" in={0} out={4}>
        <Effect id="g" type="glow" params={{ radius: 10, intensity: 2, color: "#ff0000" }} />
        <Effect id="o" type="outline" />
      </Clip></Track>`,
      "",
    );
    expect(state.errors).toEqual([]);
    const op = buildFramePlan(state, 1).ops[0]!;
    expect(op.filter).toBe("");
    expect(op.fallbackFilter).toBe("drop-shadow(0 0 10px #ff0000) drop-shadow(0 0 10px #ff0000)");
  });

  it("carry every pass of an effect of several", () => {
    const state = stateOf(
      `<Track id="t"><Clip id="c" src="asset:city" in={0} out={4}><Effect id="s" type={soft} /></Clip></Track>`,
      `const soft = effect({ name: "soft", passes: ["vec4 effect(vec2 uv) { return texture(image, uv); }", "vec4 effect(vec2 uv) { return texture(original, uv); }"] });`,
    );
    const op = buildFramePlan(state, 1).ops[0]!;
    expect(op.shaders?.[0]?.sources).toHaveLength(2);
    expect(op.shaders?.[0]?.builtIn).toBeUndefined();
    expect(op.fallbackFilter).toBe("");
  });

  it("attach an adjustment's declared effects", () => {
    const state = stateOf(
      `<Track id="t"><Clip id="c" src="asset:city" in={0} out={4} /></Track>
       <Track id="fx" layout="free"><Adjustment id="a" start={0} duration={4}><Effect id="g" type={glow} /></Adjustment></Track>`,
      GLOW,
    );
    expect(
      buildFramePlan(state, 1)
        .ops.find((o) => o.id === "a")
        ?.shaders?.map((s) => s.name),
    ).toEqual(["soft-glow"]);
  });

  it("give both sides of a built-in shader transition its pass, and the crossfade's opacity to fall back on", () => {
    const shaded = stateOf(
      `<Track id="t"><Clip id="a" src="asset:city" in={0} out={2} /><Transition id="x" type="iris" duration={1} /><Clip id="b" src="asset:city" in={0} out={2} /></Track>`,
      "",
    );
    const faded = stateOf(
      `<Track id="t"><Clip id="a" src="asset:city" in={0} out={2} /><Transition id="x" type="crossfade" duration={1} params={{ curve: "linear" }} /><Clip id="b" src="asset:city" in={0} out={2} /></Track>`,
      "",
    );
    expect(shaded.errors).toEqual([]);
    const x = shaded.items.get("x")!;
    const t = x.start + 0.3 * x.duration;
    const ops = buildFramePlan(shaded, t).ops;
    expect(ops.map((o) => [o.id, o.transition?.name, o.transition?.builtIn, o.transition?.role, o.opacity])).toEqual([
      ["a", "iris", true, "out", 1],
      ["b", "iris", true, "in", 1],
    ]);
    const crossfade = buildFramePlan(faded, t).ops;
    expect(ops.map((o) => o.fallbackOpacity)).toEqual(crossfade.map((o) => o.opacity));
    expect(ops[1]?.fallbackOpacity).toBeCloseTo(0.3, 6);
  });

  it("give both sides of a declared transition its pass, in place of the built-in look", () => {
    const state = stateOf(
      `<Track id="t"><Clip id="a" src="asset:city" in={0} out={2} /><Transition id="x" type={sweep} duration={1} /><Clip id="b" src="asset:city" in={0} out={2} /></Track>`,
      SWEEP,
    );
    const x = state.items.get("x")!;
    const ops = buildFramePlan(state, (x.start + x.end) / 2).ops;
    expect(ops.map((o) => [o.id, o.transition?.role, o.transition?.paired, o.opacity])).toEqual([
      ["a", "out", true, 1],
      ["b", "in", true, 1],
    ]);
    expect(ops[1]?.transition?.progress).toBeGreaterThan(0.3);
    expect(ops[1]?.transition?.progress).toBeLessThan(0.7);
    expect(ops[1]?.clip).toBeUndefined();
  });
});

describe("the shader runner's program", () => {
  it("declares each param by its schema's kind, settling a string or a list by its value", () => {
    const uniforms = [
      { name: "amount", kind: "float" },
      { name: "on", kind: "bool" },
      { name: "at", kind: "vec2" },
      { name: "tint", kind: "colour" },
      { name: "dir", kind: "enum", options: ["left", "right"] },
      { name: "lut", kind: "asset" },
      { name: "any", kind: "string" },
      { name: "list", kind: "numbers" },
    ] as const;
    const kinds = (params: Record<string, unknown>) =>
      declare(uniforms, params, (ref) => (ref === "asset:cube" ? "3d" : ref === "asset:pic" ? "2d" : undefined)).map(
        (d) => `${d.name}:${d.glsl}`,
      );
    expect(kinds({ lut: "asset:cube", any: "#fff", list: [1, 2, 3] })).toEqual([
      "amount:float",
      "on:bool",
      "at:vec2",
      "tint:vec3",
      "dir:int",
      "lut:sampler3D",
      "any:vec3",
      "list:vec3",
    ]);
    // An asset not loaded, a string that is neither, and a list of the wrong length reach no uniform.
    expect(kinds({ lut: "asset:missing", any: "orange", list: [1] })).not.toContain("lut:sampler3D");
    expect(kinds({ any: "asset:pic" })).toContain("any:sampler2D");
  });

  it("sets each value as its declared uniform takes it", () => {
    expect(uniformValue({ name: "a", glsl: "float" }, 0.5)).toEqual([0.5]);
    expect(uniformValue({ name: "a", glsl: "bool" }, true)).toEqual([1]);
    expect(uniformValue({ name: "a", glsl: "int", options: ["l", "r"] }, "r")).toEqual([1]);
    expect(uniformValue({ name: "a", glsl: "int", options: ["l", "r"] }, "up")).toBeNull();
    expect(uniformValue({ name: "a", glsl: "vec3" }, "#ff8800")).toEqual([1, 136 / 255, 0]);
    expect(uniformValue({ name: "a", glsl: "vec3" }, "#f80")).toEqual([1, 136 / 255, 0]);
    expect(uniformValue({ name: "a", glsl: "vec3" }, [1, 2, 3])).toEqual([1, 2, 3]);
    expect(uniformValue({ name: "a", glsl: "vec2" }, [1, 2, 3])).toBeNull();
  });

  it("wraps the declared function with its inputs and declared uniforms, and premultiplies what it returns", () => {
    const declared = [
      { name: "amount", glsl: "float" },
      { name: "tint", glsl: "vec3" },
      { name: "time", glsl: "float" },
      { name: "image", glsl: "float" },
      { name: "dir", glsl: "int", options: ["left", "right"] },
      { name: "bad name", glsl: "float" },
    ] as const;
    const effect = fragmentSource(
      "effect",
      "vec4 effect(vec2 uv) { return params.dir == params.dir.right ? texture(image, uv) * params.amount : vec4(params.tint.r); }",
      declared,
    );
    expect(effect).toContain("uniform sampler2D image;\nuniform sampler2D original;");
    expect(effect).toContain("uniform float cc_param_amount;");
    expect(effect).toContain("uniform vec3 cc_param_tint;");
    expect(effect).toContain("uniform int cc_param_dir;");
    // A param may take an input's name: it is read as params.NAME, never as the bare name.
    expect(effect).toContain("uniform float cc_param_time;");
    expect(effect).toContain("uniform float cc_param_image;");
    // An enum's option is its index; a vec's swizzle is left alone.
    expect(effect).toContain("cc_param_dir == 1 ? texture(image, uv) * cc_param_amount : vec4(cc_param_tint.r)");
    expect(effect).not.toContain("bad name");
    expect(effect).toContain("cutcraft_out = vec4(c.rgb * c.a, c.a);");
    // The text depends on how the uniforms are declared, never on their values.
    expect(fragmentSource("effect", "vec4 effect(vec2 uv) { return vec4(params.amount); }", declared)).toBe(
      fragmentSource("effect", "vec4 effect(vec2 uv) { return vec4(params.amount); }", [...declared]),
    );
    const curve = fragmentSource("effect", "vec4 effect(vec2 uv) { return texture(curve, uv); }", [], true, [
      "curve",
      "image",
    ]);
    expect(curve).toContain("uniform highp sampler2D curve;");
    expect(curve).not.toContain("uniform highp sampler2D image;");
    const between = fragmentSource("effect", "vec4 effect(vec2 uv) { return texture(image, uv); }", [], false);
    expect(between).toContain("cutcraft_out = c;");
    const transition = fragmentSource("transition", "vec4 transition(vec2 uv) { return texture(to, uv); }", []);
    expect(transition).toContain("uniform sampler2D from;\nuniform sampler2D to;\nuniform float progress;");
    expect(transition).toContain("vec4 c = transition(cutcraft_uv);");
  });
});
