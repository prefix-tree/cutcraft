import { describe, expect, it } from "vitest";

import { collectModule, FONT_CATALOG, findFont, resolve } from "@uberscene/kit";
import { loadModule } from "@uberscene/kit/source";

import { formatFonts, listFonts, sheetSource } from "../src/fonts-list";

describe("uberscene fonts", () => {
  it("lists the whole catalogue, or the families for a role, a category or both", () => {
    expect(listFonts()).toHaveLength(FONT_CATALOG.length);
    expect(listFonts({ category: "condensed" }).map((f) => f.family)).toContain("Anton");
    expect(listFonts({ role: "captions", category: "serif" }).every((f) => f.roles.includes("captions"))).toBe(true);
  });

  it("refuses a role or a category it does not know, naming the ones it does", () => {
    expect(() => listFonts({ role: "title" })).toThrow("--for wants one of headline, body, captions, numbers, accent");
    expect(() => listFonts({ category: "script" })).toThrow("--category wants one of sans, serif");
  });

  it("prints a family a line: its category, its weights, what it suits, how it looks", () => {
    const text = formatFonts(listFonts({ category: "condensed" }));
    const lines = text.split("\n");
    expect(lines[0]).toMatch(/^family\s+category\s+weights\s+for\s+looks like$/);
    expect(lines.find((l) => l.startsWith("Oswald"))).toMatch(/condensed\s+200 to 700\s+headline, captions, numbers/);
    expect(lines.find((l) => l.startsWith("Barlow Condensed"))).toContain("100 to 900 + italic");
    expect(text).toContain('googleFont("Bebas Neue")');
    // A bundled family is starred: it needs no declaration.
    expect(formatFonts([findFont("Inter") as never])).toMatch(/^Inter \*\s+sans\s+400, 700 \+ italic/m);
    expect(formatFonts([])).toBe("no font in the catalogue matches\n");
  });

  it("writes a specimen that resolves and declares each Google family in the weights it sets", () => {
    const fonts = [findFont("Inter"), findFont("Bebas Neue"), findFont("Oswald"), findFont("Kalam")] as never[];
    const sheet = sheetSource(fonts, 'Say "hi"');
    expect(sheet).toMatchObject({ width: 1920, height: 380 });
    const state = resolve(collectModule(loadModule(sheet.text) as never), { assets: {} });
    expect(state.errors).toEqual([]);
    expect(state.fonts.map((f) => `${f.family} ${f.weight}`)).toEqual([
      "Bebas Neue 400",
      "Oswald 400",
      "Oswald 700",
      "Kalam 400",
      "Kalam 700",
    ]);
    expect(sheetSource([findFont("Anton") as never], "x")).toMatchObject({ width: 640, height: 190 });
  });
});
