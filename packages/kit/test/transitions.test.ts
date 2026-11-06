import { describe, expect, it } from "vitest";

import { collectModule, resolve, transition } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const stateOf = (transition: string) =>
  resolve(
    collectModule(
      loadModule(`import { Clip, Composition, Track, Transition } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="a" src="asset:city" in={0} out={3} />${transition}<Clip id="b" src="asset:city" in={3} out={6} /></Track></Composition>; }`) as never,
    ),
    manifest,
  );

describe("the shader transitions", () => {
  it("fill their defaults", () => {
    const params = (t: string) => {
      const state = stateOf(t);
      expect(state.errors).toEqual([]);
      return state.items.get("x")?.props.params;
    };
    expect(params(`<Transition id="x" type="iris" params={{ sides: 6 }} />`)).toEqual({
      sides: 6,
      star: 0,
      rotation: 0,
      center: [0.5, 0.5],
      feather: 2,
    });
    expect(params(`<Transition id="x" type="clockWipe" />`)).toEqual({
      startAngle: 0,
      direction: 1,
      center: [0.5, 0.5],
      feather: 1,
    });
    expect(params(`<Transition id="x" type="blinds" />`)).toEqual({ slats: 12, angle: 0, feather: 0.1 });
    expect(params(`<Transition id="x" type="filmBurn" />`)).toEqual({
      seed: 0,
      center: [0.5, 0.5],
      scale: 120,
      edge: 24,
      color: "#ff7a1a",
    });
    expect(params(`<Transition id="x" type="pixelDissolve" />`)).toEqual({
      columns: 16,
      rows: 9,
      seed: 0,
      feather: 0.15,
    });
    expect(params(`<Transition id="x" type="zoom" />`)).toEqual({ center: [0.5, 0.5], scale: 1.6, blur: 0.5 });
  });

  it("say what is wrong with their params", () => {
    const state = stateOf(`<Transition id="x" type="blinds" params={{ slats: 0, shape: "round" }} />`);
    expect(state.errors.map((e) => `${e.id}.${e.prop}`)).toEqual(["x.params"]);
    expect(state.errors[0]?.message).toContain("invalid params for blinds");
  });

  it("are built in, so a file cannot declare its own under their names", () => {
    expect(() => transition({ name: "iris", shader: "vec4 transition(vec2 uv) { return texture(to, uv); }" })).toThrow(
      "is built in",
    );
  });
});
