import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { AssetManifest } from "@cutcraft/kit";
import { decodeFrames, decodesClean, pixel, probe } from "./helpers/output";
import { makePlaceholders } from "./helpers/placeholders";

const root = join(import.meta.dirname, "..");
const recipes = join(root, "..", "..", "recipes");
const scratch = join(root, "test", ".tmp", "recipes");
const manifest = JSON.parse(readFileSync(join(recipes, "manifest.json"), "utf8")) as AssetManifest;

const files = ["talking-head", "product-demo", "vertical-podcast", "slideshow", "stats", "variants", "highlights"];

beforeAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  makePlaceholders(manifest, join(scratch, "media"));
}, 300_000);
afterAll(() => rmSync(join(root, "test", ".tmp", "recipes"), { recursive: true, force: true }));

describe("recipes", () => {
  it.each(files)(
    "%s renders its first two seconds without warnings",
    (name) => {
      const out = join(scratch, `${name}.webm`);
      const r = spawnSync(
        join(root, "node_modules", ".bin", "tsx"),
        [
          join(root, "src", "cli.ts"),
          join(recipes, `${name}.tsx`),
          "--manifest",
          join(recipes, "manifest.json"),
          "--media",
          join(scratch, "media"),
          "--out",
          out,
          "--to",
          "2",
          "--quiet",
        ],
        { encoding: "utf8" },
      );
      expect(r.stderr).not.toMatch(/warning:/);
      expect(r.status, r.stderr).toBe(0);
      const info = probe(out);
      expect(info.frames).toBe(60);
      decodesClean(out);
    },
    120_000,
  );

  it("talking-head shows its first generated cue in the caption band", async () => {
    const out = join(scratch, "talking-head.webm");
    let white = 0;
    await decodeFrames(out, (frame, n) => {
      if (n !== 20) return;
      for (let y = 900; y < 1000; y++)
        for (let x = 500; x < 1420; x++) {
          const [r, g, b] = pixel(frame, x, y);
          if (r > 230 && g > 230 && b > 230) white++;
        }
    });
    // "Welcome back to the show." is set at 44 px; its glyphs light a few thousand pixels.
    expect(white).toBeGreaterThan(1000);
  });
});
