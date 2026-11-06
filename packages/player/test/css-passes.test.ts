import { collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

import { cssColour, cssFunctions, cssPasses } from "../src/model/css-passes";
import { effectPipeline } from "../src/model/shaders";

const manifest = {
  assets: { city: { id: "city", kind: "video" as const, duration: 10, fps: 30, width: 640, height: 360 } },
};
const stateOf = (children: string, declarations = "") =>
  resolve(
    collectModule(
      loadModule(`import { z } from "zod";
import { Clip, ColorGrade, Composition, effect, Effect, Track } from "@cutcraft/kit";
${declarations}
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:city" in={0} out={4}>${children}</Clip></Track></Composition>; }`) as never,
    ),
    manifest,
  );
const pipelineOf = (children: string, options: { shaders: boolean; transition?: boolean }, declarations = "") => {
  const state = stateOf(children, declarations);
  expect(state.errors).toEqual([]);
  const clip = state.items.get("c")!;
  const kids = clip.children.map((id) => state.items.get(id)!);
  return effectPipeline(state, kids, "c", 1, options);
};

describe("CSS filters as passes", () => {
  it("split a filter string at its functions, keeping a colour's own parentheses", () => {
    expect(cssFunctions("brightness(1.2) drop-shadow(0px 4px 8px rgba(0,0,0,0.5)) hue-rotate(5deg)")).toEqual([
      { name: "brightness", args: "1.2" },
      { name: "drop-shadow", args: "0px 4px 8px rgba(0,0,0,0.5)" },
      { name: "hue-rotate", args: "5deg" },
    ]);
  });

  it("make one pass per function, with the spec's numbers", () => {
    const passes = cssPasses(
      "brightness(0.9) contrast(1.5) invert(0.25) saturate(2) hue-rotate(90deg) sepia(1) grayscale(0.5) blur(3px) drop-shadow(2px 4px 6px #ff000080)",
      1,
    );
    expect(passes.map((p) => [p.name, p.sources.length])).toEqual([
      ["css:brightness", 1],
      ["css:contrast", 1],
      ["css:invert", 1],
      ["css:saturate", 1],
      ["css:hue-rotate", 1],
      ["css:sepia", 1],
      ["css:grayscale", 1],
      ["css:blur", 2],
      ["css:drop-shadow", 3],
    ]);
    expect(passes[0]?.params).toEqual({ slope: 0.9, offset: 0 });
    expect(passes[1]?.params).toEqual({ slope: 1.5, offset: -0.25 });
    expect(passes[2]?.params).toEqual({ slope: 0.5, offset: 0.25 });
    // saturate(2): the matrix's first row, 0.213 + 0.787·2 and so on.
    expect(passes[3]?.params.r0).toEqual([0.213 + 1.574, 0.715 - 1.43, 0.072 - 0.144]);
    // A full sepia is the spec's matrix.
    expect(passes[5]?.params.r0).toEqual([0.393, 0.769, 0.189]);
    expect(passes[7]?.params).toEqual({ sigma: 3 });
    expect(passes[8]?.params).toEqual({ sigma: 6, offset: [2, 4], color: [1, 0, 0, 128 / 255] });
    expect(passes.every((p) => p.builtIn && p.time === 1)).toBe(true);
  });

  it("read the colours the player writes", () => {
    expect(cssColour("#f80")).toEqual([1, 136 / 255, 0, 1]);
    expect(cssColour("rgba(0,0,0,0.5)")).toEqual([0, 0, 0, 0.5]);
    expect(cssColour("rgb(255 0 0 / 50%)")).toEqual([1, 0, 0, 0.5]);
  });
});

describe("the effect pipeline", () => {
  it("keeps one CSS filter when nothing on the element needs a shader", () => {
    const p = pipelineOf(
      `<Effect id="a" type="brightness" params={{ amount: 0.1 }} /><Effect id="b" type="blur" params={{ radius: 2 }} />`,
      {
        shaders: true,
      },
    );
    expect(p).toEqual({ filter: "brightness(1.1) blur(2px)" });
  });

  it("runs every effect as a pass in file order once one needs a shader, and keeps the CSS look as the fallback", () => {
    const p = pipelineOf(
      `<Effect id="a" type="brightness" params={{ amount: 0.1 }} /><Effect id="b" type="levels" params={{ gamma: 1.2 }} /><ColorGrade id="g" tint={0.2} /><Effect id="v" type="vibrance" params={{ amount: 0.5 }} />`,
      { shaders: true },
    );
    expect(p.filter).toBe("");
    expect(p.shaders?.map((s) => s.name)).toEqual(["css:brightness", "levels", "css:hue-rotate", "vibrance"]);
    expect(p.fallbackFilter).toMatch(
      /^brightness\(1\.1\) brightness\([\d.]+\) contrast\([\d.]+\) hue-rotate\(5deg\) saturate\(1\.25\)$/,
    );
  });

  it("runs CSS effects as passes before a shader transition, so they do not reach the other clip", () => {
    const p = pipelineOf(`<Effect id="a" type="sepia" />`, { shaders: true, transition: true });
    expect(p.filter).toBe("");
    expect(p.shaders?.map((s) => s.name)).toEqual(["css:sepia"]);
  });

  it("draws as CSS where shaders cannot run, leaving only the passes that have no CSS form", () => {
    const p = pipelineOf(
      `<Effect id="a" type="brightness" params={{ amount: 0.1 }} /><Effect id="b" type="levels" /><Effect id="o" type={own} /><Effect id="k" type="curves" />`,
      { shaders: false },
      `const own = effect({ name: "own", shader: "vec4 effect(vec2 uv) { return texture(image, uv); }" });`,
    );
    expect(p.filter).toMatch(/^brightness\(1\.1\) brightness\(1\) contrast\(1\)$/);
    expect(p.shaders?.map((s) => s.name)).toEqual(["own", "curves"]);
  });
});
