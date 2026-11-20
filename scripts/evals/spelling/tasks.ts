// Ten edits to the base file, each with a check of the resolved result. The same words go to both spellings.
import type { EffectOut, KeyOut, Loaded } from "./check";

export interface Task {
  readonly name: string;
  /** Which base file it edits: `small` has three clips, `large` six, `huge` twenty with nothing animated. */
  readonly base: "small" | "large" | "huge";
  readonly ask: string;
  /** What is wrong with the result, or null when the edit is right. */
  check(file: Loaded): string | null;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

/** `keys` against `[at, value]` pairs, and the first key's easing when one is asked for. */
function want(keys: KeyOut[], pairs: [number, number][], easing?: string): string | null {
  const got = keys.map((k) => `${k.at}:${k.value}`).join(" ");
  if (keys.length !== pairs.length) return `wanted ${pairs.length} keys, got ${keys.length} (${got})`;
  for (const [i, [at, value]] of pairs.entries()) {
    const k = keys[i] as KeyOut;
    if (!near(k.at, at) || !near(k.value, value))
      return `wanted ${pairs.map((p) => p.join(":")).join(" ")}, got ${got}`;
  }
  if (easing && keys[0]?.easing !== easing) return `wanted the first key's easing ${easing}, got ${keys[0]?.easing}`;
  return null;
}

const both = (file: Loaded, pairs: [number, number][]): string | null =>
  want(file.keys("zoom", "transform.scale.x"), pairs) ?? want(file.keys("zoom", "transform.scale.y"), pairs);

const only = (effects: EffectOut[], type: string): EffectOut | string =>
  effects.length === 1 && effects[0]?.type === type
    ? (effects[0] as EffectOut)
    : `wanted one ${type} effect, got ${effects.map((e) => e.type).join(", ") || "none"}`;

const scale = (file: Loaded, id: string, pairs: [number, number][], easing?: string): string | null => {
  const bad =
    want(file.keys(id, "transform.scale.x"), pairs, easing) ?? want(file.keys(id, "transform.scale.y"), pairs, easing);
  return bad ? `${id}: ${bad}` : null;
};

/** Each clip of the huge base file and its length in seconds. */
const HUGE: Readonly<Record<string, number>> = {
  s00: 2.0,
  s01: 2.5,
  s02: 3.0,
  s03: 2.0,
  s04: 2.5,
  s05: 3.0,
  s06: 2.0,
  s07: 2.5,
  s08: 3.0,
  s09: 2.0,
  s10: 2.5,
  s11: 3.0,
  s12: 2.0,
  s13: 2.5,
  s14: 3.0,
  s15: 2.0,
  s16: 2.5,
  s17: 3.0,
  s18: 2.0,
  s19: 2.5,
};

/** The parts of the large base file a task did not ask to change. */
const large = {
  b: (f: Loaded) =>
    scale(f, "b", [
      [0, 1],
      [3.5, 1.2],
    ]),
  cBlur: (f: Loaded) => {
    const fx = f.effects("c").find((e) => e.type === "blur");
    return fx
      ? want(fx.keys.radius ?? [], [
          [0, 0],
          [2, 8],
        ])
      : "`c` lost its blur";
  },
  eFade: (f: Loaded, end: number) => {
    const bad = want(f.keys("e", "transform.opacity"), [
      [0, 0],
      [end, 1],
    ]);
    return bad ? `e: ${bad}` : null;
  },
  eBlur: (f: Loaded) =>
    f.effects("e").some((e) => e.type === "blur" && e.params.radius === 2) ? null : "`e` lost its blur",
};

/** The parts of the small base file a task did not ask to change. */
const untouched = {
  zoom: (f: Loaded) =>
    both(f, [
      [0, 1],
      [3.5, 1.2],
    ]),
  blur: (f: Loaded) => {
    const fx = only(f.effects("close"), "blur");
    return typeof fx === "string"
      ? fx
      : want(fx.keys.radius ?? [], [
          [0, 0],
          [2, 8],
        ]);
  },
};

export const TASKS: readonly Task[] = [
  {
    base: "small",
    name: "fade-in",
    ask: "Fade the clip `open` in: its opacity goes from 0 at 0 s to 1 at 0.5 s.",
    check: (f) =>
      want(f.keys("open", "transform.opacity"), [
        [0, 0],
        [0.5, 1],
      ]) ??
      untouched.zoom(f) ??
      untouched.blur(f),
  },
  {
    base: "small",
    name: "change-value",
    ask: "The push-in on `zoom` should end at scale 1.35 instead of 1.2.",
    check: (f) =>
      both(f, [
        [0, 1],
        [3.5, 1.35],
      ]) ?? untouched.blur(f),
  },
  {
    base: "small",
    name: "insert-key",
    ask: "Add a key in the middle of the push-in on `zoom`: scale 1.05 at 1 s. Keep the two keys it has.",
    check: (f) =>
      both(f, [
        [0, 1],
        [1, 1.05],
        [3.5, 1.2],
      ]) ?? untouched.blur(f),
  },
  {
    base: "small",
    name: "remove-keys",
    ask: "Remove the push-in from `zoom`, so the clip plays at its normal size.",
    check: (f) => both(f, []) ?? untouched.blur(f),
  },
  {
    base: "small",
    name: "remove-effect",
    ask: "Remove the blur from `close`.",
    check: (f) => (f.effects("close").length === 0 ? null : "the effect is still there") ?? untouched.zoom(f),
  },
  {
    base: "small",
    name: "retime-effect",
    ask: "On `close`, the blur should stay at radius 0 until 0.5 s (its first key moves from 0 s to 0.5 s) and reach 12 instead of 8.",
    check: (f) => {
      const fx = only(f.effects("close"), "blur");
      return (
        (typeof fx === "string"
          ? fx
          : want(fx.keys.radius ?? [], [
              [0.5, 0],
              [2, 12],
            ])) ?? untouched.zoom(f)
      );
    },
  },
  {
    base: "small",
    name: "add-effect",
    ask: "Add a glow to `open` with radius 20 and intensity 0.8.",
    check: (f) => {
      const fx = only(f.effects("open"), "glow");
      if (typeof fx === "string") return fx;
      if (fx.params.radius !== 20 || fx.params.intensity !== 0.8) return `wrong params ${JSON.stringify(fx.params)}`;
      return untouched.zoom(f) ?? untouched.blur(f);
    },
  },
  {
    base: "small",
    name: "add-animated-effect",
    ask: "Add a blur to `open` that goes from radius 10 at 0 s to 0 at 1 s, easing out (`ease-out`).",
    check: (f) => {
      const fx = only(f.effects("open"), "blur");
      return (
        (typeof fx === "string"
          ? fx
          : want(
              fx.keys.radius ?? [],
              [
                [0, 10],
                [1, 0],
              ],
              "ease-out",
            )) ??
        untouched.zoom(f) ??
        untouched.blur(f)
      );
    },
  },
  {
    base: "small",
    name: "slide-title",
    ask: "Slide the title in from the left: its box x goes from 100 at 0 s to 240 at 0.6 s, easing out (`ease-out`).",
    check: (f) =>
      want(
        f.keys("title", "box.x"),
        [
          [0, 100],
          [0.6, 240],
        ],
        "ease-out",
      ) ??
      untouched.zoom(f) ??
      untouched.blur(f),
  },
  {
    base: "small",
    name: "two-properties",
    ask: "On `close`: rotate it from 0 degrees at 0 s to 5 degrees at 2.6 s, and fade it out, opacity 1 at 2 s to 0 at 2.6 s. Keep its blur.",
    check: (f) =>
      want(f.keys("close", "transform.rotation"), [
        [0, 0],
        [2.6, 5],
      ]) ??
      want(f.keys("close", "transform.opacity"), [
        [2, 1],
        [2.6, 0],
      ]) ??
      untouched.blur(f) ??
      untouched.zoom(f),
  },
  // The larger file: edits that touch several clips at once.
  {
    base: "large",
    name: "push-in-all",
    ask: "Give every clip that has no push-in a slow one: scale 1 at 0 s to 1.1 at the clip's end (its length is `out` minus `in`). Leave `b` as it is.",
    check: (f) =>
      scale(f, "a", [
        [0, 1],
        [3, 1.1],
      ]) ??
      scale(f, "c", [
        [0, 1],
        [2.6, 1.1],
      ]) ??
      scale(f, "d", [
        [0, 1],
        [4, 1.1],
      ]) ??
      scale(f, "e", [
        [0, 1],
        [2, 1.1],
      ]) ??
      scale(f, "f", [
        [0, 1],
        [2.4, 1.1],
      ]) ??
      large.b(f) ??
      large.cBlur(f) ??
      large.eFade(f, 0.5) ??
      large.eBlur(f),
  },
  {
    base: "large",
    name: "fade-all",
    ask: "Every clip should fade in over 0.3 s: opacity 0 at 0 s, 1 at 0.3 s. `e` already fades in; make it 0.3 s too.",
    check: (f) =>
      ["a", "b", "c", "d", "f"]
        .map((id) =>
          want(f.keys(id, "transform.opacity"), [
            [0, 0],
            [0.3, 1],
          ]),
        )
        .find((x) => x) ??
      large.eFade(f, 0.3) ??
      large.b(f) ??
      large.cBlur(f) ??
      large.eBlur(f),
  },
  {
    base: "large",
    name: "halve-times",
    ask: "Make the animations on `b` and `c` run twice as fast: halve the time of every key they have. Values stay.",
    check: (f) => {
      const fx = only(f.effects("c"), "blur");
      return (
        scale(f, "b", [
          [0, 1],
          [1.75, 1.2],
        ]) ??
        (typeof fx === "string"
          ? fx
          : want(fx.keys.radius ?? [], [
              [0, 0],
              [1, 8],
            ])) ??
        large.eFade(f, 0.5) ??
        large.eBlur(f)
      );
    },
  },
  {
    base: "large",
    name: "move-effect",
    ask: "Move the blur from `c` to `d`, with its keys unchanged.",
    check: (f) => {
      const fx = only(f.effects("d"), "blur");
      return (
        (f.effects("c").length === 0 ? null : "`c` still has an effect") ??
        (typeof fx === "string"
          ? fx
          : want(
              fx.keys.radius ?? [],
              [
                [0, 0],
                [2, 8],
              ],
              "ease-in-out",
            )) ??
        large.b(f) ??
        large.eFade(f, 0.5) ??
        large.eBlur(f)
      );
    },
  },
  {
    base: "large",
    name: "glow-all",
    ask: "Add a glow to every clip, radius 12, whose intensity goes from 0 at 0 s to 1 at 0.5 s. Keep the effects the clips already have.",
    check: (f) =>
      ["a", "b", "c", "d", "e", "f"]
        .map((id) => {
          const glow = f.effects(id).filter((e) => e.type === "glow");
          if (glow.length !== 1) return `${id}: wanted one glow, got ${glow.length}`;
          const g = glow[0] as EffectOut;
          if (g.params.radius !== 12) return `${id}: glow radius ${String(g.params.radius)}`;
          const bad = want(g.keys.intensity ?? [], [
            [0, 0],
            [0.5, 1],
          ]);
          return bad ? `${id}: ${bad}` : null;
        })
        .find((x) => x) ??
      (f.effects("c").some((e) => e.type === "blur") ? null : "`c` lost its blur") ??
      (f.effects("e").some((e) => e.type === "blur") ? null : "`e` lost its blur") ??
      large.b(f) ??
      large.eFade(f, 0.5),
  },
  {
    base: "large",
    name: "copy-push-in",
    ask: "Give `a` and `f` the same push-in as `b` (same values and easing), ending at each clip's own end instead of 3.5 s.",
    check: (f) =>
      scale(
        f,
        "a",
        [
          [0, 1],
          [3, 1.2],
        ],
        "ease-in-out",
      ) ??
      scale(
        f,
        "f",
        [
          [0, 1],
          [2.4, 1.2],
        ],
        "ease-in-out",
      ) ??
      large.b(f) ??
      large.cBlur(f) ??
      large.eFade(f, 0.5) ??
      large.eBlur(f),
  },
  // Twenty clips: every edit is written twenty times, and the children spelling needs an id for each key.
  {
    base: "huge",
    name: "push-in-20",
    ask: "Give every clip a slow push-in: scale 1 at 0 s to 1.1 at the clip's end (its length is `out` minus `in`), easing `ease-in-out`.",
    check: (f) =>
      Object.entries(HUGE)
        .map(([id, d]) =>
          scale(
            f,
            id,
            [
              [0, 1],
              [d, 1.1],
            ],
            "ease-in-out",
          ),
        )
        .find((x) => x) ?? null,
  },
  {
    base: "huge",
    name: "fade-and-glow-20",
    ask: "Every clip fades in (opacity 0 at 0 s, 1 at 0.3 s) and fades out over its last 0.3 s (opacity 1, then 0 at its end), and gets a glow of radius 12 whose intensity goes from 1 at 0 s to 0 at 0.5 s.",
    check: (f) =>
      Object.entries(HUGE)
        .map(([id, d]) => {
          const fade = want(f.keys(id, "transform.opacity"), [
            [0, 0],
            [0.3, 1],
            [d - 0.3, 1],
            [d, 0],
          ]);
          if (fade) return `${id}: ${fade}`;
          const fx = only(f.effects(id), "glow");
          if (typeof fx === "string") return `${id}: ${fx}`;
          if (fx.params.radius !== 12) return `${id}: glow radius ${String(fx.params.radius)}`;
          const bad = want(fx.keys.intensity ?? [], [
            [0, 1],
            [0.5, 0],
          ]);
          return bad ? `${id}: ${bad}` : null;
        })
        .find((x) => x) ?? null,
  },
];
