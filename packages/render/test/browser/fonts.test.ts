// Fonts in the browser export: the faces the file declares and the ones passed beside it (`--font`) are read in Node
// and set in the page before it draws a frame. Needs a Chrome or Chromium 153+ in UBERSCENE_CHROMIUM.
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { directoryResolver, loadVideo, renderStill } from "../../src";
import type { FontFile } from "../../src/fonts";
import { inkWidth } from "../helpers/ink";

const scratch = join(import.meta.dirname, "..", ".tmp", "browser-fonts");
let dir = "";

/** A monospace face renamed "Brand": six i's set in it are far wider than in the Inter fallback. */
const require = createRequire(import.meta.url);
const BRAND = join(
  require.resolve("@fontsource/jetbrains-mono/package.json"),
  "..",
  "files",
  "jetbrains-mono-latin-400-normal.woff2",
);

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "f-"));
  copyFileSync(BRAND, join(dir, "brand.woff2"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The width of a frame's text set in "Brand", which `brand` declares (or names), with these passed fonts. */
async function width(
  name: string,
  brand: string,
  passed: readonly FontFile[] = [],
  extra = "",
  start = 0,
): Promise<number> {
  const file = join(dir, `${name}.tsx`);
  writeFileSync(
    file,
    `import { Composition, font, Title, Track } from "@uberscene/kit";
export const manifest = { assets: {} };
const brand = ${brand};
const START = ${start};
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="o" layout="free">
        <Title id="t" start={START} duration={1} font={brand} size={72}${extra}>iiiiii</Title>
      </Track>
    </Composition>
  );
}
`,
  );
  const loaded = await loadVideo(file);
  const out = join(dir, `${name}.png`);
  await renderStill({
    state: loaded.state,
    media: directoryResolver(dir, loaded.manifest),
    out,
    time: 0.5,
    source: loaded.source,
    fonts: passed,
  });
  return inkWidth(out);
}

const NAMED = `"Brand"`;

it("sets text in a font the file declares, WOFF2 included", async () => {
  const fallback = await width("fallback", NAMED);
  expect(await width("declared", `font({ family: "Brand", src: "asset:brand" })`)).toBeGreaterThan(fallback * 1.5);
});

it("sets text in a font passed beside the file's own (--font)", async () => {
  const fallback = await width("fallback-2", NAMED);
  const passed = [{ name: "Brand", data: readFileSync(BRAND) }];
  expect(await width("passed", NAMED, passed)).toBeGreaterThan(fallback * 1.5);
});

it("sets a bundled face, which the page loads only once text uses it, in a still of that text's first moment", async () => {
  const fallback = await width("bundled-fallback", NAMED);
  // JetBrains Mono comes with the player (fonts.css), fetched lazily: the still must wait for it, not draw the fallback.
  expect(await width("bundled", `"JetBrains Mono"`)).toBeGreaterThan(fallback * 1.5);
});

it("sets a bundled face in a still of text that appears after the first frame", async () => {
  const fallback = await width("late-fallback", NAMED, [], "", 0.3);
  // JetBrains Mono comes with the player (fonts.css) and loads only once text uses it, here at 0.3 s.
  expect(await width("late", `"JetBrains Mono"`, [], "", 0.3)).toBeGreaterThan(fallback * 1.5);
});

describe("fontSheet", () => {
  it("draws the bundled families as one image, a cell each, without the network", async () => {
    const { fontSheet } = await import("../../src/fonts-list");
    const { fontsFor } = await import("@uberscene/kit/schema");
    const { mkdtempSync, readFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "uberscene-sheet-"));
    try {
      const out = join(dir, "fonts.png");
      const bundled = fontsFor().filter((f) => f.source === "bundled");
      const sheet = await fontSheet({ fonts: bundled, out, text: "Hello 123" });
      expect(sheet).toMatchObject({ width: 1920, height: 380, columns: 3, warnings: [] });
      expect(sheet.families).toEqual(bundled.map((f) => f.family));
      const png = readFileSync(out);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(1920);
      expect(png.readUInt32BE(20)).toBe(380);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
