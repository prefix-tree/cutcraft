import { describe, expect, it } from "vitest";

import { builtInShader, monotoneCurve } from "@uberscene/kit/schema";
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
    const state = stateOf(`{ type: "exposure" },
      { type: "vibrance", amount: 0.5 },
      { type: "whiteBalance", temperature: 0.2 },
      { type: "shadowsHighlights", shadows: 0.4 },
      { type: "duotone" },
      { type: "curves", rgb: [[0, 0], [0.5, 0.6], [1, 1]] }`);
    expect(state.errors).toEqual([]);
    const params = (n: number) => state.items.get(`c.effects.${n}`)?.props.params;
    expect(params(0)).toEqual({ stops: 0 });
    expect(params(1)).toEqual({ amount: 0.5 });
    expect(params(2)).toEqual({ temperature: 0.2, tint: 0 });
    expect(params(3)).toEqual({ shadows: 0.4, highlights: 0, radius: 10 });
    expect(params(4)).toEqual({ dark: "#1d2b53", light: "#ffd27f", amount: 1 });
    expect(params(5)).toMatchObject({
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
    const state = stateOf(`{ type: "exposure", stops: 9 },
      { type: "duotone", dark: "navy" },
      { type: "curves", rgb: [[0.5, 0], [0.2, 1]] }`);
    expect(state.errors.map((e) => `${e.id}.${e.prop}`)).toEqual([
      "c.effects.0.stops",
      "c.effects.1.dark",
      "c.effects.2.rgb",
    ]);
    expect(state.errors[2]?.message).toContain("x rising");
  });

  it("run shadows and highlights in three passes, and bake curves into a table", () => {
    expect(builtInShader("shadowsHighlights")?.steps?.({ radius: 2 })).toHaveLength(3);
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
