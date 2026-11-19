// Removing, splitting and trimming a clip carry along what is placed from it: titles anchored to it, transitions beside
// it, lengths that follow it. Each case checks the timeline is left with no errors and that undo puts it all back.
import { createElement as h, type ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { Clip, Composition, collect, dependentsOf, Executor, Title, Track, Transition } from "@uberscene/kit";

import { manifest, serialize } from "../helpers";

function executor(extra: ReactElement[] = [], over: ReactElement[] = []): Executor {
  const tree = collect(
    h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "main" },
        h(Clip, { id: "a", src: "asset:interview", in: 0, out: 4 }),
        h(Transition, { id: "x1", type: "crossfade", duration: 0.5 }),
        h(Clip, { id: "b", src: "asset:interview", in: 4, out: 8 }),
        ...extra,
        h(Clip, { id: "c", src: "asset:interview", in: 0, out: 2 }),
      ),
      h(
        Track,
        { id: "over", layout: "free" },
        // word:6 plays 3.2 s into "a".
        h(Title, { id: "ta", anchor: "a", at: "word:6", duration: 0.5 }, "on a word"),
        h(Title, { id: "tb", anchor: "b", offset: 1, duration: 1 }, "on b"),
        h(Title, { id: "tbe", anchor: "b.end", offset: -0.5, duration: 0.5 }, "at b's end"),
        h(Title, { id: "tu", anchor: "b", duration: { until: "b" } }, "until b ends"),
        h(Title, { id: "tm", start: 0, duration: { match: "b" } }, "as long as b"),
        h(Title, { id: "tae", anchor: "a.end", offset: -1, duration: 0.5 }, "at a's end"),
        h(Title, { id: "tua", anchor: "a", offset: 0.5, duration: { until: "a" } }, "until a ends"),
        ...over,
      ),
    ),
  );
  return new Executor({ tree, manifest, now: () => 0 });
}

const props = (exec: Executor, id: string) => exec.state().tree.byId.get(id)?.props;
const errors = (exec: Executor) => exec.state().errors.map((e) => `${e.code} ${e.id}`);

/** Runs `input`, checks it leaves no errors, hands the state over, then checks undo restores the start. */
function carried(exec: Executor, input: Parameters<Executor["execute"]>[0], check: () => void): void {
  const before = serialize(exec.state());
  expect(errors(exec)).toEqual([]);
  const result = exec.execute(input);
  expect(result.errors ?? []).toEqual([]);
  expect(errors(exec)).toEqual([]);
  check();
  const undone = exec.undo();
  expect(undone?.errors ?? []).toEqual([]);
  expect(undone?.ok).toBe(true);
  expect(serialize(exec.state())).toEqual(before);
}

describe("dependentsOf", () => {
  it("lists what is placed from an element, each way it depends", () => {
    const deps = dependentsOf(executor().state(), "b");
    expect(deps).toEqual(
      expect.arrayContaining([
        { kind: "anchor", id: "tb" },
        { kind: "anchor", id: "tbe", edge: "end" },
        { kind: "anchor", id: "tu" },
        { kind: "until", id: "tu" },
        { kind: "match", id: "tm" },
        { kind: "beside", id: "x1", side: "before" },
      ]),
    );
    expect(dependentsOf(executor().state(), "a")).toContainEqual({ kind: "anchor", id: "ta", at: "word:6" });
  });
});

describe("removing a clip", () => {
  it("moves its titles to the clip before, keeps the transition that still joins two clips, fixes lengths", () => {
    const exec = executor();
    const was = exec.state().items;
    carried(exec, { type: "clip/remove", params: { id: "b" } }, () => {
      const s = exec.state();
      expect(props(exec, "tb")).toMatchObject({ anchor: "a" });
      expect(props(exec, "tbe")).toMatchObject({ anchor: "a" });
      expect(props(exec, "tu")).toMatchObject({ anchor: "a", duration: was.get("b")?.duration });
      expect(props(exec, "tm")).toMatchObject({ duration: was.get("b")?.duration });
      // Held inside "a", which still plays where it was: each title ends by the end of "a".
      for (const id of ["tb", "tbe"]) expect(s.items.get(id)!.end).toBeLessThanOrEqual(s.items.get("a")!.end + 1e-6);
      expect(s.tree.byId.has("x1")).toBe(true);
    });
  });

  it("keeps a title's time when the clip before still plays then", () => {
    const exec = executor([], [h(Title, { id: "early", anchor: "c", offset: -1, duration: 0.5 }, "before c")]);
    const was = exec.state().items.get("early")!.start;
    carried(exec, { type: "clip/remove", params: { id: "c" } }, () => {
      expect(props(exec, "early")).toMatchObject({ anchor: "b" });
      expect(exec.state().items.get("early")!.start).toBeCloseTo(was, 3);
    });
  });

  it("removes its titles with it when there is no clip before, and a transition left with one side", () => {
    const exec = executor();
    carried(exec, { type: "clip/remove", params: { id: "a" } }, () => {
      const tree = exec.state().tree.byId;
      for (const id of ["ta", "tae", "tua", "x1"]) expect(tree.has(id)).toBe(false);
    });
  });

  it("keeps one transition when it had one on each side", () => {
    const exec = executor([h(Transition, { id: "x2", type: "crossfade", duration: 0.5 })]);
    carried(exec, { type: "clip/remove", params: { id: "b" } }, () => {
      expect(exec.state().tree.byId.has("x1")).toBe(true);
      expect(exec.state().tree.byId.has("x2")).toBe(false);
    });
  });

  it("carries the same way on a ripple delete", () => {
    const exec = executor();
    carried(exec, { type: "clip/rippleDelete", params: { id: "b" } }, () => {
      expect(props(exec, "tb")).toMatchObject({ anchor: "a" });
    });
  });

  it("is plain when nothing depends on the clip", () => {
    const exec = executor();
    const result = exec.execute({ type: "clip/remove", params: { id: "c" } });
    expect(result.inverse?.type).toBe("clip/restore");
  });
});

describe("splitting a clip", () => {
  it("moves what belongs to the second half to the new clip", () => {
    const exec = executor();
    const was = exec.state().items.get("ta")!.start;
    carried(exec, { type: "clip/split", params: { id: "a", at: 2, newId: "a2" } }, () => {
      expect(props(exec, "ta")).toMatchObject({ anchor: "a2", at: "word:6" });
      expect(exec.state().items.get("ta")!.start).toBeCloseTo(was, 3);
      expect(props(exec, "tae")).toMatchObject({ anchor: "a2.end" });
      expect(props(exec, "tua")).toMatchObject({ duration: { until: "a2" } });
    });
  });

  it("leaves a title whose word is still in the first half", () => {
    const exec = executor();
    carried(exec, { type: "clip/split", params: { id: "a", at: 3.5, newId: "a2" } }, () => {
      expect(props(exec, "ta")).toMatchObject({ anchor: "a", at: "word:6" });
    });
  });
});

describe("trimming a clip", () => {
  it("keeps a title whose word is trimmed away at its time, held inside the clip", () => {
    const exec = executor();
    carried(exec, { type: "clip/trim", params: { id: "a", edge: "in", value: 3.3 } }, () => {
      const s = exec.state();
      expect(props(exec, "ta")).not.toHaveProperty("at");
      const ta = s.items.get("ta")!;
      const a = s.items.get("a")!;
      expect(ta.start).toBeGreaterThanOrEqual(a.start - 1e-6);
      expect(ta.start).toBeLessThanOrEqual(a.end + 1e-6);
    });
  });

  it("leaves a title whose word is still played", () => {
    const exec = executor();
    carried(exec, { type: "clip/trim", params: { id: "a", edge: "in", value: 1 } }, () => {
      expect(props(exec, "ta")).toMatchObject({ at: "word:6" });
    });
  });
});
