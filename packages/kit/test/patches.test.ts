import { describe, expect, it } from "vitest";
import { createPatchLog, type CollectedNode } from "@cutcraft/kit";

const node = (id: string, props: Record<string, unknown> = {}): CollectedNode => ({
  id,
  kind: "clip",
  props: { id, ...props },
  children: [],
  parent: "t1",
  editable: "literal",
  lockedProps: [],
  boundProps: {},
});

describe("patch log reduction", () => {
  it("keeps the last write per prop", () => {
    const log = createPatchLog();
    log.append({ op: "set", id: "c1", prop: "out", value: 4 });
    log.append({ op: "set", id: "c1", prop: "out", value: 5 });
    log.append({ op: "set", id: "c1", prop: "in", value: 1 });
    expect(log.entries).toHaveLength(3);
    expect([...log.net.get("c1")!.props]).toEqual([
      ["out", 5],
      ["in", 1],
    ]);
    expect(log.version).toBe(3);
  });

  it("removes an inserted element entirely", () => {
    const log = createPatchLog();
    log.append({ op: "insert", id: "n", parent: "t1", after: null, node: node("n") });
    log.append({ op: "remove", id: "n" });
    expect(log.net.has("n")).toBe(false);
  });

  it("marks a source element removed and forgets its props", () => {
    const log = createPatchLog();
    log.append({ op: "set", id: "c1", prop: "out", value: 4 });
    log.append({ op: "remove", id: "c1" });
    expect(log.net.get("c1")).toMatchObject({ presence: "removed" });
    expect(log.net.get("c1")!.props.size).toBe(0);
    expect(() => log.append({ op: "set", id: "c1", prop: "out", value: 1 })).toThrow();
  });

  it("treats remove followed by insert of a different node as inserted, and keeps place", () => {
    const log = createPatchLog();
    log.append({ op: "remove", id: "c1" });
    log.append({ op: "insert", id: "c1", parent: "t1", after: "c0", node: node("c1", { in: 2 }) });
    expect(log.net.get("c1")).toMatchObject({ presence: "inserted", place: { parent: "t1", after: "c0" } });
  });

  it("truncates back to a mark and rebuilds net", () => {
    const log = createPatchLog();
    log.append({ op: "set", id: "c1", prop: "out", value: 4 });
    const mark = log.mark();
    log.append({ op: "set", id: "c1", prop: "out", value: 9 });
    log.append({ op: "bake", id: "c2" });
    log.truncate(mark);
    expect(log.entries).toHaveLength(1);
    expect(log.net.get("c1")!.props.get("out")).toBe(4);
    expect(log.net.has("c2")).toBe(false);
  });
});
