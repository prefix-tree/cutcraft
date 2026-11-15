import { describe, expect, it } from "vitest";

import { FONT_CATALOG, findFont, fontFamily, fontsFor, googleFont, nearestFont } from "@cutcraft/kit";
import { lint } from "@cutcraft/kit/source";

describe("the font catalogue", () => {
  it("lists each family once, with at least one upright weight, a role and a line on how it looks", () => {
    const families = FONT_CATALOG.map((f) => f.family);
    expect(new Set(families).size).toBe(families.length);
    expect(families.length).toBeGreaterThan(60);
    for (const font of FONT_CATALOG) {
      expect(font.weights.length, font.family).toBeGreaterThan(0);
      expect(font.roles.length, font.family).toBeGreaterThan(0);
      expect(font.feel.length, font.family).toBeGreaterThan(20);
      // Every weight is one googleFont() can declare.
      for (const weight of font.weights) expect(() => googleFont(font.family, { weights: [weight] })).not.toThrow();
      for (const weight of font.italics)
        expect(() => googleFont(font.family, { weights: [weight], styles: ["italic"] })).not.toThrow();
    }
  });

  it("pairs each family only with families it lists, and never with itself", () => {
    for (const font of FONT_CATALOG) {
      expect(font.pairs.length, font.family).toBeGreaterThan(0);
      for (const pair of font.pairs) {
        expect(findFont(pair), `${font.family} pairs with ${pair}`).toBeDefined();
        expect(pair).not.toBe(font.family);
      }
    }
  });

  it("marks the five bundled families, which need no declaration", () => {
    expect(FONT_CATALOG.filter((f) => f.source === "bundled").map((f) => f.family)).toEqual([
      "Inter",
      "Space Grotesk",
      "Playfair Display",
      "DM Sans",
      "JetBrains Mono",
    ]);
    expect(findFont("space grotesk")).toMatchObject({ weights: [400, 700], italics: [] });
    expect(findFont("Inter")?.italics).toEqual([400, 700]);
  });

  it("narrows to a role, a category, or both", () => {
    expect(fontsFor({ category: "condensed" }).map((f) => f.family)).toContain("Bebas Neue");
    expect(fontsFor({ role: "captions" }).every((f) => f.roles.includes("captions"))).toBe(true);
    expect(fontsFor({ role: "headline", category: "mono" })).toEqual([]);
    expect(fontsFor()).toHaveLength(FONT_CATALOG.length);
  });

  it("finds the family a misspelt name meant, and none for a name that is far from all", () => {
    expect(nearestFont("Bebas Nue")?.family).toBe("Bebas Neue");
    expect(nearestFont("Monserrat")?.family).toBe("Montserrat");
    expect(nearestFont("Brand Sans Headline")).toBeUndefined();
  });
});

describe("googleFont() and the catalogue", () => {
  it("refuses a weight or an italic a listed family does not have, and says what it has", () => {
    expect(() => googleFont("Bebas Neue", { weights: [700] })).toThrow(
      'Google font "Bebas Neue" has no 700 normal; it has normal in 400',
    );
    expect(() => googleFont("Oswald", { styles: ["italic"] })).toThrow("it has no italic at all");
    expect(() => googleFont("Oswald", { weights: [200, 700] })).not.toThrow();
  });

  it("takes any family the catalogue does not list as given", () => {
    expect(() => googleFont("Some Other Face", { weights: [900], styles: ["italic"] })).not.toThrow();
  });
});

describe("fontFamily()", () => {
  it("quotes the family, which CSS needs for a word that starts with a digit, and adds fallbacks", () => {
    expect(fontFamily(googleFont("Press Start 2P"), "monospace")).toBe('"Press Start 2P", monospace');
    expect(fontFamily("Inter")).toBe('"Inter"');
  });
});

describe("font-available", () => {
  const file = (font: string) => `import { Composition, Title, Track } from "@cutcraft/kit";
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="t" free>
        <Title id="a" start={0} font="${font}">A</Title>
      </Track>
    </Composition>
  );
}
`;
  const message = (font: string) => lint(file(font)).find((d) => d.rule === "font-available")?.message;

  it("names the declaration to write for a family the catalogue lists", () => {
    expect(message("Bebas Neue")).toContain('const bebasNeue = googleFont("Bebas Neue")');
    expect(message("Source Serif 4")).toContain('const sourceSerif4 = googleFont("Source Serif 4")');
  });

  it("suggests the family a misspelt name meant, and points at the list otherwise", () => {
    expect(message("Monserrat")).toContain('Did you mean "Montserrat"?');
    expect(message("Intr")).toContain('Did you mean "Inter", which is bundled?');
    expect(message("Brand Sans Headline")).toContain("cutcraft fonts");
  });
});
