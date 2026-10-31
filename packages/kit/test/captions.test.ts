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
    expect(pause.map((c) => c.text)).toEqual(["A", "b"]); // the first cue opens a sentence
    const plays = planCues([w(0, "a", 0, 0.3, "x"), w(1, "b", 0.4, 0.7, "y")]);
    expect(plays.map((c) => c.text)).toEqual(["A", "b"]);
    const chars = planCues([w(0, "aaaa", 0, 0.8), w(1, "bbbb", 0.9, 1.7), w(2, "cccc", 1.8, 2.6)], { maxChars: 9, maxDuration: 5, maxGap: 1 });
    expect(chars.map((c) => c.text)).toEqual(["Aaaa bbbb", "cccc"]);
    const long = planCues([w(0, "a", 0, 1), w(1, "b", 1.2, 2.2), w(2, "c", 2.4, 3.4)], { maxChars: 42, maxDuration: 3, maxGap: 1 });
    expect(long.map((c) => c.text)).toEqual(["A b", "c"]);
    const one = planCues([w(0, "a", 0, 0.3), w(1, "b", 0.4, 0.7)])[0]!;
    expect(one).toEqual({ start: 0, end: 0.7, text: "A b", words: [{ text: "A", start: 0, end: 0.3 }, { text: "b", start: 0.4, end: 0.7 }] });
  });

  it("keeps a word a cut lands inside when most of what plays of it is speech", () => {
    // A transcriber stretched "most" over the pause before it (1.0–2.2); the clip starts in that pause, at 1.7.
    const asset = { ...interview, transcript: { words: [{ i: 0, text: "so", start: 0.6, end: 1.0 }, { i: 1, text: "most", start: 1.0, end: 2.2 }, { i: 2, text: "volume.", start: 2.3, end: 2.8 }, { i: 3, text: "grazed", start: 2.9, end: 3.5 }] } } as AssetEntry;
    const words = timelineWords(asset, [{ id: "c", start: 0, in: 1.7, out: 2.95, speed: 1 }]);
    expect(words.map((x) => [x.text, x.start, x.end])).toEqual([["most", 0, 0.5], ["volume.", 0.6, 1.1]]);
  });

  it("breaks a long cue after a phrase, not on a word that leads into the next", () => {
    const at = (texts: string[]) => texts.map((t, i) => w(i, t, i, i + 0.9));
    expect(planCues(at(["How", "many", "pieces", "of", "content", "are", "you"]), { maxChars: 18, maxDuration: 30, maxGap: 1 }).map((c) => c.text))
      .toEqual(["How many pieces", "of content are you"]);
    expect(planCues(at(["Focus,", "then", "scale", "the", "thing"]), { maxChars: 16, maxDuration: 30, maxGap: 1 }).map((c) => c.text))
      .toEqual(["Focus,", "then scale", "the thing"]);
  });

  it("joins a cue too short to read to its sentence, holds it into a pause, or puts fast speech on two lines", () => {
    const opts = (maxChars: number) => ({ maxChars, maxDuration: 30, maxGap: 1 });
    // "go." alone would flash for 0.1 s: it joins its line, a little past the limit.
    const joined = planCues([w(0, "Two", 0, 0.5), w(1, "words", 0.5, 1), w(2, "then", 1, 1.5), w(3, "go.", 1.5, 1.6)], opts(14));
    expect(joined.map((c) => c.text)).toEqual(["Two words then go."]);
    // "65." is its own sentence after a cut: it stays up into the pause, never over the next cue.
    const held = planCues([w(0, "media?", 0, 0.5, "a"), w(1, "65.", 1, 1.2, "b"), w(2, "If", 2, 2.4, "c")]);
    expect(held.map((c) => [c.text, c.start, c.end])).toEqual([["Media?", 0, 0.5], ["65.", 1, 1.4], ["If", 2, 2.4]]);
    // A sentence spoken in half a second: one cue on two lines, not two flashes.
    const fast = planCues([w(0, "better", 0, 0.2), w(1, "at", 0.2, 0.25), w(2, "it", 0.25, 0.3), w(3, "than", 0.3, 0.4), w(4, "I", 0.4, 0.45), w(5, "am.", 0.45, 0.52)], opts(16));
    expect(fast.map((c) => c.text)).toEqual(["Better at it than I am."]);
  });

  it("starts a cue that opens a sentence with a capital", () => {
    const cues = planCues([w(0, "volume.", 0, 0.8, "a"), w(1, "it's", 1, 1.4, "b"), w(2, "just", 1.5, 2.2, "b")]);
    expect(cues.map((c) => c.text)).toEqual(["Volume.", "It's just"]);
    expect(cues[1]!.words[0]!.text).toBe("It's");
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
    expect(exec.state().items.get("cap-1")?.props.text).toBe("Welcome back to the show today we are");
    exec.execute({ type: "source/setProps", params: { id: "cap", props: { maxChars: 12 } } });
    const texts = [...exec.state().items.values()].filter((p) => p.parent === "cap").map((p) => p.props.text);
    // "talking" and "built" alone would flash by: each shares a line with the words before it, within the limit.
    expect(texts).toEqual(["Welcome back", "to the show", "today we", "are talking", "about why", "we built"]);
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
