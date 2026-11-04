import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fromMap, loadManifestFonts } from "../src/media";

/** jsdom has no FontFace or document.fonts: a stand-in that records what is loaded and added. */
const created: { family: string; source: unknown; descriptors: unknown }[] = [];
const added: unknown[] = [];

beforeEach(() => {
  created.length = 0;
  added.length = 0;
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
  Object.defineProperty(document, "fonts", { configurable: true, value: { add: (f: unknown) => added.push(f) } });
});
afterEach(() => vi.unstubAllGlobals());

describe("loadManifestFonts", () => {
  it("adds each face from its media URL, once", async () => {
    const manifest = { assets: {}, fonts: { brand: { family: "Brand", weight: 700, style: "italic" as const } } };
    const media = fromMap({ brand: "/fonts/Brand-Bold.woff2" });
    const errors: string[] = [];
    await loadManifestFonts(manifest, media, (id) => errors.push(id));
    await loadManifestFonts(manifest, media, (id) => errors.push(id));
    expect(created).toEqual([
      { family: "Brand", source: 'url("/fonts/Brand-Bold.woff2")', descriptors: { weight: "700", style: "italic" } },
    ]);
    expect(added).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("reports a face it cannot load and loads the rest", async () => {
    const manifest = {
      assets: {},
      fonts: { broken: { family: "Broken" }, missing: { family: "Missing" }, ok: { family: "Fine" } },
    };
    const errors: string[] = [];
    await loadManifestFonts(manifest, fromMap({ broken: "/b.ttf", ok: "/ok.ttf" }), (id, e) =>
      errors.push(`${id}: ${e.message}`),
    );
    expect(errors.sort()).toEqual(["broken: bad font", 'missing: no media for asset "missing"']);
    expect(added).toHaveLength(1);
  });
});
