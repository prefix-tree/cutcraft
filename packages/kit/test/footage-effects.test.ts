import { describe, expect, it } from "vitest";

import { builtInShader, collectModule, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const manifest = { assets: { city: { id: "city", kind: "video" as const, duration: 10 } } };
const stateOf = (effects: string) =>
  resolve(
    collectModule(
      loadModule(`import { Clip, Composition, Effect, Track } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t"><Clip id="c" src="asset:city">${effects}</Clip></Track></Composition>; }`) as never,
    ),
    manifest,
  );

describe("the footage effects", () => {
  it("fill their defaults", () => {
    const state = stateOf(`<Effect id="k" type="colorKey" />
      <Effect id="b" type="regionBlur" params={{ box: [0.1, 0.1, 0.3, 0.3] }} />
      <Effect id="p" type="cornerPin" params={{ topLeft: [0.1, 0.1] }} />
      <Effect id="z" type="zoomBlur" />
      <Effect id="a" type="chromaticAberration" params={{ radial: true }} />`);
    expect(state.errors).toEqual([]);
    const params = (id: string) => state.items.get(id)?.props.params;
    expect(params("k")).toEqual({ color: "#00ff00", tolerance: 0.3, softness: 0.1, spill: 0.5 });
    expect(params("b")).toEqual({ box: [0.1, 0.1, 0.3, 0.3], radius: 7, feather: 10, roundness: 0, inverted: false });
    expect(params("p")).toEqual({ topLeft: [0.1, 0.1], topRight: [1, 0], bottomRight: [1, 1], bottomLeft: [0, 1] });
    expect(params("z")).toEqual({ length: 40, center: [0.5, 0.5], samples: 24 });
    expect(params("a")).toEqual({ distance: 4, angle: 90, radial: true, center: [0.5, 0.5] });
  });

  it("say what is out of range", () => {
    const state = stateOf(`<Effect id="k" type="colorKey" params={{ color: "green" }} />
      <Effect id="b" type="regionBlur" params={{ box: [0, 0, 0, 0.5] }} />
      <Effect id="z" type="zoomBlur" params={{ samples: 100 }} />
      <Effect id="p" type="cornerPin" params={{ topLeft: [0.1] }} />`);
    expect(state.errors.map((e) => `${e.id}.${e.prop}`)).toEqual([
      "k.params.color",
      "b.params.box.2",
      "z.params.samples",
      "p.params.topLeft",
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
});
