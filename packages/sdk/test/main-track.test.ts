import { describe, expect, it } from "vitest";

import {
  buildSourceIndex,
  collectModule,
  Executor,
  foldToSource,
  insertLayer,
  lint,
  loadModule,
  type ResolvedState,
  resolve,
  wrapMainTrack,
} from "@uberscene/sdk";

import { manifest, serialize } from "./helpers";

const file = (
  body: string,
  names = "Clip, Composition, Gap, Title, Track, Transition",
) => `import { ${names} } from "@uberscene/kit";

export default function Video() {
  return (
    <Composition fps={30} width={1920} height={1080}>
${body}
    </Composition>
  );
}
`;

const DIRECT = file(`      <Clip id="opening" src="asset:city" />
      <Clip id="interview" src="asset:interview" in={2} out={12} />`);

const WRAPPED = file(`      <Track id="main">
        <Clip id="opening" src="asset:city" />
        <Clip id="interview" src="asset:interview" in={2} out={12} />
      </Track>`);

const BROLL = `      <Track id="broll" layout="free">
        <Clip id="grind" src="asset:city" start={4} duration={2} volume={0} />
      </Track>`;

const load = (text: string): ResolvedState =>
  resolve(collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }), manifest);
const executor = (text: string): Executor =>
  new Executor({
    tree: collectModule(loadModule(text) as never, {}, { index: buildSourceIndex(text) }),
    manifest,
    now: () => 0,
  });
/** The file after the executor's edits, with nothing skipped, and resolving to what the executor holds. */
const saved = (text: string, exec: Executor): string => {
  const result = foldToSource(text, exec.log(), exec.state());
  expect(result.skipped).toEqual([]);
  const again = load(result.text);
  expect(again.errors).toEqual([]);
  expect(serialize(again, false)).toEqual(serialize(exec.state(), false));
  return result.text;
};
const codes = (state: ResolvedState) => state.errors.map((e) => `${e.code} ${e.id}`);

describe("clips written straight in the composition", () => {
  it('are the main track: the same placements as in <Track id="main">', () => {
    const direct = load(DIRECT);
    expect(direct.errors).toEqual([]);
    expect(direct.tracks.map((t) => [t.id, t.layout, t.implicit, t.items])).toEqual([
      ["main", "sequence", true, ["opening", "interview"]],
    ]);
    expect(serialize(direct)).toEqual(serialize(load(WRAPPED)));
    expect(direct.items.get("interview")).toMatchObject({ track: "main", start: 12, end: 22, editable: "literal" });
  });

  it("stay where they were when a track is added: they are the bottom track wherever they are written", () => {
    const alone = load(DIRECT);
    for (const text of [
      file(`      <Clip id="opening" src="asset:city" />
      <Clip id="interview" src="asset:interview" in={2} out={12} />
${BROLL}`),
      file(`${BROLL}
      <Clip id="opening" src="asset:city" />
      <Clip id="interview" src="asset:interview" in={2} out={12} />`),
      file(`      <Clip id="opening" src="asset:city" />
${BROLL}
      <Clip id="interview" src="asset:interview" in={2} out={12} />`),
    ]) {
      const state = load(text);
      expect(state.errors).toEqual([]);
      expect(state.tracks.map((t) => [t.id, t.order])).toEqual([
        ["main", 0],
        ["broll", 1],
      ]);
      for (const id of ["opening", "interview"])
        expect(state.items.get(id)).toMatchObject({
          start: alone.items.get(id)?.start,
          end: alone.items.get(id)?.end,
          track: "main",
        });
    }
  });

  it("take transitions and gaps between them", () => {
    const state = load(
      file(`      <Clip id="a" src="asset:city" in={0} out={4} />
      <Transition id="x" type="crossfade" duration={1} />
      <Clip id="b" src="asset:city" in={4} out={8} />
      <Gap id="g" duration={2} />
      <Clip id="c" src="asset:city" in={8} out={10} />`),
    );
    expect(state.errors).toEqual([]);
    expect(state.items.get("b")).toMatchObject({ start: 3, end: 7 });
    expect(state.items.get("c")).toMatchObject({ start: 9, end: 11 });
  });

  it("report a start, a taken id, and an element that needs a track", () => {
    expect(codes(load(file(`      <Clip id="a" src="asset:city" start={3} />`)))).toEqual(["START_ON_SEQUENCE a"]);
    expect(codes(load(file(`      <Clip id="main" src="asset:city" />`)))).toEqual(["DUPLICATE_ID main"]);
    const both = load(
      file(`      <Clip id="a" src="asset:city" />
      <Track id="main">
        <Clip id="b" src="asset:city" />
      </Track>`),
    );
    expect(both.errors).toHaveLength(1);
    expect(both.errors[0]).toMatchObject({ code: "DUPLICATE_ID", id: "main" });
    expect(both.errors[0]?.message).toContain("move them into it");
    const title = load(file(`      <Title id="t" start={0} duration={2}>Hi</Title>`));
    expect(title.errors[0]).toMatchObject({ code: "INVALID_CHILD", id: "t" });
    expect(title.errors[0]?.message).toContain("put it in a <Track>");
  });

  it("lint clean, and are told to come first when written after a track", () => {
    expect(lint(DIRECT, { manifest })).toEqual([]);
    const late = lint(
      file(`${BROLL}
      <Clip id="opening" src="asset:city" />`),
      { manifest },
    );
    expect(late.map((d) => [d.rule, d.severity, d.id])).toEqual([["main-clips-first", "warning", "opening"]]);
    expect(lint(file(`      <Clip id="a" src="asset:city" start={3} />`), { manifest }).map((d) => d.rule)).toEqual([
      "no-start-on-sequence",
    ]);
  });
});

describe("editing clips written straight in the composition", () => {
  it("writes a trim as one prop, with no track", () => {
    const exec = executor(DIRECT);
    expect(exec.execute({ type: "clip/trim", params: { id: "interview", edge: "out", value: 9 } }).ok).toBe(true);
    const result = foldToSource(DIRECT, exec.log(), exec.state());
    expect(result.edits).toHaveLength(1);
    expect(saved(DIRECT, exec)).toBe(DIRECT.replace("out={12}", "out={9}"));
  });

  it("adds, splits, moves and joins clips without writing a track", () => {
    const exec = executor(DIRECT);
    const run = (action: Parameters<Executor["execute"]>[0]) => {
      const result = exec.execute(action);
      expect(result.ok ? [] : result.errors).toEqual([]);
    };
    run({
      type: "clip/add",
      params: { id: "first", trackId: "main", src: "asset:city", place: { after: null }, in: 0, out: 2 },
    });
    run({ type: "clip/split", params: { id: "interview", at: 20, newId: "interview-b" } });
    run({
      type: "transition/add",
      params: { transitionId: "x", between: ["first", "opening"], type: "crossfade", duration: 0.5 },
    });
    run({ type: "clip/move", params: { id: "interview-b", place: { after: "first" } } });
    const text = saved(DIRECT, exec);
    expect(text).not.toContain("<Track");
    expect(load(text).tracks.map((t) => [t.id, t.implicit])).toEqual([["main", true]]);
  });

  it("adds a track above them and leaves them as they are", () => {
    const exec = executor(DIRECT);
    expect(exec.execute({ type: "track/add", params: { trackId: "over", layout: "free" } }).ok).toBe(true);
    expect(saved(DIRECT, exec)).toBe(
      file(`      <Clip id="opening" src="asset:city" />
      <Clip id="interview" src="asset:interview" in={2} out={12} />
      <Track id="over" layout="free" />`),
    );
  });

  it("writes the track's tag for a setting of its own", () => {
    for (const action of [
      { type: "track/setFlag", params: { trackId: "main", flag: "muted", value: true } },
      { type: "track/rename", params: { trackId: "main", name: "Talk" } },
    ] as const) {
      const exec = executor(DIRECT);
      expect(exec.execute(action).ok).toBe(true);
      const fromWrapped = executor(WRAPPED);
      fromWrapped.execute(action);
      expect(saved(DIRECT, exec)).toBe(saved(WRAPPED, fromWrapped));
    }
  });

  it("writes the tag when a track goes under them, and when they are removed", () => {
    const text = file(`      <Clip id="opening" src="asset:city" />
      <Clip id="interview" src="asset:interview" in={2} out={12} />
${BROLL}`);
    const under = executor(text);
    expect(under.execute({ type: "track/reorder", params: { trackId: "broll", position: 0 } }).ok).toBe(true);
    const moved = saved(text, under);
    expect(load(moved).tracks.map((t) => [t.id, t.implicit])).toEqual([
      ["broll", undefined],
      ["main", undefined],
    ]);
    const gone = executor(text);
    expect(gone.execute({ type: "track/remove", params: { trackId: "main" } }).ok).toBe(true);
    const removed = saved(text, gone);
    expect(removed).not.toContain("opening");
    expect(load(removed).tracks.map((t) => t.id)).toEqual(["broll"]);
  });

  it("undoes a setting back to the same video", () => {
    const exec = executor(DIRECT);
    exec.execute({ type: "track/setFlag", params: { trackId: "main", flag: "muted", value: true } });
    const text = saved(DIRECT, exec);
    const again = executor(text);
    expect(again.execute({ type: "track/setFlag", params: { trackId: "main", flag: "muted", value: false } }).ok).toBe(
      true,
    );
    expect(serialize(load(saved(text, again)), false)).toEqual(serialize(load(DIRECT), false));
  });
});

describe("wrapMainTrack", () => {
  it("writes the tag around the clips and imports Track", () => {
    const bare = DIRECT.replace("Title, Track, Transition", "Title, Transition");
    expect(wrapMainTrack(bare)).toBe(WRAPPED.replace("Title, Track, Transition", "Title, Track, Transition"));
    expect(wrapMainTrack(WRAPPED)).toBe(WRAPPED);
  });

  it("gathers clips written between tracks, in order", () => {
    const wrapped = wrapMainTrack(
      file(`      <Clip id="opening" src="asset:city" />
${BROLL}
      <Clip id="interview" src="asset:interview" in={2} out={12} />`),
    );
    expect(wrapped).toBe(
      file(`      <Track id="main">
        <Clip id="opening" src="asset:city" />
        <Clip id="interview" src="asset:interview" in={2} out={12} />
      </Track>
${BROLL}`),
    );
  });

  it("lets a Layer be placed in the main track", () => {
    const text = insertLayer(DIRECT, {
      track: "main",
      id: "badge",
      component: "Badge",
      from: "./badge",
      timing: { duration: 2 },
    });
    expect(text).toContain('<Track id="main">');
    expect(buildSourceIndex(text).elements.get("badge")?.parent).toBe("main");
  });
});
