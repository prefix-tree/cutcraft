import { describe, expect, it } from "vitest";

import { builtInShader, collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const stateOf = (effects: string) =>
  resolve(
    collectModule(
      loadModule(`import { Composition, Effect, Title, Track } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t" layout="free"><Title id="h" start={0} duration={2}>Hi${effects}</Title></Track></Composition>; }`) as never,
    ),
    { assets: {} },
  );

describe("the title effects", () => {
  it("fill their defaults on a title", () => {
    const state = stateOf(`<Effect id="g" type="glow" />
      <Effect id="o" type="outline" params={{ width: 4 }} />
      <Effect id="l" type="longShadow" params={{ fade: true }} />
      <Effect id="b" type="bevel" />`);
    expect(state.errors).toEqual([]);
    const params = (id: string) => state.items.get(id)?.props.params;
    expect(params("g")).toEqual({ radius: 20, intensity: 1, threshold: 0, color: "#ffffff", tint: 1 });
    expect(params("o")).toEqual({ width: 4, color: "#ffffff", opacity: 1, outlineOnly: false });
    expect(params("l")).toEqual({ reach: 240, angle: 45, color: "#777777", opacity: 1, fade: true });
    expect(params("b")).toEqual({ size: 4, angle: -60, intensity: 0.4, highlight: "#ffffff", shade: "#000000" });
  });

  it("say what is out of range", () => {
    const state = stateOf(`<Effect id="g" type="glow" params={{ intensity: 9 }} />
      <Effect id="o" type="outline" params={{ width: 100 }} />`);
    expect(state.errors.map((e) => `${e.id}.${e.prop}`)).toEqual(["g.params.intensity", "o.params.width"]);
  });

  it("glow and bevel blur in passes; outline and longShadow are one", () => {
    expect(builtInShader("glow")?.passes).toHaveLength(4);
    expect(builtInShader("bevel")?.passes).toHaveLength(3);
    expect(builtInShader("outline")?.passes).toHaveLength(1);
    expect(builtInShader("longShadow")?.passes).toHaveLength(1);
  });
});
