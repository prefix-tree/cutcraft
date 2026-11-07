import { describe, expect, it } from "vitest";

import { collectModule, Executor, font, googleFont, resolve } from "@cutcraft/kit";
import { foldToSource, loadModule } from "@cutcraft/kit/source";

const file = (declarations: string) => `import { Composition, font, googleFont, Track } from "@cutcraft/kit";
${declarations}
export default function Video() {
  return <Composition fps={30} width={640} height={360}><Track id="t" /></Composition>;
}
`;
const fontsOf = (source: string) => resolve(collectModule(loadModule(source) as never), { assets: {} }).fonts;

describe("font() and googleFont()", () => {
  it("return a value that stands for its family: a font prop, a CSS fontFamily, a template string, JSON", () => {
    const brand = font({ family: "Brand Sans", src: "asset:brand" });
    expect(String(brand)).toBe("Brand Sans");
    expect(`${googleFont("Titan One")}, serif`).toBe("Titan One, serif");
    expect(JSON.stringify({ fontFamily: brand })).toBe('{"fontFamily":"Brand Sans"}');
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
      file(`export const brand = font({ family: "Brand", src: "asset:brand", weight: 700, style: "italic" });
export const inter = googleFont("Inter Tight", { weights: [400, 700] });`),
    );
    expect(fonts).toEqual([
      { family: "Brand", weight: 700, style: "italic", source: { kind: "asset", id: "brand" } },
      { family: "Inter Tight", weight: 400, style: "normal", source: { kind: "google" } },
      { family: "Inter Tight", weight: 700, style: "normal", source: { kind: "google" } },
    ]);
  });

  it("keep each file's faces apart: nothing a file declares is shared, however it is loaded", () => {
    const first = fontsOf(file(`export const a = googleFont("First");`));
    const second = fontsOf(file(`export const b = googleFont("Second");`));
    expect(first.map((f) => f.family)).toEqual(["First"]);
    expect(second.map((f) => f.family)).toEqual(["Second"]);
    expect(fontsOf(file("")).length).toBe(0);
    // A module imported another way (a bundled preview) is read the same way: its exports, its elements.
    const imported = { ...loadModule(file(`export const c = googleFont("Third");`)) };
    expect(resolve(collectModule(imported as never), { assets: {} }).fonts.map((f) => f.family)).toEqual(["Third"]);
  });

  it("find a face on the element that uses it, in a theme, and in a Layer's free code", () => {
    const fonts = fontsOf(`import { Composition, googleFont, Layer, Title, Track } from "@cutcraft/kit";
const heading = googleFont("Heading Face");
const label = googleFont("Label Face");
const free = googleFont("Free Face");
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360} theme={{ fonts: { heading } }}>
      <Track id="t" layout="free">
        <Title id="h" start={0} duration={1} font={label}>Hi</Title>
        <Layer id="l" start={0} duration={1}><div style={{ fontFamily: free }} /></Layer>
      </Track>
    </Composition>
  );
}`);
    expect(fonts.map((f) => f.family).sort()).toEqual(["Free Face", "Heading Face", "Label Face"]);
  });

  it("refuse one face declared twice from different files", () => {
    const state = resolve(
      collectModule(
        loadModule(
          file(`export const a = font({ family: "Brand", src: "asset:one" });
export const b = font({ family: "Brand", src: "asset:two" });`),
        ) as never,
      ),
      { assets: {} },
    );
    expect(state.errors.map((e) => e.message)).toEqual([
      expect.stringContaining('font "Brand" 400 normal is declared twice'),
    ]);
  });

  it("are written back by the editor as the identifier that declares them", () => {
    const text = `import { Composition, googleFont, Title, Track } from "@cutcraft/kit";
export const titan = googleFont("Titan One");
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t" layout="free">
        <Title id="h" start={0} duration={1}>Hi</Title>
      </Track>
    </Composition>
  );
}
`;
    const exec = new Executor({ tree: collectModule(loadModule(text) as never), manifest: { assets: {} } });
    expect(exec.execute({ type: "text/update", params: { id: "h", props: { font: "Titan One" } } }).ok).toBe(true);
    const folded = foldToSource(text, exec.log(), exec.state()).text;
    expect(folded).toContain("font={titan}");
    expect(resolve(collectModule(loadModule(folded) as never), { assets: {} }).errors).toEqual([]);
  });
});
