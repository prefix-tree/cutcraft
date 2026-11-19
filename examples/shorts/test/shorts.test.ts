// Every short loads the way the editor loads it, resolves without errors and lints clean.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type AssetManifest, collectModule, narrate, resolve } from "@uberscene/kit";
import { gatherLocalFiles, lint, loadModule } from "@uberscene/kit/source";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "uberscene.json"), "utf8")) as AssetManifest;
const FILES = readdirSync(root).filter((f) => f.endsWith(".tsx"));

/** A short evaluated as the CLI evaluates it: with its own modules (its blocks) read from the project. */
function load(source: string): { defaults?: Record<string, unknown> } {
  const files = gatherLocalFiles(source, (path) =>
    existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined,
  );
  return loadModule(source, { files }) as { defaults?: Record<string, unknown> };
}

describe.each(FILES)("%s", (name) => {
  const source = readFileSync(join(root, name), "utf8");
  const mod = load(source);
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

describe("blocks", () => {
  // The shorts use the repository's blocks as a project would after copying them in: the copy is the block, unedited.
  it.each(readdirSync(join(root, "blocks")))("%s is the block as it ships", (file) => {
    const shipped = join(root, "..", "..", "blocks", file.replace(/\.tsx$/, ""), "block.tsx");
    expect(readFileSync(join(root, "blocks", file), "utf8")).toBe(readFileSync(shipped, "utf8"));
  });
});

describe("lunar-eclipse.tsx", () => {
  const source = readFileSync(join(root, "lunar-eclipse.tsx"), "utf8");
  const mod = load(source);
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

describe("one-pixel.tsx", () => {
  const source = readFileSync(join(root, "one-pixel.tsx"), "utf8");
  const script = /const SCRIPT = `([\s\S]*?)`;/.exec(source)?.[1] ?? "";

  it("keeps its cues where its animations were written for", () => {
    // The film's script, timed by the kit's `narrate` at its default pace. The picture was built against these
    // times: a change to the helper's defaults that moves them moves every animation in the film.
    expect(narrate(script).cues).toEqual({
      through: 2.2,
      shadow: 3.49,
      fake: 7.1,
      Real: 8.17,
      billions: 11.21,
      hours: 18.93,
      second: 23.31,
      cheats: 24.9,
      dots: 27.56,
      one: 31.69,
      sun: 36.97,
      towards: 38.18,
      away: 40.43,
      facing: 44.39,
      bright: 46.18,
      dark: 47.59,
      room1: 48.89,
      back1: 50.69,
      ball: 52.42,
      photo: 58.29,
      hidden: 63.2,
      room2: 68.71,
      back2: 70.51,
      black: 71.68,
      bounces: 74.33,
      pink: 78.84,
      once: 83.3,
      room3: 87.41,
      back3: 89.21,
      touches: 90.21,
      darkens: 99.48,
      room4: 100.95,
      dazzling: 104.15,
      smeared: 106.1,
      again: 112.74,
      end: 118.28,
    });
  });

  it("shows the script as subtitles, a phrase at a time", () => {
    const mod = load(source);
    const state = resolve(collectModule(mod as never, mod.defaults ?? {}), manifest);
    const cues = [...state.items.values()].filter((p) => p.kind === "caption").sort((a, b) => a.start - b.start);
    expect(cues).toHaveLength(61);
    expect([cues[0]?.props.text, cues[0]?.start]).toEqual(["In a video game, light goes straight", 0.3]);
    expect([cues[60]?.props.text, cues[60]?.start]).toEqual(["game you've ever played.", 115.91]);
    expect(state.composition.duration).toBe(118.3);
  });
});
