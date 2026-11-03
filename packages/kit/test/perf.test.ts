import { performance } from "node:perf_hooks";
import { Executor, collectModule, createPatchLog, resolve, samePlacement } from "@cutcraft/kit";
import { buildLarge } from "../fixtures/large";
import { manifest } from "./helpers";

/** Loose budgets: CI machines vary. The identity assertions are what keep the drag loop cheap. */
const STEP_BUDGET_MS = 5;

describe("drag-loop cost", () => {
  const tree = collectModule(buildLarge(200));

  it("keeps a trim step on a 200-clip project under budget", () => {
    const exec = new Executor({ tree, manifest, now: () => 0 });
    const base = exec.state().items.get("c3")!.source!;
    for (let i = 0; i < 10; i++)
      exec.execute({ type: "clip/trim", params: { id: "c3", edge: "out", value: base.in + 0.5 + i / 100 } });
    const t0 = performance.now();
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const r = exec.execute({
        type: "clip/trim",
        params: { id: "c3", edge: "out", value: base.in + 0.5 + (i % 50) / 100 },
      });
      expect(r.ok).toBe(true);
    }
    const perStep = (performance.now() - t0) / steps;
    expect(perStep).toBeLessThan(STEP_BUDGET_MS);
    expect(exec.state().items.get("c3")!.source!.out).toBeCloseTo(base.in + 0.5 + (59 % 50) / 100);
  });

  it("keeps untouched nodes, their props and their parsed props across a prop patch", () => {
    const before = resolve(tree, manifest);
    const log = createPatchLog({ isSource: (id) => tree.byId.has(id) });
    log.append({ op: "set", id: "c3", prop: "fit", value: "contain" });
    const after = resolve(tree, manifest, log);
    expect(after.tree.byId.get("c4")).toBe(before.tree.byId.get("c4"));
    expect(after.tree.byId.get("c4")!.props).toBe(before.tree.byId.get("c4")!.props);
    expect(after.items.get("c4")!.props).toBe(before.items.get("c4")!.props);
    expect(after.tree.byId.get("c3")).not.toBe(before.tree.byId.get("c3"));
    expect(after.items.get("c3")!.props.fit).toBe("contain");
    expect(after.items.get("c3")!.props).not.toBe(before.items.get("c3")!.props);
    expect(after.tree.byId.get("v1")).not.toBe(before.tree.byId.get("v1"));
    expect(after.tree.byId.get("v2")).toBe(before.tree.byId.get("v2"));
    expect(after.tree.byId.size).toBe(before.tree.byId.size);
  });

  it("falls back to a full rebuild for structural patches and still resolves", () => {
    const log = createPatchLog({ isSource: (id) => tree.byId.has(id) });
    log.append({ op: "remove", id: "c3" });
    const after = resolve(tree, manifest, log);
    expect(after.items.has("c3")).toBe(false);
    expect(after.errors.filter((e) => e.code !== "DANGLING_ANCHOR")).toEqual([]);
  });

  it("re-reports cached schema errors on every resolve", () => {
    const bad = collectModule({ default: () => buildLarge(4).default(), defaults: {} });
    const log = createPatchLog({ isSource: (id) => bad.byId.has(id) });
    log.append({ op: "set", id: "c1", prop: "speed", value: 99 });
    const first = resolve(bad, manifest, log);
    log.append({ op: "set", id: "c2", prop: "fit", value: "contain" });
    const second = resolve(bad, manifest, log);
    expect(first.errors.filter((e) => e.id === "c1" && e.code === "SCHEMA")).toHaveLength(1);
    expect(second.errors.filter((e) => e.id === "c1" && e.code === "SCHEMA")).toHaveLength(1);
  });
});

describe("placement identity", () => {
  const tree = collectModule(buildLarge(200));

  it("keeps every placement a prop patch did not affect, children and structure included", () => {
    const before = resolve(tree, manifest);
    const log = createPatchLog({ isSource: (id) => tree.byId.has(id) });
    log.append({ op: "set", id: "c3", prop: "fit", value: "contain" });
    const after = resolve(tree, manifest, log);
    expect(after.items.get("c4")).toBe(before.items.get("c4"));
    expect(after.items.get("c4k1")).toBe(before.items.get("c4k1"));
    expect(after.items.get("v2")).toBe(before.items.get("v2"));
    expect(after.items.get("composition")).toBe(before.items.get("composition"));
    expect(after.items.get("bed")).toBe(before.items.get("bed"));
    expect(after.items.get("c3")).not.toBe(before.items.get("c3"));
    const changed = [...after.items].filter(([id, p]) => before.items.get(id) !== p).map(([id]) => id);
    expect(changed).toEqual(["c3"]);
  });

  it("changes only the trimmed clip, what follows it and what anchors to those", () => {
    const before = resolve(tree, manifest);
    const log = createPatchLog({ isSource: (id) => tree.byId.has(id) });
    log.append({ op: "set", id: "c3", prop: "out", value: 4.5 });
    const after = resolve(tree, manifest, log);
    const changed = new Set([...after.items].filter(([id, p]) => before.items.get(id) !== p).map(([id]) => id));
    expect(changed.has("c3")).toBe(true);
    expect(changed.has("c6")).toBe(true);
    expect(changed.has("c4")).toBe(false);
    expect(changed.has("v2")).toBe(false);
    expect(changed.has("c0")).toBe(false);
    expect(changed.size).toBeLessThan(after.items.size / 2);
    expect(after.items.get("c6")!.start).toBeCloseTo(before.items.get("c6")!.start + 3.5);
  });

  it("compares placements by what renders and edits", () => {
    const state = resolve(tree, manifest);
    const c4 = state.items.get("c4")!;
    expect(samePlacement(c4, { ...c4 })).toBe(true);
    expect(samePlacement(c4, { ...c4, errors: [{ code: "SCHEMA", id: "c4", message: "x" }] })).toBe(false);
    expect(samePlacement(c4, { ...c4, children: [...c4.children].reverse() })).toBe(c4.children.length < 2);
    expect(samePlacement(c4, { ...c4, props: { ...c4.props } })).toBe(false);
  });
});
