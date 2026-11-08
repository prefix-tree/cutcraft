import { describe, expect, it } from "vitest";

import { builtInShader, collectModule, EFFECT_FAMILIES, effectEntry, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const stateOf = (effects: string) =>
  resolve(
    collectModule(
      loadModule(`import { Composition, Effect, Title, Track } from "@cutcraft/kit";
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t" layout="free"><Title id="h0" start={0} duration={2}>Hi${effects}</Title></Track></Composition>; }`) as never,
    ),
    { assets: {} },
  );

const LOOKS = ["halftone", "pixelate", "scanlines", "lightLeak", "fractalNoise"] as const;

describe("the stylizers and generators", () => {
  it("fill their defaults", () => {
    const state = stateOf(LOOKS.map((t) => `<Effect id="${t}" type="${t}" />`).join("\n"));
    expect(state.errors).toEqual([]);
    const params = (id: string) => state.items.get(id)?.props.params;
    expect(params("halftone")).toEqual({
      size: 8,
      angle: 45,
      mode: "mono",
      ink: "#111111",
      paper: "#ffffff",
      amount: 1,
    });
    expect(params("pixelate")).toEqual({ size: 12, box: [0, 0, 1, 1], feather: 0 });
    expect(params("scanlines")).toEqual({ spacing: 4, thickness: 0.5, intensity: 0.35, speed: 0, angle: 0 });
    expect(params("lightLeak")).toEqual({ color: "#ff8a3d", intensity: 0.6, spread: 0.6, evolution: 0.15, seed: 0 });
    expect(params("fractalNoise")).toEqual({
      size: 160,
      octaves: 5,
      evolution: 0.2,
      contrast: 1,
      color: "#ffffff",
      blend: "overlay",
      opacity: 0.5,
      seed: 0,
    });
  });

  it("say what is out of range, unknown or not one of the choices", () => {
    const state = stateOf(`<Effect id="h" type="halftone" params={{ mode: "rgb" }} />
      <Effect id="p" type="pixelate" params={{ size: 0 }} />
      <Effect id="n" type="fractalNoise" params={{ octaves: 9 }} />
      <Effect id="l" type="lightLeak" params={{ size: 0.5 }} />`);
    expect(state.errors.map((e) => `${e.id}.${e.prop}`)).toEqual([
      "h.params.mode",
      "p.params.size",
      "n.params.octaves",
      "l.params",
    ]);
  });

  it("are drawn by shaders, with no CSS to fall back on, and skip at their neutral params", () => {
    for (const t of LOOKS) {
      const entry = effectEntry(t);
      expect(entry?.draw.kind).toBe("shader");
      expect(entry?.draw.kind === "shader" && entry.draw.css).toBeFalsy();
      expect(entry?.neutral).toBeDefined();
    }
    expect(effectEntry("pixelate")?.neutral).toEqual({ size: 1 });
  });

  it("are listed in two families of their own", () => {
    expect(EFFECT_FAMILIES.Stylize).toEqual(["halftone", "pixelate", "scanlines"]);
    expect(EFFECT_FAMILIES["Light and texture"]).toEqual(["lightLeak", "fractalNoise"]);
  });

  it("move with time where they say they do", () => {
    expect(builtInShader("scanlines")?.passes[0]).toContain("time * params.speed");
    expect(builtInShader("lightLeak")?.passes[0]).toContain("time * params.evolution");
    expect(builtInShader("fractalNoise")?.passes[0]).toContain("time * params.evolution");
    expect(builtInShader("halftone")?.passes[0]).not.toMatch(/\btime\b/);
  });

  it("halftone prints CMYK on four screens at the classic angles", () => {
    const src = builtInShader("halftone")?.passes[0] ?? "";
    expect(src).toContain("ht_cover(p, a - radians(30.0), 0)");
    expect(src).toContain("ht_cover(p, a + radians(30.0), 1)");
    expect(src).toContain("ht_cover(p, a - radians(45.0), 2)");
    expect(src).toContain("ht_cover(p, a, 3)");
  });
});
