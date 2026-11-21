import { describe, expect, it } from "vitest";

import { builtInShader } from "@uberscene/kit/schema";
import { collectModule, loadModule, resolve } from "@uberscene/sdk";

const stateOf = (effects: string) =>
  resolve(
    collectModule(
      loadModule(`import { Composition, Title, Track } from "@uberscene/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t" layout="free"><Title id="h" start={0} duration={2} effects={[${effects}]}>Hi</Title></Track></Composition>; }`) as never,
    ),
    { assets: {} },
  );

describe("the title effects", () => {
  it("fill their defaults on a title", () => {
    const state = stateOf(`{ type: "glow" },
      { type: "outline", thickness: 4 },
      { type: "longShadow", fade: true },
      { type: "bevel" }`);
    expect(state.errors).toEqual([]);
    const params = (n: number) => state.items.get(`h.effects.${n}`)?.props.params;
    expect(params(0)).toEqual({ radius: 7, intensity: 1, threshold: 0, color: "#ffffff", tint: 1 });
    expect(params(1)).toEqual({ thickness: 4, color: "#ffffff", opacity: 1, outlineOnly: false });
    expect(params(2)).toEqual({ length: 240, angle: 135, color: "#777777", opacity: 1, fade: true });
    expect(params(3)).toEqual({ size: 1.5, angle: -60, amount: 0.4, highlight: "#ffffff", shade: "#000000" });
  });

  it("say what is out of range", () => {
    const state = stateOf(`{ type: "glow", intensity: 9 },
      { type: "outline", thickness: 100 }`);
    expect(state.errors.map((e) => `${e.id}.${e.prop}`)).toEqual(["h.effects.0.intensity", "h.effects.1.thickness"]);
  });

  it("glow and bevel blur in passes; outline takes two, longShadow one", () => {
    expect(builtInShader("glow")?.steps?.({ radius: 2 })).toHaveLength(4);
    expect(builtInShader("bevel")?.steps?.({ size: 2 })).toHaveLength(3);
    expect(builtInShader("longShadow")?.passes).toHaveLength(1);
  });

  it("outline measures the distance down each column, then along each row, within its thickness", () => {
    const [down, along] = builtInShader("outline")?.passes ?? [];
    expect(builtInShader("outline")?.passes).toHaveLength(2);
    expect(down).toContain("texelFetch(image, up, 0)");
    expect(along).toContain("float(k * k) + dy * dy");
    expect([down, along].every((s) => s?.includes("ceil(params.thickness)"))).toBe(true);
  });

  it("glow is a halo under the element, and a bloom over it only once it has a threshold", () => {
    const last = builtInShader("glow")?.passes.at(-1);
    expect(last).toContain("us_over(o,");
    expect(last).toContain("clamp(params.threshold / 0.05, 0.0, 1.0)");
  });
});
