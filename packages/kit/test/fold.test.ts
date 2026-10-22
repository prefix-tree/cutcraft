import { describe, expect, it } from "vitest";
import { collectModule, resolve } from "@cutcut/kit";
import { applyEdits, buildSourceIndex, foldToSource, lint, printElement, printProp } from "@cutcut/kit/source";
import { fixtureExecutor, fixtureText, fixturesDir, manifest, serialize } from "./helpers";

function changedLines(a: string, b: string): number {
  const x = a.split("\n"), y = b.split("\n");
  let n = 0;
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) n++;
  return n;
}

describe("fold", () => {
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

  it("re-resolving the folded text equals the patched state", async () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4.4 } });
    exec.execute({ type: "text/setContent", params: { id: "t1", text: "Hello there" } });
    exec.execute({ type: "effect/add", params: { id: "c3", childId: "fx9", type: "grain", params: { amount: 20 } } });
    exec.execute({ type: "clip/remove", params: { id: "g1" } });
    exec.execute({ type: "marker/add", params: { markerId: "m2", at: 6, label: "beat" } });
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    const mod = await evaluate(result.text);
    const index = buildSourceIndex(result.text);
    const reresolved = resolve(collectModule(mod, {}, { index }), manifest);
    expect(reresolved.errors).toEqual([]);
    expect(lint(result.text, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
    expect(serialize(reresolved, false)).toEqual(serialize(exec.state(), false));
    expect(result.text).toContain('<Effect id="fx9" type="grain" params={{ amount: 20 }} enabled />');
    expect(result.text).not.toContain('<Gap id="g1"');
  });

  it("bakes a generated element before editing it", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "text/update", params: { id: "b1", props: { size: 40 } } }).ok).toBe(true);
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.baked).toContain("b1");
    expect(result.text).not.toContain('<Badge id="b1"');
    expect(result.text).toContain('<Title id="b1"');
    expect(result.text).toContain("size={40}");
    expect(buildSourceIndex(result.text).elements.get("b1")?.props.get("size")?.literal).toBe(40);
  });

  it("rewrites the defaults literal for the tweaks panel", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "composition/setProps", params: { defaults: { title: "Changed", accent: "#123456" } } });
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.text).toContain('export const defaults = { title: "Changed", accent: "#123456" };');
  });

  it("prints props and elements", () => {
    expect(printProp("src", "asset:a")).toBe('src="asset:a"');
    expect(printProp("reverse", true)).toBe("reverse");
    expect(printProp("transform", { scale: 1.1 })).toBe("transform={{ scale: 1.1 }}");
    expect(printElement({ id: "t", kind: "title", props: { id: "t", duration: 2 }, text: "Hi" })).toBe('<Title id="t" duration={2}>Hi</Title>');
    expect(applyEdits("abcdef", [{ kind: "text", id: "x", range: [1, 3], text: "XY" }, { kind: "insert", id: "y", range: [5, 5], text: "!" }])).toBe("aXYde!f");
  });
});

async function evaluate(text: string): Promise<{ default: (props: Record<string, unknown>) => React.ReactElement | null; defaults?: Record<string, unknown> }> {
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
