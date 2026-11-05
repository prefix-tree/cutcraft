import { parseCube } from "@cutcraft/kit";

import { lutTexture, ShaderTextures, textureRefs } from "../src/media/shader-textures";

const identity = (size: number, domain = "") => {
  const lines = [`LUT_3D_SIZE ${size}`, domain];
  for (let b = 0; b < size; b++)
    for (let g = 0; g < size; g++)
      for (let r = 0; r < size; r++) lines.push([r, g, b].map((v) => v / (size - 1)).join(" "));
  return lines.join("\n");
};

describe("shader textures", () => {
  it("find the asset refs among effects' params", () => {
    const pass = (params: Record<string, unknown>) => ({ name: "x", sources: [], params, time: 0 });
    expect(textureRefs([pass({ src: "asset:teal", amount: 1 }), pass({ tint: "#fff", over: "asset:logo" })])).toEqual([
      "asset:teal",
      "asset:logo",
    ]);
    expect(textureRefs(undefined)).toEqual([]);
  });

  it("make a LUT into RGBA bytes, red fastest", () => {
    const t = lutTexture(parseCube(identity(2)));
    expect(t.kind).toBe("3d");
    if (t.kind !== "3d") return;
    expect(t.size).toBe(2);
    // Entry 1 is (r=1, g=0, b=0).
    expect([...t.data.slice(4, 8)]).toEqual([255, 0, 0, 255]);
    expect([...t.data.slice(28, 32)]).toEqual([255, 255, 255, 255]);
  });

  it("resample a table whose domain is not 0..1 onto 0..1", () => {
    // An identity over 0..2: the input 1 (entry 1 of 0..1 at size 2) reads the table half way, 1.0 clamped to 1.
    const t = lutTexture(parseCube(identity(3, "DOMAIN_MIN 0 0 0\nDOMAIN_MAX 2 2 2")));
    if (t.kind !== "3d") throw new Error("3d");
    // At size 3 over 0..1: entry r=1 is input 0.5, which over 0..2 is a quarter of the way, output 0.25 → 64.
    expect(t.data[4]).toBe(64);
    expect(t.data[8]).toBe(128);
  });

  it("load each asset once, and report one that fails without stopping the others", async () => {
    const asked: string[] = [];
    const errors: string[] = [];
    const textures = new ShaderTextures(
      {
        resolve: async (id) => {
          asked.push(id);
          if (id === "bad") return { kind: "blob", blob: new Blob(["LUT_3D_SIZE 2\n0 0 0"]) };
          return { kind: "blob", blob: new Blob([identity(2)]) };
        },
      },
      (id, e) => errors.push(`${id}: ${e.message}`),
    );
    const manifest = {
      assets: {
        teal: { id: "teal", kind: "lut" as const, duration: 0 },
        bad: { id: "bad", kind: "lut" as const, duration: 0 },
      },
    };
    await Promise.all([textures.load(manifest, ["asset:teal", "asset:bad"]), textures.load(manifest, ["asset:teal"])]);
    await textures.load(manifest, ["asset:teal", "asset:bad"]);
    expect(asked.sort()).toEqual(["bad", "teal"]);
    expect(textures.get("asset:teal")?.kind).toBe("3d");
    expect(textures.get("asset:bad")).toBeUndefined();
    expect(errors).toEqual(["bad: .cube: 1 values, expected 2³ = 8"]);
  });
});
