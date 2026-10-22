import { describe, expect, it } from "vitest";
import { Executor } from "@cutcut/kit";
import { fixtureExecutor, fixtureTree, manifest, serialize } from "./helpers";

describe("Executor", () => {
  it("records nothing and leaves no patches when validation fails", () => {
    const exec = fixtureExecutor();
    const r = exec.execute({ type: "clip/trim", params: { id: "nope", edge: "out", value: 1 } });
    expect(r.ok).toBe(false);
    expect(r.errors?.[0]?.code).toBe("ELEMENT_NOT_FOUND");
    expect(exec.log().entries).toHaveLength(0);
    expect(exec.history().canUndo()).toBe(false);
  });

  it("rolls back patches when apply throws", () => {
    const exec = fixtureExecutor();
    const r = exec.execute({ type: "track/setLayout", params: { trackId: "main", layout: "free" } });
    expect(r.ok).toBe(false);
    expect(exec.log().entries).toHaveLength(0);
  });

  it("a group undoes as one history entry", () => {
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    exec.beginGroup("drag");
    exec.execute({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4.1 } });
    exec.execute({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4.2 } });
    exec.execute({ type: "audio/setVolume", params: { id: "a1", volume: 0.9 } });
    exec.endGroup();
    expect(exec.history().entries()).toHaveLength(3);
    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
    expect(exec.history().canUndo()).toBe(false);
  });

  it("undo and redo return null when there is nothing to do", () => {
    const exec = fixtureExecutor();
    expect(exec.undo()).toBeNull();
    expect(exec.redo()).toBeNull();
  });

  it("replaceTree clears the log and history", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4.1 } });
    exec.replaceTree(fixtureTree());
    expect(exec.log().entries).toHaveLength(0);
    expect(exec.history().canUndo()).toBe(false);
    expect(exec.state().items.get("c2")?.end).toBe(9);
  });

  it("memoises resolve on the log version", () => {
    const exec = new Executor({ tree: fixtureTree(), manifest });
    const a = exec.state();
    expect(exec.state()).toBe(a);
    exec.execute({ type: "audio/setVolume", params: { id: "a1", volume: 0.9 } });
    expect(exec.state()).not.toBe(a);
  });

  it("batch/apply validates each step against the state the previous one produced", () => {
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    const r = exec.execute({ type: "batch/apply", params: { actions: [
      { type: "clip/split", params: { id: "c3", at: 11, newId: "c3_b" } },
      { type: "clip/trim", params: { id: "c3_b", edge: "out", value: 24 } },
    ] } });
    expect(r.ok).toBe(true);
    expect(exec.state().items.get("c3_b")?.source?.out).toBe(24);
    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
    const bad = exec.execute({ type: "batch/apply", params: { actions: [
      { type: "clip/remove", params: { id: "c2" } },
      { type: "clip/trim", params: { id: "c2", edge: "out", value: 1 } },
    ] } });
    expect(bad.ok).toBe(false);
    expect(exec.log().entries.filter((p) => p.id === "c2")).toHaveLength(0);
  });
});
