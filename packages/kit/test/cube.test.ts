import { describe, expect, it } from "vitest";

import { collectModule, parseCube, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

/** A size-2 table whose output is (b, g, r): red and blue swapped. */
const SWAP_CUBE = [
  "# swaps red and blue",
  'TITLE "swap"',
  "LUT_3D_SIZE 2",
  ...[0, 1].flatMap((b) => [0, 1].flatMap((g) => [0, 1].map((r) => `${b} ${g} ${r}`))),
].join("\n");

describe("parseCube", () => {
  it("reads the size, title and values, red changing fastest", () => {
    const lut = parseCube(SWAP_CUBE);
    expect(lut.title).toBe("swap");
    expect(lut.size).toBe(2);
    expect(lut.domainMin).toEqual([0, 0, 0]);
    expect(lut.domainMax).toEqual([1, 1, 1]);
    // Entry (r=1, g=0, b=0) is index 1: its output is (0, 0, 1).
    expect([...lut.data.slice(3, 6)]).toEqual([0, 0, 1]);
  });

  it("reads a domain and skips keywords it does not use", () => {
    const lut = parseCube(
      `LUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 2 2 2\nLUT_3D_INPUT_RANGE 0 2\n${"0.5 0.5 0.5\n".repeat(8)}`,
    );
    expect(lut.domainMax).toEqual([2, 2, 2]);
  });

  it("refuses what it cannot use, naming the line", () => {
    expect(() => parseCube("LUT_1D_SIZE 16\n0 0 0")).toThrow("a 1D table");
    expect(() => parseCube("0 0 0")).toThrow("line 1: values before LUT_3D_SIZE");
    expect(() => parseCube("LUT_3D_SIZE 2\n0 0 0")).toThrow("1 values, expected 2³ = 8");
    expect(() => parseCube("LUT_3D_SIZE 2\n0 0")).toThrow("line 2: expected three numbers");
    expect(() => parseCube("LUT_3D_SIZE 1")).toThrow("from 2 to 256");
    expect(() => parseCube("")).toThrow("no LUT_3D_SIZE");
  });
});

describe("the lut effect", () => {
  const manifest = {
    assets: {
      city: { id: "city", kind: "video" as const, duration: 10 },
      teal: { id: "teal", kind: "lut" as const, duration: 0 },
      logo: { id: "logo", kind: "image" as const, duration: 0 },
    },
  };
  const errorsOf = (body: string, declarations = "") =>
    resolve(
      collectModule(
        loadModule(`import { z } from "zod";
import { Clip, Composition, defineEffect, Effect, Track } from "@cutcraft/kit";
${declarations}
export default function V() { return <Composition fps={30} width={640} height={360}><Track id="t">${body}</Track></Composition>; }`) as never,
      ),
      manifest,
    ).errors.map((e) => `${e.id}.${e.prop}: ${e.message}`);

  it("reads a LUT asset, and says when the asset is missing or is not a LUT", () => {
    expect(
      errorsOf(`<Clip id="c" src="asset:city"><Effect id="l" type="lut" params={{ src: "asset:teal" }} /></Clip>`),
    ).toEqual([]);
    expect(
      errorsOf(
        `<Clip id="c" src="asset:city"><Effect id="a" type="lut" params={{ src: "asset:nope" }} /><Effect id="b" type="lut" params={{ src: "asset:logo" }} /><Effect id="d" type="lut" /></Clip>`,
      ),
    ).toEqual([
      "d.params.src: Invalid input: expected string, received undefined",
      "a.params.src: asset asset:nope is not in the manifest",
      "b.params.src: asset asset:logo is an image; a lut effect reads a .cube file (kind lut)",
    ]);
  });

  it("lets a file's own effect read an image or a LUT, and a clip play neither a LUT", () => {
    expect(
      errorsOf(
        `<Clip id="c" src="asset:city"><Effect id="m" type={mix} params={{ over: "asset:logo" }} /><Effect id="v" type={mix} params={{ over: "asset:city" }} /></Clip><Clip id="x" src="asset:teal" />`,
        `const mix = defineEffect({ name: "mix", params: z.object({ over: z.string() }), shader: "vec4 effect(vec2 uv) { return texture(over, uv); }" });`,
      ),
    ).toEqual([
      expect.stringMatching(/^x\.src: asset asset:teal is a LUT, which plays nothing/),
      "v.params.over: asset asset:city is a video; a shader reads an image or a LUT",
    ]);
  });
});
