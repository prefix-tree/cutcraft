import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Clip, Composition, Gap, Title, Track, Transition, collect, resolve, resolveScene, type SceneFn } from "@cutcut/kit";
import { lint } from "@cutcut/kit/source";
import { fixtureText, fixtureTree, fixturesDir, manifest, serialize, round } from "./helpers";

const h = createElement;

describe("resolve", () => {
  it("places a sequence with a gap and a speed change", () => {
    const el = h(Composition, { fps: 30, width: 1920, height: 1080 },
      h(Track, { id: "t1" },
        h(Clip, { id: "c1", src: "asset:city", in: 0, out: 4 }),
        h(Gap, { id: "g1", duration: 1 }),
        h(Clip, { id: "c2", src: "asset:city", in: 10, out: 12, speed: 2 }),
      ),
    );
    const state = resolve(collect(el), manifest);
    expect(state.errors).toEqual([]);
    expect(state.items.get("c2")?.start).toBe(5);
    expect(state.items.get("c2")?.duration).toBe(1);
    expect(state.composition.duration).toBe(6);
  });

  it("overlaps clips around a transition and shortens the sequence", () => {
    const el = h(Composition, { fps: 30, width: 1920, height: 1080 },
      h(Track, { id: "t1" },
        h(Clip, { id: "a", src: "asset:city", in: 0, out: 4 }),
        h(Transition, { id: "x", type: "crossfade", duration: 1 }),
        h(Clip, { id: "b", src: "asset:city", in: 4, out: 8 }),
      ),
    );
    const state = resolve(collect(el), manifest);
    expect(state.items.get("x")).toMatchObject({ start: 3, end: 4, between: ["a", "b"] });
    expect(state.items.get("b")?.start).toBe(3);
    expect(state.composition.duration).toBe(7);
  });

  it("resolves transcript references, anchors and fill", () => {
    const el = h(Composition, { fps: 30, width: 1920, height: 1080 },
      h(Track, { id: "t1" }, h(Clip, { id: "c1", src: "asset:interview", in: "word:3", out: "word:6.end" })),
      h(Track, { id: "t2" }, h(Title, { id: "t", anchor: "c1", offset: 0.5, duration: "fill" }, "Hi")),
    );
    const state = resolve(collect(el), manifest);
    expect(state.errors).toEqual([]);
    expect(state.items.get("c1")?.source).toMatchObject({ in: 2, out: 3.5 });
    expect(round(state.items.get("t")?.start ?? 0)).toBe(0.5);
    expect(round(state.items.get("t")?.end ?? 0)).toBe(1.5);
  });

  it("reports typed errors instead of throwing", () => {
    const el = h(Composition, { fps: 30, width: 1920, height: 1080 },
      h(Track, { id: "t1" },
        h(Clip, { id: "c1", src: "asset:nope" }),
        h(Clip, { id: "c2", src: "asset:city", in: 0, out: 99 }),
        h(Clip, { id: "c3", src: "asset:city", start: 3, in: 0, out: 1 }),
      ),
      h(Track, { id: "t2" }, h(Title, { id: "t", anchor: "ghost" }, "x")),
    );
    const codes = resolve(collect(el), manifest).errors.map((e) => e.code).sort();
    expect(codes).toEqual(["DANGLING_ANCHOR", "MISSING_ASSET", "START_ON_SEQUENCE", "TRIM_PAST_SOURCE"]);
  });

  it("matches the expected placement of the sample file", () => {
    const expected = JSON.parse(readFileSync(join(fixturesDir, "sample.placement.json"), "utf8"));
    const state = resolve(fixtureTree(), manifest);
    expect(state.errors).toEqual([]);
    expect(serialize(state, false).map(({ props, ...rest }) => (void props, rest))).toEqual(expected);
    expect(lint(fixtureText, { manifest }).filter((d) => d.severity === "error")).toEqual([]);
  });

  it("marks helper output as generated and binds schema props", () => {
    const state = resolve(fixtureTree(), manifest);
    expect(state.items.get("b1")?.editable).toBe("generated");
    expect(state.items.get("t1")?.lockedProps).toEqual([]);
    expect(state.items.get("t1")?.boundProps).toEqual({ color: "accent" });
    expect(state.items.get("mc1.cu2")).toMatchObject({ editable: "generated", start: 2 });
  });

  it("resolves a nested scene by calling it inside a composition of the outer size", () => {
    const n1 = fixtureTree().byId.get("n1")!;
    const scene = resolveScene(n1.props.of as SceneFn, n1.props, { fps: 30, width: 1920, height: 1080 }, manifest);
    expect(scene.errors).toEqual([]);
    expect(scene.composition).toMatchObject({ fps: 30, width: 1920, height: 1080, duration: 3 });
    expect(scene.tracks.map((t) => [t.id, t.layout, t.items])).toEqual([["outro", "sequence", ["oc1"]]]);
    expect(scene.items.get("oc1")).toMatchObject({ start: 0, end: 3, source: { in: 0, out: 3, asset: "city" } });
  });
});
