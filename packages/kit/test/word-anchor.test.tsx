import { createElement as h } from "react";
import { describe, expect, it } from "vitest";

import { Clip, Composition, collect, Executor, Gap, resolve, SpeedKey, Title, Track } from "@cutcraft/kit";

import { manifest } from "./helpers";

// The interview's words: 3 starts at 2.0 s, 9 at 4.0 s, 13 ends at 6.0 s; 1 is at 0.8 s.
const edit = ({
  gap = 1,
  speed = 1,
  clip = {},
  title = {},
}: {
  gap?: number;
  speed?: number;
  clip?: Record<string, unknown>;
  title?: Record<string, unknown>;
} = {}) =>
  h(
    Composition,
    { fps: 30, width: 1920, height: 1080 },
    h(
      Track,
      { id: "main" },
      h(Gap, { id: "g", duration: gap }),
      h(Clip, { id: "make-1", src: "asset:interview", in: "word:3", out: "word:13.end", speed, ...clip }),
      h(Clip, { id: "make-2", src: "asset:interview", in: "word:3", out: "word:13.end" }),
    ),
    h(
      Track,
      { id: "text" },
      h(Title, { id: "ten", anchor: "make-1", at: "word:9", duration: 1, ...title }, "10× output"),
    ),
  );

const placed = (el: ReturnType<typeof edit>) => {
  const state = resolve(collect(el), manifest);
  const t = state.items.get("ten")!;
  return {
    start: Math.round(t.start * 1000) / 1000,
    errors: t.errors.map((e) => `${e.code}:${e.prop ?? ""}`),
    messages: t.errors.map((e) => e.message),
    state,
  };
};

describe("a graphic timed by a word of its anchor", () => {
  it("starts where the anchor plays the word: clip start + (word − in) / speed, plus offset", () => {
    expect(placed(edit())).toMatchObject({ start: 1 + 2, errors: [] });
    expect(placed(edit({ speed: 2 })).start).toBe(1 + 1);
    expect(placed(edit({ title: { offset: -0.25 } })).start).toBe(2.75);
    expect(placed(edit({ title: { at: "word:9.end" } })).start).toBe(1 + 2.4);
  });

  it("follows the clip when it moves, and the word when the clip is trimmed before it", () => {
    expect(placed(edit({ gap: 3 })).start).toBe(3 + 2);
    // in at word 5 (2.7 s): the word comes 1.3 s into the clip.
    expect(placed(edit({ clip: { in: "word:5" } })).start).toBe(1 + 1.3);
  });

  it("picks the occurrence its anchor names when the footage plays twice", () => {
    const { start, state } = placed(edit({ title: { anchor: "make-2" } }));
    expect(start).toBe(state.items.get("make-2")!.start + 2);
  });

  it("reports a word the clip no longer plays, and holds the graphic to the nearest part it plays", () => {
    const early = placed(edit({ title: { at: "word:1" } }));
    expect(early.errors).toEqual(["INVALID_ANCHOR:at"]);
    expect(early.messages[0]).toBe(
      'word:1 (0.80 s) is not in what "make-1" plays (2.00–6.00 s of interview): it was trimmed out',
    );
    expect(early.start).toBe(1);
    expect(placed(edit({ clip: { out: "word:6.end" } })).errors).toEqual(["INVALID_ANCHOR:at"]);
    expect(placed(edit({ title: { at: "word:9999" } })).errors).toEqual(["UNKNOWN_REF:at"]);
  });

  it("flags reversed and speed-ramped clips as not supported yet", () => {
    expect(placed(edit({ clip: { reverse: true } })).errors).toEqual(["UNSUPPORTED_ANCHOR:at"]);
    const ramped = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "main" },
        h(
          Clip,
          { id: "make-1", src: "asset:interview", in: "word:3", out: "word:13.end" },
          h(SpeedKey, { id: "k", at: 0, speed: 2 }),
        ),
      ),
      h(Track, { id: "text" }, h(Title, { id: "ten", anchor: "make-1", at: "word:9", duration: 1 }, "x")),
    );
    expect(placed(ramped as ReturnType<typeof edit>).errors).toEqual(["UNSUPPORTED_ANCHOR:at"]);
  });

  it("needs a plain anchor that is footage", () => {
    expect(placed(edit({ title: { anchor: "start" } })).errors).toContain("SCHEMA:at");
    expect(placed(edit({ title: { anchor: "make-1.end" } })).errors).toContain("SCHEMA:at");
    const onTitle = h(
      Composition,
      { fps: 30, width: 1920, height: 1080 },
      h(
        Track,
        { id: "text" },
        h(Title, { id: "hi", anchor: "start", duration: 3 }, "hi"),
        h(Title, { id: "ten", anchor: "hi", at: "word:9", duration: 1 }, "x"),
      ),
    );
    expect(placed(onTitle as ReturnType<typeof edit>).errors).toEqual(["INVALID_ANCHOR:at"]);
  });

  it("keeps its word through a drag (offset) and drops it when anchored elsewhere", () => {
    const exec = new Executor({ tree: collect(edit()), manifest, now: () => 0 });
    expect(
      exec.execute({ type: "clip/move", params: { id: "ten", place: { anchor: "make-1", offset: 0.5 } } }).ok,
    ).toBe(true);
    expect(exec.state().items.get("ten")).toMatchObject({ start: 3.5, props: { at: "word:9", offset: 0.5 } });
    expect(exec.execute({ type: "clip/setAnchor", params: { id: "ten", anchor: "make-2", offset: 1 } }).ok).toBe(true);
    const ten = exec.state().items.get("ten")!;
    expect(ten.props.at).toBeUndefined();
    expect(ten.start).toBe(exec.state().items.get("make-2")!.start + 1);
    expect(exec.undo()?.ok).toBe(true);
    expect(exec.state().items.get("ten")?.props.at).toBe("word:9");
  });

  describe("duration until another element ends", () => {
    const length = (title: Record<string, unknown>) => {
      const r = placed(edit({ title }));
      return { start: r.start, duration: r.state.items.get("ten")?.duration, errors: r.errors };
    };

    it("lasts from its word to the end of the clip", () => {
      // make-1 plays from 1 s to 5 s, and says word 9 at 3 s.
      expect(length({ duration: { until: "make-1" } })).toEqual({ start: 3, duration: 2, errors: [] });
    });

    it("follows the other element when that one is retimed", () => {
      expect(placed(edit({ gap: 2, title: { duration: { until: "make-2" } } })).state.items.get("ten")?.duration).toBe(
        6,
      );
    });

    it("has no length, and says so, when it starts after the other has ended", () => {
      const r = length({ anchor: "make-2", at: "word:9", duration: { until: "make-1" } });
      expect(r.duration).toBe(0);
      expect(r.errors).toEqual(["INVALID_TIME_RANGE:duration"]);
    });

    it("reports a target that does not exist", () => {
      expect(length({ duration: { until: "nobody" } }).errors).toEqual(["DANGLING_ANCHOR:duration"]);
    });
  });
});
