import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Clip, Composition, Executor, Title, Track, collectModule, resolve, type AssetManifest } from "@cutcut/kit";
import { buildSourceIndex, foldToSource, lint } from "@cutcut/kit/source";
import { manifest } from "./helpers";

/** The text and the module must agree: the index reads the text, collect evaluates the module. */
const text = `
import { z } from "zod";
import { Clip, Composition, Title, Track } from "@cutcut/kit";

export const schema = z.object({ closeOut: z.number(), label: z.string() });
export const defaults = { closeOut: 6, label: "Hi" };

export default function Video({ closeOut, label }: z.infer<typeof schema>) {
  return (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="open" src="asset:city" in={0} out={2} />
        <Clip id="close" src="asset:city" in={0} out={closeOut} />
        <Clip id="tail" src="asset:city" in={1} out={closeOut} />
      </Track>
      <Track id="overlays">
        <Title id="t" anchor="close" offset={0.5} duration={1}>{label}</Title>
      </Track>
    </Composition>
  );
}
`;

const mod = {
  schema: z.object({ closeOut: z.number(), label: z.string() }),
  defaults: { closeOut: 6, label: "Hi" },
  default: ({ closeOut, label }: { closeOut: number; label: string }) => (
    <Composition fps={30} width={1920} height={1080}>
      <Track id="main">
        <Clip id="open" src="asset:city" in={0} out={2} />
        <Clip id="close" src="asset:city" in={0} out={closeOut} />
        <Clip id="tail" src="asset:city" in={1} out={closeOut} />
      </Track>
      <Track id="overlays">
        <Title id="t" anchor="close" offset={0.5} duration={1}>{label}</Title>
      </Track>
    </Composition>
  ),
};

const m: AssetManifest = manifest;

describe("props bound to schema keys", () => {
  const index = buildSourceIndex(text);

  it("are indexed as bound, not locked, and only intentional source reuse is warned", () => {
    const close = index.elements.get("close")!;
    expect(close.boundProps).toEqual({ out: "closeOut" });
    expect(close.lockedProps).toEqual([]);
    expect(close.props.get("out")).toMatchObject({ isExpression: true, binding: "closeOut" });
    expect(index.elements.get("t")!.lockedProps).toEqual([]);
    // This fixture intentionally reuses footage to exercise one binding shared by multiple clips.
    expect(lint(text, { manifest: m }).map(({ rule, id }) => ({ rule, id }))).toEqual([
      { rule: "repeated-source", id: "close" },
      { rule: "repeated-source", id: "tail" },
    ]);
  });

  it("resolve carries the binding and the trim is allowed", () => {
    const tree = collectModule(mod, {}, { index });
    const state = resolve(tree, m);
    expect(state.items.get("close")!.boundProps).toEqual({ out: "closeOut" });
    expect(state.items.get("close")!.lockedProps).toEqual([]);
    const exec = new Executor({ tree, manifest: m, now: () => 0 });
    const r = exec.execute({ type: "clip/trim", params: { id: "close", edge: "out", value: 7 } });
    expect(r.ok).toBe(true);
    expect(exec.state().items.get("close")!.source!.out).toBe(7);
    expect(exec.state().items.get("t")!.start).toBeCloseTo(2.5);
  });

  it("folds the write into defaults and keeps the reference in the element", () => {
    const tree = collectModule(mod, {}, { index });
    const exec = new Executor({ tree, manifest: m, now: () => 0 });
    exec.execute({ type: "clip/trim", params: { id: "close", edge: "out", value: 7 } });
    const result = foldToSource(text, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.edits).toHaveLength(1);
    expect(result.edits[0]).toMatchObject({ kind: "defaults", id: "close" });
    expect(result.text).toContain("export const defaults = { closeOut: 7, label: \"Hi\" };");
    expect(result.text).toContain('out={closeOut}');
    expect(result.text.split("\n").filter((line, i) => line !== text.split("\n")[i])).toHaveLength(1);
  });

  it("lets the last of two writes to the same key win", () => {
    const tree = collectModule(mod, {}, { index });
    const exec = new Executor({ tree, manifest: m, now: () => 0 });
    exec.execute({ type: "clip/trim", params: { id: "close", edge: "out", value: 7 } });
    exec.execute({ type: "clip/trim", params: { id: "tail", edge: "out", value: 8 } });
    const result = foldToSource(text, exec.log(), exec.state());
    expect(result.edits).toHaveLength(1);
    expect(result.text).toContain("closeOut: 8,");
  });

  it("does not bind inside helpers or outside the default export", () => {
    const helperText = text.replace(
      '<Clip id="tail" src="asset:city" in={1} out={closeOut} />',
      '<Tail />',
    ) + '\nfunction Tail() { const closeOut = 3; return <Clip id="tail" src="asset:city" in={0} duration={closeOut} />; }\n';
    const i2 = buildSourceIndex(helperText);
    expect(i2.elements.get("tail")!.boundProps).toEqual({});
    expect(i2.elements.get("tail")!.lockedProps).toEqual(["duration"]);
    expect(lint(helperText, { manifest: m }).map((d) => d.rule)).toEqual(["repeated-source", "expression-locked"]);
  });

  it("binds through a props object too", () => {
    const propsText = text.replace("({ closeOut, label }: z.infer<typeof schema>)", "(props: z.infer<typeof schema>)").replaceAll("out={closeOut}", "out={props.closeOut}").replace("{label}", "{props.label}");
    const i3 = buildSourceIndex(propsText);
    expect(i3.elements.get("close")!.boundProps).toEqual({ out: "closeOut" });
    expect(i3.elements.get("tail")!.boundProps).toEqual({ out: "closeOut" });
  });
});
