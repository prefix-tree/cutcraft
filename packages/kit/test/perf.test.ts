import { performance } from "node:perf_hooks";
import { Executor, collectModule, createPatchLog, resolve } from "@cut/kit";
import { buildLarge } from "../fixtures/large";
import { manifest } from "./helpers";

/** Loose budgets: CI machines vary. The identity assertions are what keep the drag loop cheap. */
const STEP_BUDGET_MS = 5;

describe("drag-loop cost", () => {
  const tree = collectModule(buildLarge(200));

  it("keeps a trim step on a 200-clip project under budget", () => {
    const exec = new Executor({ tree, manifest, now: () => 0 });
    const base = exec.state().items.get("c3")!.source!;
    for (let i = 0; i < 10; i++) exec.execute({ type: "clip/trim", params: { id: "c3", edge: "out", value: base.in + 0.5 + i / 100 } });
    const t0 = performance.now();
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const r = exec.execute({ type: "clip/trim", params: { id: "c3", edge: "out", value: base.in + 0.5 + (i % 50) / 100 } });
      expect(r.ok).toBe(true);
    }
    const perStep = (performance.now() - t0) / steps;
    expect(perStep).toBeLessThan(STEP_BUDGET_MS);
    expect(exec.state().items.get("c3")!.source!.out).toBeCloseTo(base.in + 0.5 + 59 % 50 / 100);
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
