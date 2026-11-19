// Every showcase file loads the way the editor loads it, resolves without errors, lints clean, and ends with its
// footage; and every engine layer is timed to a word, a clip or a literal start, so the editor can move it.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { type AssetManifest, collectModule, resolve } from "@uberscene/kit";
import { gatherLocalFiles, lint, loadModule } from "@uberscene/kit/source";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "uberscene.json"), "utf8")) as AssetManifest;
const FILES = ["launch", "kinetic", "data", "logo", "edit", "captions", "hero", "coffee"];
/** The guide's examples (guide/*.tsx), rendered for the pages that explain each feature. */
const GUIDE = [
  "fonts",
  "motion-blur",
  "shader-effect",
  "shader-transition",
  "title-effect",
  "at-a-cut",
  "white-balance",
  "colour-grade",
  "effect-order",
];
/** The reference's demos, one per built-in effect and transition, written by `pnpm docs:gen`. */
const DEMOS = ["effects", "transitions", "components"].flatMap((dir) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `${dir}/${f}`),
);

/** A file evaluated as the CLI evaluates it: with its own modules (a block it placed) read from the project. */
function load(source: string): ReturnType<typeof loadModule> {
  const files = gatherLocalFiles(source, (path) =>
    existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined,
  );
  return loadModule(source, { files });
}

describe.each(FILES)("%s.tsx", (name) => {
  const source = readFileSync(join(root, `${name}.tsx`), "utf8");

  it("resolves without errors and lints clean", () => {
    const mod = load(source);
    const state = resolve(collectModule(mod as never, {}), manifest);
    expect(state.errors).toEqual([]);
    expect(lint(source, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
    expect(lint(source, { manifest }).map((d) => `${d.rule}: ${d.message}`)).toEqual([]);
  });

  it("ends with its footage, not after it", () => {
    const state = resolve(collectModule(load(source) as never, {}), manifest);
    const clips = [...state.items.values()].filter((p) => p.kind === "clip");
    if (clips.length === 0) return;
    const footage = Math.max(...clips.map((c) => c.start + c.duration));
    expect(state.composition.duration).toBeCloseTo(footage, 2);
  });
});

it("draws three.js or Motion in the four new examples", () => {
  for (const name of ["launch", "kinetic", "data", "logo"]) {
    const source = readFileSync(join(root, `${name}.tsx`), "utf8");
    expect(source).toMatch(/<(Three|Motion)\b/);
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

describe.each(DEMOS)("%s", (file) => {
  it("resolves without errors, lints clean, and lasts its three seconds", () => {
    const source = readFileSync(join(root, file), "utf8");
    const state = resolve(collectModule(loadModule(source) as never, {}), manifest);
    expect(state.errors).toEqual([]);
    expect(lint(source, { manifest }).map((d) => `${d.rule}: ${d.message}`)).toEqual([]);
    expect(state.composition.duration).toBeCloseTo(3, 2);
  });
});

it("has a demo for every built-in effect, transition and component", () => {
  expect(DEMOS.length).toBe(56);
});

it("keeps the coffee film's block as the bundled block", () => {
  const copy = readFileSync(join(root, "blocks", "quote-build.tsx"), "utf8");
  const bundled = readFileSync(join(root, "..", "..", "blocks", "quote-build", "block.tsx"), "utf8");
  expect(copy).toBe(bundled);
});

it("plays only the four reference coffee clips in the coffee film", () => {
  const source = readFileSync(join(root, "coffee.tsx"), "utf8");
  const state = resolve(collectModule(load(source) as never, {}), manifest);
  const footage = new Set([...state.items.values()].filter((p) => p.kind === "clip").map((p) => String(p.props.src)));
  expect([...footage].sort()).toEqual(["asset:coffee", "asset:coffeeWide", "asset:espresso", "asset:redCup"]);
});
