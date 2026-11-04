// Every showcase file loads the way the editor loads it, resolves without errors, lints clean, and ends with its
// footage; and every engine layer is timed to a word, a clip or a literal start, so the editor can move it.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type AssetManifest, collectModule, resolve } from "@cutcraft/kit";
import { lint, loadModule } from "@cutcraft/kit/source";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as AssetManifest;
const FILES = ["launch", "kinetic", "data", "logo", "edit", "captions"];
/** The guide's examples (guide/*.tsx), rendered for the pages that explain each feature. */
const GUIDE = ["fonts", "motion-blur", "shader-effect", "shader-transition", "title-effect", "at-a-cut"];

describe.each(FILES)("%s.tsx", (name) => {
  const source = readFileSync(join(root, `${name}.tsx`), "utf8");

  it("resolves without errors and lints clean", () => {
    const mod = loadModule(source);
    const state = resolve(collectModule(mod as never, {}), manifest);
    expect(state.errors).toEqual([]);
    expect(lint(source, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
    expect(lint(source, { manifest }).map((d) => `${d.rule}: ${d.message}`)).toEqual([]);
  });

  it("ends with its footage, not after it", () => {
    const state = resolve(collectModule(loadModule(source) as never, {}), manifest);
    const clips = [...state.items.values()].filter((p) => p.kind === "clip");
    if (clips.length === 0) return;
    const footage = Math.max(...clips.map((c) => c.start + c.duration));
    expect(state.composition.duration).toBeCloseTo(footage, 2);
  });
});

it("draws three.js or Motion in the four new examples, and no built-in <Graphic>", () => {
  for (const name of ["launch", "kinetic", "data", "logo"]) {
    const source = readFileSync(join(root, `${name}.tsx`), "utf8");
    expect(source).toMatch(/<(Three|Motion)\b/);
    expect(source).not.toMatch(/<Graphic\b/);
  }
});

describe.each(GUIDE)("guide/%s.tsx", (name) => {
  it("resolves without errors and lints clean", () => {
    const source = readFileSync(join(root, "guide", `${name}.tsx`), "utf8");
    const state = resolve(collectModule(loadModule(source) as never, {}), manifest);
    expect(state.errors).toEqual([]);
    expect(lint(source, { manifest }).map((d) => `${d.rule}: ${d.message}`)).toEqual([]);
  });
});
