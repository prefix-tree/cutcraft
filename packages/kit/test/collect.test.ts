import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { Clip, Composition, Layer, Title, Track, collect, createPatchLog, resolve } from "@cutcraft/kit";
import { overlay } from "../src/resolve/overlay";
import { fixtureTree, manifest } from "./helpers";

const h = createElement;

function Pair({ id }: { id: string }) {
  return h(
    Fragment,
    null,
    h(Clip, { id: `${id}a`, src: "asset:city", in: 0, out: 1 }),
    h(Clip, { id: `${id}b`, src: "asset:city", in: 1, out: 2 }),
  );
}

describe("collect", () => {
  it("expands helpers and fragments, and records origins", () => {
    const tree = collect(h(Composition, { fps: 30, width: 1, height: 1 }, h(Track, { id: "t" }, h(Pair, { id: "p" }))));
    expect([...tree.byId.keys()]).toEqual(["composition", "t", "pa", "pb"]);
    expect(tree.byId.get("pa")?.origin).toEqual({ helper: "Pair", callerId: "t", callIndex: 0 });
    expect(tree.byId.get("pa")?.editable).toBe("literal");
  });

  it("marks output of a helper used twice as generated", () => {
    const tree = collect(
      h(
        Composition,
        { fps: 30, width: 1, height: 1 },
        h(Track, { id: "t" }, h(Pair, { id: "x" }), h(Pair, { id: "y" })),
      ),
    );
    expect(tree.byId.get("xa")?.editable).toBe("generated");
    expect(tree.byId.get("yb")?.origin?.callIndex).toBe(1);
  });

  it("does not enter a Layer interior and keeps title text", () => {
    const tree = collect(
      h(
        Composition,
        { fps: 30, width: 1, height: 1 },
        h(
          Track,
          { id: "t" },
          h(Layer, { id: "l", duration: 1 }, h("div", null, h(Clip, { id: "hidden", src: "asset:city" }))),
          h(Title, { id: "ti", duration: 1 }, "Hello ", "world"),
        ),
      ),
    );
    expect(tree.byId.has("hidden")).toBe(false);
    expect(tree.byId.get("l")?.children).toEqual([]);
    expect(tree.byId.get("l")?.interior).toBeUndefined();
    expect(tree.byId.get("ti")?.text).toBe("Hello world");
  });

  it("keeps a Layer's one component and its props as handles", () => {
    expect(fixtureTree().byId.get("l1")?.interior).toEqual({ component: "Counter", props: { from: 0, to: 1200 } });
    expect(fixtureTree().byId.get("l1")?.children).toEqual([]);
  });

  it("reports missing and duplicate ids", () => {
    const tree = collect(
      h(
        Composition,
        { fps: 30, width: 1, height: 1 },
        h(
          Track,
          { id: "t" },
          h(Clip, { src: "asset:city" } as never),
          h(Clip, { id: "d", src: "asset:city" }),
          h(Clip, { id: "d", src: "asset:city" }),
        ),
      ),
    );
    expect(tree.errors.map((e) => e.code)).toEqual(["SCHEMA", "DUPLICATE_ID"]);
  });

  it("uses the source index to decide what is literal", () => {
    const index = { elements: new Map([["known", { generated: false, lockedProps: ["out"] }]]) };
    const tree = collect(
      h(
        Composition,
        { fps: 30, width: 1, height: 1 },
        h(
          Track,
          { id: "t" },
          h(Clip, { id: "known", src: "asset:city" }),
          h(Clip, { id: "unknown", src: "asset:city" }),
        ),
      ),
      { index },
    );
    expect(tree.byId.get("known")).toMatchObject({ editable: "literal", lockedProps: ["out"] });
    expect(tree.byId.get("unknown")?.editable).toBe("generated");
    expect(tree.byId.get("t")?.editable).toBe("generated");
  });
});

describe("overlay", () => {
  const base = () =>
    collect(
      h(
        Composition,
        { fps: 30, width: 1, height: 1 },
        h(
          Track,
          { id: "t" },
          h(Clip, { id: "a", src: "asset:city", in: 0, out: 1 }),
          h(Clip, { id: "b", src: "asset:city", in: 0, out: 1 }),
        ),
        h(Track, { id: "u", layout: "free" }),
      ),
    );

  it("returns the same tree for an empty log", () => {
    const tree = base();
    expect(overlay(tree, createPatchLog())).toBe(tree);
  });

  it("applies props, text, removes, inserts and moves across parents", () => {
    const tree = base();
    const log = createPatchLog({ isSource: (id) => tree.byId.has(id) });
    log.append({ op: "set", id: "a", prop: "out", value: 0.5 });
    log.append({ op: "set", id: "a", prop: "in", value: undefined });
    log.append({ op: "remove", id: "b" });
    log.append({
      op: "insert",
      id: "n",
      parent: "t",
      after: null,
      node: {
        id: "n",
        kind: "title",
        props: { id: "n", duration: 1 },
        text: "x",
        children: [],
        parent: "t",
        editable: "literal",
        lockedProps: [],
        boundProps: {},
      },
    });
    log.append({ op: "move", id: "a", parent: "u", after: null });
    const out = overlay(tree, log);
    expect(out.byId.get("t")?.children.map((c) => c.id)).toEqual(["n"]);
    expect(out.byId.get("u")?.children.map((c) => c.id)).toEqual(["a"]);
    expect(out.byId.get("a")?.props).toEqual({ id: "a", src: "asset:city", out: 0.5 });
    expect(out.byId.get("a")?.parent).toBe("u");
    expect(out.byId.has("b")).toBe(false);
    const state = resolve(tree, manifest, log);
    expect(state.items.get("a")?.track).toBe("u");
    expect(state.items.get("a")?.errors.map((e) => e.code)).toEqual(["MISSING_START"]);
  });
});
