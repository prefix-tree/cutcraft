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

  it("is a vertical video of 20 to 120 seconds", () => {
    expect([state.composition.width, state.composition.height]).toEqual([1080, 1920]);
    expect(state.composition.duration).toBeGreaterThanOrEqual(20);
    expect(state.composition.duration).toBeLessThanOrEqual(120);
  });
});

describe("lunar-eclipse.tsx", () => {
  const source = readFileSync(join(root, "lunar-eclipse.tsx"), "utf8");
  const mod = loadModule(source) as { defaults?: Record<string, unknown> };
  const state = resolve(collectModule(mod as never, mod.defaults ?? {}), manifest);

  it("times nothing by a typed second: every cut is on a word and every graphic hangs off a clip", () => {
    const items = [...state.items.values()];
    const clips = items.filter((p) => p.kind === "clip");
    expect(clips.length).toBe(5);
    for (const c of clips)
      expect([c.id, String(c.props.in), String(c.props.out)]).toEqual([
        c.id,
        expect.stringMatching(/^word:\d+$/),
        expect.stringMatching(/^word:\d+\.end$/),
      ]);
    const graphics = items.filter((p) => ["layer", "shape", "title"].includes(p.kind));
    expect(graphics.length).toBeGreaterThan(15);
    for (const g of graphics) {
      expect([g.id, g.props.start, typeof g.props.anchor]).toEqual([g.id, undefined, "string"]);
      expect([g.id, typeof g.props.duration]).toEqual([g.id, "object"]);
    }
  });

  it("ends every graphic with the clip it is over", () => {
    const cuts = new Set(
      [...state.items.values()].filter((p) => p.kind === "clip").map((c) => Math.round((c.start + c.duration) * 1000)),
    );
    for (const g of [...state.items.values()].filter((p) => ["layer", "shape", "title"].includes(p.kind)))
      expect([g.id, cuts.has(Math.round((g.start + g.duration) * 1000))]).toEqual([g.id, true]);
  });
});
