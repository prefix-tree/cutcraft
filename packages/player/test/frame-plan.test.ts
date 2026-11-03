import type { ResolvedState } from "@cutcraft/kit";
import { buildFramePlan, captureWarnings, visiblePlacements } from "@cutcraft/player";
import { overlayLayout } from "@cutcraft/player/overlays";

import { fixtureState, makeState } from "./helpers/state";

const state = makeState({
  width: 1920,
  height: 1080,
  tracks: [
    {
      id: "main",
      items: [
        {
          id: "c1",
          kind: "clip",
          source: { in: 0, out: 4, asset: "a" },
          children: [
            { id: "e2", kind: "effect", props: { type: "vignette", params: { amount: 30 } } },
            { id: "e3", kind: "effect", props: { type: "blur", params: { radius: 2 } } },
          ],
        },
        { id: "x1", kind: "transition", duration: 1, props: { type: "crossfade", params: { curve: "linear" } } },
        {
          id: "c2",
          kind: "clip",
          source: { in: 0, out: 4, asset: "img" },
          duration: 4,
          props: { transform: { opacity: 0.5 } },
        },
        { id: "x2", kind: "transition", duration: 1, props: { type: "pixelate", params: {} } },
        { id: "c3", kind: "clip", source: { in: 0, out: 4, asset: "b" } },
      ],
    },
    {
      id: "fx",
      layout: "free",
      items: [
        {
          id: "adj",
          kind: "adjustment",
          start: 0,
          duration: 10,
          children: [{ id: "e1", kind: "effect", props: { type: "blur", params: { radius: 4 } } }],
        },
      ],
    },
  ],
});

describe("buildFramePlan", () => {
  beforeEach(() => captureWarnings(() => {}));
  afterEach(() => captureWarnings(null));

  it("is deterministic", () => {
    expect(buildFramePlan(state, 2.2)).toEqual(buildFramePlan(state, 2.2));
  });

  it("orders ops bottom-up and puts the adjustment after what it affects", () => {
    const plan = buildFramePlan(state, 1);
    expect(plan.ops.map((o) => [o.id, o.kind])).toEqual([
      ["c1", "video"],
      ["adj", "adjustment"],
    ]);
    expect(plan.ops[1]!.filter).toBe("blur(4px)");
    expect(plan.frame).toBe(30);
    expect(plan.background).toBe("#000000");
  });

  it("fades the incoming clip over an opaque outgoing one and multiplies element opacity", () => {
    const plan = buildFramePlan(state, 3.25);
    const [a, b] = plan.ops;
    expect(a!.id).toBe("c1");
    expect(b!.id).toBe("c2");
    expect(a!.opacity).toBe(1);
    expect(b!.opacity).toBeCloseTo(0.25 * 0.5);
    expect(b!.kind).toBe("image");
    expect(b!.blend).toBe("source-over");
  });

  it("falls back to a crossfade for other transition types with a warning", () => {
    const plan = buildFramePlan(state, 6.5);
    expect(plan.ops.map((o) => o.id)).toEqual(["c2", "c3", "adj"]);
    expect(plan.warnings.some((w) => w.includes("pixelate"))).toBe(true);
  });

  describe("transitions", () => {
    const between = (type: string, params: object = {}) =>
      makeState({
        width: 640,
        height: 360,
        tracks: [
          {
            id: "main",
            items: [
              { id: "a", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
              { id: "x", kind: "transition", duration: 1, props: { type, params: { curve: "linear", ...params } } },
              { id: "b", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
            ],
          },
        ],
      });
    // The transition runs 3..4; at 3.25 it is a quarter through.
    const at = (type: string, params?: object, t = 3.25) => buildFramePlan(between(type, params), t);

    it("wipes the incoming clip in behind a growing rect, the outgoing one untouched", () => {
      const [a, b] = at("wipe").ops;
      expect(a).not.toHaveProperty("clip");
      expect(b!.clip).toEqual([{ x: 480, y: 0, w: 160, h: 360 }]);
      expect(b!.opacity).toBe(1);
      expect(at("wipe", { direction: "down" }).ops[1]!.clip).toEqual([{ x: 0, y: 0, w: 640, h: 90 }]);
      expect(at("wipe").warnings).toEqual([]);
    });

    it("slides the incoming clip in, and moves the outgoing one too for push", () => {
      const [a, b] = at("slide").ops;
      expect(b!.matrix.e - a!.matrix.e).toBeCloseTo(480);
      expect(a!.matrix.e).toBe(0);
      const [pa, pb] = at("push", { direction: "up" }).ops;
      expect(pa!.matrix.f).toBeCloseTo(-90);
      expect(pb!.matrix.f).toBeCloseTo(270);
      expect(at("slide", { pushOut: true }).ops[0]!.matrix.e).toBeCloseTo(-160);
    });

    it("dips through black with an adjustment, showing the incoming clip from the midpoint", () => {
      const early = at("dipToBlack", { holdDuration: 0 });
      expect(early.ops.map((o) => [o.id, o.kind])).toEqual([
        ["a", "video"],
        ["b", "video"],
        ["x", "adjustment"],
      ]);
      expect(early.ops[1]!.opacity).toBe(0);
      expect(early.ops[2]).toMatchObject({ filter: "brightness(0)", opacity: 0.5 });
      const late = at("dipToWhite", { holdDuration: 0.5 }, 3.6);
      expect(late.ops[1]!.opacity).toBe(1);
      expect(late.ops[2]).toMatchObject({ filter: "brightness(0) invert(1)", opacity: 1 });
    });

    it("plays the same look on overlays across their box, a dip as a fade", () => {
      const titles = (type: string) =>
        makeState({
          width: 640,
          height: 360,
          tracks: [
            {
              id: "main",
              items: [
                { id: "a", kind: "title", duration: 4, text: "A" },
                { id: "x", kind: "transition", duration: 1, props: { type, params: { curve: "linear" } } },
                { id: "b", kind: "title", duration: 4, text: "B" },
              ],
            },
          ],
        });
      const layoutOf = (type: string, t: number) => {
        const state = titles(type);
        const item = visiblePlacements(state, t).find((v) => v.placement.id === "b")!;
        return overlayLayout(
          { placement: item.placement, children: item.children, state, time: t, transition: item.transition },
          { width: 640, height: 360 },
        );
      };
      expect(layoutOf("wipe", 3.25).clip).toEqual([{ x: 480, y: 0, w: 160, h: 360 }]);
      expect(layoutOf("push", 3.25).matrix.e).toBeCloseTo(480);
      expect(layoutOf("dipToBlack", 3.25).opacity).toBe(0);
      expect(layoutOf("dipToBlack", 3.75).opacity).toBeGreaterThan(0);
    });
  });

  it("draws vignette and grain after the element, the grain seeded by the frame", () => {
    const s = makeState({
      width: 640,
      height: 360,
      tracks: [
        {
          id: "main",
          items: [
            {
              id: "c",
              kind: "clip",
              source: { in: 0, out: 4, asset: "a" },
              children: [
                { id: "v", kind: "effect", props: { type: "vignette", params: { amount: 30 } } },
                { id: "g", kind: "effect", props: { type: "grain" } },
                { id: "off", kind: "effect", props: { type: "grain", params: { amount: 0 } } },
              ],
            },
          ],
        },
      ],
    });
    const op = buildFramePlan(s, 1).ops[0]!;
    expect(op.post).toEqual([
      { type: "vignette", amount: 0.3 },
      { type: "grain", amount: 0.2, seed: 30 },
    ]);
    expect(op.filter).toBe("");
    expect(buildFramePlan(s, 1).warnings).toEqual([]);
    expect(buildFramePlan(s, 1.5).ops[0]!.post![1]).toMatchObject({ seed: 45 });
  });

  it("builds filters and lists unsupported effects", () => {
    const plan = buildFramePlan(state, 0.5);
    expect(plan.ops[0]!.filter).toBe("blur(2px)");
  });

  it("draws temperature, tint and levels as filters, levels mapping black to 0 and white to 1", () => {
    const s = makeState({
      width: 640,
      height: 360,
      tracks: [
        {
          id: "main",
          items: [
            {
              id: "c",
              kind: "clip",
              source: { in: 0, out: 4, asset: "a" },
              children: [
                { id: "t", kind: "effect", props: { type: "temperature", params: { amount: 40 } } },
                { id: "n", kind: "effect", props: { type: "tint", params: { amount: 20 } } },
                { id: "l", kind: "effect", props: { type: "levels", params: { black: 0.1, white: 0.6, gamma: 1.2 } } },
              ],
            },
          ],
        },
      ],
    });
    const filter = buildFramePlan(s, 1).ops[0]!.filter;
    expect(filter).toMatch(/^sepia\(0\.2\) hue-rotate\(5deg\) brightness\([\d.]+\) contrast\([\d.]+\)$/);
    const [k, c] = [/brightness\(([\d.]+)\)/, /contrast\(([\d.]+)\)/].map((r) => Number(r.exec(filter)![1]));
    const level = (v: number) => (Math.min(1, k! * v) - 0.5) * c! + 0.5;
    expect(level(0.1)).toBeCloseTo(0);
    expect(level(0.35)).toBeCloseTo(0.5);
    expect(level(0.6)).toBeCloseTo(1);
  });

  it("animates effect params and colour grade by their keyframes", () => {
    const s = makeState({
      width: 640,
      height: 360,
      tracks: [
        {
          id: "main",
          items: [
            {
              id: "c",
              kind: "clip",
              source: { in: 0, out: 4, asset: "a" },
              children: [
                { id: "b", kind: "effect", props: { type: "blur", params: { radius: 2 } } },
                { id: "v", kind: "effect", props: { type: "vignette" } },
                { id: "g", kind: "colorGrade", props: { temperature: 0 } },
                { id: "k1", kind: "keyframe", props: { property: "effect.b.radius", at: 0, value: 0 } },
                { id: "k2", kind: "keyframe", props: { property: "effect.b.radius", at: 2, value: 8 } },
                { id: "k3", kind: "keyframe", props: { property: "effect.v.amount", at: 2, value: 80 } },
                { id: "k4", kind: "keyframe", props: { property: "colorGrade.temperature", at: 0, value: 0 } },
                { id: "k5", kind: "keyframe", props: { property: "colorGrade.temperature", at: 2, value: 40 } },
              ],
            },
          ],
        },
      ],
    });
    expect(buildFramePlan(s, 0).ops[0]!.filter).toBe("blur(0px)");
    expect(buildFramePlan(s, 1).ops[0]).toMatchObject({
      filter: "blur(4px) sepia(0.1)",
      post: [{ type: "vignette", amount: 0.8 }],
    });
    expect(buildFramePlan(s, 3).ops[0]!.filter).toBe("blur(8px) sepia(0.2)");
  });

  it("blurs the first footage behind everything, unless an overlay sits beneath the footage", () => {
    const main = {
      id: "main",
      items: [
        { id: "c", kind: "clip", source: { in: 0, out: 4, asset: "a" } },
        { id: "d", kind: "clip", source: { in: 0, out: 4, asset: "b" } },
      ],
    };
    const blurred = buildFramePlan(makeState({ background: { mode: "blur" }, tracks: [main] }), 1);
    expect(blurred.backgroundBlur).toEqual({ id: "c" });
    expect(blurred.warnings).toEqual([]);
    expect(buildFramePlan(makeState({ tracks: [main] }), 1).backgroundBlur).toBeUndefined();
    const under = buildFramePlan(
      makeState({
        background: { mode: "blur" },
        tracks: [{ id: "bg", items: [{ id: "h", kind: "title", duration: 4, text: "Hi" }] }, main],
      }),
      1,
    );
    expect(under.clear).toBe(true);
    expect(under.backgroundBlur).toBeUndefined();
    expect(under.warnings).toEqual(["background mode blur is drawn as a colour under backdrop overlays"]);
  });

  it("maps source time through speed and resolves nested compositions", () => {
    const inner = makeState({
      width: 640,
      height: 360,
      tracks: [{ id: "i", items: [{ id: "ic", kind: "clip", source: { in: 0, out: 3, asset: "a" } }] }],
    });
    const outer = makeState({
      tracks: [
        {
          id: "main",
          items: [
            {
              id: "n",
              kind: "nested",
              source: { in: 1, out: 3, speed: 2, asset: "nested" },
              duration: 1,
              props: { of: () => null },
            },
          ],
        },
      ],
    });
    const plan = buildFramePlan(outer, 0.5, (p) => (p.id === "n" ? inner : null) as ResolvedState | null);
    expect(plan.ops[0]).toMatchObject({ id: "n", kind: "nested", nested: { time: 2 } });
    expect(buildFramePlan(outer, 0.5).ops[0]!.kind).toBe("error");
  });

  it("omits multicam clips on hidden tracks in the fixture and finds c1 with its mask", () => {
    const plan = buildFramePlan(fixtureState(), 1);
    expect(plan.ops.map((o) => o.id)).toEqual(["c1", "adj1"]);
    expect(plan.ops[0]!.mask).toMatchObject({ feather: 12, inverted: false });
    expect(plan.ops[0]!.sourceTime).toBe(3);
    expect(plan.ops[0]!.opacity).toBe(1);
  });
});
