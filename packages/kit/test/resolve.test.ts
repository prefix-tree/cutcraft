import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { describe, expect, it } from "vitest";

import {
  Angle,
  Audio,
  Clip,
  Composition,
  Cut,
  collect,
  Freeze,
  Gap,
  Multicam,
  resolve,
  resolveScene,
  type SceneFn,
  SpeedKey,
  Title,
  Track,
  Transition,
} from "@cutcraft/kit";
import { lint } from "@cutcraft/kit/source";

import { fixturesDir, fixtureText, fixtureTree, manifest, round, serialize } from "./helpers";

const h = createElement;

describe("resolve", () => {
  it("places a sequence with a gap and a speed change", () => {
    const el = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "t1" },
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

  it("times a clip by its speed ramp and lengthens it by its freeze holds", () => {
    const ramp = (id: string) => [
      h(SpeedKey, { id: `${id}-k1`, at: 0, speed: 1 }),
      h(SpeedKey, { id: `${id}-k2`, at: 2, speed: 0.5 }),
    ];
    const el = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "t1" },
        // 1 → 0.5 over 2 s plays 1.5 s of source; the other 2.5 s at half speed take 5 s.
        h(Clip, { id: "byOut", src: "asset:city", in: 0, out: 4 }, ...ramp("byOut")),
        h(Clip, { id: "byDuration", src: "asset:city", in: 0, duration: 4 }, ...ramp("byDuration")),
        h(
          Clip,
          { id: "held", src: "asset:city", in: 0, out: 4 },
          h(Freeze, { id: "f", at: 1, start: 2, duration: 0.5 }),
        ),
        h(Gap, { id: "after", duration: 1 }),
      ),
    );
    const state = resolve(collect(el), manifest);
    expect(state.errors).toEqual([]);
    expect(state.items.get("byOut")?.duration).toBeCloseTo(7, 4);
    expect(state.items.get("byDuration")?.duration).toBe(4);
    expect(state.items.get("byDuration")?.source?.out).toBeCloseTo(2.5, 4);
    expect(state.items.get("held")?.duration).toBe(4.5);
    expect(state.items.get("after")?.start).toBeCloseTo(15.5, 4);
  });

  it("overlaps clips around a transition and shortens the sequence", () => {
    const el = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "t1" },
        h(Clip, { id: "a", src: "asset:city", in: 0, out: 4 }),
        h(Transition, { id: "x", type: "crossfade", duration: 1 }),
        h(Clip, { id: "b", src: "asset:city", in: 4, out: 8 }),
      ),
    );
    const state = resolve(collect(el), manifest);
    expect(state.items.get("x")).toMatchObject({
      start: 3,
      end: 4,
      between: ["a", "b"],
      props: { params: { curve: "ease" } },
    });
    expect(state.items.get("b")?.start).toBe(3);
    expect(state.composition.duration).toBe(7);
  });

  it("resolves transcript references, anchors and fill", () => {
    const el = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(Track, { id: "t1" }, h(Clip, { id: "c1", src: "asset:interview", in: "word:3", out: "word:6.end" })),
      h(Track, { id: "t2" }, h(Title, { id: "t", anchor: "c1", offset: 0.5, duration: "fill" }, "Hi")),
    );
    const state = resolve(collect(el), manifest);
    expect(state.errors).toEqual([]);
    expect(state.items.get("c1")?.source).toMatchObject({ in: 2, out: 3.5 });
    expect(round(state.items.get("t")?.start ?? 0)).toBe(0.5);
    expect(round(state.items.get("t")?.end ?? 0)).toBe(1.5);
  });

  it("anchors to an element's end, reframes a clip to the composition and checks duck targets", () => {
    const el = h(
      Composition,
      { fps: 30, width: 1080, height: 1920 },
      h(
        Track,
        { id: "t1", role: "dialogue" },
        h(Clip, { id: "c1", src: "asset:city", in: 0, out: 4, frame: { focus: "left" } }),
      ),
      h(
        Track,
        { id: "t2" },
        h(Title, { id: "t", anchor: "c1.end", offset: -1, duration: 2, width: 1080, height: 200 }, "Bye"),
      ),
      h(
        Track,
        { id: "t3", layout: "free" },
        h(Audio, { id: "bed", src: "asset:bed", start: 0, duration: 2, duck: { under: "dialogue", to: 0.2 } }),
        h(Audio, { id: "bad", src: "asset:bed", start: 0, duration: 2, duck: { under: "nothing", to: 0.2 } }),
      ),
    );
    const state = resolve(collect(el), manifest);
    expect(state.items.get("t")).toMatchObject({ start: 3, end: 5 });
    expect(state.composition.duration).toBe(5);
    expect(state.tracks[0]?.role).toBe("dialogue");
    const crop = (
      state.items.get("c1")!.props.transform as { crop: { x: number; y: number; width: number; height: number } }
    ).crop;
    expect(crop).toMatchObject({ x: 0, y: 0, height: 1 });
    expect(crop.width).toBeCloseTo(1080 / 1920 / (3840 / 2160));
    expect(state.errors.map((e) => [e.id, e.code])).toEqual([["bad", "UNKNOWN_REF"]]);
  });

  it("gives a filling audio placement the source range it plays", () => {
    const el = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(Track, { id: "t1" }, h(Clip, { id: "c1", src: "asset:city", in: 0, out: 4 })),
      h(
        Track,
        { id: "t2", layout: "free" },
        h(Audio, { id: "a", src: "asset:bed", start: 0, in: 2, duration: "fill", speed: 2 }),
      ),
    );
    const state = resolve(collect(el), manifest);
    expect(state.errors).toEqual([]);
    expect(state.items.get("a")).toMatchObject({ start: 0, end: 4, source: { in: 2, out: 10, speed: 2 } });
  });

  it("gives a multicam's generated clips plain asset ids and the last one its length", () => {
    const el = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "t1", layout: "free" },
        h(
          Multicam,
          { id: "mc", sync: 0 },
          h(Angle, { id: "a", src: "asset:city" }),
          h(Angle, { id: "b", src: "asset:interview" }),
          h(Cut, { id: "c1", at: 0, angle: "a" }),
          h(Cut, { id: "c2", at: 2, angle: "b" }),
        ),
      ),
      h(Track, { id: "t2" }, h(Clip, { id: "len", src: "asset:city", in: 0, out: 5 })),
    );
    const state = resolve(collect(el), manifest);
    expect(state.items.get("mc.c1")).toMatchObject({ start: 0, end: 2, source: { asset: "city", in: 0, out: 2 } });
    expect(state.items.get("mc.c2")).toMatchObject({ start: 2, end: 5, source: { asset: "interview", in: 2, out: 5 } });
  });

  it("reports a reference in a cut's `at` as a schema error: cuts take seconds", () => {
    const el = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "t1", layout: "free" },
        h(
          Multicam,
          { id: "mc", sync: 0 },
          h(Angle, { id: "a", src: "asset:city" }),
          h(Cut, { id: "c1", at: "word:3" as never, angle: "a" }),
        ),
      ),
    );
    expect(new Set(resolve(collect(el), manifest).errors.map((e) => `${e.code} ${e.id}.${e.prop}`))).toEqual(
      new Set(["SCHEMA c1.at"]),
    );
  });

  it("reports typed errors instead of throwing", () => {
    const el = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "t1" },
        h(Clip, { id: "c1", src: "asset:nope" }),
        h(Clip, { id: "c2", src: "asset:city", in: 0, out: 99 }),
        h(Clip, { id: "c3", src: "asset:city", start: 3, in: 0, out: 1 }),
      ),
      h(Track, { id: "t2" }, h(Title, { id: "t", anchor: "ghost" }, "x")),
    );
    const codes = resolve(collect(el), manifest)
      .errors.map((e) => e.code)
      .sort();
    expect(codes).toEqual(["DANGLING_ANCHOR", "MISSING_ASSET", "START_ON_SEQUENCE", "TRIM_PAST_SOURCE"]);
  });

  it("matches the expected placement of the sample file", () => {
    const expected = JSON.parse(readFileSync(join(fixturesDir, "sample.placement.json"), "utf8"));
    const state = resolve(fixtureTree(), manifest);
    expect(state.errors).toEqual([]);
    expect(serialize(state, false).map(({ props: _props, ...rest }) => rest)).toEqual(expected);
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
