import { createElement as h } from "react";
import { describe, expect, it } from "vitest";

import { Composition, collect, Executor, Layer, Track } from "@cutcraft/kit";

import { fixtureExecutor, manifest, serialize } from "../helpers";

describe("structure on free and sequence tracks", () => {
  it("adds a clip on a free track by start and refuses the wrong placement form", () => {
    const exec = fixtureExecutor();
    expect(
      exec.execute({
        type: "clip/add",
        params: { id: "f1", trackId: "music", src: "asset:city", place: { after: null } },
      }).errors?.[0]?.code,
    ).toBe("UNSUPPORTED_ON_LAYOUT");
    expect(
      exec.execute({ type: "clip/add", params: { id: "f1", trackId: "main", src: "asset:city", place: { start: 2 } } })
        .errors?.[0]?.code,
    ).toBe("UNSUPPORTED_ON_LAYOUT");
    expect(
      exec.execute({
        type: "clip/add",
        params: { id: "f1", trackId: "music", src: "asset:city", place: { start: 3 }, in: 0, out: 2 },
      }).ok,
    ).toBe(true);
    expect(exec.state().items.get("f1")).toMatchObject({ start: 3, end: 5, track: "music" });
  });

  it("adds sound only: an <Audio> on the music track, filling to the end, removed by undo", () => {
    const exec = fixtureExecutor();
    expect(
      exec.execute({
        type: "audio/add",
        params: { id: "bed2", trackId: "music", src: "asset:bed", place: { start: 0 }, duration: "fill" },
      }).ok,
    ).toBe(true);
    const bed = exec.state().items.get("bed2");
    expect(bed).toMatchObject({ kind: "audio", track: "music", start: 0, end: exec.state().composition.duration });
    expect(
      exec.execute({
        type: "audio/add",
        params: { id: "bed2", trackId: "music", src: "asset:bed", place: { start: 0 } },
      }).errors?.[0]?.code,
    ).toBe("DUPLICATE_ID");
    expect(exec.undo()?.ok).toBe(true);
    expect(exec.state().items.has("bed2")).toBe(false);
  });

  it("moves a clip to another track and back", () => {
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    expect(exec.execute({ type: "clip/move", params: { id: "c2", trackId: "music", place: { start: 1 } } }).ok).toBe(
      true,
    );
    const s = exec.state();
    expect(s.items.get("c2")).toMatchObject({ track: "music", start: 1 });
    expect(s.items.get("c3")?.start).toBe(6.5);
    expect(s.items.get("x1")?.errors.map((e) => e.code)).toEqual(["NOT_ADJACENT"]);
    expect(exec.undo()?.ok).toBe(true);
    expect(serialize(exec.state())).toEqual(before);
  });

  it("ripple delete on a free track pulls later items left; on a sequence it is a plain remove", () => {
    const exec = fixtureExecutor();
    exec.execute({
      type: "clip/add",
      params: { id: "f1", trackId: "music", src: "asset:city", place: { start: 20 }, in: 0, out: 2 },
    });
    exec.execute({
      type: "clip/add",
      params: { id: "f2", trackId: "music", src: "asset:city", place: { start: 25 }, in: 0, out: 2 },
    });
    expect(exec.execute({ type: "clip/rippleDelete", params: { id: "f1" } }).ok).toBe(true);
    expect(exec.state().items.get("f2")?.start).toBe(23);
    expect(exec.undo()?.ok).toBe(true);
    expect(exec.state().items.get("f2")?.start).toBe(25);
    expect(exec.state().items.get("f1")?.start).toBe(20);
    expect(exec.execute({ type: "clip/rippleDelete", params: { id: "c2" } }).ok).toBe(true);
    expect(exec.state().items.get("c3")?.start).toBe(6.5);
  });

  it("closes gaps on both layouts", () => {
    const exec = fixtureExecutor();
    exec.execute({
      type: "clip/add",
      params: { id: "f1", trackId: "music", src: "asset:city", place: { start: 20 }, in: 0, out: 2 },
    });
    exec.execute({
      type: "clip/add",
      params: { id: "f2", trackId: "music", src: "asset:city", place: { start: 30 }, in: 0, out: 2 },
    });
    expect(exec.execute({ type: "clip/closeGapBefore", params: { id: "f2" } }).ok).toBe(true);
    expect(exec.state().items.get("f2")?.start).toBe(22);
    expect(exec.execute({ type: "clip/closeGapBefore", params: { id: "c3" } }).ok).toBe(true);
    expect(exec.state().items.has("g1")).toBe(false);
    expect(exec.state().items.get("c3")?.start).toBe(9);
    expect(exec.execute({ type: "clip/closeGapBefore", params: { id: "c2" } }).errors?.[0]?.code).toBe(
      "INVALID_PARAMS",
    );
    exec.undo();
    expect(exec.state().items.get("g1")).toMatchObject({ start: 9, end: 10 });
  });

  it("consolidates a free track and restores positions on undo", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "source/setProps", params: { id: "a1", props: { duration: 5 } } });
    exec.execute({
      type: "clip/add",
      params: { id: "f1", trackId: "music", src: "asset:city", place: { start: 20 }, in: 0, out: 2 },
    });
    expect(exec.execute({ type: "track/consolidate", params: { trackId: "music" } }).ok).toBe(true);
    const s = exec.state();
    expect(s.items.get("a1")?.start).toBe(0);
    expect(s.items.get("f1")?.start).toBe(5);
    exec.undo();
    expect(exec.state().items.get("f1")?.start).toBe(20);
    expect(exec.execute({ type: "track/consolidate", params: { trackId: "main" } }).errors?.[0]?.code).toBe(
      "UNSUPPORTED_ON_LAYOUT",
    );
  });

  it("duplicates a track with remapped ids and anchors", () => {
    const exec = fixtureExecutor();
    expect(
      exec.execute({
        type: "track/duplicate",
        params: { sourceTrackId: "main", trackId: "main2", idMap: { c1: "d1", c2: "d2" } },
      }).ok,
    ).toBe(true);
    const s = exec.state();
    expect(s.tracks.map((t) => t.id)).toEqual(["main", "main2", "overlays", "music", "mc"]);
    expect(s.items.get("d1")).toMatchObject({ track: "main2", start: 0 });
    expect(s.items.get("c3_main2")?.track).toBe("main2");
    expect(s.items.get("main2")?.props.name).toBe("Main Copy");
    expect(s.errors).toEqual([]);
  });

  it("reorders tracks and keeps compositing order", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "track/reorder", params: { trackId: "music", position: 0 } });
    expect(exec.state().tracks.map((t) => t.id)).toEqual(["music", "main", "overlays", "mc"]);
    exec.undo();
    expect(exec.state().tracks.map((t) => t.id)).toEqual(["main", "overlays", "music", "mc"]);
  });

  it("creates captions when none exist and anchors overlays on creation", () => {
    const exec = fixtureExecutor();
    // With no literal cues, <Captions src> generates them from the transcript; the first literal edit makes them literal.
    exec.execute({ type: "caption/setAll", params: { captionsId: "cap", nodes: [] } });
    expect([...exec.state().items.values()].filter((p) => p.parent === "cap").map((p) => [p.id, p.editable])).toEqual([
      ["cap-1", "generated"],
      ["cap-2", "generated"],
    ]);
    expect(
      exec.execute({
        type: "caption/add",
        params: { captionsId: "cap", captionId: "cn1", start: 1, end: 2, text: "one" },
      }).ok,
    ).toBe(true);
    expect(
      exec.execute({
        type: "caption/add",
        params: { captionsId: "cap", captionId: "cn0", start: 0.5, end: 1, text: "zero" },
      }).ok,
    ).toBe(true);
    expect(
      exec
        .state()
        .tree.byId.get("cap")
        ?.children.map((c) => c.id),
    ).toEqual(["cap-1", "cn0", "cn1", "cap-2"]);
    expect(exec.state().items.get("cap-1")?.editable).toBe("literal");
    expect(
      exec.execute({
        type: "text/create",
        params: {
          id: "t9",
          kind: "title",
          trackId: "overlays",
          place: { anchor: "c3", offset: 0.5 },
          props: { duration: 1 },
          text: "late",
        },
      }).ok,
    ).toBe(true);
    expect(exec.state().items.get("t9")).toMatchObject({ start: 10.5, end: 11.5 });
    expect(
      exec.execute({
        type: "text/create",
        params: { id: "t10", kind: "title", trackId: "overlays", place: { anchor: "ghost" }, props: {} },
      }).errors?.[0]?.code,
    ).toBe("ELEMENT_NOT_FOUND");
  });

  it("keeps the keyframe inside its element and the transition on an existing cut", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "keyframe/move", params: { id: "c1", keyId: "k2", at: 99 } }).errors?.[0]?.code).toBe(
      "OUT_OF_BOUNDS",
    );
    expect(
      exec.execute({ type: "keyframe/add", params: { id: "c1", keyId: "k9", property: "nope", at: 0, value: 1 } })
        .errors?.[0]?.code,
    ).toBe("INVALID_PARAMS");
    expect(
      exec.execute({ type: "effect/setOrder", params: { id: "c1", childIds: ["fx1", "ghost"] } }).errors?.[0]?.code,
    ).toBe("INVALID_PARAMS");
    expect(
      exec.execute({ type: "effect/add", params: { id: "c1", childId: "fx9", type: "nope" as never } }).errors?.[0]
        ?.code,
    ).toBe("INVALID_PARAMS");
  });

  it("converts a sequence track to free, keeping every element where it played", () => {
    const exec = fixtureExecutor();
    const before = exec.state();
    const timing = (state: typeof before) =>
      [...state.items.values()]
        .filter((p) => p.track === "main" && p.kind !== "gap")
        .map((p) => [p.id, Math.round(p.start * 1000), Math.round(p.end * 1000)]);
    const was = timing(before);
    expect(exec.execute({ type: "track/setLayout", params: { trackId: "main", layout: "free" } }).ok).toBe(true);
    const s = exec.state();
    expect(s.tracks.find((t) => t.id === "main")?.layout).toBe("free");
    expect(s.items.has("g1")).toBe(false);
    expect(s.tree.byId.get("c2")?.props.start).toBe(5);
    expect(s.tree.byId.get("c3")?.props.start).toBe(10);
    expect(s.tree.byId.get("x1")?.props).toMatchObject({ on: "c1", edge: "out" });
    expect(timing(s)).toEqual(was);
    expect(s.errors).toEqual([]);
    expect(
      exec.execute({ type: "track/setLayout", params: { trackId: "main", layout: "free" } }).errors?.[0]?.code,
    ).toBe("INVALID_PARAMS");
    exec.undo();
    expect(serialize(exec.state())).toEqual(serialize(before));
  });

  it("converts a free track to a sequence, reordering by start and filling holes with gaps", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "track/add", params: { trackId: "f", layout: "free" } }).ok).toBe(true);
    expect(
      exec.execute({
        type: "clip/add",
        params: { id: "fb", trackId: "f", src: "asset:city", place: { start: 4 }, in: 0, out: 2 },
      }).ok,
    ).toBe(true);
    expect(
      exec.execute({
        type: "clip/add",
        params: { id: "fa", trackId: "f", src: "asset:city", place: { start: 0 }, in: 0, out: 2 },
      }).ok,
    ).toBe(true);
    const before = serialize(exec.state());
    expect(exec.execute({ type: "track/setLayout", params: { trackId: "f", layout: "sequence" } }).ok).toBe(true);
    const s = exec.state();
    expect(s.tracks.find((t) => t.id === "f")?.layout).toBe("sequence");
    expect(s.tree.byId.get("f")?.props.layout).toBeUndefined();
    expect(s.tree.byId.get("f")?.children.map((c) => c.id)).toEqual(["fa", "gap-f-1", "fb"]);
    expect(s.items.get("fa")).toMatchObject({ start: 0, end: 2 });
    expect(s.items.get("gap-f-1")).toMatchObject({ start: 2, end: 4 });
    expect(s.items.get("fb")).toMatchObject({ start: 4, end: 6 });
    expect(s.tree.byId.get("fb")?.props.start).toBeUndefined();
    expect(s.errors).toEqual([]);
    exec.undo();
    expect(serialize(exec.state())).toEqual(before);
    exec.redo();
    expect(
      exec
        .state()
        .tree.byId.get("f")
        ?.children.map((c) => c.id),
    ).toEqual(["fa", "gap-f-1", "fb"]);
  });

  it("refuses a sequence conversion when free items overlap", () => {
    const exec = fixtureExecutor();
    exec.execute({ type: "track/add", params: { trackId: "f", layout: "free" } });
    exec.execute({
      type: "clip/add",
      params: { id: "fa", trackId: "f", src: "asset:city", place: { start: 0 }, in: 0, out: 2 },
    });
    exec.execute({
      type: "clip/add",
      params: { id: "fb", trackId: "f", src: "asset:city", place: { start: 1 }, in: 0, out: 2 },
    });
    expect(
      exec.execute({ type: "track/setLayout", params: { trackId: "f", layout: "sequence" } }).errors?.[0]?.code,
    ).toBe("UNSUPPORTED_ON_LAYOUT");
  });

  it("flattens a multicam into literal clips and restores it on undo", () => {
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    expect(exec.state().items.get("mc1.cu2")?.end).toBeGreaterThan(12);
    expect(exec.execute({ type: "multicam/flatten", params: { id: "mc1" } }).ok).toBe(true);
    const s = exec.state();
    expect(s.items.has("mc1")).toBe(false);
    expect(s.items.has("mc1.cu1")).toBe(false);
    expect(s.tree.byId.get("mc")?.children.map((c) => c.id)).toEqual(["mc1-cu1", "mc1-cu2"]);
    expect(s.items.get("mc1-cu1")).toMatchObject({
      start: 0,
      end: 2,
      editable: "literal",
      source: { in: 0, out: 2, asset: "interview" },
    });
    // The last cut ran to the end of the composition, past the 12 s of city; the literal clip stops where the source does.
    expect(s.items.get("mc1-cu2")).toMatchObject({ start: 2, end: 12, source: { in: 2, out: 12, asset: "city" } });
    expect(s.tree.byId.get("mc1-cu2")?.props).toEqual({
      id: "mc1-cu2",
      src: "asset:city",
      in: 2,
      duration: 10,
      start: 2,
    });
    expect(s.errors).toEqual([]);
    exec.undo();
    expect(serialize(exec.state())).toEqual(before);
  });

  it("flattens only on a free track", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "track/setLayout", params: { trackId: "mc", layout: "sequence" } }).ok).toBe(true);
    expect(exec.execute({ type: "multicam/flatten", params: { id: "mc1" } }).errors?.[0]?.code).toBe(
      "UNSUPPORTED_ON_LAYOUT",
    );
  });

  it("extracts a nested scene into free tracks after the nested's track", () => {
    const exec = fixtureExecutor();
    const before = serialize(exec.state());
    const n1 = exec.state().items.get("n1")!;
    expect(exec.execute({ type: "nested/extract", params: { id: "n1" } }).ok).toBe(true);
    const s = exec.state();
    expect(s.items.has("n1")).toBe(false);
    const trackIds = s.tree.root.children.filter((c) => c.kind === "track").map((c) => c.id);
    expect(trackIds.slice(0, 2)).toEqual(["main", "n1-outro"]);
    expect(s.tracks.find((t) => t.id === "n1-outro")).toMatchObject({ layout: "free", items: ["n1-oc1"] });
    expect(s.items.get("n1-oc1")).toMatchObject({
      track: "n1-outro",
      start: n1.start,
      end: n1.end,
      source: { in: 0, out: 3, asset: "city" },
    });
    expect(s.tree.byId.get("n1-oc1")?.props).toEqual({
      id: "n1-oc1",
      src: "asset:city",
      in: 0,
      out: 3,
      start: n1.start,
      volume: 0.8,
    });
    expect(s.tree.byId.get("main")?.children.map((c) => c.id)).toEqual(["c1", "x1", "c2", "g1", "c3", "n1-gap"]);
    expect(s.items.get("n1-gap")).toMatchObject({ start: n1.start, end: n1.end });
    expect(s.composition.duration).toBeCloseTo(n1.end, 6);
    expect(s.errors).toEqual([]);
    exec.undo();
    expect(serialize(exec.state())).toEqual(before);
  });

  it("refuses to extract a nested that re-times its scene", () => {
    const exec = fixtureExecutor();
    expect(exec.execute({ type: "nested/update", params: { id: "n1", props: { in: 1 } } }).ok).toBe(true);
    const r = exec.execute({ type: "nested/extract", params: { id: "n1" } });
    expect(r.errors?.[0]?.code).toBe("INVALID_PARAMS");
    expect(r.errors?.[0]?.message).toContain("n1.in");
  });

  it("edits a Layer's handles and refuses a Layer without them", () => {
    const exec = fixtureExecutor();
    expect(exec.state().items.get("l1")?.interior).toEqual({ component: "Counter", props: { from: 0, to: 1200 } });
    expect(exec.execute({ type: "layer/setProps", params: { id: "l1", props: { to: 900, label: "go" } } }).ok).toBe(
      true,
    );
    expect(exec.state().items.get("l1")?.interior).toEqual({
      component: "Counter",
      props: { from: 0, to: 900, label: "go" },
    });
    expect(exec.state().items.get("l1")?.props).not.toHaveProperty("to");
    exec.undo();
    expect(exec.state().items.get("l1")?.interior).toEqual({ component: "Counter", props: { from: 0, to: 1200 } });
    const bare = new Executor({
      tree: collect(
        h(
          Composition,
          { fps: 30, width: 1, height: 1 },
          h(Track, { id: "t" }, h(Layer, { id: "l", duration: 1 }, h("div", null, "x"))),
        ),
      ),
      manifest,
      now: () => 0,
    });
    expect(bare.execute({ type: "layer/setProps", params: { id: "l", props: { x: 1 } } }).errors?.[0]?.code).toBe(
      "INVALID_PARAMS",
    );
  });
});
