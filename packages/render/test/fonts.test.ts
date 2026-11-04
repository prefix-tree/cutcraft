import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DeclaredFont } from "@cutcraft/kit";

import { directoryResolver, loadVideo, renderStill } from "../src";
import { googleCssUrl, loadFonts } from "../src/fonts";
import { inkWidth } from "./helpers/ink";

const scratch = join(import.meta.dirname, ".tmp", "fonts");
let dir = "";

/** A monospace face renamed "Brand": set in it, a title looks nothing like the Inter fallback. */
const require = createRequire(import.meta.url);
const files = join(require.resolve("@fontsource/jetbrains-mono/package.json"), "..", "files");
const BRAND_WOFF = join(files, "jetbrains-mono-latin-400-normal.woff");
const BRAND_WOFF2 = join(files, "jetbrains-mono-latin-400-normal.woff2");

const asset = (id: string, weight = 400): DeclaredFont => ({
  family: "Brand",
  weight,
  style: "normal",
  source: { kind: "asset", id },
});

beforeAll(() => {
  mkdirSync(scratch, { recursive: true });
  dir = mkdtempSync(join(scratch, "f-"));
  copyFileSync(BRAND_WOFF, join(dir, "brand.woff"));
  copyFileSync(BRAND_WOFF2, join(dir, "brand2.woff2"));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("loadFonts", () => {
  const media = () => directoryResolver(dir, { assets: {} });

  it("reads an asset face through the media resolver", async () => {
    const [font] = await loadFonts([{ ...asset("brand", 700), style: "italic" }], media());
    expect(font).toMatchObject({ name: "Brand", weight: 700, style: "italic" });
    expect(Buffer.compare(font?.data as Buffer, readFileSync(BRAND_WOFF))).toBe(0);
  });

  it("refuses WOFF2 for the Node export only, and says why a face cannot be read", async () => {
    await expect(loadFonts([asset("brand2")], media())).rejects.toThrow(/font "Brand" is WOFF2/);
    await expect(loadFonts([asset("brand2")], media(), { woff2: true })).resolves.toHaveLength(1);
    await expect(loadFonts([asset("nope")], media())).rejects.toThrow(/font "asset:nope": no media file/);
  });

  it("downloads a Google face once, into the cache", async () => {
    const cacheDir = join(dir, "cache");
    const asked: string[] = [];
    const fake = (async (url: string) => {
      asked.push(url);
      return url.startsWith("https://fonts.googleapis.com/")
        ? new Response("@font-face { src: url(https://fonts.gstatic.com/s/titan.ttf) format('truetype'); }")
        : new Response(readFileSync(BRAND_WOFF));
    }) as typeof fetch;
    const face: DeclaredFont = { family: "Titan One", weight: 400, style: "italic", source: { kind: "google" } };
    const [first] = await loadFonts([face], media(), { cacheDir, fetch: fake });
    const [again] = await loadFonts([face], media(), { cacheDir, fetch: fake });
    expect(asked).toEqual([
      "https://fonts.googleapis.com/css2?family=Titan+One:ital,wght@1,400",
      "https://fonts.gstatic.com/s/titan.ttf",
    ]);
    expect(existsSync(join(cacheDir, "titan-one-400-italic.ttf"))).toBe(true);
    expect(again?.data).toEqual(first?.data);
    expect(again).toMatchObject({ name: "Titan One", weight: 400, style: "italic" });
  });

  it("says what to do when Google cannot serve a face", async () => {
    const offline = (async () => {
      throw new Error("getaddrinfo ENOTFOUND fonts.googleapis.com");
    }) as typeof fetch;
    const unknown = (async () => new Response("", { status: 400 })) as typeof fetch;
    const face: DeclaredFont = { family: "Nope Sans", weight: 400, style: "normal", source: { kind: "google" } };
    const cacheDir = join(dir, "cache-2");
    await expect(loadFonts([face], media(), { cacheDir, fetch: offline })).rejects.toThrow(
      /Google font "Nope Sans" 400 normal: getaddrinfo .* use font\(\{ src: "asset:…" \}\)/,
    );
    await expect(loadFonts([face], media(), { cacheDir, fetch: unknown })).rejects.toThrow(/Google answered 400/);
  });

  it("asks Google for one face per weight and style", () => {
    expect(googleCssUrl({ family: "Inter Tight", weight: 700, style: "normal" })).toBe(
      "https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,700",
    );
  });
});

describe("fonts declared in the file", () => {
  /** The width of six i's in "Brand", with the file declaring the font or not. */
  async function width(name: string, declare: boolean): Promise<number> {
    const file = join(dir, `${name}.tsx`);
    writeFileSync(
      file,
      `import { Composition, font, Title, Track } from "@cutcraft/kit";
export const manifest = { assets: {} };
const brand = ${declare ? `font({ family: "Brand", src: "asset:brand" })` : `"Brand"`};
export default function Video() {
  return (
    <Composition fps={30} width={640} height={360}>
      <Track id="o" layout="free"><Title id="t" start={0} duration={1} font={brand} size={72}>iiiiii</Title></Track>
    </Composition>
  );
}
`,
    );
    const loaded = await loadVideo(file);
    const out = join(dir, `${name}.png`);
    await renderStill({ state: loaded.state, media: directoryResolver(dir, loaded.manifest), out, time: 0.5 });
    return inkWidth(out);
  }

  it("sets a title in a font the file declares, which the export otherwise replaces with Inter", async () => {
    // Six i's: narrow in Inter, a full monospace advance each in Brand.
    expect(await width("declared", true)).toBeGreaterThan((await width("fallback", false)) * 1.5);
  });
});
