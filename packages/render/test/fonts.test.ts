import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { directoryResolver, loadVideo, renderStill } from "../src";
import { manifestFonts } from "../src/fonts";
import { inkWidth } from "./helpers/ink";

const scratch = join(import.meta.dirname, ".tmp", "fonts");
let dir = "";

/** A monospace face renamed "Brand": set in it, a title looks nothing like the Inter fallback. */
const require = createRequire(import.meta.url);
const files = join(require.resolve("@fontsource/jetbrains-mono/package.json"), "..", "files");
const BRAND_WOFF = join(files, "jetbrains-mono-latin-400-normal.woff");
const BRAND_WOFF2 = join(files, "jetbrains-mono-latin-400-normal.woff2");

function cut(name: string, fonts: string): string {
  const file = join(dir, name);
  writeFileSync(
    file,
    `import { Composition, Title, Track } from "@cutcraft/kit";
export const manifest = { assets: {}, fonts: ${fonts} };
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="o" layout="free"><Title id="t" start={0} duration={1} font="Brand" size={72}>iiiiii</Title></Track>
    </Composition>
  );
}
`,
  );
  return file;
}

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "f-"));
  copyFileSync(BRAND_WOFF, join(dir, "brand.woff"));
  copyFileSync(BRAND_WOFF2, join(dir, "brand2.woff2"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("manifest fonts", () => {
  it("reads each face through the media resolver", async () => {
    const manifest = { assets: {}, fonts: { brand: { family: "Brand", weight: 700, style: "italic" as const } } };
    const [font] = await manifestFonts(manifest, directoryResolver(dir, manifest));
    expect(font).toMatchObject({ name: "Brand", weight: 700, style: "italic" });
    expect(Buffer.compare(font?.data as Buffer, readFileSync(BRAND_WOFF))).toBe(0);
  });

  it("says why a face cannot be read", async () => {
    const at = (fonts: Record<string, { family: string; weight?: number }>) =>
      manifestFonts({ assets: {}, fonts }, directoryResolver(dir, { assets: {} }));
    await expect(at({ brand2: { family: "Brand" } })).rejects.toThrow(/font "brand2" is WOFF2/);
    await expect(at({ nope: { family: "Nope" } })).rejects.toThrow(/font "nope": no media file/);
    await expect(at({ brand: { family: "Brand", weight: 450 } })).rejects.toThrow(/weight must be/);
  });

  it("sets a title in a font the manifest lists, which the export otherwise replaces with Inter", async () => {
    const width = async (name: string, fonts: string): Promise<number> => {
      const loaded = await loadVideo(cut(`${name}.tsx`, fonts));
      const out = join(dir, `${name}.png`);
      await renderStill({ state: loaded.state, media: directoryResolver(dir, loaded.manifest), out, time: 0.5 });
      return inkWidth(out);
    };
    // Six i's: narrow in Inter, a full monospace advance each in Brand.
    const listed = await width("listed", `{ brand: { family: "Brand" } }`);
    const fallback = await width("fallback", "{}");
    expect(listed).toBeGreaterThan(fallback * 1.5);
  });
});
