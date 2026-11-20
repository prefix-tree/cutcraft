import { describe, expect, it } from "vitest";

import {
  applyEdits,
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  lint,
  printElement,
  printProp,
  resolve,
} from "@uberscene/sdk";

import { fixtureExecutor, fixturesDir, fixtureText, manifest, serialize } from "./helpers";

function changedLines(a: string, b: string): number {
  const x = a.split("\n"),
    y = b.split("\n");
  let n = 0;
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) n++;
  return n;
}

/**
 * A timeline without each element's `editable`. Undoing a delete of c3 writes back the anchor of b2, which a helper
 * generates on c3, so a save bakes b2 into a literal Title: the same element at the same place, now written out.
 */
const timeline = (items: ReturnType<typeof serialize>) => items.map(({ editable: _, ...item }) => item);

describe("fold", () => {
  it.each(["@uberscene/kit", "@cut/kit"])("imports newly materialized captions from %s", (moduleName) => {
    const initial = fixtureExecutor();
    initial.execute({ type: "caption/setAll", params: { captionsId: "cap", nodes: [] } });
    const generated = foldToSource(fixtureText, initial.log(), initial.state())
      .text.replace(/\bCaption,\s*/, "")
      .replaceAll("@uberscene/kit", moduleName);
    const exec = new Executor({ tree: initial.state().tree, manifest });
    expect(exec.execute({ type: "caption/update", params: { captionId: "cap-1", text: "Edited caption" } }).ok).toBe(
      true,
    );
    const result = foldToSource(generated, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text).toContain(`import { Caption } from "${moduleName}";`);
    expect(result.text).toContain("<Caption");
    expect(lint(result.text, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
  });

  it("folds a trim into a one-token prop edit", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "clip/trim", params: { id: "c3", edge: "out", value: 25 } });
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.baked).toEqual([]);
    expect(result.edits).toHaveLength(1);
    const edit = result.edits[0]!;
    expect(edit).toMatchObject({ kind: "prop", id: "c3", prop: "out", text: "{25}" });
    expect(fixtureText.slice(edit.range[0], edit.range[1])).toBe('"shot:2.end"');
    expect(changedLines(fixtureText, result.text)).toBe(1);
  });

  it("writes a reference that replaces a number as a plain string attribute", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "clip/trim", params: { id: "c3", edge: "out", value: 25 } });
    const seconds = foldToSource(fixtureText, exec.log(), exec.state()).text;
    expect(seconds).toContain("out={25}");
    const back = new Executor({ tree: exec.state().tree, manifest });
    expect(back.execute({ type: "clip/trim", params: { id: "c3", edge: "out", value: "shot:2.end" } }).ok).toBe(true);
    const result = foldToSource(seconds, back.log(), back.state());
    expect(result.text).toContain('out="shot:2.end"');
    expect(result.text).toBe(fixtureText);
  });

  it("moves a track and keeps the edits made inside it", async () => {
    // The moved block is printed anew; an edit inside it must land in that text, not overlap the removed original.
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "track/reorder", params: { trackId: "music", position: 0 } }).ok).toBe(true);
    expect(exec.execute({ type: "audio/setFade", params: { id: "a1", out: 0.5 } }).ok).toBe(true);
    expect(exec.execute({ type: "audio/setVolume", params: { id: "a1", volume: 0.4 } }).ok).toBe(true);
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text.indexOf('<Track id="music"')).toBeLessThan(result.text.indexOf('<Track id="main"'));
    expect(result.text.match(/<Audio id="a1"/g)).toHaveLength(1);
    expect(result.text).toMatch(/<Audio id="a1"[^>]*volume=\{0\.4\}[^>]*fade=\{\{ out: 0\.5 \}\}/);
    const mod = await evaluate(result.text);
    const reresolved = resolve(collectModule(mod, {}, { index: buildSourceIndex(result.text) }), manifest);
    expect(reresolved.errors).toEqual([]);
    expect(serialize(reresolved)).toEqual(serialize(exec.state()));
  });

  it("re-resolving the folded text equals the patched state", async () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4.4 } });
    exec.execute({ type: "text/setContent", params: { id: "t1", text: "Hello there" } });
    exec.execute({ type: "effect/add", params: { id: "c3", childId: "fx9", type: "grain", params: { amount: 0.2 } } });
    exec.execute({ type: "element/remove", params: { id: "g1" } });
    exec.execute({ type: "marker/add", params: { markerId: "m2", at: 6, label: "beat" } });
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    const mod = await evaluate(result.text);
    const index = buildSourceIndex(result.text);
    const reresolved = resolve(collectModule(mod, {}, { index }), manifest);
    expect(reresolved.errors).toEqual([]);
    expect(lint(result.text, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
    expect(serialize(reresolved, false)).toEqual(serialize(exec.state(), false));
    expect(result.text).toContain('<Effect id="fx9" type="grain" params={{ amount: 0.2 }} enabled />');
    expect(result.text).not.toContain('<Gap id="g1"');
  });

  it("bakes a generated element before editing it", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "element/update", params: { id: "b1", props: { size: 40 } } }).ok).toBe(true);
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.baked).toContain("b1");
    expect(result.text).not.toContain('<Badge id="b1"');
    expect(result.text).toContain('<Title id="b1"');
    expect(result.text).toContain("size={40}");
    expect(buildSourceIndex(result.text).elements.get("b1")?.props.get("size")?.literal).toBe(40);
  });

  it("writes a Layer's handles into the component tag", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "layer/setProps", params: { id: "l1", props: { to: 900, label: "go" } } }).ok).toBe(
      true,
    );
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text).toContain('<Counter from={0} to={900} label="go" />');
    expect(changedLines(fixtureText, result.text)).toBe(1);
    expect(buildSourceIndex(result.text).elements.get("l1")?.interior?.props.get("to")?.literal).toBe(900);
  });

  it("rewrites the defaults literal for the tweaks panel", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "composition/setProps", params: { defaults: { title: "Changed", accent: "#123456" } } });
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.text).toContain('export const defaults = { title: "Changed", accent: "#123456" };');
  });

  it("writes a deleted clip back once when the delete is undone", async () => {
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    expect(exec.execute({ type: "element/remove", params: { id: "c3" } }).ok).toBe(true);
    expect(exec.undo()?.ok).toBe(true);
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text.match(/<Clip id="c3"/g)).toHaveLength(1);
    const mod = await evaluate(result.text);
    const reresolved = resolve(collectModule(mod, {}, { index: buildSourceIndex(result.text) }), manifest);
    expect(reresolved.errors).toEqual([]);
    expect(timeline(serialize(reresolved))).toEqual(timeline(before));
    expect(result.baked).toEqual(["b2"]);
  });

  it("writes an edit to a clip whose delete was undone, on the one clip", async () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "element/remove", params: { id: "c3" } }).ok).toBe(true);
    expect(exec.undo()?.ok).toBe(true);
    expect(exec.execute({ type: "clip/setSpeed", params: { id: "c3", speed: 1.5 } }).ok).toBe(true);
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text.match(/<Clip id="c3"/g)).toHaveLength(1);
    expect(result.text).toMatch(/<Clip id="c3"[^>]*speed=\{1\.5\}/);
    const mod = await evaluate(result.text);
    const reresolved = resolve(collectModule(mod, {}, { index: buildSourceIndex(result.text) }), manifest);
    expect(reresolved.errors).toEqual([]);
    expect(timeline(serialize(reresolved))).toEqual(timeline(serialize(exec.state())));
  });

  it("writes a clip back once, with the trim it had, when its delete is undone", async () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "clip/trim", params: { id: "c3", edge: "out", value: 25 } }).ok).toBe(true);
    expect(exec.execute({ type: "element/remove", params: { id: "c3" } }).ok).toBe(true);
    expect(exec.undo()?.ok).toBe(true);
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text.match(/<Clip id="c3"/g)).toHaveLength(1);
    expect(result.text).toContain('<Clip id="c3" src="asset:interview" in="shot:2" out={25} speed={1.2} />');
    const mod = await evaluate(result.text);
    const reresolved = resolve(collectModule(mod, {}, { index: buildSourceIndex(result.text) }), manifest);
    expect(reresolved.errors).toEqual([]);
    expect(timeline(serialize(reresolved))).toEqual(timeline(serialize(exec.state())));
  });

  it("writes a clip back once when a delete is undone after an element was added inside it", async () => {
    // The clip put back is not the file's clip (it has a keyframe the file lacks): it is printed anew, the old one goes.
    const exec = fixtureExecutor();
    const add = { id: "c3", keyId: "kz", property: "transform.opacity", at: 0, value: 0 };
    expect(exec.execute({ type: "keyframe/add", params: add }).ok).toBe(true);
    expect(exec.execute({ type: "element/remove", params: { id: "c3" } }).ok).toBe(true);
    expect(exec.undo()?.ok).toBe(true);
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text.match(/<Clip id="c3"/g)).toHaveLength(1);
    expect(result.text.match(/<Keyframe id="kz"/g)).toHaveLength(1);
    const mod = await evaluate(result.text);
    const reresolved = resolve(collectModule(mod, {}, { index: buildSourceIndex(result.text) }), manifest);
    expect(reresolved.errors).toEqual([]);
    expect(timeline(serialize(reresolved))).toEqual(timeline(serialize(exec.state())));
  });

  it("prints props and elements", () => {
    expect(printProp("src", "asset:a")).toBe('src="asset:a"');
    expect(printProp("reverse", true)).toBe("reverse");
    expect(printProp("transform", { scale: 1.1 })).toBe("transform={{ scale: 1.1 }}");
    expect(printElement({ id: "t", kind: "title", props: { id: "t", duration: 2 }, text: "Hi" })).toBe(
      '<Title id="t" duration={2}>Hi</Title>',
    );
    expect(
      applyEdits("abcdef", [
        { kind: "text", id: "x", range: [1, 3], text: "XY" },
        { kind: "insert", id: "y", range: [5, 5], text: "!" },
      ]),
    ).toBe("aXYde!f");
  });
});

describe("fold, layout conversion, flatten and extract", () => {
  const cases: {
    name: string;
    actions: Parameters<ReturnType<typeof fixtureExecutor>["execute"]>[0][];
    expect: (text: string) => void;
  }[] = [
    {
      name: "sequence → free",
      actions: [{ type: "track/setLayout", params: { trackId: "main", layout: "free" } }],
      expect: (text) => {
        expect(text).toContain('<Track id="main" name="Main" layout="free">');
        expect(text).toContain('<Transition id="x1" type="crossfade" duration={0.5} on="c1" edge="out" />');
        expect(text).toContain(
          '<Clip id="c2" src="asset:city" duration={3.5} fit="cover" transform={{ scale: 1.1 }} start={5}>',
        );
        expect(text).not.toContain('<Gap id="g1"');
      },
    },
    {
      name: "free → sequence with a reorder and a gap",
      actions: [
        { type: "track/add", params: { trackId: "f", layout: "free" } },
        { type: "clip/add", params: { id: "fb", trackId: "f", src: "asset:city", place: { start: 4 }, in: 0, out: 2 } },
        { type: "clip/add", params: { id: "fa", trackId: "f", src: "asset:city", place: { start: 0 }, in: 0, out: 2 } },
        { type: "track/setLayout", params: { trackId: "f", layout: "sequence" } },
      ],
      expect: (text) => {
        expect(text).toContain(
          '<Track id="f">\n        <Clip id="fa" src="asset:city" in={0} out={2} />\n        <Gap id="gap-f-1" duration={2} />\n        <Clip id="fb" src="asset:city" in={0} out={2} />\n      </Track>',
        );
      },
    },
    {
      name: "flatten",
      actions: [{ type: "multicam/flatten", params: { id: "mc1" } }],
      expect: (text) => {
        expect(text).not.toContain("<Multicam");
        expect(text).toContain(
          '<Clip id="mc1-cu1" src="asset:interview" in={0} duration={2} start={0} />\n        <Clip id="mc1-cu2" src="asset:city" in={2} duration={10} start={2} />',
        );
      },
    },
    {
      name: "extract",
      actions: [{ type: "nested/extract", params: { id: "n1" } }],
      expect: (text) => {
        expect(text).not.toContain('<Nested id="n1"');
        expect(text).toMatch(
          /<Gap id="n1-gap" duration=\{3\} \/>\n {6}<\/Track>\n {6}<Track id="n1-outro" layout="free">\n {8}<Clip id="n1-oc1" src="asset:city" in=\{0\} out=\{3\} start=\{14\.16666666666666\d\} volume=\{0\.8\} \/>\n {6}<\/Track>\n {6}<Track id="overlays"/,
        );
      },
    },
  ];
  for (const c of cases) {
    it(`${c.name} folds to a file that resolves to the same state`, async () => {
      const exec = fixtureExecutor();
      for (const a of c.actions) expect(exec.execute(a).ok, a.type).toBe(true);
      const result = foldToSource(fixtureText, exec.log(), exec.state());
      expect(result.skipped).toEqual([]);
      c.expect(result.text);
      const mod = await evaluate(result.text);
      const index = buildSourceIndex(result.text);
      const reresolved = resolve(collectModule(mod, {}, { index }), manifest);
      expect(reresolved.errors).toEqual([]);
      expect(lint(result.text, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
      expect(serialize(reresolved, false)).toEqual(serialize(exec.state(), false));
    });
  }
});

async function evaluate(text: string): Promise<{
  default: (props: Record<string, unknown>) => React.ReactElement | null;
  defaults?: Record<string, unknown>;
}> {
  // Vitest transpiles TSX on import; write the folded text next to the fixture under a unique name.
  const { writeFileSync, mkdirSync, rmSync } = await import("node:fs");
  const { join } = await import("node:path");
  const dir = join(fixturesDir, ".tmp");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `folded-${Math.random().toString(36).slice(2)}.tsx`);
  writeFileSync(file, text);
  try {
    return (await import(/* @vite-ignore */ file)) as never;
  } finally {
    rmSync(file, { force: true });
  }
}
