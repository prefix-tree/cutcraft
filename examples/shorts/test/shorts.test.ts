// Every short loads the way the editor loads it, resolves without errors and lints clean.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type AssetManifest, collectModule, resolve } from "@cutcraft/kit";
import { lint, loadModule } from "@cutcraft/kit/source";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as AssetManifest;
const FILES = readdirSync(root).filter((f) => f.endsWith(".tsx"));

describe.each(FILES)("%s", (name) => {
  const source = readFileSync(join(root, name), "utf8");
  const mod = loadModule(source) as { defaults?: Record<string, unknown> };
  const state = resolve(collectModule(mod as never, mod.defaults ?? {}), manifest);

  it("resolves without errors and lints clean", () => {
    expect(state.errors).toEqual([]);
    expect(lint(source, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
  });

  it("is a vertical video of 20 to 40 seconds", () => {
    expect([state.composition.width, state.composition.height]).toEqual([1080, 1920]);
    expect(state.composition.duration).toBeGreaterThanOrEqual(20);
    expect(state.composition.duration).toBeLessThanOrEqual(40);
  });
});
