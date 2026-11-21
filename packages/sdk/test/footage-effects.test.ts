import { describe, expect, it } from "vitest";

import { builtInShader } from "@uberscene/kit/schema";
import { collectModule, loadModule, resolve } from "@uberscene/sdk";

const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const stateOf = (effects: string) =>
  resolve(
    collectModule(
      loadModule(`import { Clip, Composition, Track } from "@uberscene/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:city" effects={[${effects}]} /></Track></Composition>; }`) as never,
    ),
    manifest,
  );

describe("the footage effects", () => {
  it("fill their defaults", () => {
    const state = stateOf(`{ type: "colorKey" },
      { type: "regionBlur", box: [0.1, 0.1, 0.3, 0.3] },
      { type: "cornerPin", topLeft: [0.1, 0.1] },
      { type: "zoomBlur" },
      { type: "chromaticAberration", radial: true }`);
    expect(state.errors).toEqual([]);
    const params = (n: number) => state.items.get(`c.effects.${n}`)?.props.params;
    expect(params(0)).toEqual({ color: "#00ff00", tolerance: 0.3, softness: 0.1, spill: 0.5 });
    expect(params(1)).toEqual({ box: [0.1, 0.1, 0.3, 0.3], radius: 7, feather: 10, roundness: 0, inverted: false });
    expect(params(2)).toEqual({ topLeft: [0.1, 0.1], topRight: [1, 0], bottomRight: [1, 1], bottomLeft: [0, 1] });
    expect(params(3)).toEqual({ length: 40, center: [0.5, 0.5], samples: 24 });
    expect(params(4)).toEqual({ distance: 4, angle: 90, radial: true, center: [0.5, 0.5] });
  });

  it("say what is out of range", () => {
    const state = stateOf(`{ type: "colorKey", color: "green" },
      { type: "regionBlur", box: [0, 0, 0, 0.5] },
      { type: "zoomBlur", samples: 100 },
      { type: "cornerPin", topLeft: [0.1] }`);
    expect(state.errors.map((e) => `${e.id}.${e.prop}`)).toEqual([
      "c.effects.0.color",
      "c.effects.1.box.2",
      "c.effects.2.samples",
      "c.effects.3.topLeft",
    ]);
  });

  it("blur a region in three passes, over the box's part of the frame unless it is inverted", () => {
    const steps = (p: Record<string, unknown>) => builtInShader("regionBlur")?.steps?.(p) ?? [];
    expect(steps({ radius: 2, box: [0.1, 0.1, 0.2, 0.2] }).map((s) => s.region?.box)).toEqual([
      [0.1, 0.1, 0.2, 0.2],
      [0.1, 0.1, 0.2, 0.2],
      undefined,
    ]);
    expect(steps({ radius: 2, box: [0.1, 0.1, 0.2, 0.2], inverted: true }).every((s) => !s.region)).toBe(true);
  });

  it("zoomBlur takes one sample per pixel of streak, at least 2 and at most samples", () => {
    const source = builtInShader("zoomBlur")?.passes[0];
    expect(source).toContain("min(int(params.samples), max(2, int(ceil(streak))))");
  });
});
