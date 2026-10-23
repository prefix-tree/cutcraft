import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Executor, collectModule, resolve, type AssetManifest } from "@cutcut/kit";
import { buildSourceIndex, foldToSource, lint } from "@cutcut/kit/source";
import * as file from "../video";

const root = join(import.meta.dirname, "..");
const text = readFileSync(join(root, "video.tsx"), "utf8");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as AssetManifest;

describe("the launch recap file", () => {
  const tree = collectModule(file);
  const state = resolve(tree, manifest);

  it("passes every lint rule and resolves without errors", () => {
    expect(lint(text, { manifest })).toEqual([]);
    expect(state.errors).toEqual([]);
  });

  it("lands in the brief's length and places the story as intended", () => {
    expect(state.composition.duration).toBeGreaterThan(24);
    expect(state.composition.duration).toBeLessThan(32);
    const at = (id: string) => state.items.get(id)!;
    expect(at("hook")).toMatchObject({ start: 0, source: { in: 5.6, out: 10.8 } });
    expect(at("broll").start).toBeCloseTo(4.8);
    expect(at("close").start).toBeCloseTo(17.4);
    expect(at("close").source).toMatchObject({ in: 24, out: 29.2 });
    expect(at("bed").end).toBeCloseTo(state.composition.duration);
    expect(at("lt-bg").start).toBeCloseTo(17.8);
    expect(at("cta").start).toBeCloseTo(at("outro").start + 0.3);
  });

  it("keeps the once-used helper's elements editable and the layer opaque", () => {
    for (const id of ["lt-bg", "lt-name", "lt-role"]) expect(state.items.get(id)!.editable).toBe("literal");
    expect(state.items.get("cta")!.kind).toBe("layer");
    expect(state.tree.byId.get("cta")!.children).toEqual([]);
  });

  it("gives the call-to-action layer two handles, both bound to the schema", () => {
    const index = buildSourceIndex(text);
    expect(index.elements.get("cta")?.interior?.component).toBe("CallToAction");
    expect(index.elements.get("cta")?.boundProps).toEqual({ "interior.text": "cta", "interior.accent": "accent" });
    const indexed = collectModule(file, {}, { index });
    expect(indexed.byId.get("cta")?.interior).toEqual({ component: "CallToAction", props: { text: file.defaults.cta, accent: file.defaults.accent } });
    const exec = new Executor({ tree: indexed, manifest, now: () => 0 });
    expect(exec.execute({ type: "layer/setProps", params: { id: "cta", props: { text: "Go" } } }).ok).toBe(true);
    const folded = foldToSource(text, exec.log(), exec.state());
    expect(folded.skipped).toEqual([]);
    expect(folded.edits).toHaveLength(1);
    expect(folded.edits[0]).toMatchObject({ kind: "defaults", id: "cta" });
    expect(folded.text).toContain('cta: "Go"');
    expect(folded.text).toContain("<CallToAction text={cta} accent={accent} />");
  });

  it("folds a trim gesture into one changed token", () => {
    const exec = new Executor({ tree, manifest, now: () => 0 });
    const r = exec.execute({ type: "clip/trim", params: { id: "hook", edge: "out", value: "word:22.end" } });
    expect(r.ok).toBe(true);
    expect(exec.state().items.get("broll")!.start).toBeCloseTo(4.2);
    const folded = foldToSource(text, exec.log(), exec.state());
    expect(folded.edits).toHaveLength(1);
    expect(folded.text).toContain('out="word:22.end"');
    const changed = folded.text.split("\n").filter((line, i) => line !== text.split("\n")[i]);
    expect(changed).toHaveLength(1);
  });
});
