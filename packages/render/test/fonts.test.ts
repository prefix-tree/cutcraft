import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DeclaredFont } from "@cutcraft/kit";

import { directoryResolver } from "../src";
import { googleCssUrl, loadFonts } from "../src/fonts";

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

  it("reads WOFF2, and says why a face cannot be read", async () => {
    await expect(loadFonts([asset("brand2")], media())).resolves.toHaveLength(1);
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
