import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DeclaredFont } from "@cutcraft/kit";

import { fromMap, loadFileFonts } from "../src/media";

/** jsdom has no FontFace or document.fonts: a stand-in that records what is loaded and added. */
const created: { family: string; source: unknown; descriptors: unknown }[] = [];
const added: unknown[] = [];
const loaded: string[] = [];

beforeEach(() => {
  created.length = 0;
  added.length = 0;
  loaded.length = 0;
  vi.stubGlobal(
    "FontFace",
    class {
      constructor(
        readonly family: string,
        source: unknown,
        descriptors: unknown,
      ) {
        created.push({ family, source, descriptors });
      }
      load() {
        return this.family === "Broken" ? Promise.reject(new Error("bad font")) : Promise.resolve(this);
      }
    },
  );
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: {
      add: (f: unknown) => added.push(f),
      load: (spec: string) => {
        loaded.push(spec);
        return Promise.resolve(spec.includes("Nowhere") ? [] : [{}]);
      },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  observer?.disconnect();
  for (const link of document.head.querySelectorAll("link")) link.remove();
});

const asset = (family: string, id: string, weight = 400): DeclaredFont => ({
  family,
  weight,
  style: "normal",
  source: { kind: "asset", id },
});
const google = (family: string): DeclaredFont => ({ family, weight: 400, style: "normal", source: { kind: "google" } });

/** Lets a Google stylesheet link "load" as soon as it is added. */
let observer: MutationObserver | null = null;
function serveStylesheets(): void {
  observer = new MutationObserver((records) => {
    for (const r of records)
      for (const node of r.addedNodes)
        if (node instanceof HTMLLinkElement) queueMicrotask(() => node.dispatchEvent(new Event("load")));
  });
  observer.observe(document.head, { childList: true });
}

describe("loadFileFonts", () => {
  it("adds an asset face from its media URL, once", async () => {
    const faces = [{ ...asset("Brand", "brand", 700), style: "italic" as const }];
    const media = fromMap({ brand: "/fonts/Brand-Bold.woff2" });
    const errors: string[] = [];
    await loadFileFonts(faces, media, (f) => errors.push(f));
    await loadFileFonts(faces, media, (f) => errors.push(f));
    expect(created).toEqual([
      { family: "Brand", source: 'url("/fonts/Brand-Bold.woff2")', descriptors: { weight: "700", style: "italic" } },
    ]);
    expect(added).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("loads a Google face from Google's stylesheet", async () => {
    serveStylesheets();
    const errors: string[] = [];
    await loadFileFonts([google("Titan One")], fromMap({}), (f, e) => errors.push(`${f}: ${e.message}`));
    expect(document.head.querySelector("link")?.getAttribute("href")).toBe(
      "https://fonts.googleapis.com/css2?family=Titan+One:ital,wght@0,400&display=block",
    );
    expect(loaded).toEqual(['normal 400 16px "Titan One"']);
    expect(errors).toEqual([]);
  });

  it("reports a face it cannot load and loads the rest", async () => {
    serveStylesheets();
    const errors: string[] = [];
    await loadFileFonts(
      [asset("Broken", "broken"), asset("Missing", "missing"), asset("Fine", "ok"), google("Nowhere")],
      fromMap({ broken: "/b.ttf", ok: "/ok.ttf" }),
      (f, e) => errors.push(`${f}: ${e.message}`),
    );
    expect(errors.sort()).toEqual([
      "Broken: bad font",
      'Missing: no media for asset "missing"',
      "Nowhere: Google Fonts has no Nowhere 400 normal",
    ]);
    expect(added).toHaveLength(1);
  });
});
