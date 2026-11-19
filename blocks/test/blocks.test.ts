// Every block loads the way `uberscene blocks` loads it, says what it is for, labels every prop, and has a demo that
// resolves without errors, lints clean and is drawn in its preview.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";

import { blockMetaSchema, collectModule, knobsOf, resolve } from "@uberscene/kit";
import { gatherLocalFiles, lint, loadModule } from "@uberscene/kit/source";

const root = join(import.meta.dirname, "..");
const BLOCKS = readdirSync(root).filter((name) => existsSync(join(root, name, "block.tsx")));
const read = (dir: string) => (path: string) => {
  const file = join(dir, path);
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
};

/** A block's file has no video to export by default: it is evaluated through one that re-exports it, as the CLI does. */
const WRAPPER = 'export * from "./block";\nexport default function Block() {\n  return null;\n}\n';

/** A file of a block's folder, evaluated with the folder's own modules, as the CLI and the export load it. */
function load(name: string, file: string): { text: string; mod: Record<string, unknown> } {
  const dir = join(root, name);
  const text = file === "block.tsx" ? WRAPPER : readFileSync(join(dir, file), "utf8");
  const files = gatherLocalFiles(text, read(dir), { name: file });
  return { text, mod: loadModule(text, { files }) as unknown as Record<string, unknown> };
}

it("has blocks", () => {
  expect(BLOCKS.length).toBeGreaterThanOrEqual(3);
});

describe.each(BLOCKS)("%s", (name) => {
  const block = load(name, "block.tsx");

  it("says what it is for, in a meta the CLI reads", () => {
    const meta = blockMetaSchema.parse(block.mod.meta);
    expect(meta.title.length).toBeGreaterThan(0);
    const keys = knobsOf(block.mod.schema as ZodType).map((k) => k.key);
    for (const beat of meta.beats) expect([beat, keys.includes(beat)]).toEqual([beat, true]);
  });

  it("exports one component, its schema and defaults that the schema accepts", () => {
    const components = Object.keys(block.mod).filter((k) => /^[A-Z]/.test(k) && typeof block.mod[k] === "function");
    expect(components).toHaveLength(1);
    const schema = block.mod.schema as ZodType;
    expect(schema.safeParse(block.mod.defaults).success).toBe(true);
  });

  it("labels every prop, so an editor and an agent know what each one means", () => {
    const knobs = knobsOf(block.mod.schema as ZodType, block.mod.defaults as Record<string, unknown>);
    expect(knobs.length).toBeGreaterThan(0);
    for (const knob of knobs) expect([knob.key, typeof knob.description]).toEqual([knob.key, "string"]);
  });

  it("takes the video's colours: its colour props default to theme tokens or literal colours", () => {
    const knobs = knobsOf(block.mod.schema as ZodType, block.mod.defaults as Record<string, unknown>);
    expect(knobs.some((k) => k.kind === "color" && String(k.value).startsWith("$"))).toBe(true);
  });

  it("has a demo that resolves without errors and lints clean", () => {
    const demo = load(name, "demo.tsx");
    const state = resolve(collectModule(demo.mod as never), { assets: {} });
    expect(state.errors).toEqual([]);
    expect(lint(demo.text, { manifest: { assets: {} } }).filter((d) => d.severity === "error")).toEqual([]);
    const meta = blockMetaSchema.parse(block.mod.meta);
    expect(state.composition.duration).toBeGreaterThanOrEqual(meta.length);
  });

  it("has a preview", () => {
    expect(existsSync(join(root, name, "preview.png"))).toBe(true);
  });
});
