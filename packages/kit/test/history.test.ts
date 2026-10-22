import { describe, expect, it } from "vitest";
import { ActionHistory, type Action, type ActionInput } from "@cutcut/kit";

const trim = (id: string, out: number, actionId = "a"): Action => ({ type: "clip/trim", actionId, ts: 0, params: { id, edge: "out", value: out } });
const inverse: ActionInput = { type: "source/setProps", params: { id: "c1", props: {} } };

describe("ActionHistory", () => {
  it("auto-groups rapid same-type same-target updates and undoes them together", () => {
    let t = 0;
    const h = new ActionHistory(1000, 100, () => t);
    h.push(trim("c1", 1, "a1"), inverse, [0, 1]);
    t = 50; h.push(trim("c1", 2, "a2"), inverse, [1, 2]);
    t = 90; h.push(trim("c1", 3, "a3"), inverse, [2, 3]);
    t = 400; h.push(trim("c1", 4, "a4"), inverse, [3, 4]);
    expect(h.entries().map((e) => e.groupId)).toEqual([expect.any(String), expect.any(String), expect.any(String), undefined]);
    expect(h.undoGroup().map((e) => e.action.actionId)).toEqual(["a4"]);
    expect(h.undoGroup().map((e) => e.action.actionId)).toEqual(["a3", "a2", "a1"]);
    expect(h.canUndo()).toBe(false);
    expect(h.redoGroup().map((e) => e.action.actionId)).toEqual(["a1", "a2", "a3"]);
  });

  it("does not auto-group different targets or non-groupable types", () => {
    const h = new ActionHistory(1000, 100, () => 0);
    h.push(trim("c1", 1, "a1"), inverse, [0, 1]);
    h.push(trim("c2", 1, "a2"), inverse, [1, 2]);
    h.push({ type: "clip/remove", actionId: "a3", ts: 0, params: { id: "c2" } }, inverse, [2, 3]);
    h.push({ type: "clip/remove", actionId: "a4", ts: 0, params: { id: "c2" } }, inverse, [3, 4]);
    expect(h.entries().every((e) => e.groupId === undefined)).toBe(true);
  });

  it("explicit groups nest and undo as one", () => {
    const h = new ActionHistory(1000, 0, () => 0);
    h.beginGroup("gesture");
    h.push(trim("c1", 1, "a1"), inverse, [0, 1]);
    h.beginGroup("inner");
    h.push({ type: "clip/remove", actionId: "a2", ts: 0, params: { id: "c2" } }, inverse, [1, 2]);
    h.endGroup();
    h.push(trim("c3", 1, "a3"), inverse, [2, 3]);
    h.endGroup();
    h.push(trim("c4", 1, "a4"), inverse, [3, 4]);
    expect(new Set(h.entries().slice(0, 3).map((e) => e.groupId)).size).toBe(1);
    h.undoGroup();
    expect(h.undoGroup().map((e) => e.action.actionId)).toEqual(["a3", "a2", "a1"]);
  });

  it("drops redo on a new push and caps the stack", () => {
    const h = new ActionHistory(2, 0, () => 0);
    h.push(trim("c1", 1, "a1"), inverse, [0, 1]);
    h.push(trim("c2", 1, "a2"), inverse, [1, 2]);
    h.push(trim("c3", 1, "a3"), inverse, [2, 3]);
    expect(h.entries().map((e) => e.action.actionId)).toEqual(["a2", "a3"]);
    h.undoGroup();
    expect(h.canRedo()).toBe(true);
    h.push(trim("c4", 1, "a4"), inverse, [3, 4]);
    expect(h.canRedo()).toBe(false);
    expect(h.createSnapshot("before export").stackIndex).toBe(2);
    expect(h.listSnapshots()).toHaveLength(1);
  });
});
