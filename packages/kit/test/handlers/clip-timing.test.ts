import { describe, expect, it } from "vitest";
import { fixtureExecutor, serialize, round } from "../helpers";

describe("clip timing", () => {
  it("trim → undo restores the state and keeps the inverse in the log", () => {
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    const r = exec.execute({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4.4 } });
    expect(r.ok).toBe(true);
    const after = exec.state();
    expect(after.items.get("c2")?.end).toBeCloseTo(9.4);
    expect(after.items.get("g1")?.start).toBeCloseTo(9.4);
    expect(after.items.get("c3")?.start).toBeCloseTo(10.4);
    expect(after.items.get("l1")?.start).toBe(5);
    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
    expect(exec.log().net.get("c2")?.props.get("duration")).toBe(4);
    expect(exec.redo()?.ok).toBe(true);
    expect(exec.state().items.get("c2")?.end).toBeCloseTo(9.4);
  });

  it("trims a word reference to seconds and refuses out-of-range values", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "clip/trim", params: { id: "c1", edge: "out", value: "word:12.end" } }).ok).toBe(true);
    expect(exec.state().items.get("c1")?.source?.out).toBe(5.5);
    const bad = exec.execute({ type: "clip/trim", params: { id: "c1", edge: "out", value: 99 } });
    expect(bad.ok).toBe(false);
    expect(bad.errors?.[0]?.code).toBe("OUT_OF_BOUNDS");
  });

  it("splits with speed and children, then merges back", () => {
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    expect(exec.execute({ type: "clip/split", params: { id: "c3", at: 11, newId: "c3_b" } }).ok).toBe(true);
    const s = exec.state();
    expect(s.items.get("c3")).toMatchObject({ start: 10, end: 11 });
    expect(round(s.items.get("c3")?.source?.out ?? 0)).toBe(22.2);
    expect(s.items.get("c3_b")).toMatchObject({ start: 11 });
    expect(round(s.items.get("c3_b")?.source?.in ?? 0)).toBe(22.2);
    expect(s.items.get("st1")?.start).toBe(10);
    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
  });

  it("split moves keyframes after the cut to the right half", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "clip/split", params: { id: "c1", at: 0.25, newId: "c1_b" } }).ok).toBe(true);
    const s = exec.state();
    expect(s.items.get("k1")?.parent).toBe("c1");
    expect(s.items.get("k2_b")).toMatchObject({ parent: "c1_b", start: 0.5 });
    expect(s.items.get("k2")).toBeUndefined();
    expect(s.items.get("mk1_b")?.parent).toBe("c1_b");
  });

  it("slip keeps the timeline and moves the source window", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "clip/slip", params: { id: "c3", delta: 1 } }).ok).toBe(true);
    const c3 = exec.state().items.get("c3")!;
    expect(c3.start).toBe(10);
    expect(round(c3.source!.in)).toBe(22.2);
    expect(round(c3.source!.out)).toBe(27.2);
  });

  it("roll moves the cut between two source clips without changing total length", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "clip/remove", params: { id: "g1" } });
    exec.execute({ type: "transition/remove", params: { transitionId: "x1" } });
    const total = exec.state().composition.duration;
    expect(exec.execute({ type: "clip/roll", params: { leftId: "c2", rightId: "c3", delta: 0.5 } }).ok).toBe(true);
    const s = exec.state();
    expect(s.items.get("c2")?.end).toBeCloseTo(10);
    expect(s.items.get("c3")?.start).toBeCloseTo(10);
    expect(s.composition.duration).toBeCloseTo(total);
  });

  it("validates locked tracks and locked props", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "track/setFlag", params: { trackId: "main", flag: "locked", value: true } });
    const r = exec.execute({ type: "clip/trim", params: { id: "c2", edge: "out", value: 4 } });
    expect(r.errors?.[0]?.code).toBe("TRACK_LOCKED");
    const locked = exec.execute({ type: "text/update", params: { id: "t1", props: { color: "#fff" } } });
    expect(locked.errors?.[0]?.code).toBe("LOCKED_PROP");
  });
});
