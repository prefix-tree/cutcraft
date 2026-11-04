import { describe, expect, it } from "vitest";

import { collectModule, font, googleFont, resolve } from "@cutcraft/kit";
import { loadModule } from "@cutcraft/kit/source";

const file = (declarations: string) => `import { Composition, font, googleFont, Track } from "@cutcraft/kit";
${declarations}
export default function Video() {
  return <Composition fps={30} width={640} height={360}><Track id="t" /></Composition>;
}
`;
const fontsOf = (source: string) => resolve(collectModule(loadModule(source) as never), { assets: {} }).fonts;

describe("font() and googleFont()", () => {
  it("return the family, to use as a font prop or a CSS fontFamily", () => {
    expect(font({ family: "Brand Sans", src: "asset:brand" })).toBe("Brand Sans");
    expect(googleFont("Titan One")).toBe("Titan One");
  });

  it("refuse a face no renderer can load", () => {
    expect(() => font({ family: "Brand", src: "brand.ttf" })).toThrow('src must be "asset:<id>"');
    expect(() => font({ family: "Brand", src: "asset:brand", weight: 450 })).toThrow("weight must be 100, 200 … 900");
    expect(() => googleFont("Titan One", { styles: ["oblique" as never] })).toThrow(
      'style must be "normal" or "italic"',
    );
  });

  it("put the faces a file declares on its state, one per weight and style", () => {
    const fonts = fontsOf(
      file(`const brand = font({ family: "Brand", src: "asset:brand", weight: 700, style: "italic" });
const inter = googleFont("Inter Tight", { weights: [400, 700] });`),
    );
    expect(fonts).toEqual([
      { family: "Brand", weight: 700, style: "italic", source: { kind: "asset", id: "brand" } },
      { family: "Inter Tight", weight: 400, style: "normal", source: { kind: "google" } },
      { family: "Inter Tight", weight: 700, style: "normal", source: { kind: "google" } },
    ]);
  });

  it("keep each loaded file's faces apart", () => {
    const first = fontsOf(file(`const a = googleFont("First");`));
    const second = fontsOf(file(`const b = googleFont("Second");`));
    expect(first.map((f) => f.family)).toEqual(["First"]);
    expect(second.map((f) => f.family)).toEqual(["Second"]);
    expect(fontsOf(file("")).length).toBe(0);
  });

  it("fall back to the faces declared outside a load for a module imported another way", () => {
    // The two calls in the first test ran outside any load, as a bundled app's imports do. A copy of a loaded module
    // has its exports but not the faces `loadModule` recorded for it.
    const imported = { ...loadModule(file("")) };
    expect(resolve(collectModule(imported as never), { assets: {} }).fonts.map((f) => f.family)).toEqual(
      expect.arrayContaining(["Brand Sans", "Titan One"]),
    );
  });
});
