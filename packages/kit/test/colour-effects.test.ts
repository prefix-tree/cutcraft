import { describe, expect, it } from "vitest";

import { builtInShader, collectModule, monotoneCurve, resolve } from "@cutcraft/kit";
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

describe("monotoneCurve", () => {
  it("is the identity through (0, 0) and (1, 1), and flat past its end points", () => {
    const f = monotoneCurve([
      [0, 0],
      [1, 1],
    ]);
    for (const x of [0, 0.25, 0.5, 0.9, 1]) expect(f(x)).toBeCloseTo(x, 6);
    const g = monotoneCurve([
      [0.2, 0.1],
      [0.8, 0.9],
    ]);
    expect(g(0)).toBe(0.1);
    expect(g(1)).toBe(0.9);
  });

  it("passes through its points and never overshoots between rising ones", () => {
    const points = [
      [0, 0],
      [0.1, 0.6],
      [0.2, 0.62],
      [1, 1],
    ] as const;
    const f = monotoneCurve(points);
    for (const [x, y] of points) expect(f(x)).toBeCloseTo(y, 6);
    let last = -1;
    for (let i = 0; i <= 1000; i++) {
      const y = f(i / 1000);
      expect(y).toBeGreaterThanOrEqual(last - 1e-9);
      last = y;
    }
    // Between the two near-equal points it stays between them.
    for (let x = 0.1; x <= 0.2; x += 0.01) {
      expect(f(x)).toBeGreaterThanOrEqual(0.6 - 1e-9);
      expect(f(x)).toBeLessThanOrEqual(0.62 + 1e-9);
    }
  });

  it("refuses fewer than two points and points out of order", () => {
    expect(() => monotoneCurve([[0, 0]])).toThrow("two points");
    expect(() =>
      monotoneCurve([
        [0.5, 0],
        [0.5, 1],
      ]),
    ).toThrow("x rising");
  });
});

describe("the colour effects", () => {
  it("fill their defaults", () => {
    const state = stateOf(`<Effect id="e" type="exposure" />
      <Effect id="v" type="vibrance" params={{ amount: 0.5 }} />
      <Effect id="w" type="whiteBalance" params={{ temperature: 20 }} />
      <Effect id="s" type="shadowsHighlights" params={{ shadows: 0.4 }} />
      <Effect id="d" type="duotone" />
      <Effect id="k" type="curves" params={{ rgb: [[0, 0], [0.5, 0.6], [1, 1]] }} />`);
    expect(state.errors).toEqual([]);
    const params = (id: string) => state.items.get(id)?.props.params;
    expect(params("e")).toEqual({ stops: 0 });
    expect(params("v")).toEqual({ amount: 0.5 });
    expect(params("w")).toEqual({ temperature: 20, tint: 0 });
    expect(params("s")).toEqual({ shadows: 0.4, highlights: 0, radius: 30 });
    expect(params("d")).toEqual({ dark: "#1d2b53", light: "#ffd27f", amount: 1 });
    expect(params("k")).toMatchObject({
      rgb: [
        [0, 0],
        [0.5, 0.6],
        [1, 1],
      ],
      red: [
        [0, 0],
        [1, 1],
      ],
    });
  });

  it("say what is out of range", () => {
    const state = stateOf(`<Effect id="e" type="exposure" params={{ stops: 9 }} />
      <Effect id="d" type="duotone" params={{ dark: "navy" }} />
      <Effect id="k" type="curves" params={{ rgb: [[0.5, 0], [0.2, 1]] }} />`);
    expect(state.errors.map((e) => `${e.id}.${e.prop}`)).toEqual(["e.params.stops", "d.params.dark", "k.params.rgb"]);
    expect(state.errors[2]?.message).toContain("x rising");
  });

  it("run shadows and highlights in three passes, and bake curves into a table", () => {
    expect(builtInShader("shadowsHighlights")?.passes).toHaveLength(3);
    const table = builtInShader("curves")?.tables?.({
      rgb: [
        [0, 0],
        [0.5, 0.75],
        [1, 1],
      ],
      red: [
        [0, 1],
        [1, 0],
      ],
    }).curve;
    expect(table).toMatchObject({ width: 256, height: 1 });
    const at = (i: number) => [...(table?.data.slice(i * 4, i * 4 + 4) ?? [])];
    // Black: rgb keeps 0, red inverts it.
    expect(at(0)).toEqual([255, 0, 0, 255]);
    // Mid grey (128) lifts near 0.75 through rgb; red then inverts it.
    expect(at(128)[1]).toBeGreaterThan(185);
    expect((at(128)[0] as number) + (at(128)[1] as number)).toBeCloseTo(255, -1);
  });
});
