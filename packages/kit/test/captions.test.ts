import { describe, expect, it } from "vitest";
import { collectModule, planCues, resolve, timelineWords, type AssetEntry, type TimelineWord } from "@cutcut/kit";
import { applyEdits, bake, buildSourceIndex, foldToSource, lint } from "@cutcut/kit/source";
import * as sample from "../fixtures/sample";
import { fixtureExecutor, fixtureText, manifest, serialize } from "./helpers";

const interview = manifest.assets.interview as AssetEntry;
const w = (i: number, text: string, start: number, end: number, play = "c"): TimelineWord => ({ i, text, start, end, play });

describe("captions from the transcript", () => {
  it("maps words through the plays that show them, in timeline order", () => {
    const words = timelineWords(interview, [
      { id: "b", start: 10, in: 3.2, out: 4.4, speed: 2 },
      { id: "a", start: 0, in: 2.0, out: 3.5, speed: 1 },
    ]);
    expect(JSON.stringify(words.map((x) => [x.text, x.play, x.start, x.end]))).toBe(JSON.stringify([
      ["Hello", "a", 0, 0.4], ["and", "a", 0.5, 0.6], ["welcome", "a", 0.7, 1.1], ["back", "a", 1.2, 1.5],
      ["back", "b", 10, 10.15], ["to", "b", 10.2, 10.25], ["the", "b", 10.3, 10.35], ["show", "b", 10.4, 10.6],
    ]));
  });

  it("maps words through a speed ramp and pushes them past a freeze hold", () => {
    const at = (plays: Parameters<typeof timelineWords>[1]) => timelineWords(interview, plays).map((x) => [x.text, x.start, x.end]);
    // A key at half speed replaces `speed`: every word plays twice as late.
    expect(at([{ id: "a", start: 0, in: 2.0, out: 3.5, speed: 1, keys: [{ at: 0, speed: 0.5 }] }])).toEqual([
      ["Hello", 0, 0.8], ["and", 1, 1.2], ["welcome", 1.4, 2.2], ["back", 2.4, 3],
    ]);
    // A 1 s hold at 0.6 s: the words after it play 1 s later.
    expect(at([{ id: "a", start: 0, in: 2.0, out: 3.5, speed: 1, holds: [{ at: 2.5, start: 0.6, duration: 1 }] }])).toEqual([
      ["Hello", 0, 0.4], ["and", 0.5, 0.6], ["welcome", 1.7, 2.1], ["back", 2.2, 2.5],
    ]);
  });

  it("breaks cues at sentence ends, pauses, play boundaries and limits", () => {
    const sentence = planCues([w(0, "Hello.", 0, 0.3), w(1, "World", 0.4, 0.7)]);
    expect(sentence.map((c) => c.text)).toEqual(["Hello.", "World"]);
    const pause = planCues([w(0, "a", 0, 0.3), w(1, "b", 1.5, 1.8)]);
    expect(pause.map((c) => c.text)).toEqual(["a", "b"]);
    const plays = planCues([w(0, "a", 0, 0.3, "x"), w(1, "b", 0.4, 0.7, "y")]);
    expect(plays.map((c) => c.text)).toEqual(["a", "b"]);
    const chars = planCues([w(0, "aaaa", 0, 0.1), w(1, "bbbb", 0.2, 0.3), w(2, "cccc", 0.4, 0.5)], { maxChars: 9, maxDuration: 5, maxGap: 1 });
    expect(chars.map((c) => c.text)).toEqual(["aaaa bbbb", "cccc"]);
    const long = planCues([w(0, "a", 0, 1), w(1, "b", 1.2, 2.2), w(2, "c", 2.4, 3.4)], { maxChars: 42, maxDuration: 3, maxGap: 1 });
    expect(long.map((c) => c.text)).toEqual(["a b", "c"]);
    const one = planCues([w(0, "a", 0, 0.3), w(1, "b", 0.4, 0.7)])[0]!;
    expect(one).toEqual({ start: 0, end: 0.7, text: "a b", words: [{ text: "a", start: 0, end: 0.3 }, { text: "b", start: 0.4, end: 0.7 }] });
  });

  it("times a literal cue's word references where the words play", () => {
    const state = resolve(collectModule(sample), manifest);
    expect(state.errors).toEqual([]);
    expect(state.items.get("cp1")).toMatchObject({ start: 0, end: 1.5 });
    expect(state.items.get("cp2")).toMatchObject({ start: 4, end: 6 });
  });

  it("reports a word that no clip plays", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "caption/update", params: { captionId: "cp1", start: "word:0" } }).ok).toBe(true);
    const errors = exec.state().items.get("cp1")?.errors.map((e) => `${e.code}:${e.prop}`);
    expect(errors).toEqual(["UNKNOWN_REF:start"]);
  });

  it("generates cues along the timeline when there are no literal ones", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "caption/setAll", params: { captionsId: "cap", nodes: [] } });
    const s = exec.state();
    const cues = [...s.items.values()].filter((p) => p.parent === "cap" && p.kind === "caption");
    // c1 plays word 3 to word 18 from 0; "it" (7.5–7.7) ends past the trim and is left out.
    expect(cues.map((c) => [c.id, c.editable, c.props.text, c.start, c.end])).toEqual([
      ["cap-1", "generated", "Hello and welcome back to the show today", 0, 3],
      ["cap-2", "generated", "we are talking about why we built", 3.2, 5.4],
    ]);
    expect((s.items.get("cap-1")?.props.words as unknown[])[0]).toEqual({ text: "Hello", start: 0, end: 0.4 });
    const again = exec.state();
    expect(again.items.get("cap-1")).toBe(s.items.get("cap-1"));
    exec.execute({ type: "caption/setStyle", params: { captionsId: "cap", style: { size: 30 } } });
    expect(exec.state().items.get("cap-1")?.props.text).toBe("Hello and welcome back to the show today");
  });

  it("follows the clip when it moves and respects the generation limits", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "caption/setAll", params: { captionsId: "cap", nodes: [] } });
    exec.execute({ type: "clip/trim", params: { id: "c1", edge: "in", value: "word:5" } });
    expect(exec.state().items.get("cap-1")?.props.text).toBe("welcome back to the show today we are");
    exec.execute({ type: "source/setProps", params: { id: "cap", props: { maxChars: 12 } } });
    const texts = [...exec.state().items.values()].filter((p) => p.parent === "cap").map((p) => p.props.text);
    expect(texts).toEqual(["welcome back", "to the show", "today we are", "talking", "about why we", "built"]);
  });

  it("makes the cues literal on the first edit and regenerates on undo", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "caption/setAll", params: { captionsId: "cap", nodes: [] } });
    const generated = serialize(exec.state());
    expect(exec.execute({ type: "caption/update", params: { captionId: "cap-2", text: "we are talking about why we built it!" } }).ok).toBe(true);
    const s = exec.state();
    expect(s.tree.byId.get("cap")?.children.map((c) => [c.id, c.editable])).toEqual([["cap-1", "literal"], ["cap-2", "literal"]]);
    expect(s.items.get("cap-2")?.props.text).toBe("we are talking about why we built it!");
    expect(s.items.get("cap-1")).toMatchObject({ start: 0, editable: "literal" });
    exec.undo();
    expect(serialize(exec.state())).toEqual(generated);
    exec.redo();
    expect(exec.state().items.get("cap-2")?.props.text).toBe("we are talking about why we built it!");
    expect(exec.execute({ type: "caption/remove", params: { captionId: "cap-1" } }).ok).toBe(true);
    expect(exec.state().items.has("cap-1")).toBe(false);
  });

  it("folds a materialised edit into literal cues inside <Captions>", async () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "caption/setAll", params: { captionsId: "cap", nodes: [] } });
    exec.execute({ type: "caption/update", params: { captionId: "cap-2", text: "we are talking about why we built it!" } });
    const result = foldToSource(fixtureText, exec.log(), exec.state());
    expect(result.skipped).toEqual([]);
    expect(result.text).toContain('<Caption id="cap-1" start={0} end={3} text="Hello and welcome back to the show today" words={[{ text: "Hello", start: 0, end: 0.4 }');
    expect(result.text).toContain('text="we are talking about why we built it!"');
    expect(result.text).not.toContain('<Caption id="cp1"');
    expect(lint(result.text, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
    const index = buildSourceIndex(result.text);
    expect(index.elements.get("cap")?.childrenRange).not.toBeNull();
    expect([...index.elements.keys()].filter((k) => k.startsWith("cap-"))).toEqual(["cap-1", "cap-2"]);
  });

  it("bakes generated cues as children of a self-closing <Captions>", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "caption/setAll", params: { captionsId: "cap", nodes: [] } });
    const open = foldToSource(fixtureText, exec.log(), exec.state()).text;
    const state = exec.state();
    for (const text of [open, open.replace(/<Captions id="cap"([^>]*)>\n\s*<\/Captions>/, '<Captions id="cap"$1 />')]) {
      const edits = bake(text, "cap-1", state);
      expect(edits).toHaveLength(1);
      const baked = applyEdits(text, edits);
      expect(baked).toMatch(/<Captions id="cap"[^>]*>\n {8}<Caption id="cap-1" [^\n]*\n {8}<Caption id="cap-2" [^\n]*\n {6}<\/Captions>/);
    }
    expect(open.replace(/<Captions id="cap"([^>]*)>\n\s*<\/Captions>/, "SELF")).toContain("SELF");
  });
});
